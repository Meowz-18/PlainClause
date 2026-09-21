/**
 * ClauseBlock component.
 *
 * Renders a single addressable clause in the reading pane.
 * Uses <mark> for highlights with accessible names per DESIGN.md §7.3.
 * Supports click to focus finding and keyboard interaction.
 */
'use client';

import React from 'react';
import type { Clause } from '@/lib/types';

interface ClauseBlockProps {
  clause: Clause;
  isHighlighted: boolean;
  hasFinding?: boolean;
  findingSeverity?: 'high' | 'medium' | 'low';
  onClick?: (clauseId: string) => void;
}

export function ClauseBlock({
  clause,
  isHighlighted,
  hasFinding = false,
  findingSeverity,
  onClick,
}: ClauseBlockProps) {
  const handleClick = () => {
    if (onClick) {
      onClick(clause.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  // Container styling based on active state and finding severity
  const severityClasses = isHighlighted
    ? 'bg-amber-500/10 border-l-[4px] border-l-amber-500 shadow-sm ring-1 ring-amber-500/30 p-4 -mx-3 rounded-xl'
    : findingSeverity === 'high'
    ? 'border-l-[4px] border-l-[var(--severity-high)] bg-rose-500/[0.03] hover:bg-rose-500/[0.08] p-3.5 -mx-3 rounded-xl'
    : findingSeverity === 'medium'
    ? 'border-l-[4px] border-l-[var(--severity-medium)] bg-amber-500/[0.03] hover:bg-amber-500/[0.08] p-3.5 -mx-3 rounded-xl'
    : findingSeverity === 'low'
    ? 'border-l-[4px] border-l-[var(--severity-low)] bg-emerald-500/[0.03] hover:bg-emerald-500/[0.08] p-3.5 -mx-3 rounded-xl'
    : hasFinding
    ? 'border-l-[4px] border-l-[var(--border-strong)] hover:bg-[var(--surface-elevated)]/60 p-3.5 -mx-3 rounded-xl'
    : 'border-l-[4px] border-l-transparent hover:bg-[var(--surface-elevated)]/60 p-3.5 -mx-3 rounded-xl';

  return (
    <div
      id={`clause-${clause.id}`}
      tabIndex={0}
      role="region"
      aria-label={`Clause ${clause.label || clause.id}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`group relative transition-all duration-150 focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] cursor-pointer select-text ${severityClasses}`}
    >
      {/* Clause header / gutter info */}
      <div className="mb-2 flex items-center justify-between font-mono text-[11px] text-[var(--text-secondary)] select-none">
        <div className="flex items-center gap-2 truncate">
          <span className="font-bold text-[var(--accent)] bg-[var(--surface-elevated)] border border-[var(--border-subtle)] px-2 py-0.5 rounded-md text-[10px] shadow-2xs">
            § {clause.id}
          </span>
          {clause.label && (
            <span className="font-bold text-[var(--text-primary)]">
              {clause.label}
            </span>
          )}
          {clause.heading && (
            <span className="italic text-[var(--text-tertiary)] truncate">
              {clause.heading}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-2">
          {hasFinding && findingSeverity && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                findingSeverity === 'high'
                  ? 'bg-[var(--sev-high-bg)] text-[var(--sev-high-fg)] border border-[var(--sev-high-border)]'
                  : findingSeverity === 'medium'
                  ? 'bg-[var(--sev-medium-bg)] text-[var(--sev-medium-fg)] border border-[var(--sev-medium-border)]'
                  : 'bg-[var(--sev-low-bg)] text-[var(--sev-low-fg)] border border-[var(--sev-low-border)]'
              }`}
            >
              <span>{findingSeverity === 'high' ? '▲' : findingSeverity === 'medium' ? '◆' : '●'}</span>
              <span>{findingSeverity}</span>
            </span>
          )}
          {clause.page !== null && (
            <span className="text-[10px] text-[var(--text-tertiary)] font-mono bg-[var(--surface-elevated)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)]">
              p. {clause.page}
            </span>
          )}
        </div>
      </div>

      {/* Clause text */}
      <div className="font-document text-inherit leading-[1.8] text-[var(--text-primary)]">
        {isHighlighted ? (
          <mark
            className="clause-highlight leading-[1.8]"
            aria-label={`Highlighted: Clause ${clause.label || clause.id}`}
          >
            {clause.text}
          </mark>
        ) : (
          <span>{clause.text}</span>
        )}
      </div>
    </div>
  );
}
