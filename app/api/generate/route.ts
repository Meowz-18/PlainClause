/**
 * POST /api/generate — Document Artifact Generation Endpoint.
 *
 * Implements TECH.md §5.4:
 * - 'checklist': Pre-signing checklist
 * - 'prep_pack': Advocate briefing pack
 * - 'negotiation_email': Professional negotiation counter-proposal email
 * - 'markdown': Full Markdown analysis export
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ClauseSchema, TriageSchema, ClauseFindingSchema, MissingFindingSchema } from '@/lib/types';
import { exportAnalysisToMarkdown } from '@/lib/export/markdown';
import { generatePrepPack } from '@/lib/export/prep-pack';
import {
  getAnthropicClient,
  isAnthropicConfigured,
  getGroqClient,
  isGroqConfigured,
} from '@/lib/ai/client';
import { MODEL_SONNET, GROQ_MODEL_POWER } from '@/lib/ai/models';

const RequestSchema = z.object({
  kind: z.enum(['checklist', 'obligations', 'prep_pack', 'negotiation_email', 'markdown']),
  clauses: z.array(ClauseSchema).min(1),
  findings: z.array(ClauseFindingSchema),
  missingFindings: z.array(MissingFindingSchema).optional().default([]),
  triage: TriageSchema.nullable().optional(),
  filename: z.string().optional().default('document.txt'),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const rawBody = await request.json();
    const parsed = RequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Invalid generate request body' },
        { status: 400 }
      );
    }

    const { kind, clauses, findings, missingFindings, triage, filename } = parsed.data;

    // 1. Markdown full export
    if (kind === 'markdown') {
      const doc = {
        filename,
        mimeType: 'text/plain',
        normalizedText: clauses.map((c) => c.text).join('\n\n'),
        clauses,
        pageCount: null,
        charCount: clauses.reduce((acc, c) => acc + c.text.length, 0),
        hasTextLayer: true,
        redactions: [],
      };

      const md = exportAnalysisToMarkdown({
        doc,
        triage: triage || null,
        findings,
        missingFindings,
        riskScore: null,
      });

      return NextResponse.json({ markdown: md });
    }

    // 2. Advocate Prep Pack
    if (kind === 'prep_pack') {
      const doc = {
        filename,
        mimeType: 'text/plain',
        normalizedText: clauses.map((c) => c.text).join('\n\n'),
        clauses,
        pageCount: null,
        charCount: clauses.reduce((acc, c) => acc + c.text.length, 0),
        hasTextLayer: true,
        redactions: [],
      };

      const pack = generatePrepPack({
        doc,
        triage: triage || null,
        findings,
        missingFindings,
      });

      return NextResponse.json({ markdown: pack });
    }

    // 3. Pre-signing Checklist
    if (kind === 'checklist') {
      let checklist = `# Pre-Signing Checklist for ${filename}\n\n`;
      checklist += `Complete these verification steps before signing:\n\n`;

      const highFindings = findings.filter((f) => f.severity === 'high');
      if (highFindings.length > 0) {
        checklist += `### Critical Terms to Clarify\n`;
        for (const f of highFindings) {
          checklist += `- [ ] **Clause #${f.clauseId} (${f.title})**: ${f.suggestedAsk || f.whyItMatters}\n`;
        }
        checklist += `\n`;
      }

      if (missingFindings.length > 0) {
        checklist += `### Missing Clauses to Request\n`;
        for (const m of missingFindings) {
          checklist += `- [ ] **${m.title}**: ${m.suggestedAsk}\n`;
        }
        checklist += `\n`;
      }

      checklist += `### Practical Formalities\n`;
      checklist += `- [ ] Verify government ID credentials for all signatories\n`;
      checklist += `- [ ] Ensure all monetary figures and bank accounts match written amounts\n`;
      checklist += `- [ ] Retain an original signed copy with stamp paper / e-registration receipt\n`;

      return NextResponse.json({ markdown: checklist });
    }

    // 4. Negotiation Email
    if (kind === 'negotiation_email') {
      if (isGroqConfigured()) {
        try {
          const groq = getGroqClient();
          const completion = await groq.chat.completions.create({
            model: GROQ_MODEL_POWER,
            max_tokens: 1000,
            temperature: 0.2,
            messages: [
              {
                role: 'system',
                content:
                  'You are a professional contract negotiation assistant. Draft a polite, constructive email to the other party or landlord requesting amendments based strictly on the provided findings.',
              },
              {
                role: 'user',
                content: `Document: ${filename}\nFindings:\n${JSON.stringify(
                  findings.map((f) => ({ title: f.title, ask: f.suggestedAsk })),
                  null,
                  2
                )}\n\nDraft a polite negotiation email proposing these amendments:`,
              },
            ],
          });

          const emailText = completion.choices[0]?.message?.content;
          if (emailText) {
            return NextResponse.json({ markdown: emailText });
          }
        } catch {
          // Fall through to Anthropic or deterministic template
        }
      }

      if (isAnthropicConfigured()) {
        try {
          const client = getAnthropicClient();
          const response = await client.messages.create({
            model: MODEL_SONNET,
            max_tokens: 1000,
            temperature: 0.2,
            system: 'You are a professional contract negotiation assistant. Draft a polite, constructive email to the other party or landlord requesting amendments based strictly on the provided findings.',
            messages: [
              {
                role: 'user',
                content: `Document: ${filename}\nFindings:\n${JSON.stringify(
                  findings.map((f) => ({ title: f.title, ask: f.suggestedAsk })),
                  null,
                  2
                )}\n\nDraft a polite negotiation email proposing these amendments:`,
              },
            ],
          });

          const firstBlock = response.content[0];
          if (firstBlock && firstBlock.type === 'text') {
            return NextResponse.json({ markdown: firstBlock.text });
          }
        } catch {
          // Fall through to deterministic template
        }
      }

      // Deterministic Negotiation Email Template
      let email = `Subject: Proposed amendments to ${filename}\n\n`;
      email += `Dear [Counterparty / Landlord / HR Team],\n\n`;
      email += `Thank you for sharing the draft agreement for ${filename}. I have reviewed the terms and would like to propose a few minor adjustments to ensure mutual clarity before signing:\n\n`;

      let item = 1;
      for (const f of findings.filter((f) => f.severity === 'high')) {
        if (f.suggestedAsk) {
          email += `${item++}. **Regarding Clause #${f.clauseId} (${f.title})**:\n   ${f.suggestedAsk}\n\n`;
        }
      }

      for (const m of missingFindings) {
        email += `${item++}. **Regarding ${m.title}**:\n   Could we include the following standard protection: "${m.suggestedAsk}"\n\n`;
      }

      email += `Please let me know if these adjustments work for you. I look forward to finalizing the document.\n\nWarm regards,\n[Your Name]`;

      return NextResponse.json({ markdown: email });
    }

    return NextResponse.json({ error: 'UNSUPPORTED_KIND' }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: err instanceof Error ? err.message : 'Error' },
      { status: 500 }
    );
  }
}
