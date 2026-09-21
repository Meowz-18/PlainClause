/**
 * FindingsRail component.
 *
 * Implements DESIGN.md §3.2, §4.2, §7.1:
 * - The primary column on the left: leads with findings, not a prompt
 * - High findings expanded by default; Medium and Low collapsed into count-labelled groups
 * - Semantic <ul> container with <article> items
 * - Missing clauses section at the bottom
 * - Information, not legal advice notice
 */
'use client';

import React from 'react';
import type { ClauseFinding, MissingFinding } from '@/lib/types';
import { FindingCard } from './FindingCard';
import { SkeletonCard } from './SkeletonCard';
import { MissingSection } from './MissingSection';
import { RiskRadar } from './RiskRadar';
import { SeverityBadge } from '../ui/SeverityBadge';
import { ExportButtons } from './ExportButtons';
import type { Clause, Triage } from '@/lib/types';

interface FindingsRailProps {
  findings: ClauseFinding[];
  missingFindings?: MissingFinding[];
  clauses?: Clause[];
  triage?: Triage | null;
  filename?: string;
  isLoading?: boolean;
  analyzedCount?: number;
  totalCount?: number;
  riskScore?: number | null;
  highlightedClauseId?: string | null;
  expandedSeverities: Set<string>;
  onToggleSeverity: (severity: string) => void;
  onSelectClause: (clauseId: string) => void;
  onAskAboutFinding?: (question: string) => void;
  className?: string;
}

export function FindingsRail({
  findings,
  missingFindings = [],
  clauses = [],
  triage = null,
  filename = 'document.txt',
  isLoading = false,
  analyzedCount = 0,
  totalCount = 0,
  riskScore = null,
  highlightedClauseId = null,
  expandedSeverities,
  onToggleSeverity,
  onSelectClause,
  onAskAboutFinding,
  className = '',
}: FindingsRailProps) {
  // Group findings by severity
  const highFindings = findings.filter((f) => f.severity === 'high');
  const mediumFindings = findings.filter((f) => f.severity === 'medium');
  const lowFindings = findings.filter((f) => f.severity === 'low');

  return (
    <section
      id="findings-rail"
      aria-labelledby="findings-heading"
      className={`flex h-full flex-col border-r border-[var(--border)] bg-[var(--surface)] ${className}`}
    >
      {/* Rail Header */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4">
        <div className="flex items-center gap-2">
          <h2
            id="findings-heading"
            className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]"
          >
            Key Findings
          </h2>
          {isLoading && (
            <span
              className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--accent)] animate-ping"
              title="Streaming clause analysis in progress"
            />
          )}
        </div>

        {totalCount > 0 && (
          <span className="font-mono text-[11px] text-[var(--text-secondary)] bg-[var(--surface-elevated)] border border-[var(--border-subtle)] px-2 py-0.5 rounded-full">
            {isLoading
              ? `Analysing ${analyzedCount}/${totalCount}`
              : `${findings.length} findings`}
          </span>
        )}
      </div>

      {/* Findings List Container */}
      <div
        tabIndex={0}
        aria-label="Findings list"
        className="custom-scroll flex-1 overflow-y-auto px-4 py-4 space-y-4"
      >
        {/* Empty state while no document/findings */}
        {!isLoading && findings.length === 0 && missingFindings.length === 0 && (
          <div className="py-16 text-center text-xs text-[var(--text-secondary)] space-y-2">
            <span className="text-2xl block mb-2 opacity-60">📑</span>
            <p className="font-medium text-[var(--text-primary)]">Ready for analysis</p>
            <p className="text-[11px] text-[var(--text-tertiary)] max-w-xs mx-auto">
              Select or upload a contract to begin scanning clauses and identifying risks.
            </p>
          </div>
        )}

        {/* Risk Radar — Above the fold summary */}
        {findings.length > 0 && (
          <>
            <RiskRadar
              findings={findings}
              riskScore={riskScore}
              onSelectClause={onSelectClause}
            />
            {clauses.length > 0 && (
              <ExportButtons
                clauses={clauses}
                findings={findings}
                missingFindings={missingFindings}
                triage={triage}
                filename={filename}
              />
            )}
          </>
        )}

        {/* HIGH SEVERITY GROUP (Expanded by default) */}
        {highFindings.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-[var(--border)]">
              <SeverityBadge severity="high" count={highFindings.length} />
              <button
                type="button"
                onClick={() => onToggleSeverity('high')}
                className="text-xs font-mono font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] rounded px-1.5 py-0.5 hover:bg-[var(--surface-elevated)] cursor-pointer"
                aria-expanded={expandedSeverities.has('high')}
              >
                {expandedSeverities.has('high') ? 'Collapse' : 'Expand'}
              </button>
            </div>

            {expandedSeverities.has('high') && (
              <ul className="space-y-3" role="list">
                {highFindings.map((finding) => (
                  <li key={finding.id} className="list-none">
                    <FindingCard
                      finding={finding}
                      isActive={highlightedClauseId === finding.clauseId}
                      onSelectClause={onSelectClause}
                      onAskAboutFinding={onAskAboutFinding}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* MEDIUM SEVERITY GROUP (Collapsed by default per DESIGN.md §1.2 & §3.2) */}
        {mediumFindings.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-[var(--border)]">
              <SeverityBadge severity="medium" count={mediumFindings.length} />
              <button
                type="button"
                onClick={() => onToggleSeverity('medium')}
                className="text-xs font-mono font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] rounded px-1.5 py-0.5 hover:bg-[var(--surface-elevated)] cursor-pointer"
                aria-expanded={expandedSeverities.has('medium')}
              >
                {expandedSeverities.has('medium') ? 'Collapse' : `Show ${mediumFindings.length}`}
              </button>
            </div>

            {expandedSeverities.has('medium') && (
              <ul className="space-y-3" role="list">
                {mediumFindings.map((finding) => (
                  <li key={finding.id} className="list-none">
                    <FindingCard
                      finding={finding}
                      isActive={highlightedClauseId === finding.clauseId}
                      onSelectClause={onSelectClause}
                      onAskAboutFinding={onAskAboutFinding}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* LOW SEVERITY GROUP (Collapsed by default) */}
        {lowFindings.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-[var(--border)]">
              <SeverityBadge severity="low" count={lowFindings.length} />
              <button
                type="button"
                onClick={() => onToggleSeverity('low')}
                className="text-xs font-mono font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] rounded px-1.5 py-0.5 hover:bg-[var(--surface-elevated)] cursor-pointer"
                aria-expanded={expandedSeverities.has('low')}
              >
                {expandedSeverities.has('low') ? 'Collapse' : `Show ${lowFindings.length}`}
              </button>
            </div>

            {expandedSeverities.has('low') && (
              <ul className="space-y-3" role="list">
                {lowFindings.map((finding) => (
                  <li key={finding.id} className="list-none">
                    <FindingCard
                      finding={finding}
                      isActive={highlightedClauseId === finding.clauseId}
                      onSelectClause={onSelectClause}
                      onAskAboutFinding={onAskAboutFinding}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Skeletons when analyzing */}
        {isLoading && (
          <ul className="space-y-3" role="list" aria-label="Loading findings">
            <SkeletonCard />
            <SkeletonCard />
          </ul>
        )}

        {/* MISSING CLAUSES SECTION */}
        <MissingSection missingFindings={missingFindings} />

        {/* Non-dismissible legal notice per FR-4.5 — in-context near findings, not only footer */}
        <div
          role="note"
          aria-label="Legal disclaimer"
          className="border-t border-[var(--border)] pt-4 pb-2 text-[11px] text-[var(--text-secondary)] leading-normal flex items-start gap-1.5"
        >
          <span aria-hidden="true">ℹ</span>
          <p>
            Information, not legal advice. PlainClause helps you understand what you are reading, not what you should do.
          </p>
        </div>
      </div>
    </section>
  );
}
