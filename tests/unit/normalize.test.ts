/**
 * Unit tests for text normalisation.
 *
 * Tests each normalisation step independently and the full pipeline.
 */
import { describe, it, expect } from 'vitest';
import {
  normalizeText,
  replaceLigatures,
  removeSoftHyphens,
  rejoinHyphenatedLineBreaks,
  normaliseWhitespace,
  collapseExcessiveNewlines,
  trimTrailingLineWhitespace,
} from '@/lib/parse/normalize';

describe('replaceLigatures', () => {
  it('replaces fi ligature', () => {
    expect(replaceLigatures('of\uFB01ce')).toBe('office');
  });

  it('replaces fl ligature', () => {
    expect(replaceLigatures('\uFB02oor')).toBe('floor');
  });

  it('replaces ffi ligature', () => {
    expect(replaceLigatures('o\uFB03ce')).toBe('office');
  });

  it('leaves text without ligatures unchanged', () => {
    expect(replaceLigatures('hello world')).toBe('hello world');
  });
});

describe('removeSoftHyphens', () => {
  it('removes soft hyphens', () => {
    expect(removeSoftHyphens('agree\u00ADment')).toBe('agreement');
  });

  it('preserves regular hyphens', () => {
    expect(removeSoftHyphens('well-known')).toBe('well-known');
  });
});

describe('rejoinHyphenatedLineBreaks', () => {
  it('rejoins word split across lines', () => {
    expect(rejoinHyphenatedLineBreaks('agree-\nment')).toBe('agreement');
  });

  it('rejoins with leading whitespace on continuation', () => {
    expect(rejoinHyphenatedLineBreaks('agree-\n  ment')).toBe('agreement');
  });

  it('preserves real hyphens not at line breaks', () => {
    expect(rejoinHyphenatedLineBreaks('well-known clause')).toBe('well-known clause');
  });
});

describe('normaliseWhitespace', () => {
  it('converts CRLF to LF', () => {
    expect(normaliseWhitespace('line1\r\nline2')).toBe('line1\nline2');
  });

  it('converts CR to LF', () => {
    expect(normaliseWhitespace('line1\rline2')).toBe('line1\nline2');
  });

  it('replaces non-breaking spaces', () => {
    expect(normaliseWhitespace('hello\u00A0world')).toBe('hello world');
  });

  it('removes zero-width spaces', () => {
    expect(normaliseWhitespace('hello\u200Bworld')).toBe('helloworld');
  });

  it('converts line separator to newline', () => {
    expect(normaliseWhitespace('line1\u2028line2')).toBe('line1\nline2');
  });

  it('converts paragraph separator to double newline', () => {
    expect(normaliseWhitespace('para1\u2029para2')).toBe('para1\n\npara2');
  });
});

describe('collapseExcessiveNewlines', () => {
  it('collapses 3+ newlines to exactly 2', () => {
    expect(collapseExcessiveNewlines('a\n\n\nb')).toBe('a\n\nb');
    expect(collapseExcessiveNewlines('a\n\n\n\n\nb')).toBe('a\n\nb');
  });

  it('preserves double newlines', () => {
    expect(collapseExcessiveNewlines('a\n\nb')).toBe('a\n\nb');
  });

  it('preserves single newlines', () => {
    expect(collapseExcessiveNewlines('a\nb')).toBe('a\nb');
  });
});

describe('trimTrailingLineWhitespace', () => {
  it('removes trailing spaces', () => {
    expect(trimTrailingLineWhitespace('hello   \nworld  ')).toBe('hello\nworld');
  });

  it('removes trailing tabs', () => {
    expect(trimTrailingLineWhitespace('hello\t\nworld')).toBe('hello\nworld');
  });
});

describe('normalizeText (full pipeline)', () => {
  it('handles a typical extraction artefact', () => {
    const input = 'The of\uFB01ce is on the \uFB02oor.\r\n\r\n\r\nThis agree-\n  ment is valid.\u00A0 ';
    const result = normalizeText(input);

    expect(result).toBe('The office is on the floor.\n\nThis agreement is valid.');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(normalizeText('   \n\n  ')).toBe('');
  });

  it('preserves intentional double newlines', () => {
    const input = 'Clause 1.\n\nClause 2.';
    expect(normalizeText(input)).toBe('Clause 1.\n\nClause 2.');
  });
});
