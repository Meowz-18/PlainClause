/**
 * Missing Clauses Unit Tests.
 *
 * Implements TECH.md §9.1:
 * - Missing-clause detection against documents with omitted standard protections
 */
import { describe, it, expect } from 'vitest';
import { detectMissing } from '@/lib/ai/missing';
import { rentalIN } from '@/lib/playbooks/rental-in';
import type { ParsedDocument, ClauseFinding } from '@/lib/types';

describe('Missing Clause Detection (TECH.md §4.1 & §9.1)', () => {
  it('flags missing protections when expected keywords are completely absent from document', () => {
    // Document mentioning only rent payment, omitting deposit return, inspection notice, etc.
    const minimalDoc: ParsedDocument = {
      filename: 'minimal-lease.txt',
      mimeType: 'text/plain',
      normalizedText: '1. The Licensee shall pay a monthly license fee of Rs. 20,000.',
      clauses: [
        {
          id: 'c-1',
          label: '1',
          heading: null,
          text: 'The Licensee shall pay a monthly license fee of Rs. 20,000.',
          start: 0,
          end: 60,
          page: 1,
          tokenEstimate: 14,
        },
      ],
      pageCount: 1,
      charCount: 60,
      hasTextLayer: true,
      redactions: [],
    };

    const missing = detectMissing(minimalDoc, rentalIN, []);
    expect(missing.length).toBeGreaterThan(0);

    const requirementIds = missing.map((m) => m.requirementId);
    expect(requirementIds).toContain('req-deposit-return');
    expect(requirementIds).toContain('req-inspection-notice');
  });

  it('flags a requirement as missing when present findings reveal a critical deficiency', () => {
    const docWithVagueDeposit: ParsedDocument = {
      filename: 'lease.txt',
      mimeType: 'text/plain',
      normalizedText: '1. Deposit of Rs. 1,00,000 shall be paid by Licensee.',
      clauses: [
        {
          id: 'c-1',
          label: '1',
          heading: null,
          text: 'Deposit of Rs. 1,00,000 shall be paid by Licensee.',
          start: 0,
          end: 50,
          page: 1,
          tokenEstimate: 12,
        },
      ],
      pageCount: 1,
      charCount: 50,
      hasTextLayer: true,
      redactions: [],
    };

    const findingFlaggingOmission: ClauseFinding = {
      kind: 'present',
      id: 'f-1',
      clauseId: 'c-1',
      category: 'deposit',
      title: 'No deadline to return your deposit',
      plainSummary: 'Deposit required without any return deadline.',
      severity: 'high',
      favours: 'them',
      whyItMatters: 'Risk of indefinite delay',
      marketNorm: null,
      suggestedAsk: 'Ask for return deadline',
      jurisdictionNote: null,
      confidence: 0.95,
    };

    const missing = detectMissing(docWithVagueDeposit, rentalIN, [findingFlaggingOmission]);
    const reqIds = missing.map((m) => m.requirementId);
    expect(reqIds).toContain('req-deposit-return');
  });
});
