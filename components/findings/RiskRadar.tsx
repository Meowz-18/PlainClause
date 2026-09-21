/**
 * RiskRadar Component.
 *
 * Implements DESIGN.md §1.2 & §3.2:
 * Highlights top high-severity findings and composite risk score above the fold.
 */
'use client';

import React from 'react';
import type { ClauseFinding } from '@/lib/types';
import { SeverityBadge } from '../ui/SeverityBadge';

interface RiskRadarProps {
  findings: ClauseFinding[];
  riskScore: number | null;
  onSelectClause: (clauseId: string) => void;
  className?: string;
}

export function RiskRadar({
  findings,
  riskScore,
  onSelectClause,
  className = '',
}: RiskRadarProps) {
  const highRisks = findings.filter((f) => f.severity === 'high');

  if (highRisks.length === 0 && riskScore === null) {
    return null;
  }

  const scorePercentage = riskScore !== null ? Math.round(riskScore * 100) : 0;
  const scoreColor =
    scorePercentage > 60
      ? 'var(--severity-high)'
      : scorePercentage > 30
      ? 'var(--severity-medium)'
      : 'var(--severity-low)';

  const riskLabel =
    scorePercentage > 60
      ? 'High Risk Profile'
      : scorePercentage > 30
      ? 'Moderate Risk Profile'
      : 'Standard Terms';

  return (
    <div
      className={`rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-4 space-y-3.5 shadow-xs ${className}`}
      role="region"
      aria-label="Risk Radar Summary"
    >
      {/* Header: Title & Risk Index */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--accent)] text-white text-xs shadow-2xs">
            ⚡
          </span>
          <span>Risk Radar</span>
        </div>

        {riskScore !== null && (
          <div className="flex items-center gap-2 font-mono text-xs font-semibold">
            <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider hidden sm:inline">
              {riskLabel}
            </span>
            <span
              className="px-2.5 py-1 rounded-full text-xs font-bold font-mono border"
              style={{
                color: scoreColor,
                backgroundColor: `color-mix(in srgb, ${scoreColor} 10%, transparent)`,
                borderColor: `color-mix(in srgb, ${scoreColor} 30%, transparent)`,
              }}
            >
              {scorePercentage}%
            </span>
          </div>
        )}
      </div>

      {/* Progress / Gauge bar */}
      {riskScore !== null && (
        <div className="w-full bg-[var(--surface-elevated)] rounded-full h-2.5 overflow-hidden border border-[var(--border-subtle)] p-0.5">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${Math.max(scorePercentage, 4)}%`,
              backgroundColor: scoreColor,
            }}
          />
        </div>
      )}

      {/* Top Risks Quick Jump */}
      {highRisks.length > 0 ? (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
            <span className="font-semibold text-[var(--text-primary)]">Priority Attention Required:</span>
            <span className="font-mono text-[10px] text-[var(--severity-high)] font-bold bg-[var(--sev-high-bg)] border border-[var(--sev-high-border)] px-2 py-0.5 rounded-full">
              {highRisks.length} {highRisks.length === 1 ? 'clause' : 'clauses'}
            </span>
          </div>

          <ul className="space-y-2" role="list">
            {highRisks.slice(0, 3).map((risk) => (
              <li key={risk.id}>
                <button
                  type="button"
                  onClick={() => onSelectClause(risk.clauseId)}
                  className="group w-full flex items-center justify-between gap-2.5 rounded-xl p-2.5 text-left text-xs bg-[var(--surface-elevated)] border border-[var(--border-subtle)] hover:border-[var(--severity-high)] hover:bg-[var(--sev-high-bg)] transition-all focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] cursor-pointer shadow-2xs"
                >
                  <span className="font-medium text-[var(--text-primary)] group-hover:text-[var(--sev-high-fg)] truncate">
                    {risk.title}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] font-bold text-[var(--accent)] group-hover:text-[var(--sev-high-fg)] flex items-center gap-1 bg-[var(--surface-raised)] px-2 py-0.5 rounded-md border border-[var(--border-subtle)] shadow-2xs">
                    <span>§ {risk.clauseId}</span>
                    <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] pt-1">
          <SeverityBadge severity="low" />
          <span>No high-severity risks flagged. Standard protections present.</span>
        </div>
      )}
    </div>
  );
}
