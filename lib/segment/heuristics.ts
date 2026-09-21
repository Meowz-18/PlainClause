/**
 * Clause boundary detection heuristics.
 *
 * Five ordered heuristics from TECH.md §5.1, first match wins:
 * 1. Numbered clauses — `^\s*(\d+(?:\.\d+)*)[.)]\s+`
 * 2. Lettered/roman sub-items — `^\s*\(?([a-z]|[ivx]+)\)\s+`
 * 3. Headings — short line (<80 chars), title case or ALL CAPS, no terminal period
 * 4. ARTICLE / SECTION / CLAUSE keywords
 * 5. Paragraph fallback — double-newline splits
 *
 * Each heuristic returns boundary positions within the text.
 * Assumes: text has been normalised (LF line endings, collapsed whitespace).
 */

export interface RawBoundary {
  start: number;
  label: string | null;
  heading: string | null;
  heuristic: string;
}

/**
 * Heuristic 1: Numbered clauses.
 *
 * Matches patterns like "1.", "1)", "1.2.", "1.2.3)", at the start of a line.
 * Hierarchy is inferred from dot depth.
 */
export function findNumberedClauses(text: string): RawBoundary[] {
  const boundaries: RawBoundary[] = [];
  const pattern = /^[ \t]*(\d+(?:\.\d+)*)[.)]\s+/gm;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    boundaries.push({
      start: match.index,
      label: match[1],
      heading: null,
      heuristic: 'numbered',
    });
  }

  return boundaries;
}

/**
 * Heuristic 2: Lettered or roman-numeral sub-items.
 *
 * Matches patterns like "(a)", "(iv)", "b)" at the start of a line.
 * These are attached to their parent numbered clause.
 */
export function findLetteredItems(text: string): RawBoundary[] {
  const boundaries: RawBoundary[] = [];
  const pattern = /^[ \t]*\(?([a-z]|[ivx]{1,4})\)\s+/gm;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    boundaries.push({
      start: match.index,
      label: `(${match[1]})`,
      heading: null,
      heuristic: 'lettered',
    });
  }

  return boundaries;
}

/**
 * Heuristic 3: Headings.
 *
 * A short line (<80 chars) in title case or ALL CAPS, with no terminal period,
 * followed by a blank line or immediately by content.
 */
export function findHeadings(text: string): RawBoundary[] {
  const boundaries: RawBoundary[] = [];
  const lines = text.split('\n');
  let offset = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (
      trimmed.length > 0 &&
      trimmed.length < 80 &&
      !trimmed.endsWith('.') &&
      !trimmed.endsWith(',') &&
      (isAllCaps(trimmed) || isTitleCase(trimmed))
    ) {
      boundaries.push({
        start: offset,
        label: null,
        heading: trimmed,
        heuristic: 'heading',
      });
    }

    offset += line.length + 1; // +1 for the \n
  }

  return boundaries;
}

/**
 * Heuristic 4: ARTICLE / SECTION / CLAUSE keywords.
 *
 * Matches lines starting with these keywords followed by a number or title.
 */
export function findKeywordSections(text: string): RawBoundary[] {
  const boundaries: RawBoundary[] = [];
  const pattern = /^[ \t]*(ARTICLE|SECTION|CLAUSE|SCHEDULE|ANNEXURE|APPENDIX)\s+([IVXLCDM\d]+[.:)]?\s*.*)/gim;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    boundaries.push({
      start: match.index,
      label: `${match[1]} ${match[2]}`.trim(),
      heading: match[0].trim(),
      heuristic: 'keyword',
    });
  }

  return boundaries;
}

/**
 * Heuristic 5: Paragraph fallback.
 *
 * Split on double-newline boundaries when no structural markers are found.
 */
export function findParagraphBreaks(text: string): RawBoundary[] {
  const boundaries: RawBoundary[] = [
    { start: 0, label: null, heading: null, heuristic: 'paragraph' },
  ];

  const pattern = /\n\n+/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const nextStart = match.index + match[0].length;
    if (nextStart < text.length) {
      boundaries.push({
        start: nextStart,
        label: null,
        heading: null,
        heuristic: 'paragraph',
      });
    }
  }

  return boundaries;
}

/** Check if a string is ALL CAPS (ignoring numbers and punctuation). */
function isAllCaps(s: string): boolean {
  const letters = s.replace(/[^a-zA-Z]/g, '');
  return letters.length > 1 && letters === letters.toUpperCase();
}

/** Check if a string is Title Case (first letter of most words capitalised). */
function isTitleCase(s: string): boolean {
  const words = s.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return false;

  const skipWords = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
  let capitalised = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const firstLetter = word.match(/[a-zA-Z]/);
    if (!firstLetter) continue;

    if (i === 0 || !skipWords.has(word.toLowerCase())) {
      if (firstLetter[0] === firstLetter[0].toUpperCase()) {
        capitalised++;
      }
    } else {
      capitalised++; // Skip words don't count against us
    }
  }

  const letterWords = words.filter(w => /[a-zA-Z]/.test(w)).length;
  return letterWords > 1 && capitalised / letterWords >= 0.6;
}
