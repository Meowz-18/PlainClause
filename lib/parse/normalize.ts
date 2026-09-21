/**
 * Text normalisation for parsed documents.
 *
 * Handles whitespace, ligatures, soft hyphens, line-break hyphenation,
 * CRLF, and non-breaking spaces. Output is the canonical text against
 * which all offsets are anchored.
 *
 * Assumes: input is raw extracted text from a parser (unpdf, mammoth, etc.).
 */

/** Common Unicode ligatures → their component characters. */
const LIGATURE_MAP: ReadonlyMap<string, string> = new Map([
  ['\uFB00', 'ff'],
  ['\uFB01', 'fi'],
  ['\uFB02', 'fl'],
  ['\uFB03', 'ffi'],
  ['\uFB04', 'ffl'],
  ['\uFB05', 'st'],
  ['\uFB06', 'st'],
]);

/**
 * Replace Unicode ligatures with their ASCII equivalents.
 *
 * Assumes: ligatures are limited to the common Latin set above.
 */
export function replaceLigatures(text: string): string {
  let result = text;
  for (const [ligature, replacement] of LIGATURE_MAP) {
    result = result.replaceAll(ligature, replacement);
  }
  return result;
}

/**
 * Remove soft hyphens (U+00AD) that are used for line-break hints.
 *
 * Assumes: soft hyphens are never meaningful content in legal documents.
 */
export function removeSoftHyphens(text: string): string {
  return text.replaceAll('\u00AD', '');
}

/**
 * Rejoin words split across lines by a hyphen at a line break.
 *
 * Matches: `word-\n  word` → `wordword`.
 * Assumes: real hyphens (e.g. "well-known") never appear at the end of a line
 * followed immediately by a lowercase letter continuation.
 */
export function rejoinHyphenatedLineBreaks(text: string): string {
  return text.replace(/(\w)-\s*\n\s*(\w)/g, '$1$2');
}

/**
 * Normalise line endings to LF and replace non-breaking spaces.
 *
 * Assumes: CRLF and CR are artefacts of extraction, not meaningful.
 */
export function normaliseWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u00A0/g, ' ')       // non-breaking space → regular space
    .replace(/\u2007/g, ' ')       // figure space
    .replace(/\u2008/g, ' ')       // punctuation space
    .replace(/\u2009/g, ' ')       // thin space
    .replace(/\u200A/g, ' ')       // hair space
    .replace(/\u200B/g, '')        // zero-width space (remove)
    .replace(/\u2028/g, '\n')      // line separator
    .replace(/\u2029/g, '\n\n');   // paragraph separator
}

/**
 * Collapse runs of 3+ newlines to exactly 2 (paragraph boundary).
 *
 * Assumes: more than one blank line is extraction noise, not structure.
 */
export function collapseExcessiveNewlines(text: string): string {
  return text.replace(/\n{3,}/g, '\n\n');
}

/**
 * Trim trailing whitespace from each line.
 *
 * Assumes: trailing spaces are extraction artefacts.
 */
export function trimTrailingLineWhitespace(text: string): string {
  return text.replace(/[ \t]+$/gm, '');
}

/**
 * Full normalisation pipeline. Order matters — each step assumes the
 * output of the previous step.
 *
 * Returns the canonical normalised text against which all clause offsets
 * are anchored.
 */
export function normalizeText(raw: string): string {
  let text = raw;
  text = normaliseWhitespace(text);
  text = replaceLigatures(text);
  text = removeSoftHyphens(text);
  text = rejoinHyphenatedLineBreaks(text);
  text = trimTrailingLineWhitespace(text);
  text = collapseExcessiveNewlines(text);
  text = text.trim();
  return text;
}
