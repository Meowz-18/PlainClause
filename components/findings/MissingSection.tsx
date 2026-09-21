/**
 * MissingSection component.
 *
 * Implements DESIGN.md §3.2 & §4.2:
 * Visually distinct missing-clause section with outlined (hollow) markers.
 * The visual grammar says absence.
 */
'use client';

import React from 'react';
import type { MissingFinding } from '@/lib/types';
import { SeverityBadge } from '../ui/SeverityBadge';

interface MissingSectionProps {
  missingFindings: MissingFinding[];
  className?: string;
}

export function MissingSection({ missingFindings, className = '' }: MissingSectionProps) {
  if (missingFindings.length === 0) return null;

  return (
    <section aria-labelledby="missing-clauses-heading" className={`mt-6 space-y-3 ${className}`}>
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
        <div className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-[var(--severity-absent)]">
          <span className="flex h-4 w-4 items-center justify-center rounded-full border border-dashed border-current text-[10px]">
            ○
          </span>
          <h3 id="missing-clauses-heading">
            Omissions &amp; Missing Protections ({missingFindings.length})
          </h3>
        </div>
        <span className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase tracking-wider">
          Market Baseline
        </span>
      </div>

      <ul className="space-y-3" role="list">
        {missingFindings.map((item) => (
          <li
            key={item.id}
            className="rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-raised)]/60 p-3.5 text-xs transition-colors hover:border-[var(--text-secondary)] shadow-xs"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-[var(--severity-absent)] uppercase tracking-wide bg-[var(--surface)] px-2 py-0.5 rounded border border-[var(--border-subtle)]">
                <span aria-hidden="true">○</span>
                <span>NOT IN DOCUMENT</span>
              </span>
              {item.severity && <SeverityBadge severity={item.severity} />}
            </div>

            <h4 className="font-bold text-[var(--text-primary)] text-xs sm:text-sm mb-1 tracking-tight">
              {item.title}
            </h4>

            <p className="text-[var(--text-secondary)] leading-relaxed mb-2.5">
              {item.whyItMatters}
            </p>

            {item.suggestedAsk && (
              <div className="rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)] p-2.5 text-[var(--text-primary)] leading-relaxed">
                <div className="flex items-start gap-1.5">
                  <span className="text-[var(--accent)] font-bold shrink-0" aria-hidden="true">→</span>
                  <div>
                    <span className="font-bold text-[10px] text-[var(--text-secondary)] uppercase tracking-wider block mb-0.5">
                      Suggested Protective Addendum:
                    </span>
                    <p className="font-medium">{item.suggestedAsk}</p>
                  </div>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
