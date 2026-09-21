'use client';

/**
 * ExportButtons — 1-Click Export for Markdown Analysis, Advocate Prep Pack & Checklist.
 *
 * Implements TECH.md §5.4 & DESIGN.md §3.4.
 */
import React, { useState } from 'react';
import type { Clause, Triage, ClauseFinding, MissingFinding } from '@/lib/types';

interface ExportButtonsProps {
  clauses: Clause[];
  findings: ClauseFinding[];
  missingFindings: MissingFinding[];
  triage: Triage | null;
  filename: string;
}

export function ExportButtons({
  clauses,
  findings,
  missingFindings,
  triage,
  filename,
}: ExportButtonsProps) {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleExport = async (kind: 'markdown' | 'prep_pack' | 'checklist') => {
    setDownloading(kind);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          clauses,
          findings,
          missingFindings,
          triage,
          filename,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([data.markdown], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const ext =
          kind === 'prep_pack'
            ? 'prep-pack.md'
            : kind === 'checklist'
            ? 'checklist.md'
            : 'report.md';
        a.download = `${filename.replace(/\.[^/.]+$/, '')}-${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="pt-3 border-t border-[var(--border)] space-y-2.5">
      <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)]">
        <span className="font-bold">1-Click Exports</span>
        <span>Markdown / Print-Ready</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => handleExport('markdown')}
          disabled={Boolean(downloading)}
          className="group inline-flex flex-col items-center justify-center p-2.5 text-center rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] hover:border-[var(--accent)] hover:bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:-translate-y-0.5 transition-all shadow-2xs focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] disabled:opacity-50 cursor-pointer"
          title="Download complete clause analysis and findings as Markdown"
        >
          <span className="text-base mb-1 group-hover:scale-110 transition-transform" aria-hidden="true">📄</span>
          <span className="text-[11px] font-bold tracking-tight">Report</span>
          <span className="font-mono text-[9px] text-[var(--text-tertiary)]">.md</span>
        </button>

        <button
          type="button"
          onClick={() => handleExport('prep_pack')}
          disabled={Boolean(downloading)}
          className="group inline-flex flex-col items-center justify-center p-2.5 text-center rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] hover:border-[var(--accent)] hover:bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:-translate-y-0.5 transition-all shadow-2xs focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] disabled:opacity-50 cursor-pointer"
          title="Download briefing document formatted for consulting a legal advocate"
        >
          <span className="text-base mb-1 group-hover:scale-110 transition-transform" aria-hidden="true">⚖️</span>
          <span className="text-[11px] font-bold tracking-tight">Counsel Brief</span>
          <span className="font-mono text-[9px] text-[var(--text-tertiary)]">Prep Pack</span>
        </button>

        <button
          type="button"
          onClick={() => handleExport('checklist')}
          disabled={Boolean(downloading)}
          className="group inline-flex flex-col items-center justify-center p-2.5 text-center rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] hover:border-[var(--accent)] hover:bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:-translate-y-0.5 transition-all shadow-2xs focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] disabled:opacity-50 cursor-pointer"
          title="Download pre-signing verification checklist"
        >
          <span className="text-base mb-1 group-hover:scale-110 transition-transform" aria-hidden="true">📋</span>
          <span className="text-[11px] font-bold tracking-tight">Checklist</span>
          <span className="font-mono text-[9px] text-[var(--text-tertiary)]">Verification</span>
        </button>
      </div>
    </div>
  );
}
