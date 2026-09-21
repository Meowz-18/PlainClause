/**
 * PlainClause Markdown Report Exporter.
 *
 * Implements TECH.md §2 & DESIGN.md §3.4:
 * Converts document findings, risk radar metrics, missing protections,
 * and market norms into a clean, portable GitHub-flavored Markdown document.
 */
import type { ParsedDocument, Triage, ClauseFinding, MissingFinding } from '@/lib/types';

export interface ExportMarkdownOptions {
  doc: ParsedDocument;
  triage: Triage | null;
  findings: ClauseFinding[];
  missingFindings: MissingFinding[];
  riskScore: number | null;
}

export function exportAnalysisToMarkdown(opts: ExportMarkdownOptions): string {
  const { doc, triage, findings, missingFindings, riskScore } = opts;
  const dateStr = new Date().toISOString().split('T')[0];

  let md = `# PlainClause Analysis Report: ${doc.filename}\n\n`;
  md += `> Generated on ${dateStr} by PlainClause · In-memory private legal comprehension\n\n`;

  // Document Metadata
  md += `## Document Overview\n\n`;
  md += `- **File**: \`${doc.filename}\` (${doc.charCount.toLocaleString()} characters, ${doc.clauses.length} clauses)\n`;
  if (triage) {
    md += `- **Document Type**: ${triage.documentType.replace('_', ' ').toUpperCase()}\n`;
    md += `- **Jurisdiction**: ${triage.jurisdiction}\n`;
    md += `- **Language**: ${triage.language.toUpperCase()}\n`;
    if (triage.parties.length > 0) {
      md += `- **Parties**: ${triage.parties.map((p) => `${p.role}: ${p.name || 'Unspecified'}`).join(', ')}\n`;
    }
  }
  if (riskScore !== null) {
    const pct = Math.round(riskScore * 100);
    md += `- **Overall Risk Score**: **${pct}%**\n`;
  }
  md += `\n---\n\n`;

  // High & Medium Severity Findings
  md += `## What to Look At (Findings)\n\n`;
  if (findings.length === 0) {
    md += `*No significant contractual red flags detected.*\n\n`;
  } else {
    for (const f of findings) {
      const glyph = f.severity === 'high' ? '▲ HIGH' : f.severity === 'medium' ? '◆ MEDIUM' : '● LOW';
      md += `### ${glyph}: ${f.title}\n\n`;
      md += `- **Clause Anchor**: Clause \`#${f.clauseId}\`\n`;
      md += `- **Category**: \`${f.category}\`\n`;
      md += `- **Favours**: ${f.favours.toUpperCase()}\n`;
      md += `- **Summary**: ${f.plainSummary}\n`;
      md += `- **Why It Matters**: ${f.whyItMatters}\n`;
      if (f.marketNorm) {
        md += `- **Market Norm**: ${f.marketNorm}\n`;
      }
      if (f.suggestedAsk) {
        md += `- **Suggested Ask**: *${f.suggestedAsk}*\n`;
      }
      if (f.jurisdictionNote) {
        md += `- **Statutory / Legal Note**: ${f.jurisdictionNote}\n`;
      }
      md += `\n`;
    }
  }

  // Missing Protections
  if (missingFindings.length > 0) {
    md += `---\n\n## What's Not in the Document (Missing Protections)\n\n`;
    for (const m of missingFindings) {
      const glyph = m.severity === 'high' ? '▲ HIGH' : '◆ MEDIUM';
      md += `### ${glyph}: ${m.title}\n\n`;
      md += `- **Why It Matters**: ${m.whyItMatters}\n`;
      md += `- **Recommended Clause to Request**: *${m.suggestedAsk}*\n\n`;
    }
  }

  // Disclaimer
  md += `---\n\n`;
  md += `*Disclaimer: PlainClause provides automated document comprehension and taxonomy matching for informational purposes only. It does not provide legal advice or create an attorney-client relationship. If in doubt, consult a licensed advocate or legal aid authority.*`;

  return md;
}
