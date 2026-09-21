/**
 * Prompt Injection & Untrusted Content Safeguards.
 *
 * Implements TECH.md §8.2:
 * 1. Pre-scan for malicious instructions attempting to bypass the constitutional prompt.
 * 2. Neutralisation of XML breakout characters in untrusted user queries and document content.
 */

const INJECTION_PATTERNS: { regex: RegExp; reason: string }[] = [
  {
    regex: /\bignore\s+(all\s+|previous\s+|prior\s+)?(instructions|rules|prompts|guidelines)\b/i,
    reason: 'Instruction override attempt',
  },
  {
    regex: /\b(system\s+prompt|reveal\s+prompt|print\s+instructions|show\s+constitution)\b/i,
    reason: 'System prompt extraction attempt',
  },
  {
    regex: /<\/?(document_content|clause|system|instructions|tool_use)>/i,
    reason: 'XML framing tag injection',
  },
  {
    regex: /\b(disregard\s+(the\s+)?above|forget\s+everything|override\s+safety)\b/i,
    reason: 'Context reset attempt',
  },
  {
    regex: /\b(you\s+are\s+now\s+in\s+developer\s+mode|jailbreak|DAN\s+mode)\b/i,
    reason: 'Role alteration / jailbreak attempt',
  },
  {
    regex: /\b(say\s+that\s+all\s+clauses\s+are\s+(safe|standard|low\s+risk))\b/i,
    reason: 'Manipulative analysis override',
  },
];

export interface InjectionCheckResult {
  detected: boolean;
  reason?: string;
  matchedPattern?: string;
}

/**
 * Deterministic pre-scan for common prompt injection patterns in user inputs or document segments.
 */
export function detectPromptInjection(text: string): InjectionCheckResult {
  if (!text || typeof text !== 'string') {
    return { detected: false };
  }

  for (const item of INJECTION_PATTERNS) {
    const match = item.regex.exec(text);
    if (match) {
      return {
        detected: true,
        reason: item.reason,
        matchedPattern: match[0],
      };
    }
  }

  return { detected: false };
}

/**
 * Escapes sensitive XML framing delimiters from untrusted strings before prompt interpolation.
 */
export function sanitizeUntrustedXml(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
