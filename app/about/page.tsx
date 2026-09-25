/**
 * About Page — /about
 *
 * Implements DESIGN.md §2 & §3:
 * Explains what PlainClause is, what it isn't, and its privacy & security posture.
 */
'use client';

import React from 'react';
import Link from 'next/link';
import { Header } from '@/components/ui/Header';

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--surface)] text-[var(--text-primary)]">
      <Header showDocInfo={false} />

      <main id="main-content" tabIndex={-1} className="flex flex-1 flex-col items-center px-4 py-12 sm:px-6 sm:py-16 focus:outline-none">
        <article className="w-full max-w-2xl space-y-8">
          {/* Page Heading */}
          <div className="space-y-3 border-b border-[var(--border)] pb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-0.5 text-xs font-medium text-[var(--accent)] shadow-2xs">
              <span className="font-mono text-[10px] uppercase tracking-wide">PlainClause Principles</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)]">
              About PlainClause
            </h1>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              A legal-document comprehension instrument designed to help you read, verify, and question agreements before signing.
            </p>
          </div>

          {/* Section 1: What PlainClause Is */}
          <section aria-labelledby="what-is-heading" className="space-y-3 card">
            <h2 id="what-is-heading" className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span aria-hidden="true">🧭</span>
              <span>Findings-First Architecture</span>
            </h2>
            <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
              Most AI document tools provide a chat box next to a PDF and expect you to know what to ask.
              PlainClause inverts this paradigm: <strong>we lead with findings, not a prompt.</strong>
            </p>
            <ul className="space-y-2.5 text-xs text-[var(--text-secondary)] leading-relaxed pt-1">
              <li className="flex items-start gap-2">
                <span className="text-[var(--accent)] font-bold" aria-hidden="true">▪</span>
                <span>
                  <strong className="text-[var(--text-primary)]">Source document is always visible:</strong> Findings are claims about a document;
                  a claim you cannot immediately verify against original text is untrustworthy. The reading pane is the evidence.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--accent)] font-bold" aria-hidden="true">▪</span>
                <span>
                  <strong className="text-[var(--text-primary)]">Ranked analytical hierarchy:</strong> High-risk clauses appear above the fold, while standard terms are grouped so you don&apos;t drown in noise.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--accent)] font-bold" aria-hidden="true">▪</span>
                <span>
                  <strong className="text-[var(--text-primary)]">Omission detection:</strong> What is missing is often what hurts you most. We verify whether standard protections (like landlord repair duties or notice periods) were omitted.
                </span>
              </li>
            </ul>
          </section>

          {/* Section 2: What It Isn't */}
          <section aria-labelledby="what-is-not-heading" className="space-y-3">
            <div className="rounded-xl border border-[var(--severity-medium)] bg-[var(--sev-medium-bg)] p-4 text-xs leading-relaxed text-[var(--text-primary)] shadow-xs space-y-1.5">
              <p className="font-bold flex items-center gap-1.5 text-[var(--sev-medium-fg)] text-sm">
                <span aria-hidden="true">⚖️</span>
                <span>Information, Not Legal Advice</span>
              </p>
              <p className="text-[var(--text-secondary)]">
                PlainClause explains complex legalese into plain language, highlights market deviations, and drafts actionable negotiation questions. It is not a licensed attorney, does not create an advocate-client relationship, and never tells you whether to execute an agreement.
              </p>
            </div>
          </section>

          {/* Section 3: Privacy & Zero-Retention Architecture */}
          <section aria-labelledby="privacy-heading" className="space-y-3 card">
            <h2 id="privacy-heading" className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span aria-hidden="true">🔒</span>
              <span>Privacy by Architecture</span>
            </h2>
            <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
              Legal agreements contain your most confidential personal, commercial, and financial terms. PlainClause treats privacy as an invariant:
            </p>
            <ul className="space-y-2.5 text-xs text-[var(--text-secondary)] leading-relaxed pt-1">
              <li className="flex items-start gap-2">
                <span className="text-[var(--accent)] font-bold" aria-hidden="true">▪</span>
                <span>
                  <strong className="text-[var(--text-primary)]">Zero Storage:</strong> Everything is held strictly in ephemeral RAM and browser state. The moment you close the tab, all text is gone forever.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--accent)] font-bold" aria-hidden="true">▪</span>
                <span>
                  <strong className="text-[var(--text-primary)]">Pre-Model PII Redaction:</strong> Aadhaar numbers, PAN cards, phone numbers, and emails are replaced with synthetic tokens before passing to any reasoning pipeline.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--accent)] font-bold" aria-hidden="true">▪</span>
                <span>
                  <strong className="text-[var(--text-primary)]">No Accounts or Telemetry:</strong> No logins, no cookies, no tracking pixels, and no data harvesting.
                </span>
              </li>
            </ul>
          </section>

          {/* Back link */}
          <div className="pt-6 border-t border-[var(--border)] flex justify-between items-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--accent)] hover:underline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] rounded-md py-1"
            >
              <span aria-hidden="true">←</span>
              <span>Return to document upload</span>
            </Link>
            <span className="font-mono text-xs text-[var(--text-secondary)] bg-[var(--surface-elevated)] px-2.5 py-1 rounded-md border border-[var(--border-subtle)]">
              PlainClause v0.1.0 · Hackathon Edition
            </span>
          </div>
        </article>
      </main>
    </div>
  );
}
