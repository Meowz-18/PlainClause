/**
 * Unit tests for PII detection and redaction.
 *
 * Tests: Aadhaar, PAN, phone, email, bank account detection.
 * No false positives on clause numbers, amounts, or dates.
 * Round-trip: redact → restore is lossless.
 */
import { describe, it, expect } from 'vitest';
import { detectPii } from '@/lib/redact/patterns';
import { detectAndRedact, restoreRedactions } from '@/lib/redact/redact';

describe('detectPii', () => {
  it('detects Aadhaar numbers', () => {
    const matches = detectPii('Aadhaar: 1234 5678 9012');
    expect(matches.some(m => m.kind === 'AADHAAR')).toBe(true);
  });

  it('detects Aadhaar without spaces', () => {
    const matches = detectPii('Aadhaar: 123456789012');
    expect(matches.some(m => m.kind === 'AADHAAR')).toBe(true);
  });

  it('detects PAN numbers', () => {
    const matches = detectPii('PAN: ABCDE1234F');
    expect(matches.some(m => m.kind === 'PAN')).toBe(true);
  });

  it('detects email addresses', () => {
    const matches = detectPii('Email: priya.mehta@example.com');
    expect(matches.some(m => m.kind === 'EMAIL')).toBe(true);
  });

  it('detects phone numbers with +91', () => {
    const matches = detectPii('Phone: +91 98765 43210');
    expect(matches.some(m => m.kind === 'PHONE')).toBe(true);
  });

  it('detects bank account numbers with context', () => {
    const matches = detectPii('Account No: 12345678901234');
    expect(matches.some(m => m.kind === 'BANK_ACCOUNT')).toBe(true);
  });

  describe('no false positives', () => {
    it('does not match clause numbers', () => {
      const matches = detectPii('See clause 1.2.3 and section 4.5.');
      const falseAadhaar = matches.filter(m => m.kind === 'AADHAAR');
      expect(falseAadhaar.length).toBe(0);
    });

    it('does not match monetary amounts', () => {
      const matches = detectPii('Rs. 1,50,000/- (Rupees One Lakh)');
      expect(matches.length).toBe(0);
    });

    it('does not match dates', () => {
      const matches = detectPii('dated 15th March 2026');
      expect(matches.length).toBe(0);
    });

    it('does not match short numbers', () => {
      const matches = detectPii('Flat No. 302, 3rd Floor');
      expect(matches.length).toBe(0);
    });
  });
});

describe('detectAndRedact', () => {
  it('replaces PII with tokens', () => {
    const { text, redactions } = detectAndRedact('PAN: ABCDE1234F is my PAN');
    expect(redactions.length).toBeGreaterThan(0);
    expect(text).not.toContain('ABCDE1234F');
  });

  it('preserves text length (offset-safe)', () => {
    const input = 'Contact: priya@example.com or call +91 98765 43210';
    const { text } = detectAndRedact(input);
    expect(text.length).toBe(input.length);
  });

  it('returns empty redactions for PII-free text', () => {
    const { text, redactions } = detectAndRedact('This is a standard clause about rent.');
    expect(redactions.length).toBe(0);
    expect(text).toBe('This is a standard clause about rent.');
  });
});

describe('round-trip: redact → restore', () => {
  it('restores original text losslessly', () => {
    const original = 'PAN: ABCDE1234F, Email: user@test.com';
    const { text: redacted, redactions } = detectAndRedact(original);
    const restored = restoreRedactions(redacted, redactions);

    expect(restored).toBe(original);
  });

  it('round-trips with multiple PII types', () => {
    const original = 'Aadhaar: 1234 5678 9012, PAN: XYZAB9876C, email: test@mail.com';
    const { text: redacted, redactions } = detectAndRedact(original);
    const restored = restoreRedactions(redacted, redactions);

    expect(restored).toBe(original);
  });
});
