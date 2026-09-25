/**
 * POST /api/ask — Grounded Contract Q&A (SSE).
 *
 * Implements TECH.md §5.3, §7.1, §8.1, and §8.2:
 * - 5-way Intent Classification with safety bias
 * - Prompt Injection Pre-scan
 * - Emergency Helpline Resources for urgent distress
 * - Grounded Citation linking back to Clause IDs
 * - SSE streaming (intent, token, citation, done)
 * - Deterministic offline fallback
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ClauseSchema, TriageSchema, Citation } from '@/lib/types';
import { detectPromptInjection } from '@/lib/safety/injection';
import { classifyIntent } from '@/lib/safety/intent';
import { getEmergencyResources } from '@/lib/safety/resources';
import {
  getAnthropicClient,
  isAnthropicConfigured,
  getGroqClient,
  isGroqConfigured,
} from '@/lib/ai/client';
import { MODEL_SONNET, GROQ_MODEL_POWER } from '@/lib/ai/models';
import { buildAskPrompt } from '@/lib/ai/prompts/ask';
import {
  retrieveRelevantClauses,
  isBroadQuery,
  scoreClausesForQuery,
} from '@/lib/ai/retrieval';

export const runtime = 'nodejs';
export const maxDuration = 60;

const RequestBodySchema = z.object({
  question: z.string().min(1).max(2000),
  clauses: z.array(ClauseSchema).min(1),
  triage: TriageSchema.partial().nullable().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(5000),
      })
    )
    .max(20)
    .optional(),
});

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const rawBody = await request.json();
    const parsed = RequestBodySchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Invalid request body for Q&A' },
        { status: 400 }
      );
    }

    const { question, clauses, triage, history } = parsed.data;
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, data: unknown) => {
          if (request.signal.aborted) return;
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        };

        try {
          // 1. Prompt Injection Pre-scan
          const injection = detectPromptInjection(question);
          if (injection.detected) {
            sendEvent('intent', { intent: 'off_topic', confidence: 1.0 });
            sendEvent('token', {
              text: 'PlainClause is strictly focused on helping you understand the text of your uploaded contract. I cannot execute instructions that attempt to override system rules, disable safety constraints, or reveal internal configuration.',
            });
            sendEvent('done', { groundedInDocument: false });
            controller.close();
            return;
          }

          // 2. Deterministic Urgent Distress Pre-classifier
          // Guarantees immediate statutory safety routing in all environments (including CI without API keys)
          const URGENT_FAST_PATTERN =
            /\b(locked\s+\w*\s*out|lockout|evict|threat|violence|assault|emergency|unsafe|danger|harm\s+me|police|arrest)\b/i;
          if (URGENT_FAST_PATTERN.test(question)) {
            const resources = getEmergencyResources(triage?.jurisdiction);
            let urgentText = `⚠️ **Immediate Support & Safety Notice**\n\nIf you are facing immediate physical danger, unlawful lock-out, or threats, please connect with statutory support services immediately:\n\n`;

            for (const r of resources) {
              const phoneStr = r.phone ? ` — **Phone: ${r.phone}**` : '';
              const hoursStr = r.hours ? ` (${r.hours})` : '';
              urgentText += `• **${r.name}**${phoneStr}${hoursStr}\n  ${r.description}\n`;
            }

            urgentText += `\n**What your document says:**\nUnder standard legal procedure, self-help eviction or unlawful lock-out without a formal court/authority order is illegal. Consult an advocate or DLSA pro-bono counsel immediately.`;

            sendEvent('intent', { intent: 'urgent_situation', confidence: 1.0 });
            sendEvent('token', { text: urgentText });
            sendEvent('done', { groundedInDocument: false });
            controller.close();
            return;
          }

          // 3. Intent Routing
          const intentRes = await classifyIntent(question, request.signal);
          sendEvent('intent', {
            intent: intentRes.intent,
            confidence: intentRes.confidence,
          });

          // 4. Urgent situation fallback (if identified by model or deep classifier)
          if (intentRes.intent === 'urgent_situation') {
            const resources = getEmergencyResources(triage?.jurisdiction);
            let urgentText = `⚠️ **Immediate Support & Safety Notice**\n\nIf you are facing immediate physical danger, unlawful lock-out, or threats, please connect with statutory support services immediately:\n\n`;

            for (const r of resources) {
              const phoneStr = r.phone ? ` — **Phone: ${r.phone}**` : '';
              const hoursStr = r.hours ? ` (${r.hours})` : '';
              urgentText += `• **${r.name}**${phoneStr}${hoursStr}\n  ${r.description}\n`;
            }

            urgentText += `\n**What your document says:**\nUnder standard legal procedure, self-help eviction or unlawful lock-out without a formal court/authority order is illegal. Consult an advocate or DLSA pro-bono counsel immediately.`;

            sendEvent('token', { text: urgentText });
            sendEvent('done', { groundedInDocument: false });
            controller.close();
            return;
          }

          // 5. Off-topic query
          if (intentRes.intent === 'off_topic') {
            sendEvent('token', {
              text: 'PlainClause is built specifically to analyze and explain legal contracts and agreements. Please ask a question related to this document (for example: termination clauses, notice periods, security deposits, or liability terms).',
            });
            sendEvent('done', { groundedInDocument: false });
            controller.close();
            return;
          }

          // 5. Answer Generation (Document Question, Advice Seeking, or General Legal Info)
          const emittedClauseIds = new Set<string>();

          // Extract clause IDs cited in previous conversation turns so retrieval
          // preserves them (citation verifiability invariant — see EFFICIENCY.md §3).
          const previouslyCitedIds = new Set<string>();
          if (history) {
            for (const h of history) {
              const citationMatches = h.content.matchAll(/#?(c-\d+)/gi);
              for (const m of citationMatches) {
                previouslyCitedIds.add(m[1].toLowerCase());
              }
            }
          }

          // BM25-lite retrieval: send only the most relevant clauses to the model.
          // For small documents (≤15 clauses) or broad queries, all clauses are sent.
          // For large documents with targeted questions, this reduces input tokens
          // by 50–85% (see EFFICIENCY.md §6, Rank 4).
          const retrievedClauses = retrieveRelevantClauses(
            question,
            clauses,
            previouslyCitedIds
          );


          if (isGroqConfigured()) {
            // Live Ultra-Fast Inference via Groq (Llama 3.3 70B)
            const groq = getGroqClient();
            const prompt = buildAskPrompt({
              question,
              clauses: retrievedClauses,
              triage: triage ?? null,
              history,
            });

            const messagesPayload: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
              { role: 'system', content: prompt.system },
            ];
            if (history && history.length > 0) {
              for (const h of history.slice(-4)) {
                messagesPayload.push({ role: h.role, content: h.content });
              }
            }
            messagesPayload.push({ role: 'user', content: prompt.user });

            const chatStream = await groq.chat.completions.create({
              model: GROQ_MODEL_POWER,
              temperature: 0.1,
              max_tokens: 1200,
              messages: messagesPayload,
              stream: true,
            });

            let streamBuffer = '';
            for await (const chunk of chatStream) {
              if (request.signal.aborted) break;
              const text = chunk.choices[0]?.delta?.content || '';
              if (text) {
                sendEvent('token', { text });
                streamBuffer += text;

                // Match both ASCII [c-1], [#c-1], and unicode bracket variants 【c-1】 across token boundaries
                const matches = streamBuffer.matchAll(/[\[【#\s]?(c-\d+)[\]】\s\.]/gi);
                for (const m of matches) {
                  const cId = m[1].toLowerCase();
                  if (!emittedClauseIds.has(cId)) {
                    const matchedClause = clauses.find((c) => c.id.toLowerCase() === cId);
                    if (matchedClause) {
                      emittedClauseIds.add(cId);
                      const citation: Citation = {
                        clauseId: matchedClause.id,
                        start: matchedClause.start,
                        end: matchedClause.end,
                      };
                      sendEvent('citation', citation);
                    }
                  }
                }
              }
            }
          } else if (isAnthropicConfigured()) {
            const client = getAnthropicClient();
            const prompt = buildAskPrompt({
              question,
              clauses: retrievedClauses,
              triage: triage ?? null,
              history,
            });

            const responseStream = client.messages.stream(
              {
                model: MODEL_SONNET,
                max_tokens: 1200,
                temperature: 0.1,
                system: prompt.system,
                messages: [{ role: 'user', content: prompt.user }],
              },
              { signal: request.signal }
            );

            for await (const chunk of responseStream) {
              if (request.signal.aborted) break;

              if (
                chunk.type === 'content_block_delta' &&
                chunk.delta.type === 'text_delta'
              ) {
                const text = chunk.delta.text;
                sendEvent('token', { text });

                // Detect clause citations in the stream: e.g. [Clause #c-5] or #c-5
                const matches = text.matchAll(/#?(c-\d+)/gi);
                for (const m of matches) {
                  const cId = m[1].toLowerCase();
                  if (!emittedClauseIds.has(cId)) {
                    const matchedClause = clauses.find((c) => c.id.toLowerCase() === cId);
                    if (matchedClause) {
                      emittedClauseIds.add(cId);
                      const citation: Citation = {
                        clauseId: matchedClause.id,
                        start: matchedClause.start,
                        end: matchedClause.end,
                      };
                      sendEvent('citation', citation);
                    }
                  }
                }
              }
            }
          } else {
            // 6. Deterministic Offline Fallback Grounded Answer (when neither key is configured)
            // Re-uses the shared BM25-lite retrieval module for clause ranking (DRY).

            // Check if user is asking for general document overview/summary
            const isDocumentOverviewQuery = isBroadQuery(question);

            // Score and rank clauses using the shared retrieval module
            const scored = scoreClausesForQuery(question, clauses);
            const relevantClauses = scored.map((sc) => sc.clause);

            let reply = '';
            if (intentRes.intent === 'advice_seeking') {
              reply += `*Note: PlainClause provides document comprehension, not legal advice on strategic decisions.*\n\n`;
            }

            if (isDocumentOverviewQuery) {
              const docTypeTitle = triage?.documentType
                ? triage.documentType.replace('_', ' ').toUpperCase()
                : 'LEGAL AGREEMENT';
              const jurisdictionInfo = triage?.jurisdiction ? ` applicable in **${triage.jurisdiction}**` : '';
              const partySummary = triage?.parties && triage.parties.length > 0
                ? `between ${triage.parties.map((p) => `**${p.name || p.role}** (${p.role})`).join(' and ')}`
                : '';

              reply += `This document is a **${docTypeTitle}**${jurisdictionInfo} ${partySummary}.\n\nIt sets forth binding obligations across **${clauses.length} structured clauses**, including terms governing scope, duties, compensation/payments, liabilities, and termination.\n\nKey areas covered in the clauses:\n`;

              // List the first 4 prominent clauses with headings or text
              for (const c of clauses.slice(0, 4)) {
                const title = c.heading || `Clause [${c.id}]`;
                const snippet = c.text.length > 140 ? c.text.slice(0, 140).trim() + '...' : c.text;
                reply += `• **${title}** ([#${c.id}]): ${snippet}\n`;
                const citation: Citation = { clauseId: c.id, start: c.start, end: c.end };
                sendEvent('citation', citation);
              }
            } else if (relevantClauses.length > 0) {
              reply += `Based on the document terms:\n\n`;
              for (const c of relevantClauses.slice(0, 3)) {
                const headingStr = c.heading ? `**${c.heading}**` : `**Clause [${c.id}]**`;
                const snippet = c.text.length > 220 ? c.text.slice(0, 220).trim() + '...' : c.text;
                reply += `• ${headingStr} ([#${c.id}]): "${snippet}"\n\n`;

                const citation: Citation = {
                  clauseId: c.id,
                  start: c.start,
                  end: c.end,
                };
                sendEvent('citation', citation);
              }
            } else {
              reply += `The agreement does not explicitly address this specific question in the provided clauses. You may wish to request written clarification from the other party.`;
            }

            sendEvent('token', { text: reply });
          }

          sendEvent('done', { groundedInDocument: emittedClauseIds.size > 0 });
          controller.close();
        } catch (err) {
          if (!request.signal.aborted) {
            sendEvent('token', {
              text: `\n\nAn error occurred while answering your question: ${
                err instanceof Error ? err.message : 'Unknown error'
              }`,
            });
            sendEvent('done', { groundedInDocument: false });
            controller.close();
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: err instanceof Error ? err.message : 'Error' },
      { status: 500 }
    );
  }
}
