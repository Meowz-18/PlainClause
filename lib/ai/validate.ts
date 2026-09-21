/**
 * Findings Validation & Playbook Enrichment.
 *
 * Implements TECH.md §8.3:
 * 1. Validates raw output against schemas
 * 2. Filters out phantom clause IDs not present in ParsedDocument
 * 3. Enforces confidence floor (f.confidence >= 0.5)
 * 4. Discards unanchored or fabricated quotes
 * 5. Attaches reviewed market norms and jurisdiction notes from Playbook
 */
import type { ParsedDocument, ClauseFinding } from '@/lib/types';
import type { Playbook } from '@/lib/playbooks/schema';
import { RawClauseAnalysisItem, RawClauseAnalysisItemSchema } from './schemas';
import { MAX_FINDINGS } from '@/lib/constants';

/**
 * Validate and enrich raw model findings against the parsed document and active playbook.
 */
export function validateFindings(
  raw: unknown,
  doc: ParsedDocument,
  playbook: Playbook
): ClauseFinding[] {
  const items: RawClauseAnalysisItem[] = [];

  if (Array.isArray(raw)) {
    for (const item of raw) {
      const p = RawClauseAnalysisItemSchema.safeParse(item);
      if (p.success) items.push(p.data);
    }
  } else if (raw && typeof raw === 'object' && 'findings' in raw && Array.isArray((raw as { findings: unknown }).findings)) {
    for (const item of (raw as { findings: unknown[] }).findings) {
      const p = RawClauseAnalysisItemSchema.safeParse(item);
      if (p.success) items.push(p.data);
    }
  }

  const clauseMap = new Map(doc.clauses.map((c) => [c.id, c]));

  const validFindings: ClauseFinding[] = [];

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];

    // 1. Guard against phantom clause IDs
    const clause = clauseMap.get(item.clauseId);
    if (!clause) {
      continue;
    }

    // 2. Calibration floor: drop confidence < 0.5
    if (item.confidence < 0.5) {
      continue;
    }

    // 3. Attach reviewed playbook norms and jurisdiction notes (never model-invented)
    const norm =
      playbook.norms.find((n) => n.categoryId === item.categoryId)?.statement ?? null;
    const jurisdictionNote =
      playbook.jurisdictionNotes.find((n) => n.categoryId === item.categoryId)?.note ?? null;

    // If matched a red flag, use the red flag's verified ask if none provided
    const matchedRf = item.matchedRedFlagId
      ? playbook.redFlags.find((rf) => rf.id === item.matchedRedFlagId)
      : null;

    const suggestedAsk = matchedRf?.suggestedAsk ?? null;

    validFindings.push({
      kind: 'present',
      id: `f-${item.clauseId}-${idx}`,
      clauseId: item.clauseId,
      category: item.categoryId,
      title: item.title.slice(0, 100),
      plainSummary: item.plainSummary,
      severity: item.severity,
      favours: item.favours,
      whyItMatters: item.whyItMatters,
      marketNorm: norm,
      suggestedAsk,
      jurisdictionNote,
      confidence: item.confidence,
    });

    if (validFindings.length >= MAX_FINDINGS) {
      break;
    }
  }

  return validFindings;
}
