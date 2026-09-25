/**
 * SampleButtons component.
 *
 * Provides one-click sample document loading from DESIGN.md §3.1:
 * [ Mumbai rent agreement ] [ Offer letter ] [ Freelance contract ]
 */
'use client';

import React, { useState } from 'react';

interface SampleButtonsProps {
  onSelectSample: (sampleId: string) => Promise<void> | void;
  disabled?: boolean;
}

interface SampleMeta {
  id: string;
  title: string;
  category: string;
  tag: string;
  icon: string;
}

const SAMPLES: SampleMeta[] = [
  {
    id: 'rent-agreement-mumbai',
    title: 'Mumbai Rental Agreement',
    category: 'Residential Tenancy',
    tag: '12 clauses · Lock-in & Deposit',
    icon: '🏢',
  },
  {
    id: 'offer-letter',
    title: 'Tech Employment Offer',
    category: 'Full-time SDE',
    tag: '14 clauses · IP & Non-Compete',
    icon: '💼',
  },
  {
    id: 'freelance-msa',
    title: 'Freelance Agreement',
    category: 'Master Services (MSA)',
    tag: '10 clauses · Milestones & IP',
    icon: '🤝',
  },
];

export function SampleButtons({ onSelectSample, disabled = false }: SampleButtonsProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleClick = async (sampleId: string) => {
    if (disabled || loadingId) return;
    setLoadingId(sampleId);
    try {
      await onSelectSample(sampleId);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <section aria-labelledby="sample-documents-heading" className="flex flex-col items-center gap-3 w-full max-w-2xl">
      <div className="flex items-center gap-3">
        <span className="h-px w-10 bg-[var(--border)]" aria-hidden="true" />
        <h2 id="sample-documents-heading" className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] font-mono">
          Try a sample
        </h2>
        <span className="h-px w-10 bg-[var(--border)]" aria-hidden="true" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full">
        {SAMPLES.map((sample) => {
          const isLoading = loadingId === sample.id;
          return (
            <button
              key={sample.id}
              type="button"
              onClick={() => handleClick(sample.id)}
              disabled={disabled || loadingId !== null}
              className="group relative flex flex-col items-start text-left p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] hover:border-[var(--accent)] hover:bg-[var(--surface-elevated)] transition-all duration-200 shadow-xs hover:shadow-elevated hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              aria-label={`Load sample: ${sample.title}`}
            >
              <div className="flex items-center justify-between w-full mb-2.5">
                <span
                  className="text-xl p-2 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] group-hover:scale-110 group-hover:shadow-2xs transition-all"
                  aria-hidden="true"
                >
                  {sample.icon}
                </span>
                {isLoading ? (
                  <span
                    className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-[var(--accent)] border-r-transparent"
                    aria-hidden="true"
                  />
                ) : (
                  <span className="text-[11px] font-mono text-[var(--accent)] font-bold group-hover:translate-x-0.5 transition-all">
                    Evaluate <span aria-hidden="true">→</span>
                  </span>
                )}
              </div>

              <span className="font-bold text-sm text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors leading-snug">
                {sample.title}
              </span>

              <span className="text-xs text-[var(--text-secondary)] mt-0.5 font-medium">
                {sample.category}
              </span>

              <span className="mt-3 text-[10px] font-mono font-medium text-[var(--text-tertiary)] bg-[var(--surface)] px-2.5 py-1 rounded-md border border-[var(--border-subtle)] group-hover:border-[var(--border-strong)] transition-colors">
                {sample.tag}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
