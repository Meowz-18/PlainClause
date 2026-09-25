/**
 * POST /api/triage — Fast Document Classification Endpoint.
 *
 * Implements TECH.md §5 & §6:
 * Uses Claude Haiku (or deterministic heuristic fallback) on introductory text
 * and headings to classify document type, jurisdiction, language, and parties.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { MODEL_HAIKU, GROQ_MODEL_FAST } from '@/lib/ai/models';
import { buildTriagePrompt } from '@/lib/ai/prompts/triage';
import {
  getAnthropicClient,
  isAnthropicConfigured,
  getGroqClient,
  isGroqConfigured,
} from '@/lib/ai/client';
import { TriageOutputSchema } from '@/lib/ai/schemas';
import type { Triage } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 15;

const RequestBodySchema = z.object({
  sample: z.string().min(1),
  headings: z.array(z.string()).optional().default([]),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const rawBody = await request.json();
    const parsedBody = RequestBodySchema.safeParse(rawBody);

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'Missing or invalid "sample" text' },
        { status: 400 }
      );
    }

    const { sample, headings } = parsedBody.data;

    // 1. Live Model Call via Groq or Haiku if configured
    if (isGroqConfigured()) {
      try {
        const groq = getGroqClient();
        const prompt = buildTriagePrompt(sample, headings);

        const completion = await groq.chat.completions.create({
          model: GROQ_MODEL_FAST,
          temperature: 0,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: prompt.system + '\nYou must return valid JSON matching: {"documentType": "rental_residential"|"employment"|"freelance_services"|"nda"|"loan"|"terms_of_service"|"other", "confidence": number, "jurisdiction": string, "language": string, "parties": [{"role": string, "name": string|null}], "reasoning": string}' },
            { role: 'user', content: prompt.user },
          ],
        });

        const text = completion.choices[0]?.message?.content || '{}';
        const parsed = JSON.parse(text);
        const triageParsed = TriageOutputSchema.safeParse(parsed);
        if (triageParsed.success) {
          return NextResponse.json(triageParsed.data);
        }
      } catch {
        // Fall through to Anthropic or deterministic fallback
      }
    }

    if (isAnthropicConfigured()) {
      const client = getAnthropicClient();
      const prompt = buildTriagePrompt(sample, headings);

      const response = await client.messages.create(
        {
          model: MODEL_HAIKU,
          max_tokens: 1000,
          system: prompt.system,
          messages: [{ role: 'user', content: prompt.user }],
          tools: [
            {
              name: 'record_triage',
              description: 'Record contract triage classification',
              input_schema: {
                type: 'object',
                properties: {
                  documentType: {
                    type: 'string',
                    enum: [
                      'rental_residential',
                      'employment',
                      'freelance_services',
                      'nda',
                      'loan',
                      'terms_of_service',
                      'other',
                    ],
                  },
                  confidence: { type: 'number' },
                  jurisdiction: { type: 'string' },
                  language: { type: 'string' },
                  parties: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        role: { type: 'string' },
                        name: { type: ['string', 'null'] },
                      },
                      required: ['role', 'name'],
                    },
                  },
                  reasoning: { type: 'string' },
                },
                required: ['documentType', 'confidence', 'jurisdiction', 'language', 'parties', 'reasoning'],
              },
            },
          ],
          tool_choice: { type: 'tool', name: 'record_triage' },
        },
        { signal: request.signal }
      );

      const toolUse = response.content.find((b) => b.type === 'tool_use');
      if (toolUse && 'input' in toolUse) {
        const triageParsed = TriageOutputSchema.safeParse(toolUse.input);
        if (triageParsed.success) {
          return NextResponse.json(triageParsed.data);
        }
      }
    }

    // 2. Deterministic Heuristic Fallback (Offline / Demo)
    const lower = sample.toLowerCase();
    let triage: Triage;

    if (
      lower.includes('offer letter') ||
      lower.includes('employment') ||
      lower.includes('cost to company') ||
      lower.includes('probation period') ||
      (lower.includes('ctc') && lower.includes('salary'))
    ) {
      triage = {
        documentType: 'employment',
        confidence: 0.95,
        jurisdiction: 'IN',
        language: 'en',
        parties: [
          { role: 'Employer', name: 'Employer' },
          { role: 'Employee', name: 'Employee' },
        ],
        reasoning: 'Employment offer agreement detailing remuneration, notice period, and restrictive covenants.',
      };
    } else if (
      lower.includes('leave and license') ||
      lower.includes('licensor') ||
      lower.includes('licensee') ||
      lower.includes('licensed premises') ||
      lower.includes('tenancy agreement') ||
      lower.includes('lease agreement') ||
      (lower.includes('rent') && (lower.includes('tenant') || lower.includes('landlord')))
    ) {
      const isMumbai =
        lower.includes('mumbai') ||
        lower.includes('maharashtra') ||
        lower.includes('bandra') ||
        lower.includes('pali hill');

      triage = {
        documentType: 'rental_residential',
        confidence: 0.95,
        jurisdiction: isMumbai ? 'IN-MH' : 'IN',
        language: 'en',
        parties: [
          { role: 'Licensor', name: 'Landlord' },
          { role: 'Licensee', name: 'Tenant' },
        ],
        reasoning: 'Residential leave and license agreement with monthly license fees and deposit terms.',
      };
    } else if (
      lower.includes('master services agreement') ||
      lower.includes('freelance') ||
      lower.includes('statement of work') ||
      lower.includes('consultant')
    ) {
      triage = {
        documentType: 'freelance_services',
        confidence: 0.9,
        jurisdiction: 'IN',
        language: 'en',
        parties: [
          { role: 'Client', name: 'Client' },
          { role: 'Service Provider', name: 'Contractor' },
        ],
        reasoning: 'Master services contract detailing deliverables, intellectual property, and payment terms.',
      };
    } else {
      triage = {
        documentType: 'other',
        confidence: 0.65,
        jurisdiction: 'unknown',
        language: 'en',
        parties: [],
        reasoning: 'Commercial legal document with standard terms and provisions.',
      };
    }

    return NextResponse.json(triage);
  } catch (err) {
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: err instanceof Error ? err.message : 'Triage failed',
      },
      { status: 500 }
    );
  }
}
