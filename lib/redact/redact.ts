/**
 * Reversible PII tokenisation.
 *
 * Replaces detected PII with deterministic tokens ([PERSON_1], [EMAIL_1], etc.)
 * and returns a token map that allows the client to restore original values
 * in the UI. The server and model never see real PII.
 *
 * Tokenisation is offset-preserving: replacement tokens are padded to match
 * the original length so that all clause offsets remain valid.
 *
 * Assumes: PII detection has already run via detectPii().
 */
import type { Redaction } from '@/lib/types';
import { detectPii } from './patterns';

interface RedactResult {
  text: string;
  redactions: Redaction[];
}

/**
 * Detect and redact PII in the given text.
 *
 * Returns the redacted text and the redaction map. The text has the same
 * length as the input — tokens are padded with spaces to preserve offsets.
 *
 * Assumes: text has been normalised.
 */
export function detectAndRedact(text: string): RedactResult {
  const matches = detectPii(text);

  if (matches.length === 0) {
    return { text, redactions: [] };
  }

  const counters: Record<string, number> = {};
  const redactions: Redaction[] = [];
  let result = text;

  // Process in reverse order to preserve offsets during replacement
  const reversed = [...matches].reverse();

  for (const match of reversed) {
    const count = (counters[match.kind] = (counters[match.kind] ?? 0) + 1);
    const token = `[${match.kind}_${count}]`;

    // Pad or truncate token to match original length for offset preservation
    const paddedToken = padToken(token, match.value.length);

    result =
      result.slice(0, match.start) +
      paddedToken +
      result.slice(match.end);

    redactions.push({
      original: match.value,
      token: token,
      kind: match.kind,
      start: match.start,
      end: match.end,
    });
  }

  // Reverse redactions to be in forward order
  redactions.reverse();

  // Re-number in forward order for consistent naming
  const forwardCounters: Record<string, number> = {};
  for (const r of redactions) {
    const count = (forwardCounters[r.kind] = (forwardCounters[r.kind] ?? 0) + 1);
    r.token = `[${r.kind}_${count}]`;
  }

  // Rebuild text with forward-numbered tokens
  let finalText = text;
  for (let i = redactions.length - 1; i >= 0; i--) {
    const r = redactions[i];
    const paddedToken = padToken(r.token, r.original.length);
    finalText =
      finalText.slice(0, r.start) +
      paddedToken +
      finalText.slice(r.end);
  }

  return { text: finalText, redactions };
}

/**
 * Restore original PII values in text using the redaction map.
 *
 * This runs client-side so the UI shows real names/numbers while the
 * model only ever saw tokens.
 *
 * Assumes: redactions array matches the text being restored.
 */
export function restoreRedactions(
  redactedText: string,
  redactions: Redaction[],
): string {
  let result = redactedText;

  // Process in reverse order to preserve offsets
  for (let i = redactions.length - 1; i >= 0; i--) {
    const r = redactions[i];
    const paddedToken = padToken(r.token, r.original.length);
    const idx = result.indexOf(paddedToken);
    if (idx !== -1) {
      result =
        result.slice(0, idx) +
        r.original +
        result.slice(idx + paddedToken.length);
    }
  }

  return result;
}

/** Pad a token with spaces to match the target length, or truncate if longer. */
function padToken(token: string, targetLength: number): string {
  if (token.length >= targetLength) {
    return token.slice(0, targetLength);
  }
  return token + ' '.repeat(targetLength - token.length);
}
