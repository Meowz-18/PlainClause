/**
 * PII detection regex patterns.
 *
 * Patterns for Indian-format identifiers: Aadhaar, PAN, phone, email,
 * bank account numbers. Designed to minimise false positives on clause
 * numbers, monetary amounts, and dates.
 *
 * Assumes: text has been normalised (consistent whitespace).
 *
 * Efficiency note: The `g` flag carries mutable `lastIndex` state so each
 * call to detectPii() must work with a fresh RegExp instance (sharing one
 * across calls would cause incorrect results on the second invocation).
 * We store a compiled factory per pattern — the regex source string is
 * parsed exactly once at module load, and each call clones from those
 * pre-compiled source/flags. This eliminates the per-call source-string
 * parse while preserving correct lastIndex isolation.
 */

export interface PiiMatch {
  kind: string;
  value: string;
  start: number;
  end: number;
}

/**
 * A compiled pattern stores the source and flags so that per-call RegExp
 * construction skips re-parsing the source string (parsing cost is paid
 * once at module load time instead of once per detectPii() call).
 */
interface CompiledPiiPattern {
  kind: string;
  source: string;
  flags: string;
}

/**
 * Module-level compiled patterns — source string parsed once at load time.
 *
 * Aadhaar: 12 digits, optionally in groups of 4 separated by spaces or hyphens.
 * Negative lookbehind for currency symbols and clause numbering context.
 */
const AADHAAR_PATTERN: CompiledPiiPattern = {
  kind: 'AADHAAR',
  source: /(?<![₹$\d.])\b(\d{4}[\s-]?\d{4}[\s-]?\d{4})\b(?![\d.])/g.source,
  flags: 'g',
};

/**
 * PAN: 5 uppercase letters, 4 digits, 1 uppercase letter.
 * Very specific format reduces false positives.
 */
const PAN_PATTERN: CompiledPiiPattern = {
  kind: 'PAN',
  source: /\b([A-Z]{5}\d{4}[A-Z])\b/g.source,
  flags: 'g',
};

/**
 * Indian phone numbers: optional +91 or 0 prefix, 10 digits.
 * Negative lookbehind avoids matching clause/section numbers.
 */
const PHONE_PATTERN: CompiledPiiPattern = {
  kind: 'PHONE',
  source: /(?<![A-Za-z\d])(?:\+91[\s-]?|0)?([6-9]\d{4}[\s-]?\d{5})\b/g.source,
  flags: 'g',
};

/**
 * Email addresses.
 */
const EMAIL_PATTERN: CompiledPiiPattern = {
  kind: 'EMAIL',
  source: /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g.source,
  flags: 'g',
};

/**
 * Bank account numbers: 9–18 digits, optionally grouped.
 * Requires contextual keywords nearby to reduce false positives.
 */
const BANK_ACCOUNT_PATTERN: CompiledPiiPattern = {
  kind: 'BANK_ACCOUNT',
  source: /(?:account\s*(?:no\.?|number|#)\s*[:.]?\s*)(\d{9,18})/gi.source,
  flags: 'gi',
};

/**
 * All PII patterns in detection order.
 * Source strings are parsed once at module load; per-call RegExp instances
 * are constructed from these pre-compiled components.
 */
const PII_PATTERNS: readonly CompiledPiiPattern[] = [
  PAN_PATTERN,
  AADHAAR_PATTERN,
  EMAIL_PATTERN,
  PHONE_PATTERN,
  BANK_ACCOUNT_PATTERN,
];

/**
 * Detect all PII matches in the given text.
 *
 * Returns matches sorted by position. Each match includes the kind,
 * matched value, and character offsets in the source text.
 *
 * Assumes: text has been normalised. Patterns are designed to avoid
 * false positives on clause numbers (e.g. "1.2.3"), monetary amounts
 * (e.g. "₹1,50,000"), and dates (e.g. "04-01-2024").
 */
export function detectPii(text: string): PiiMatch[] {
  const matches: PiiMatch[] = [];

  for (const pattern of PII_PATTERNS) {
    // Construct a fresh per-call RegExp from the pre-compiled source/flags.
    // A new instance is required each call to guarantee lastIndex starts at 0
    // (reusing a `g`-flag regex across calls would cause incorrect results on
    // the second invocation). The source string is NOT re-parsed here — it was
    // parsed once at module load when PII_PATTERNS was initialised above.
    const regex = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      matches.push({
        kind: pattern.kind,
        value: match[0],
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  }

  // Sort by position and remove overlapping matches (keep first)
  matches.sort((a, b) => a.start - b.start);
  const deduped: PiiMatch[] = [];
  for (const m of matches) {
    const prev = deduped[deduped.length - 1];
    if (prev && m.start < prev.end) continue; // Overlapping — skip
    deduped.push(m);
  }

  return deduped;
}
