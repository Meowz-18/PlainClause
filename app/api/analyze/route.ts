/**
 * POST /api/analyze — Server-Sent Events (SSE) Clause Analysis Endpoint.
 *
 * Implements TECH.md §5.2 & §6:
 * - Batched clause analysis using Claude Sonnet with playbook grounding
 * - Streams findings, estimates, missing protections, and final risk score
 * - Client disconnect propagates through AbortSignal to cease spending
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ClauseSchema, TriageSchema, ParsedDocument } from '@/lib/types';
import { resolvePlaybook, getPlaybookById } from '@/lib/playbooks/index';
import { analyzeDocument } from '@/lib/ai/pipeline';

export const runtime = 'nodejs';
export const maxDuration = 60;

const RequestBodySchema = z.object({
  clauses: z.array(ClauseSchema).min(1),
  normalizedText: z.string().min(1),
  triage: TriageSchema.nullable().optional(),
  playbookId: z.string().optional(),
});

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const rawBody = await request.json();
    const parsed = RequestBodySchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'VALIDATION_FAILED',
          message: 'Invalid request body for analysis',
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { clauses, normalizedText, triage, playbookId } = parsed.data;

    // Resolve playbook
    const playbook =
      (playbookId ? getPlaybookById(playbookId) : undefined) ||
      resolvePlaybook(triage ?? null);

    // Build synthetic ParsedDocument for the pipeline
    const doc: ParsedDocument = {
      filename: 'document.txt',
      mimeType: 'text/plain',
      normalizedText,
      clauses,
      pageCount: null,
      charCount: normalizedText.length,
      hasTextLayer: true,
      redactions: [],
    };

    const encoder = new TextEncoder();

    // Create readable stream for Server-Sent Events
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const generator = analyzeDocument(doc, playbook, request.signal);

          for await (const event of generator) {
            if (request.signal.aborted) {
              break;
            }

            const sseChunk = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(sseChunk));
          }

          controller.close();
        } catch (err) {
          if (!request.signal.aborted) {
            const errChunk = `event: error\ndata: ${JSON.stringify({
              code: 'PIPELINE_ERROR',
              message: err instanceof Error ? err.message : 'Analysis error',
            })}\n\n`;
            controller.enqueue(encoder.encode(errChunk));
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
      {
        error: 'INTERNAL_ERROR',
        message: err instanceof Error ? err.message : 'Failed to initialize analysis',
      },
      { status: 500 }
    );
  }
}
