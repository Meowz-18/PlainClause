/**
 * Clause segmentation orchestrator.
 *
 * Runs heuristics in priority order, deduplicates boundaries, assigns stable
 * IDs and exact character offsets, then post-processes: merges short clauses
 * into their neighbour and splits overly long clauses at sentence boundaries.
 *
 * The offset invariant is sacred:
 *   normalizedText.slice(clause.start, clause.end) === clause.text
 *
 * This is enforced by tests and is the backbone of the whole product.
 * Assumes: text has been normalised via normalizeText().
 */
import type { Clause } from '@/lib/types';
import { MIN_CLAUSE_CHARS, MAX_CLAUSE_TOKENS, CHARS_PER_TOKEN } from '@/lib/constants';
import {
  findNumberedClauses,
  findLetteredItems,
  findHeadings,
  findKeywordSections,
  findParagraphBreaks,
  type RawBoundary,
} from './heuristics';

/**
 * Segment normalised text into addressable clauses.
 *
 * Returns an array of Clause objects with stable IDs, labels, and character
 * offsets that satisfy the offset invariant.
 */
export function segmentText(normalizedText: string): Clause[] {
  if (normalizedText.length === 0) return [];

  // 1. Collect boundaries from all heuristics
  const boundaries = collectBoundaries(normalizedText);

  // 2. Convert boundaries to raw clauses with text slices
  const rawClauses = boundariesToClauses(normalizedText, boundaries);

  // 3. Merge clauses shorter than MIN_CLAUSE_CHARS into their neighbour
  const merged = mergeShortClauses(rawClauses, normalizedText);

  // 4. Split clauses exceeding MAX_CLAUSE_TOKENS at sentence boundaries
  const split = splitLongClauses(merged, normalizedText);

  // 5. Assign stable IDs, derive text from offsets, compute token estimates
  //    Text is ALWAYS normalizedText.slice(start, end) — the invariant holds
  //    by construction, not by luck.
  return split.map((clause, index) => ({
    id: `c-${index + 1}`,
    label: clause.label,
    heading: clause.heading,
    text: normalizedText.slice(clause.start, clause.end),
    start: clause.start,
    end: clause.end,
    page: null,
    tokenEstimate: Math.ceil((clause.end - clause.start) / CHARS_PER_TOKEN),
  }));
}

/**
 * Collect and deduplicate boundaries from all heuristics.
 *
 * Priority order: numbered > lettered > keyword > heading > paragraph.
 * If structural heuristics (1–4) produce results, paragraph fallback is skipped.
 */
function collectBoundaries(text: string): RawBoundary[] {
  const numbered = findNumberedClauses(text);
  const lettered = findLetteredItems(text);
  const keywords = findKeywordSections(text);
  const headings = findHeadings(text);

  const structural = [...numbered, ...lettered, ...keywords, ...headings];

  let all: RawBoundary[];
  if (structural.length > 0) {
    all = structural;
    // Ensure start of document is covered
    if (!all.some(b => b.start === 0)) {
      all.unshift({ start: 0, label: null, heading: null, heuristic: 'implicit' });
    }
  } else {
    all = findParagraphBreaks(text);
  }

  // Sort by position, deduplicate (same start position → keep highest-priority)
  const priority: Record<string, number> = {
    numbered: 0,
    keyword: 1,
    lettered: 2,
    heading: 3,
    implicit: 4,
    paragraph: 5,
  };

  all.sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    return (priority[a.heuristic] ?? 99) - (priority[b.heuristic] ?? 99);
  });

  // Deduplicate: if two boundaries are within 5 chars, keep the higher-priority one
  const deduped: RawBoundary[] = [];
  for (const b of all) {
    const prev = deduped[deduped.length - 1];
    if (prev && Math.abs(b.start - prev.start) < 5) {
      continue; // Skip — previous one wins due to sort order
    }
    deduped.push(b);
  }

  return deduped;
}

interface RawClause {
  label: string | null;
  heading: string | null;
  start: number;
  end: number;
}

/**
 * Convert boundaries to clause spans with exact offsets.
 *
 * Each clause spans from its boundary start to the next boundary start,
 * with trailing whitespace trimmed. Text is always derived from
 * `normalizedText.slice(start, end)` — never stored separately at this stage.
 */
function boundariesToClauses(text: string, boundaries: RawBoundary[]): RawClause[] {
  const clauses: RawClause[] = [];

  for (let i = 0; i < boundaries.length; i++) {
    const current = boundaries[i];
    const nextStart = i + 1 < boundaries.length ? boundaries[i + 1].start : text.length;

    // Trim trailing whitespace from the clause span
    let end = nextStart;
    while (end > current.start && /\s/.test(text[end - 1])) {
      end--;
    }

    const clauseText = text.slice(current.start, end);
    if (clauseText.trim().length === 0) continue;

    clauses.push({
      label: current.label,
      heading: current.heading,
      start: current.start,
      end,
    });
  }

  return clauses;
}

/**
 * Merge clauses shorter than MIN_CLAUSE_CHARS into their next neighbour.
 *
 * Merged clause text is always re-derived from the original text to
 * maintain the offset invariant.
 */
function mergeShortClauses(clauses: RawClause[], text: string): RawClause[] {
  if (clauses.length <= 1) return clauses;

  const result: RawClause[] = [];

  for (let i = 0; i < clauses.length; i++) {
    const clause = clauses[i];
    const clauseText = text.slice(clause.start, clause.end);

    if (clauseText.trim().length < MIN_CLAUSE_CHARS && result.length > 0) {
      // Merge into previous clause — extend its end to cover this clause
      const prev = result[result.length - 1];
      prev.end = clause.end;
    } else {
      result.push({ ...clause });
    }
  }

  return result;
}

/**
 * Split clauses exceeding MAX_CLAUSE_TOKENS at sentence boundaries.
 *
 * Split clause text is always re-derived from the original text to
 * maintain the offset invariant.
 */
function splitLongClauses(clauses: RawClause[], text: string): RawClause[] {
  const maxChars = MAX_CLAUSE_TOKENS * CHARS_PER_TOKEN;
  const result: RawClause[] = [];

  for (const clause of clauses) {
    const clauseText = text.slice(clause.start, clause.end);
    if (clauseText.length <= maxChars) {
      result.push(clause);
      continue;
    }

    // Split at sentence boundaries within the clause
    const sentenceEnds = findSentenceEnds(clauseText);
    let chunkStart = clause.start;

    for (const relEnd of sentenceEnds) {
      const absEnd = clause.start + relEnd;
      const chunkLen = absEnd - chunkStart;

      if (chunkLen >= maxChars && chunkStart < absEnd) {
        // This chunk is already too large; emit what we have so far
        const emitEnd = absEnd;
        result.push({
          label: clause.label,
          heading: clause.heading,
          start: chunkStart,
          end: emitEnd,
        });
        chunkStart = emitEnd;
      }
    }

    // Emit remaining
    if (chunkStart < clause.end) {
      result.push({
        label: clause.label,
        heading: clause.heading,
        start: chunkStart,
        end: clause.end,
      });
    }
  }

  return result;
}

/**
 * Find sentence end positions (after the period + whitespace).
 *
 * Returns character offsets within the input text where sentences end.
 */
function findSentenceEnds(text: string): number[] {
  const ends: number[] = [];
  const pattern = /[.!?]\s+/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    ends.push(match.index + match[0].length);
  }

  return ends;
}

