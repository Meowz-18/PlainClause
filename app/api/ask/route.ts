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

export const runtime = 'nodejs';
export const maxDuration = 60;

const RequestBodySchema = z.object({
  question: z.string().min(1).max(2000),
  clauses: z.array(ClauseSchema).min(1),
  triage: TriageSchema.nullable().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
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

          // 2. Intent Routing
          const intentRes = await classifyIntent(question, request.signal);
          sendEvent('intent', {
            intent: intentRes.intent,
            confidence: intentRes.confidence,
          });

          // 3. Urgent situation: Emergency & Legal Aid resources first
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

          // 4. Off-topic query
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

          if (isGroqConfigured()) {
            // Live Ultra-Fast Inference via Groq (Llama 3.3 70B)
            const groq = getGroqClient();
            const prompt = buildAskPrompt({
              question,
              clauses,
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
              clauses,
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
            const qLower = question.toLowerCase();

            // Check if user is asking for general document overview/summary
            const isDocumentOverviewQuery =
              qLower.includes('what is this document') ||
              qLower.includes('what is the document') ||
              qLower.includes('about this document') ||
              qLower.includes('summarize') ||
              qLower.includes('summary') ||
              qLower.includes('overview') ||
              qLower.includes('what kind of contract') ||
              qLower.includes('what type of agreement');

            // Tokenize user query words (filtering common stop words)
            const stopWords = new Set([
              'the', 'is', 'at', 'which', 'on', 'a', 'an', 'in', 'and', 'or', 'of', 'for', 'to',
              'this', 'that', 'it', 'what', 'does', 'say', 'about', 'how', 'can', 'i', 'my', 'are',
              'there', 'any', 'tell', 'me', 'with', 'from', 'by', 'as', 'per', 'please', 'explain'
            ]);
            const queryWords = qLower
              .replace(/[^a-z0-9\s]/g, ' ')
              .split(/\s+/)
              .filter((w) => w.length > 2 && !stopWords.has(w));

            // Score each clause based on keyword and synonym match
            const scoredClauses = clauses.map((c) => {
              const cLower = (c.heading ? `${c.heading} ` : '') + c.text.toLowerCase();
              let score = 0;

              // Direct query word hits
              for (const word of queryWords) {
                if (cLower.includes(word)) {
                  score += 2;
                }
              }

              // Specific legal/contractual topic keywords
              if ((qLower.includes('early') || qLower.includes('leave') || qLower.includes('terminate')) &&
                  (cLower.includes('terminat') || cLower.includes('lock-in') || cLower.includes('notice') || cLower.includes('severance'))) {
                score += 5;
              }
              if ((qLower.includes('deposit') || qLower.includes('refund')) &&
                  (cLower.includes('deposit') || cLower.includes('refund') || cLower.includes('deduction'))) {
                score += 5;
              }
              if ((qLower.includes('enter') || qLower.includes('inspect') || qLower.includes('visit')) &&
                  (cLower.includes('enter') || cLower.includes('inspect') || cLower.includes('access'))) {
                score += 5;
              }
              if ((qLower.includes('repair') || qLower.includes('maintenance')) &&
                  (cLower.includes('maintain') || cLower.includes('repair') || cLower.includes('wear and tear'))) {
                score += 5;
              }
              if ((qLower.includes('compete') || qLower.includes('solicit') || qLower.includes('restrict')) &&
                  (cLower.includes('compete') || cLower.includes('solicit') || cLower.includes('restrictive'))) {
                score += 5;
              }
              if ((qLower.includes('pay') || qLower.includes('rent') || qLower.includes('salary') || qLower.includes('bonus') || qLower.includes('insurance') || qLower.includes('benefit') || qLower.includes('compensation') || qLower.includes('fee')) &&
                  (cLower.includes('salary') || cLower.includes('bonus') || cLower.includes('insurance') || cLower.includes('benefit') || cLower.includes('rent') || cLower.includes('compensation') || cLower.includes('fee') || cLower.includes('per annum'))) {
                score += 5;
              }
              if ((qLower.includes('probation') || qLower.includes('confirm')) &&
                  (cLower.includes('probation') || cLower.includes('confirm') || cLower.includes('evaluation'))) {
                score += 5;
              }
              if ((qLower.includes('court') || qLower.includes('jurisdiction') || qLower.includes('dispute') || qLower.includes('arbitrat')) &&
                  (cLower.includes('jurisdiction') || cLower.includes('court') || cLower.includes('dispute') || cLower.includes('arbitration') || cLower.includes('governing law'))) {
                score += 5;
              }

              return { clause: c, score };
            });

            // Filter relevant clauses with positive score
            const relevantClauses = scoredClauses
              .filter((sc) => sc.score > 0)
              .sort((a, b) => b.score - a.score)
              .map((sc) => sc.clause);

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
