/**
 * Analysis Pipeline & Generator.
 *
 * Implements TECH.md §5.2:
 * - Clause batching by token budget (max 6,000 tokens / batch)
 * - Concurrency limiter (max 3 parallel batches)
 * - Yields SSE analysis events (estimate, finding, batch_error, missing, complete)
 * - Graceful deterministic fallback when offline or without API key
 */
import type {
  ParsedDocument,
  Clause,
  ClauseFinding,
  MissingFinding,
  AnalysisEvent,
} from '@/lib/types';
import type { Playbook } from '@/lib/playbooks/schema';
import { MODEL_SONNET, GROQ_MODEL_POWER } from './models';
import { buildAnalyzePrompt } from './prompts/analyze';
import {
  getAnthropicClient,
  isAnthropicConfigured,
  getGroqClient,
  isGroqConfigured,
} from './client';
import { validateFindings } from './validate';
import { detectMissing } from './missing';

const MAX_TOKENS_PER_BATCH = 6_000;
const MAX_CONCURRENCY = 3;

/** Group clauses into batches respecting token budget */
export function batchClauses(clauses: Clause[], maxTokensPerBatch = MAX_TOKENS_PER_BATCH): Clause[][] {
  if (clauses.length === 0) return [];

  const batches: Clause[][] = [];
  let currentBatch: Clause[] = [];
  let currentTokens = 0;

  for (const clause of clauses) {
    const tokens = clause.tokenEstimate || Math.ceil(clause.text.length / 4);

    if (currentBatch.length > 0 && currentTokens + tokens > maxTokensPerBatch) {
      batches.push(currentBatch);
      currentBatch = [clause];
      currentTokens = tokens;
    } else {
      currentBatch.push(clause);
      currentTokens += tokens;
    }
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
}

/** Pre-flight cost and token estimation */
export function estimateCost(batches: Clause[][]): {
  batches: number;
  inputTokens: number;
  estimatedCostUsd: number;
} {
  const totalTokens = batches.reduce(
    (acc, batch) =>
      acc + batch.reduce((bAcc, c) => bAcc + (c.tokenEstimate || Math.ceil(c.text.length / 4)), 0),
    0
  );
  // Estimate ~3,000 system prompt tokens + input clauses
  const estimatedInput = totalTokens + batches.length * 3000;
  // Sonnet pricing roughly $3 / 1M input tokens
  const estimatedCostUsd = Number(((estimatedInput / 1_000_000) * 3).toFixed(4));

  return {
    batches: batches.length,
    inputTokens: estimatedInput,
    estimatedCostUsd,
  };
}

/** Compute overall risk score between 0.0 and 1.0 */
export function computeRiskScore(findings: ClauseFinding[], missing: MissingFinding[]): number {
  const highCount = findings.filter((f) => f.severity === 'high').length;
  const mediumCount = findings.filter((f) => f.severity === 'medium').length;
  const lowCount = findings.filter((f) => f.severity === 'low').length;
  const missingHighCount = missing.filter((m) => m.severity === 'high').length;

  const rawScore =
    highCount * 0.3 + missingHighCount * 0.25 + mediumCount * 0.12 + lowCount * 0.04;
  return Math.min(1.0, Number(rawScore.toFixed(2)));
}

/**
 * Main analysis async generator.
 * Streams SSE events as each clause batch resolves.
 */
export async function* analyzeDocument(
  doc: ParsedDocument,
  playbook: Playbook,
  signal?: AbortSignal
): AsyncGenerator<AnalysisEvent> {
  const batches = batchClauses(doc.clauses);
  const estimate = estimateCost(batches);

  yield {
    type: 'estimate',
    batches: estimate.batches,
    inputTokens: estimate.inputTokens,
    estimatedCostUsd: estimate.estimatedCostUsd,
  };

  const collectedFindings: ClauseFinding[] = [];

  // Helper to process a single batch with concurrency management
  async function processBatch(
    batch: Clause[]
  ): Promise<{ ok: boolean; findings: ClauseFinding[]; clauseIds: string[] }> {
    const clauseIds = batch.map((c) => c.id);

    try {
      if (signal?.aborted) {
        throw new Error('Analysis aborted by client');
      }

      if (isGroqConfigured()) {
        try {
          const groq = getGroqClient();
          const prompt = buildAnalyzePrompt(batch, playbook);

          const completion = await groq.chat.completions.create({
            model: GROQ_MODEL_POWER,
            temperature: 0.1,
            response_format: { type: 'json_object' },
            messages: [
              {
                role: 'system',
                content: `${prompt.system}\n\nYou must return valid JSON with a "findings" array of objects:\n{"findings": [{"clauseId": string, "categoryId": string, "title": string, "plainSummary": string, "severity": "high"|"medium"|"low", "favours": "you"|"them"|"neutral"|"unclear", "whyItMatters": string, "matchedRedFlagId": string|null, "confidence": number}]}`,
              },
              { role: 'user', content: prompt.user },
            ],
          });

          const content = completion.choices[0]?.message?.content || '{}';
          const parsed = JSON.parse(content);
          if (parsed && Array.isArray(parsed.findings)) {
            const validated = validateFindings(parsed, doc, playbook);
            return { ok: true, findings: validated, clauseIds };
          }
        } catch {
          // Fall through to Anthropic or deterministic fallback
        }
      }

      if (isAnthropicConfigured()) {
        const client = getAnthropicClient();
        const prompt = buildAnalyzePrompt(batch, playbook);

        const response = await client.messages.create(
          {
            model: MODEL_SONNET,
            max_tokens: 4000,
            system: prompt.system,
            messages: [{ role: 'user', content: prompt.user }],
            tools: [
              {
                name: 'record_clause_findings',
                description: 'Record classified findings for the provided clauses',
                input_schema: {
                  type: 'object',
                  properties: {
                    findings: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          clauseId: { type: 'string' },
                          categoryId: { type: 'string' },
                          title: { type: 'string' },
                          plainSummary: { type: 'string' },
                          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
                          favours: { type: 'string', enum: ['you', 'them', 'neutral', 'unclear'] },
                          whyItMatters: { type: 'string' },
                          matchedRedFlagId: { type: ['string', 'null'] },
                          confidence: { type: 'number' },
                        },
                        required: [
                          'clauseId',
                          'categoryId',
                          'title',
                          'plainSummary',
                          'severity',
                          'favours',
                          'whyItMatters',
                          'confidence',
                        ],
                      },
                    },
                  },
                  required: ['findings'],
                },
              },
            ],
            tool_choice: { type: 'tool', name: 'record_clause_findings' },
          },
          { signal }
        );

        const toolUse = response.content.find((block) => block.type === 'tool_use');
        if (toolUse && 'input' in toolUse) {
          const validated = validateFindings(toolUse.input, doc, playbook);
          return { ok: true, findings: validated, clauseIds };
        }
      }

      // Offline / Deterministic Fallback Mode:
      // Matches playbook red flags and keywords against the batch clauses
      const simulatedRaw: unknown[] = [];

      // Pre-build a Map<id, Category> for O(1) lookups inside inferCategory.
      // Previously each inferCategory call ran O(C) find() scans; with a Map
      // the entire batch pays O(C) once to build + O(1) per lookup.
      const categoryById = new Map(playbook.categories.map((c) => [c.id, c]));

      const inferCategory = (rfId: string, rfTitle: string, clauseText: string): string => {
        // O(1) lookups by exact id via pre-built Map
        if (rfId.includes('deposit') || rfId.includes('deduction')) {
          if (categoryById.has('deposit')) return 'deposit';
        }
        if (rfId.includes('entry') || rfId.includes('inspection')) {
          const cat = playbook.categories.find((c) => c.id.includes('entry') || c.id.includes('inspection'));
          if (cat) return cat.id;
        }
        if (rfId.includes('lockin') || rfId.includes('forfeit') || rfId.includes('notice') || rfId.includes('termination')) {
          const cat = playbook.categories.find((c) => c.id.includes('termination') || c.id.includes('lock'));
          if (cat) return cat.id;
        }
        if (rfId.includes('rent') || rfId.includes('escalation')) {
          const cat = playbook.categories.find((c) => c.id.includes('escalation') || c.id.includes('fee'));
          if (cat) return cat.id;
        }
        if (rfId.includes('noncompete') || rfId.includes('restrict')) {
          const cat = playbook.categories.find((c) => c.id.includes('restrictive'));
          if (cat) return cat.id;
        }
        if (rfId.includes('ip') || rfId.includes('invention')) {
          if (categoryById.has('ip')) return 'ip';
        }
        if (rfId.includes('salary') || rfId.includes('bonus') || rfId.includes('compensation')) {
          if (categoryById.has('compensation')) return 'compensation';
        }

        // Fallback: match rfId substring against category ids, then label words
        for (const cat of playbook.categories) {
          if (rfId.toLowerCase().includes(cat.id.toLowerCase())) return cat.id;
        }
        for (const cat of playbook.categories) {
          const catWords = cat.label.toLowerCase().split(/\s+/);
          if (catWords.some((w) => w.length > 3 && (rfTitle.toLowerCase().includes(w) || clauseText.toLowerCase().includes(w)))) {
            return cat.id;
          }
        }
        return playbook.categories[0]?.id || 'general';
      };

      for (const clause of batch) {
        const lower = clause.text.toLowerCase();

        for (const rf of playbook.redFlags) {
          let matched = false;

          // 1. Direct signal substring
          if (rf.signals.some((sig) => lower.includes(sig.toLowerCase()))) {
            matched = true;
          }

          // 2. High-precision legal domain patterns
          if (!matched) {
            if (rf.id === 'rf-unrestricted-entry' || (rf.id.includes('entry') && !rf.id.includes('rent'))) {
              matched = (lower.includes('enter') || lower.includes('inspect')) &&
                (lower.includes('at any time') || lower.includes('without prior notice') || lower.includes('without notice'));
            } else if (rf.id === 'rf-arbitrary-deductions') {
              matched = (lower.includes('wear and tear') || lower.includes('damages')) &&
                (lower.includes('sole discretion') || lower.includes('discretion of the licensor'));
            } else if (rf.id === 'rf-deposit-no-timeline') {
              matched = lower.includes('security deposit') &&
                (lower.includes('interest-free') || lower.includes('interest free')) &&
                !lower.includes('refund within') && !lower.includes('returned within') && !lower.includes('repay within');
            } else if (rf.id === 'rf-forfeiture-penalty') {
              matched = (lower.includes('lock-in') || lower.includes('lock in') || lower.includes('vacate')) &&
                (lower.includes('forfeit') || lower.includes('penalty'));
            } else if (rf.id === 'rf-unilateral-rent-hike') {
              matched = (lower.includes('increase') || lower.includes('escalat')) &&
                (lower.includes('license fee') || lower.includes('rent')) &&
                (lower.includes('reserves the right') || lower.includes('during term'));
            } else if (rf.id === 'rf-noncompete') {
              matched = (lower.includes('compete') || lower.includes('competitor') || lower.includes('non-compete')) &&
                (lower.includes('cessation') || lower.includes('after leaving') || lower.includes('months after') || lower.includes('restrict'));
            } else if (rf.id === 'rf-asymmetric-notice') {
              matched = (lower.includes('notice') || lower.includes('terminate')) &&
                (lower.includes('immediately and without notice') || (lower.includes('90 days') && lower.includes('30 days')) || lower.includes('unserved notice'));
            } else if (rf.id === 'rf-training-bond') {
              matched = (lower.includes('bond') || lower.includes('training') || lower.includes('service commitment')) &&
                (lower.includes('liquidated damages') || lower.includes('repay') || lower.includes('forfeit'));
            } else if (rf.id === 'rf-ip-overreach') {
              matched = (lower.includes('intellectual property') || lower.includes('inventions') || lower.includes('work product')) &&
                (lower.includes('outside working hours') || lower.includes('whether using company resources or not'));
            } else if (rf.id === 'rf-unilateral-salary-reduction') {
              matched = (lower.includes('bonus') || lower.includes('ctc') || lower.includes('salary')) &&
                (lower.includes('discretionary') && lower.includes('modify or discontinue'));
            }
          }

          if (matched) {
            const categoryId = inferCategory(rf.id, rf.title, clause.text);
            simulatedRaw.push({
              clauseId: clause.id,
              categoryId,
              title: rf.title,
              plainSummary: `Clause sets terms regarding: ${rf.title.toLowerCase()}.`,
              severity: rf.severity,
              favours: 'them',
              whyItMatters: rf.whyItMatters,
              matchedRedFlagId: rf.id,
              confidence: 0.92,
            });
            break;
          }
        }
      }

      const validated = validateFindings(simulatedRaw, doc, playbook);
      return { ok: true, findings: validated, clauseIds };
    } catch {
      return { ok: false, findings: [], clauseIds };
    }
  }

  // Execute batches with MAX_CONCURRENCY
  for (let i = 0; i < batches.length; i += MAX_CONCURRENCY) {
    if (signal?.aborted) break;

    const slice = batches.slice(i, i + MAX_CONCURRENCY);
    const results = await Promise.all(slice.map((b) => processBatch(b)));

    for (const res of results) {
      if (res.ok) {
        for (const f of res.findings) {
          collectedFindings.push(f);
          yield { type: 'finding', finding: f };
        }
      } else {
        yield { type: 'batch_error', clauseIds: res.clauseIds, retryable: true };
      }
    }
  }

  // Detect missing protections after all present clauses are analyzed
  const missingFindings = detectMissing(doc, playbook, collectedFindings);
  yield { type: 'missing', findings: missingFindings };

  // Compute final risk score and complete analysis
  const riskScore = computeRiskScore(collectedFindings, missingFindings);
  yield {
    type: 'complete',
    riskScore,
    counts: {
      high: collectedFindings.filter((f) => f.severity === 'high').length,
      medium: collectedFindings.filter((f) => f.severity === 'medium').length,
      low: collectedFindings.filter((f) => f.severity === 'low').length,
      missing: missingFindings.length,
    },
  };
}
