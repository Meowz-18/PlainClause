/**
 * Clause Analysis Prompt Template.
 *
 * Implements TECH.md §7.2:
 * Packages system constitution, playbook context, and untrusted clause batch.
 */
import type { Clause } from '@/lib/types';
import type { Playbook } from '@/lib/playbooks/schema';
import { SYSTEM_CONSTITUTION } from './system';

export function buildAnalyzePrompt(
  clauses: Clause[],
  playbook: Playbook
): {
  system: string;
  user: string;
} {
  // Format Playbook context
  const categoriesList = playbook.categories
    .map((c) => `- ${c.id}: ${c.label} (${c.description})`)
    .join('\n');

  const redFlagsList = playbook.redFlags
    .map(
      (rf) =>
        `- ID: "${rf.id}" | Title: "${rf.title}" | Severity: ${rf.severity}\n  Signals: ${rf.signals.join(
          ', '
        )}\n  Why it matters: ${rf.whyItMatters}\n  Ask: ${rf.suggestedAsk}`
    )
    .join('\n');

  const playbookContext = `PLAYBOOK CONTEXT:
Document Type: ${playbook.displayName} (Jurisdiction: ${playbook.jurisdiction})

CATEGORIES TO CLASSIFY INTO:
${categoriesList}

NOTABLE RED-FLAG PATTERNS TO WATCH FOR:
${redFlagsList}`;

  const system = `${SYSTEM_CONSTITUTION}\n\n${playbookContext}`;

  // Format clauses into <document_content trust="untrusted">
  const formattedClauses = clauses
    .map(
      (c) =>
        `<clause id="${c.id}"${c.label ? ` label="${c.label}"` : ''}${
          c.heading ? ` heading="${c.heading}"` : ''
        }>\n${c.text}\n</clause>`
    )
    .join('\n\n');

  const user = `<document_content trust="untrusted">
${formattedClauses}
</document_content>

Analyse each clause above. For each clause that warrants a finding or presents notable risk, obligations, or deviation from standard fair terms, return a finding with:
- clauseId: Must be the exact id attribute of the clause analysed.
- categoryId: Must be one of the playbook category IDs listed above.
- title: Concise finding title, at most 8 words.
- plainSummary: Clear summary of what this clause says in plain second-person language, at most 2 sentences.
- severity: "high" | "medium" | "low".
- favours: "you" | "them" | "neutral" | "unclear".
- whyItMatters: Practical risk, consequence, or burden on the user.
- matchedRedFlagId: The ID of the matching red flag from the list if applicable, or null.
- confidence: Number between 0 and 1.

Do not write market norms or statutory jurisdiction notes yourself — the application attaches those deterministically from the playbook.
Return a JSON object with a "findings" array matching the schema.`;

  return { system, user };
}
