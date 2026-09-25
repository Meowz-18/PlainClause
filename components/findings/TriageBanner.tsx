/**
 * TriageBanner Component.
 *
 * Implements DESIGN.md §3.2:
 * Displays document type, jurisdiction, language, and redacted PII token count.
 * Provides an inline playbook override dropdown with confirmation.
 */
'use client';

import React, { useState } from 'react';
import type { Triage } from '@/lib/types';
import { getAllPlaybooks } from '@/lib/playbooks/index';

interface TriageBannerProps {
  triage: Triage | null;
  redactionCount?: number;
  charCount: number;
  clauseCount: number;
  activePlaybookId?: string;
  onPlaybookChange?: (playbookId: string) => void;
  disabled?: boolean;
}

export function TriageBanner({
  triage,
  redactionCount = 0,
  charCount,
  clauseCount,
  activePlaybookId,
  onPlaybookChange,
  disabled = false,
}: TriageBannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const playbooks = getAllPlaybooks();

  const handleSelect = (pId: string) => {
    setIsOpen(false);
    if (onPlaybookChange && pId !== activePlaybookId) {
      onPlaybookChange(pId);
    }
  };

  const docTypeIcon =
    triage?.documentType === 'rental_residential'
      ? '🏠'
      : triage?.documentType === 'employment'
      ? '💼'
      : '📜';

  const docTypeLabel = triage?.documentType
    ? triage.documentType.replace(/_/g, ' ')
    : 'Contract Analysis';

  return (
    <div className="relative flex shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--surface-raised)] px-4 py-2 text-xs shadow-2xs">
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        {/* Document Type Pill */}
        <div className="inline-flex items-center gap-1.5 rounded-md bg-[var(--surface-elevated)] border border-[var(--border-subtle)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-primary)]">
          <span aria-hidden="true">{docTypeIcon}</span>
          <span className="uppercase tracking-wide">{docTypeLabel}</span>
        </div>

        {/* Jurisdiction Pill */}
        <div className="inline-flex items-center gap-1 rounded-md bg-[var(--surface)] border border-[var(--border-subtle)] px-2 py-1 text-[11px] text-[var(--text-secondary)] font-mono">
          <span aria-hidden="true">📍</span>
          <span>{triage?.jurisdiction || 'India / General'}</span>
        </div>

        {/* Language */}
        <span className="rounded bg-[var(--surface)] border border-[var(--border-subtle)] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[var(--text-tertiary)]">
          {triage?.language?.toUpperCase() || 'EN'}
        </span>

        {/* Redaction Shield Pill */}
        {redactionCount > 0 && (
          <div className="inline-flex items-center gap-1.5 rounded-md bg-[var(--sev-low-bg)] border border-[var(--sev-low-border)] px-2 py-0.5 font-mono text-[11px] font-medium text-[var(--sev-low-fg)]">
            <span aria-hidden="true">🛡️</span>
            <span>{redactionCount} PII Redacted</span>
          </div>
        )}

        {/* Change Playbook Override Button */}
        {onPlaybookChange && (
          <div className="relative inline-block ml-1">
            <button
              type="button"
              disabled={disabled}
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] hover:bg-[var(--surface)] transition-all focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] disabled:opacity-50 cursor-pointer shadow-2xs"
              aria-expanded={isOpen}
              aria-label="Change document type or playbook"
            >
              <span>Playbook: {activePlaybookId || triage?.documentType || 'Auto'}</span>
              <span aria-hidden="true" className="text-[9px] opacity-70">▼</span>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
              <div className="absolute left-0 top-full mt-1.5 z-50 w-72 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-2 shadow-popover">
                <p className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--border-subtle)] pb-1.5 mb-1">
                  Select Legal Playbook
                </p>
                <div className="space-y-1">
                  {playbooks.map((p) => {
                    const isSelected = p.id === (activePlaybookId || triage?.documentType);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelect(p.id)}
                        className={`w-full text-left rounded-lg p-2 text-xs transition-colors hover:bg-[var(--surface-elevated)] ${
                          isSelected
                            ? 'bg-[var(--accent-subtle)] font-semibold text-[var(--accent)] border border-[var(--accent-ring)]'
                            : 'text-[var(--text-primary)]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{p.displayName}</span>
                          {isSelected && <span className="font-bold">✓</span>}
                        </div>
                        <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">{p.jurisdiction}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="hidden sm:flex items-center gap-2 font-mono text-[11px] text-[var(--text-secondary)]">
        <span className="rounded bg-[var(--surface)] px-2 py-0.5 border border-[var(--border-subtle)]">
          {charCount.toLocaleString()} chars
        </span>
        <span className="rounded bg-[var(--surface)] px-2 py-0.5 border border-[var(--border-subtle)]">
          {clauseCount} clauses
        </span>
      </div>
    </div>
  );
}
