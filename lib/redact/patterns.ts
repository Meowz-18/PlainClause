/**
 * PII detection regex patterns.
 *
 * Patterns for Indian-format identifiers: Aadhaar, PAN, phone, email,
 * bank account numbers. Designed to minimise false positives on clause
 * numbers, monetary amounts, and dates.
 *
 * Assumes: text has been normalised (consistent whitespace).
 */

export interface PiiMatch {
  kind: string;
  value: string;
  start: number;
  end: number;
}

interface PiiPattern {
  kind: string;
  regex: RegExp;
}

/**
 * Aadhaar: 12 digits, optionally in groups of 4 separated by spaces or hyphens.
 * Negative lookbehind for currency symbols and clause numbering context.
 */
const AADHAAR_PATTERN: PiiPattern = {
  kind: 'AADHAAR',
  regex: /(?<![₹$\d.])\b(\d{4}[\s-]?\d{4}[\s-]?\d{4})\b(?![\d.])/g,
};

/**
 * PAN: 5 uppercase letters, 4 digits, 1 uppercase letter.
 * Very specific format reduces false positives.
 */
const PAN_PATTERN: PiiPattern = {
  kind: 'PAN',
  regex: /\b([A-Z]{5}\d{4}[A-Z])\b/g,
};

/**
 * Indian phone numbers: optional +91 or 0 prefix, 10 digits.
 * Negative lookbehind avoids matching clause/section numbers.
 */
const PHONE_PATTERN: PiiPattern = {
  kind: 'PHONE',
  regex: /(?<![A-Za-z\d])(?:\+91[\s-]?|0)?([6-9]\d{4}[\s-]?\d{5})\b/g,
};

/**
 * Email addresses.
 */
const EMAIL_PATTERN: PiiPattern = {
  kind: 'EMAIL',
  regex: /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g,
};

/**
 * Bank account numbers: 9–18 digits, optionally grouped.
 * Requires contextual keywords nearby to reduce false positives.
 */
const BANK_ACCOUNT_PATTERN: PiiPattern = {
  kind: 'BANK_ACCOUNT',
  regex: /(?:account\s*(?:no\.?|number|#)\s*[:.]?\s*)(\d{9,18})/gi,
};

/** All PII patterns in detection order. */
const PII_PATTERNS: readonly PiiPattern[] = [
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
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
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
