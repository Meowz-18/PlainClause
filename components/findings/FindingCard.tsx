/**
 * FindingCard component.
 *
 * Implements DESIGN.md §3.3:
 * The atomic unit of PlainClause with four-beat structure:
 * 1. What it says (plain language)
 * 2. Why it matters (risk/consequence)
 * 3. What's normal (comparable agreements)
 * 4. What you could do (suggested ask)
 *
 * Semantic <article> with <h3> title per DESIGN.md §7.1.
 */
'use client';

import React from 'react';
import type { ClauseFinding } from '@/lib/types';
import { SeverityBadge } from '../ui/SeverityBadge';

interface FindingCardProps {
  finding: ClauseFinding;
  isActive?: boolean;
  onSelectClause?: (clauseId: string) => void;
  onAskAboutFinding?: (question: string) => void;
}

export function FindingCard({
  finding,
  isActive = false,
  onSelectClause,
  onAskAboutFinding,
}: FindingCardProps) {
  const [copied, setCopied] = React.useState(false);

  const handleShowClause = () => {
    if (onSelectClause) {
      onSelectClause(finding.clauseId);
    }
  };

  const handleAsk = () => {
    if (onAskAboutFinding) {
      onAskAboutFinding(`Regarding ${finding.title}: ${finding.suggestedAsk || finding.plainSummary}`);
    }
  };

  const handleCopyAsk = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (finding.suggestedAsk) {
      navigator.clipboard.writeText(finding.suggestedAsk);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const severityAccentClass =
    finding.severity === 'high'
      ? 'border-l-[4px] border-l-[var(--severity-high)] bg-gradient-to-br from-[var(--surface-raised)] to-rose-500/[0.04]'
      : finding.severity === 'medium'
      ? 'border-l-[4px] border-l-[var(--severity-medium)] bg-gradient-to-br from-[var(--surface-raised)] to-amber-500/[0.04]'
      : 'border-l-[4px] border-l-[var(--severity-low)] bg-gradient-to-br from-[var(--surface-raised)] to-emerald-500/[0.04]';

  return (
    <article
      id={`finding-${finding.id}`}
      tabIndex={0}
      className={`card finding-enter flex flex-col gap-3.5 text-left transition-all duration-200 rounded-xl p-4.5 shadow-xs ${severityAccentClass} ${
        isActive
          ? 'border-[var(--accent)] ring-2 ring-[var(--accent-ring)] bg-[var(--surface-raised)] shadow-elevated scale-[1.01]'
          : 'hover:border-[var(--border-strong)] hover:shadow-card hover:-translate-y-0.5'
      }`}
    >
      {/* Header: Severity Badge + Category */}
      <div className="flex items-center justify-between gap-2">
        <SeverityBadge severity={finding.severity} />
        <span className="rounded bg-[var(--surface)] border border-[var(--border-subtle)] px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider truncate">
          {finding.category.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Finding title (<= 8 words) */}
      <h3 className="text-sm font-bold text-[var(--text-primary)] leading-snug tracking-tight">
        {finding.title}
      </h3>

      {/* Beat 1: What it says (Plain summary) */}
      <p className="text-xs text-[var(--text-primary)] leading-relaxed">
        {finding.plainSummary}
      </p>

      {/* Beat 2: Why it matters */}
      {finding.whyItMatters && (
        <div className="rounded-xl bg-amber-500/[0.06] dark:bg-amber-500/[0.08] p-3 text-xs text-[var(--text-secondary)] border border-amber-500/20 leading-relaxed shadow-2xs">
          <p className="font-semibold text-amber-800 dark:text-amber-400 mb-1 flex items-center gap-1.5 text-[11px]">
            <span aria-hidden="true">⚠️</span>
            <span>Why this matters:</span>
          </p>
          <p className="text-[var(--text-primary)]">{finding.whyItMatters}</p>
        </div>
      )}

      {/* Beat 3: Market norm */}
      {finding.marketNorm && (
        <div className="rounded-xl bg-[var(--surface-elevated)] p-3 text-xs text-[var(--text-secondary)] border-l-[3px] border-[var(--accent)] border-y border-r border-[var(--border-subtle)] leading-relaxed shadow-2xs">
          <div className="flex items-start gap-2">
            <span className="text-xs shrink-0 mt-0.5" aria-hidden="true">⚖️</span>
            <div>
              <span className="font-semibold text-[var(--text-primary)] block text-[11px] mb-0.5 uppercase tracking-wide">
                Market Norm:
              </span>
              <p className="italic text-[var(--text-secondary)]">{finding.marketNorm}</p>
            </div>
          </div>
        </div>
      )}

      {/* Beat 4: What you could do (Suggested ask) */}
      {finding.suggestedAsk && (
        <div className="rounded-xl bg-[var(--accent-subtle)] border border-[var(--accent-ring)] p-3 text-xs text-[var(--text-primary)] leading-relaxed shadow-2xs">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <span className="font-bold text-[var(--accent)] shrink-0 mt-0.5" aria-hidden="true">💡</span>
              <div>
                <span className="font-bold text-[var(--accent)] block text-[11px] mb-1 uppercase tracking-wide">
                  Suggested Negotiation Ask:
                </span>
                <p className="font-medium text-[var(--text-primary)] leading-relaxed">{finding.suggestedAsk}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopyAsk}
              className="shrink-0 text-[10px] font-mono font-bold px-2 py-1 rounded-md bg-[var(--surface-raised)] border border-[var(--border)] hover:border-[var(--accent)] text-[var(--accent)] transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
              title="Copy negotiation script to clipboard"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {/* Jurisdiction note if present */}
      {finding.jurisdictionNote && (
        <p className="text-[11px] text-[var(--text-tertiary)] italic font-mono flex items-center gap-1.5">
          <span>📍</span>
          <span>Jurisdiction: {finding.jurisdictionNote}</span>
        </p>
      )}

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)] mt-1">
        <button
          type="button"
          onClick={handleShowClause}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] hover:underline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] rounded-md py-1 px-1.5 hover:bg-[var(--surface)] transition-colors cursor-pointer"
          aria-label={`Show clause in document: ${finding.title}`}
        >
          <span aria-hidden="true">🎯</span>
          <span>Show clause</span>
          <span className="font-mono text-[11px] font-bold bg-[var(--surface-elevated)] border border-[var(--border-subtle)] px-1.5 py-0.2 rounded">
            § {finding.clauseId}
          </span>
        </button>

        {onAskAboutFinding && (
          <button
            type="button"
            onClick={handleAsk}
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] rounded-md px-2 py-1 transition-colors cursor-pointer"
          >
            <span>💬</span>
            <span>Ask AI</span>
          </button>
        )}
      </div>
    </article>
  );
}
