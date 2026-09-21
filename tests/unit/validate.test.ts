/**
 * Validation Unit Tests.
 *
 * Implements TECH.md §9.1:
 * - Phantom clause IDs dropped
 * - Low confidence (< 0.5) dropped
 * - Attaches reviewed market norms & jurisdiction notes from Playbook
 */
import { describe, it, expect } from 'vitest';
import { validateFindings } from '@/lib/ai/validate';
import { rentalIN } from '@/lib/playbooks/rental-in';
import type { ParsedDocument } from '@/lib/types';

describe('Findings Validation (TECH.md §8.3 & §9.1)', () => {
  const dummyDoc: ParsedDocument = {
    filename: 'test.txt',
    mimeType: 'text/plain',
    normalizedText: '1. Deposit Rs 50,000. 2. Landlord may enter anytime.',
    clauses: [
      {
        id: 'c-1',
        label: '1',
        heading: null,
        text: 'Deposit Rs 50,000.',
        start: 0,
        end: 18,
        page: 1,
        tokenEstimate: 5,
      },
      {
        id: 'c-2',
        label: '2',
        heading: null,
        text: 'Landlord may enter anytime.',
        start: 19,
        end: 46,
        page: 1,
        tokenEstimate: 6,
      },
    ],
    pageCount: 1,
    charCount: 46,
    hasTextLayer: true,
    redactions: [],
  };

  it('drops findings with phantom clause IDs not present in document', () => {
    const raw = [
      {
        clauseId: 'c-999', // Phantom clause ID
        categoryId: 'deposit',
        title: 'Non-existent clause issue',
        plainSummary: 'Summary of phantom clause.',
        severity: 'high',
        favours: 'them',
        whyItMatters: 'Risk',
        confidence: 0.95,
      },
      {
        clauseId: 'c-1', // Real clause ID
        categoryId: 'deposit',
        title: 'Valid deposit issue',
        plainSummary: 'Valid summary.',
        severity: 'high',
        favours: 'them',
        whyItMatters: 'Risk',
        confidence: 0.95,
      },
    ];

    const validated = validateFindings(raw, dummyDoc, rentalIN);
    expect(validated).toHaveLength(1);
    expect(validated[0].clauseId).toBe('c-1');
  });

  it('drops findings with confidence below calibration floor (< 0.5)', () => {
    const raw = [
      {
        clauseId: 'c-1',
        categoryId: 'deposit',
        title: 'Low confidence finding',
        plainSummary: 'Maybe something is wrong.',
        severity: 'low',
        favours: 'neutral',
        whyItMatters: 'Uncertain',
        confidence: 0.42, // Below 0.5 floor
      },
      {
        clauseId: 'c-2',
        categoryId: 'entry_inspection',
        title: 'High confidence finding',
        plainSummary: 'Unrestricted entry allowed.',
        severity: 'high',
        favours: 'them',
        whyItMatters: 'Loss of privacy',
        confidence: 0.88,
      },
    ];

    const validated = validateFindings(raw, dummyDoc, rentalIN);
    expect(validated).toHaveLength(1);
    expect(validated[0].clauseId).toBe('c-2');
  });

  it('attaches reviewed market norms and jurisdiction notes from the playbook', () => {
    const raw = [
      {
        clauseId: 'c-1',
        categoryId: 'deposit',
        title: 'No deadline to return deposit',
        plainSummary: 'Deposit has no return date.',
        severity: 'high',
        favours: 'them',
        whyItMatters: 'Risk of indefinite delay',
        confidence: 0.9,
      },
    ];

    const validated = validateFindings(raw, dummyDoc, rentalIN);
    expect(validated).toHaveLength(1);
    expect(validated[0].marketNorm).toContain('Comparable residential agreements in Mumbai');
    expect(validated[0].jurisdictionNote).toContain('Maharashtra Rent Control Act');
  });
});
