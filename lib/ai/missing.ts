/**
 * Missing Clause Detector.
 *
 * Implements TECH.md §4.1, §5.2, and DESIGN.md §3.2:
 * Evaluates required playbook protections against parsed document text and findings.
 * Generates MissingFinding objects with distinct absence visual grammar.
 */
import type { ParsedDocument, ClauseFinding, MissingFinding } from '@/lib/types';
import type { Playbook } from '@/lib/playbooks/schema';

export function detectMissing(
  doc: ParsedDocument,
  playbook: Playbook,
  findings: ClauseFinding[] = []
): MissingFinding[] {
  const missingFindings: MissingFinding[] = [];
  const normalizedDocText = doc.normalizedText.toLowerCase();

  for (const req of playbook.required) {
    // 1. Keyword check across document text
    const keywordFound = req.detect.keywords.some((kw) =>
      normalizedDocText.includes(kw.toLowerCase())
    );

    // 2. Check if a present finding explicitly flagged this requirement as defective/absent
    const hasDeficiencyFinding = findings.some(
      (f) =>
        f.category === req.detect.categoryId &&
        (f.severity === 'high' || f.title.toLowerCase().includes('no ') || f.title.toLowerCase().includes('without'))
    );

    // If keywords are entirely absent, or if the requirement was flagged as missing/omitted
    if (!keywordFound || hasDeficiencyFinding) {
      missingFindings.push({
        kind: 'missing',
        id: `miss-${req.id}`,
        requirementId: req.id,
        title: req.title,
        whyItMatters: req.whyItMatters,
        severity: req.severityIfMissing,
        suggestedAsk: req.suggestedAsk,
      });
    }
  }

  return missingFindings;
}
