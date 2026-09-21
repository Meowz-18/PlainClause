/**
 * Export Generators Test Suite.
 *
 * Validates TECH.md §2 and DESIGN.md §3.4:
 * - Markdown report includes disclaimer, findings, missing protections
 * - ICS export produces RFC 5545 compliant calendar events
 * - Prep pack includes numbered questions for legal counsel
 */
import { describe, it, expect } from 'vitest';
import { exportAnalysisToMarkdown } from '@/lib/export/markdown';
import { generateIcs, type CalendarEvent } from '@/lib/export/ics';
import { generatePrepPack } from '@/lib/export/prep-pack';
import type { ParsedDocument, ClauseFinding, MissingFinding, Triage } from '@/lib/types';

const mockDoc: ParsedDocument = {
  filename: 'test-agreement.txt',
  mimeType: 'text/plain',
  normalizedText: 'This is a test document.',
  clauses: [
    { id: 'c-1', label: '1', heading: null, text: 'First clause text.', start: 0, end: 19, page: null, tokenEstimate: 5 },
    { id: 'c-2', label: '2', heading: null, text: 'Second clause text.', start: 20, end: 39, page: null, tokenEstimate: 5 },
  ],
  pageCount: null,
  charCount: 40,
  hasTextLayer: true,
  redactions: [],
};

const mockTriage: Triage = {
  documentType: 'rental_residential',
  jurisdiction: 'IN-MH',
  language: 'en',
  confidence: 0.95,
  parties: [
    { role: 'Licensor', name: 'Mr. Sharma' },
    { role: 'Licensee', name: 'Ms. Mehta' },
  ],
};

const mockFindings: ClauseFinding[] = [
  {
    kind: 'present',
    id: 'f-1',
    clauseId: 'c-1',
    category: 'deposit',
    title: 'No deposit refund timeline',
    plainSummary: 'The agreement does not specify when the deposit must be returned.',
    severity: 'high',
    favours: 'them',
    whyItMatters: 'Landlords may delay refund indefinitely.',
    marketNorm: 'Standard is 15-30 days after handover.',
    suggestedAsk: 'Add a 15-30 day refund deadline.',
    jurisdictionNote: 'Maharashtra Rent Control Act applies.',
    confidence: 0.92,
  },
];

const mockMissing: MissingFinding[] = [
  {
    kind: 'missing',
    id: 'miss-req-inspection-notice',
    requirementId: 'req-inspection-notice',
    title: 'Advance notice required before landlord entry',
    whyItMatters: 'Privacy and quiet enjoyment at risk.',
    severity: 'high',
    suggestedAsk: 'Request 24-48 hours written notice.',
  },
];

describe('Markdown Report Export', () => {
  it('generates a complete report with header, findings, and disclaimer', () => {
    const md = exportAnalysisToMarkdown({
      doc: mockDoc,
      triage: mockTriage,
      findings: mockFindings,
      missingFindings: mockMissing,
      riskScore: 0.72,
    });

    expect(md).toContain('# PlainClause Analysis Report');
    expect(md).toContain('test-agreement.txt');
    expect(md).toContain('RENTAL RESIDENTIAL');
    expect(md).toContain('IN-MH');
    expect(md).toContain('72%'); // risk score
    expect(md).toContain('No deposit refund timeline');
    expect(md).toContain('▲ HIGH');
    expect(md).toContain('Missing Protections');
    expect(md).toContain('Advance notice required');
    expect(md).toContain('Disclaimer');
    expect(md).toContain('does not provide legal advice');
  });

  it('handles empty findings gracefully', () => {
    const md = exportAnalysisToMarkdown({
      doc: mockDoc,
      triage: null,
      findings: [],
      missingFindings: [],
      riskScore: null,
    });

    expect(md).toContain('No significant contractual red flags');
    expect(md).not.toContain('Missing Protections');
  });
});

describe('ICS Calendar Export', () => {
  const events: CalendarEvent[] = [
    {
      title: 'Lock-in Period Ends',
      description: 'You may now give notice to vacate.',
      startDate: '20261001',
    },
    {
      title: 'Rent Due',
      description: 'Monthly license fee of Rs. 35,000 due.',
      startDate: '20260505',
      recurrenceRule: 'RRULE:FREQ=MONTHLY;BYMONTHDAY=5',
    },
  ];

  it('generates valid ICS with BEGIN/END markers', () => {
    const ics = generateIcs(events, 'Rental Agreement Deadlines');
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('PRODID:-//PlainClause');
  });

  it('includes all calendar events with correct summaries', () => {
    const ics = generateIcs(events);
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('SUMMARY:Lock-in Period Ends');
    expect(ics).toContain('SUMMARY:Rent Due');
    expect(ics).toContain('RRULE:FREQ=MONTHLY;BYMONTHDAY=5');
    // Count VEVENT blocks
    const veventCount = (ics.match(/BEGIN:VEVENT/g) || []).length;
    expect(veventCount).toBe(2);
  });
});

describe('Legal Consultation Prep Pack', () => {
  it('generates a structured briefing with numbered questions', () => {
    const pack = generatePrepPack({
      doc: mockDoc,
      triage: mockTriage,
      findings: mockFindings,
      missingFindings: mockMissing,
    });

    expect(pack).toContain('Legal Consultation Briefing Pack');
    expect(pack).toContain('1 high-severity');
    expect(pack).toContain('1 missing statutory protections');
    expect(pack).toContain('Questions for Your Advocate');
    expect(pack).toContain('Clause #c-1');
    expect(pack).toContain('Missing Protection');
    expect(pack).toContain('Strictly for preparation purposes');
  });

  it('includes verbatim clause extracts for high/medium findings', () => {
    const pack = generatePrepPack({
      doc: mockDoc,
      triage: mockTriage,
      findings: mockFindings,
      missingFindings: [],
    });

    expect(pack).toContain('First clause text.');
    expect(pack).toContain('Statutory Reference');
  });
});
