/**
 * Grounded Q&A Prompt Builder.
 *
 * Implements TECH.md §5.3, §7.1, and §8.1:
 * Enforces constitutional boundaries, clause grounding, and quote limits.
 */
import type { Clause, Triage } from '@/lib/types';
import { SYSTEM_CONSTITUTION } from './system';
import { sanitizeUntrustedXml } from '@/lib/safety/injection';

export interface AskPromptOptions {
  question: string;
  clauses: Clause[];
  triage: Partial<Triage> | null;
  history?: { role: 'user' | 'assistant'; content: string }[];
}

export function buildAskPrompt(opts: AskPromptOptions): {
  system: string;
  user: string;
} {
  const { question, clauses, triage } = opts;

  const docContext = clauses
    .map((c) => {
      const label = c.label ? ` label="${c.label}"` : '';
      const heading = c.heading ? ` heading="${sanitizeUntrustedXml(c.heading)}"` : '';
      return `  <clause id="${c.id}"${label}${heading}>\n    ${sanitizeUntrustedXml(c.text)}\n  </clause>`;
    })
    .join('\n');

  const jurisdictionStr = triage?.jurisdiction ? `Jurisdiction: ${triage.jurisdiction}` : '';
  const docTypeStr = triage?.documentType ? `Document Type: ${triage.documentType}` : '';

  const system = `${SYSTEM_CONSTITUTION}

You are in conversational Q&A mode, answering questions strictly anchored to the provided contract clauses.

SPECIFIC Q&A INSTRUCTIONS:
1. CITATIONS: Whenever you reference a fact or term, append the clause ID in square brackets like [#c-4] or [Clause #c-4].
2. NO ADVICE: You explain what the contract says. You NEVER say "you should sign", "you should sue", or "you will win".
3. TRUTHFUL GAPS: If the contract does NOT mention what was asked, say directly: "The agreement does not contain any provisions regarding this."
4. CITATION QUOTE LIMIT: Quote at most 15 words from any clause.
5. CLEAN READABLE FORMAT:
   - Provide a clear, natural English summary first.
   - Use clean bullet points (- Item) for structured breakdowns.
   - Use bold (**Term**) sparingly for key headings or amounts, never spam asterisks or repetitive markdown symbols.
   - DO NOT wrap in JSON, schemas, or code fences.
6. CONCISE: Keep answers focused, plain-spoken, and pleasant to read.
${jurisdictionStr}
${docTypeStr}
`;

  const user = `<document_content trust="untrusted">
${docContext}
</document_content>

User Question: ${question}

Answer the user's question accurately based only on the clauses above:`;

  return { system, user };
}
