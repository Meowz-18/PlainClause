/**
 * Retrieval Module Tests.
 *
 * Tests BM25-lite clause scoring, synonym expansion, broad query detection,
 * and the top-k retrieval contract (cited clauses always included,
 * small documents pass through, broad queries pass through).
 */
import { describe, it, expect } from 'vitest';
import {
  tokenize,
  expandWithSynonyms,
  isBroadQuery,
  scoreClausesForQuery,
  retrieveRelevantClauses,
} from '@/lib/ai/retrieval';
import type { Clause } from '@/lib/types';

/* ── Helpers ─────────────────────────────────────────────────────────── */

function makeClause(id: string, text: string, heading?: string): Clause {
  return {
    id,
    label: null,
    heading: heading ?? null,
    text,
    start: 0,
    end: text.length,
    page: null,
    tokenEstimate: Math.ceil(text.length / 4),
  };
}

function makeClauses(count: number): Clause[] {
  return Array.from({ length: count }, (_, i) =>
    makeClause(`c-${i + 1}`, `This is clause number ${i + 1} with generic legal text about obligations and duties.`)
  );
}

/* ── tokenize() ──────────────────────────────────────────────────────── */

describe('tokenize()', () => {
  it('strips punctuation and lowercases', () => {
    const tokens = tokenize('What is the Notice Period?');
    expect(tokens).toEqual(['notice', 'period']);
  });

  it('removes stop words', () => {
    const tokens = tokenize('tell me about the deposit return policy');
    expect(tokens).toEqual(['deposit', 'return', 'policy']);
  });

  it('filters short words (≤2 chars)', () => {
    const tokens = tokenize('Is it an IP clause?');
    // 'is', 'it', 'an', 'ip' are ≤2 chars — all filtered
    expect(tokens).toEqual(['clause']);
  });

  it('returns empty for all-stop-word queries', () => {
    expect(tokenize('what is this?')).toEqual([]);
  });
});

/* ── expandWithSynonyms() ────────────────────────────────────────────── */

describe('expandWithSynonyms()', () => {
  it('expands legal synonyms', () => {
    const expanded = expandWithSynonyms(['terminate']);
    expect(expanded).toContain('terminate');
    expect(expanded).toContain('leave');
    expect(expanded).toContain('exit');
    expect(expanded).toContain('resign');
  });

  it('preserves non-synonym tokens unchanged', () => {
    const expanded = expandWithSynonyms(['umbrella']);
    expect(expanded).toEqual(['umbrella']);
  });

  it('deduplicates across synonym groups', () => {
    const expanded = expandWithSynonyms(['terminate', 'leave']);
    const unique = new Set(expanded);
    expect(expanded.length).toBe(unique.size);
  });
});

/* ── isBroadQuery() ──────────────────────────────────────────────────── */

describe('isBroadQuery()', () => {
  it('detects "summarize this document"', () => {
    expect(isBroadQuery('Can you summarize this document?')).toBe(true);
  });

  it('detects "overview"', () => {
    expect(isBroadQuery('Give me an overview')).toBe(true);
  });

  it('returns false for targeted questions', () => {
    expect(isBroadQuery('What is the notice period for termination?')).toBe(false);
  });

  it('returns false for deposit questions', () => {
    expect(isBroadQuery('When will I get my deposit back?')).toBe(false);
  });
});

/* ── scoreClausesForQuery() ──────────────────────────────────────────── */

describe('scoreClausesForQuery()', () => {
  const clauses = [
    makeClause('c-1', 'The tenant shall pay a security deposit of two months rent.', 'SECURITY DEPOSIT'),
    makeClause('c-2', 'The licensor may terminate this agreement with 30 days written notice.', 'TERMINATION'),
    makeClause('c-3', 'The licensee shall maintain the premises in good condition.', 'MAINTENANCE'),
    makeClause('c-4', 'The governing law shall be the laws of Maharashtra. Disputes resolved by arbitration.', 'JURISDICTION'),
  ];

  it('ranks deposit clause highest for deposit question', () => {
    const scored = scoreClausesForQuery('When will my deposit be refunded?', clauses);
    expect(scored.length).toBeGreaterThan(0);
    expect(scored[0].clause.id).toBe('c-1');
  });

  it('ranks termination clause highest for termination question', () => {
    const scored = scoreClausesForQuery('How can the agreement be terminated?', clauses);
    expect(scored.length).toBeGreaterThan(0);
    expect(scored[0].clause.id).toBe('c-2');
  });

  it('ranks maintenance clause highest for repair question', () => {
    const scored = scoreClausesForQuery('Who is responsible for repairs and maintenance?', clauses);
    expect(scored.length).toBeGreaterThan(0);
    expect(scored[0].clause.id).toBe('c-3');
  });

  it('returns empty array for queries with only stop words', () => {
    const scored = scoreClausesForQuery('what is this?', clauses);
    expect(scored).toEqual([]);
  });

  it('gives heading matches higher scores than body-only matches', () => {
    const clausesWithHeading = [
      makeClause('c-a', 'Some text mentioning deposit briefly.'),
      makeClause('c-b', 'Some unrelated text.', 'DEPOSIT RETURN POLICY'),
    ];
    const scored = scoreClausesForQuery('deposit', clausesWithHeading);
    // c-b has heading match → should score higher
    const idxA = scored.findIndex((s) => s.clause.id === 'c-a');
    const idxB = scored.findIndex((s) => s.clause.id === 'c-b');
    if (idxA >= 0 && idxB >= 0) {
      expect(scored[idxB].score).toBeGreaterThan(scored[idxA].score);
    }
  });
});

/* ── retrieveRelevantClauses() ───────────────────────────────────────── */

describe('retrieveRelevantClauses()', () => {
  it('returns all clauses for small documents (≤15)', () => {
    const clauses = makeClauses(10);
    const result = retrieveRelevantClauses('notice period', clauses);
    expect(result.length).toBe(10);
  });

  it('returns all clauses for broad queries regardless of doc size', () => {
    const clauses = makeClauses(50);
    const result = retrieveRelevantClauses('Please summarize this document', clauses);
    expect(result.length).toBe(50);
  });

  it('retrieves fewer clauses than total for targeted queries on large docs', () => {
    const clauses = [
      ...makeClauses(40),
      makeClause('c-deposit', 'The security deposit of Rs. 50,000 shall be refunded within 30 days.', 'DEPOSIT'),
    ];
    const result = retrieveRelevantClauses('When will my deposit be refunded?', clauses);
    // Should retrieve significantly fewer than all 41 clauses
    expect(result.length).toBeLessThan(clauses.length);
    // The deposit clause MUST be included
    expect(result.some((c) => c.id === 'c-deposit')).toBe(true);
  });

  it('always includes previously-cited clauses', () => {
    const clauses = [
      ...makeClauses(40),
      makeClause('c-cited', 'This clause was cited in a previous answer about something unrelated.'),
    ];
    const citedIds = new Set(['c-cited']);
    const result = retrieveRelevantClauses('What is the deposit amount?', clauses, citedIds);
    expect(result.some((c) => c.id === 'c-cited')).toBe(true);
  });

  it('maintains document order in returned clauses', () => {
    const clauses: Clause[] = [
      { ...makeClause('c-1', 'First clause about deposit.'), start: 0, end: 30 },
      { ...makeClause('c-2', 'Second clause about rent.'), start: 100, end: 130 },
      { ...makeClause('c-3', 'Third clause about maintenance.'), start: 200, end: 230 },
      // pad to >15 so retrieval kicks in
      ...Array.from({ length: 20 }, (_, i) => ({
        ...makeClause(`c-pad-${i}`, `Padding clause ${i} with irrelevant text about weather.`),
        start: 300 + i * 100,
        end: 350 + i * 100,
      })),
    ];
    const result = retrieveRelevantClauses('deposit rent maintenance', clauses);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].start).toBeGreaterThanOrEqual(result[i - 1].start);
    }
  });

  it('falls back to all clauses when no keywords match', () => {
    const clauses = makeClauses(30);
    // A very specific term that matches nothing
    const result = retrieveRelevantClauses('xyzzyplugh foobarbaz', clauses);
    expect(result.length).toBe(30);
  });
});
