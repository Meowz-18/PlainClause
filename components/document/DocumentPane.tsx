/**
 * DocumentPane component.
 *
 * Implements DESIGN.md §3.2 & §4.1:
 * - The source document is always visible as primary evidence
 * - Typeface: Source Serif 4
 * - Three-step font size control: 16px / 18px / 21px for accessibility
 * - Line length constrained to 68ch
 * - Bidirectional linking: scrolls to highlighted clause, notifies finding on clause click
 */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { Clause, ClauseFinding } from '@/lib/types';
import { ClauseBlock } from './ClauseBlock';

interface DocumentPaneProps {
  clauses: Clause[];
  findings?: ClauseFinding[];
  highlightedClauseId: string | null;
  onClauseClick?: (clauseId: string) => void;
  className?: string;
}

type FontSizeStep = 'sm' | 'base' | 'lg';

export function DocumentPane({
  clauses,
  findings = [],
  highlightedClauseId,
  onClauseClick,
  className = '',
}: DocumentPaneProps) {
  const [fontSize, setFontSize] = useState<FontSizeStep>('base');
  const containerRef = useRef<HTMLDivElement>(null);

  // Map finding by clauseId
  const findingsByClauseId = React.useMemo(() => {
    const map = new Map<string, { severity: 'high' | 'medium' | 'low' }>();
    for (const f of findings) {
      const existing = map.get(f.clauseId);
      if (!existing || (f.severity === 'high' && existing.severity !== 'high')) {
        map.set(f.clauseId, { severity: f.severity });
      }
    }
    return map;
  }, [findings]);

  // Scroll to highlighted clause when it changes
  useEffect(() => {
    if (!highlightedClauseId) return;

    const element = document.getElementById(`clause-${highlightedClauseId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightedClauseId]);

  const fontSizeClass =
    fontSize === 'sm'
      ? 'text-[15px]'
      : fontSize === 'base'
      ? 'text-[17px]'
      : 'text-[20px]';

  const documentTitle = React.useMemo(() => {
    if (clauses.length > 0) {
      if (clauses[0].heading && clauses[0].heading.length < 80) {
        return clauses[0].heading;
      }
      if (clauses[0].label && clauses[0].label.length < 80) {
        return clauses[0].label;
      }
      const firstLine = clauses[0].text.split('\n')[0].trim();
      if (firstLine.length < 90 && /agreement|contract|lease|letter|terms/i.test(firstLine)) {
        return firstLine;
      }
    }
    return 'Executed Legal Agreement';
  }, [clauses]);

  return (
    <section
      id="document-pane"
      aria-labelledby="document-pane-heading"
      className={`flex h-full flex-col border-r border-[var(--border)] bg-[var(--canvas-bg)] ${className}`}
    >
      {/* Pane header with font size controls */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 select-none z-10 shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="font-document italic text-sm text-[var(--accent)]" aria-hidden="true">
            §
          </span>
          <h2
            id="document-pane-heading"
            className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]"
          >
            Source Contract
          </h2>
          <span className="text-[10px] font-mono text-[var(--text-tertiary)] hidden sm:inline">
            (Primary Evidence)
          </span>
        </div>

        {/* 3-step font size control */}
        <div
          role="group"
          aria-label="Document font size"
          className="flex items-center gap-0.5 border border-[var(--border)] rounded-lg p-0.5 bg-[var(--surface-raised)] shadow-2xs"
        >
          <button
            type="button"
            onClick={() => setFontSize('sm')}
            className={`px-2 py-0.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
              fontSize === 'sm'
                ? 'bg-[var(--accent)] text-white font-semibold shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-elevated)]'
            }`}
            aria-label="Small font size"
            aria-pressed={fontSize === 'sm'}
          >
            A-
          </button>
          <button
            type="button"
            onClick={() => setFontSize('base')}
            className={`px-2 py-0.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
              fontSize === 'base'
                ? 'bg-[var(--accent)] text-white font-semibold shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-elevated)]'
            }`}
            aria-label="Default font size"
            aria-pressed={fontSize === 'base'}
          >
            A
          </button>
          <button
            type="button"
            onClick={() => setFontSize('lg')}
            className={`px-2 py-0.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
              fontSize === 'lg'
                ? 'bg-[var(--accent)] text-white font-semibold shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-elevated)]'
            }`}
            aria-label="Large font size"
            aria-pressed={fontSize === 'lg'}
          >
            A+
          </button>
        </div>
      </div>

      {/* Reading pane content - Floating Manuscript Desk */}
      <div
        ref={containerRef}
        tabIndex={0}
        aria-label="Source contract text"
        className="custom-scroll flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8 bg-[var(--canvas-bg)]"
      >
        <div className={`mx-auto max-w-[760px] document-sheet rounded-2xl p-6 sm:p-12 md:p-14 ${fontSizeClass}`}>
          {/* Formal Legal Document Header / Masthead */}
          <div className="pb-8 mb-8 border-b border-[var(--border-subtle)] text-center relative select-none">
            <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--accent)] font-document text-xl mb-3 shadow-2xs">
              §
            </div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-tertiary)] mb-1.5">
              Official Executed Instrument · Primary Evidence
            </p>
            <h1 className="font-document text-lg sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              {documentTitle}
            </h1>
            <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2 text-[11px] font-mono text-[var(--text-secondary)]">
              <span className="bg-[var(--surface-elevated)] border border-[var(--border-subtle)] px-2.5 py-0.5 rounded-full">
                {clauses.length} Clauses
              </span>
              <span className="text-[var(--text-tertiary)]">•</span>
              <span className="bg-[var(--surface-elevated)] border border-[var(--border-subtle)] px-2.5 py-0.5 rounded-full">
                Strict Grounding
              </span>
              <span className="text-[var(--text-tertiary)]">•</span>
              <span className="bg-[var(--sev-low-bg)] border border-[var(--sev-low-border)] text-[var(--sev-low-fg)] px-2.5 py-0.5 rounded-full font-medium">
                Live Risk Audit
              </span>
            </div>
          </div>

          {/* Clauses List */}
          {clauses.length === 0 ? (
            <div className="py-12 text-center text-sm text-[var(--text-secondary)]">
              No document text loaded.
            </div>
          ) : (
            <div className="space-y-4">
              {clauses.map((clause) => {
                const finding = findingsByClauseId.get(clause.id);
                const isHighlighted = clause.id === highlightedClauseId;

                return (
                  <ClauseBlock
                    key={clause.id}
                    clause={clause}
                    isHighlighted={isHighlighted}
                    hasFinding={!!finding}
                    findingSeverity={finding?.severity}
                    onClick={onClauseClick}
                  />
                );
              })}
            </div>
          )}

          {/* Official Document Footer Stamp */}
          <div className="mt-12 pt-8 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] font-mono text-[var(--text-tertiary)] select-none">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-[var(--accent)]" />
              <span>PlainClause Verified Evidence Layer</span>
            </div>
            <span>End of Document Instrument</span>
          </div>
        </div>
      </div>
    </section>
  );
}
