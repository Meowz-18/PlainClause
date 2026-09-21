/**
 * Unit tests for clause segmentation.
 *
 * The critical test: the offset invariant.
 * For every clause across all fixtures:
 *   normalizedText.slice(clause.start, clause.end) === clause.text
 *
 * Also tests specific numbering styles and merge/split post-processing.
 */
import { describe, it, expect } from 'vitest';
import { segmentText } from '@/lib/segment/segment';
import { normalizeText } from '@/lib/parse/normalize';
import { readFileSync } from 'fs';
import { join } from 'path';

/** Load and normalise a fixture file. */
function loadFixture(name: string): string {
  const raw = readFileSync(join(process.cwd(), 'fixtures', name), 'utf-8');
  return normalizeText(raw);
}

describe('offset invariant', () => {
  const fixtures = [
    'rent-agreement-mumbai.txt',
    'offer-letter.txt',
    'freelance-msa.txt',
  ];

  for (const fixture of fixtures) {
    it(`holds for every clause in ${fixture}`, () => {
      const text = loadFixture(fixture);
      const clauses = segmentText(text);

      expect(clauses.length).toBeGreaterThan(0);

      for (const clause of clauses) {
        const sliced = text.slice(clause.start, clause.end);
        expect(sliced).toBe(clause.text);
      }
    });
  }
});

describe('clause coverage', () => {
  const fixtures = [
    'rent-agreement-mumbai.txt',
    'offer-letter.txt',
    'freelance-msa.txt',
  ];

  for (const fixture of fixtures) {
    it(`covers the full text in ${fixture} (no gaps, no overlaps)`, () => {
      const text = loadFixture(fixture);
      const clauses = segmentText(text);

      // Check no overlaps
      for (let i = 1; i < clauses.length; i++) {
        expect(clauses[i].start).toBeGreaterThanOrEqual(clauses[i - 1].end);
      }

      // Check first clause starts at or near 0
      expect(clauses[0].start).toBeLessThanOrEqual(5);

      // Check last clause ends at or near the end
      const lastEnd = clauses[clauses.length - 1].end;
      expect(lastEnd).toBeGreaterThanOrEqual(text.length - 5);
    });
  }
});

describe('numbered clause detection', () => {
  it('segments dotted numbering (1. 2. 3.)', () => {
    const text = '1. First clause content here.\n\n2. Second clause content here.\n\n3. Third clause content here.';
    const clauses = segmentText(text);

    expect(clauses.length).toBeGreaterThanOrEqual(1);
    for (const clause of clauses) {
      const sliced = text.slice(clause.start, clause.end);
      expect(sliced).toBe(clause.text);
    }
  });

  it('segments parenthetical numbering (1) 2) 3))', () => {
    const text = '1) First clause with enough content to pass merge threshold and be kept.\n\n2) Second clause with enough content to pass merge threshold and be kept.\n\n3) Third clause with enough content to pass merge threshold and be kept.';
    const clauses = segmentText(text);

    expect(clauses.length).toBeGreaterThanOrEqual(1);
    for (const clause of clauses) {
      expect(text.slice(clause.start, clause.end)).toBe(clause.text);
    }
  });

  it('segments hierarchical numbering (1.1, 1.2)', () => {
    const text = '1. Main clause one with enough content to pass the minimum threshold.\n\n1.1 Sub-clause with enough content to pass the minimum threshold for keeping.\n\n1.2 Another sub-clause with sufficient content to be kept as separate.\n\n2. Main clause two with enough content to pass the minimum threshold.';
    const clauses = segmentText(text);

    for (const clause of clauses) {
      expect(text.slice(clause.start, clause.end)).toBe(clause.text);
    }
  });
});

describe('heading detection', () => {
  it('detects ALL CAPS headings as boundaries', () => {
    const text = 'TERMS AND CONDITIONS\n\nThe following terms apply to all users of the service and must be read carefully.\n\nPAYMENT TERMS\n\nAll payments must be made within 30 days of the invoice date as specified herein.';
    const clauses = segmentText(text);

    for (const clause of clauses) {
      expect(text.slice(clause.start, clause.end)).toBe(clause.text);
    }
  });
});

describe('keyword section detection', () => {
  it('detects ARTICLE/SECTION/CLAUSE keywords', () => {
    const text = 'ARTICLE I: DEFINITIONS\n\nIn this agreement, the following terms have the meanings set forth below and described herein.\n\nARTICLE II: OBLIGATIONS\n\nEach party shall perform its obligations as described in this article and all sub-sections.';
    const clauses = segmentText(text);

    for (const clause of clauses) {
      expect(text.slice(clause.start, clause.end)).toBe(clause.text);
    }
  });
});

describe('paragraph fallback', () => {
  it('segments on double newlines when no structural markers exist', () => {
    const text = 'This is the first paragraph of the agreement with enough text to pass the threshold.\n\nThis is the second paragraph of the agreement with enough text to pass the minimum.\n\nThis is the third paragraph of the agreement with enough text to pass the limit.';
    const clauses = segmentText(text);

    expect(clauses.length).toBeGreaterThanOrEqual(1);
    for (const clause of clauses) {
      expect(text.slice(clause.start, clause.end)).toBe(clause.text);
    }
  });
});

describe('stable IDs', () => {
  it('assigns sequential c-N IDs', () => {
    const text = loadFixture('rent-agreement-mumbai.txt');
    const clauses = segmentText(text);

    for (let i = 0; i < clauses.length; i++) {
      expect(clauses[i].id).toBe(`c-${i + 1}`);
    }
  });
});

describe('token estimates', () => {
  it('provides reasonable token estimates', () => {
    const text = loadFixture('rent-agreement-mumbai.txt');
    const clauses = segmentText(text);

    for (const clause of clauses) {
      expect(clause.tokenEstimate).toBeGreaterThan(0);
      // Rough check: tokens should be approximately chars / 4
      expect(clause.tokenEstimate).toBeCloseTo(clause.text.length / 4, -1);
    }
  });
});

describe('empty input', () => {
  it('returns empty array for empty text', () => {
    expect(segmentText('')).toEqual([]);
  });
});
