/**
 * Triage Prompt Template.
 *
 * Implements TECH.md §5 & §6:
 * Classifies contract document type, jurisdiction, language, and parties from a sample.
 */

export function buildTriagePrompt(sampleText: string, headings: string[]): {
  system: string;
  user: string;
} {
  const headingsList = headings.length > 0 ? headings.slice(0, 30).join('\n') : '(None detected)';

  const user = `<document_content trust="untrusted">
${sampleText}
</document_content>

Clause Headings Found in Document:
${headingsList}

Classify this document into one of the following types:
- rental_residential: Residential tenancy, lease, leave and license agreements.
- employment: Employment contracts, offer letters, consultancy employment, appointment letters.
- freelance_services: Contractor agreements, master services agreements, statement of work.
- nda: Non-disclosure, confidentiality agreements.
- loan: Loan, credit, promissory notes.
- terms_of_service: Website or software user terms.
- other: Any agreement not matching the above.

Determine the primary jurisdiction (e.g. "IN-MH" for Maharashtra India, "IN" for India, "US-CA", or "unknown").
Identify the primary parties and their roles (e.g., Licensor / Licensee, Employer / Employee).
Return only JSON matching the triage schema.`;

  return {
    system: `You are the document triage classifier in PlainClause. You determine the contract classification quickly and accurately based on introductory text and headings.`,
    user,
  };
}
