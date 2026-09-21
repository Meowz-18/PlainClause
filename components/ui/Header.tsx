/**
 * Main application header.
 *
 * Semantic <header> landmark per DESIGN.md §7.1.
 * Shows branding, active document name/page count if loaded, and controls.
 */
'use client';

import React from 'react';
import Link from 'next/link';
import { useDocumentStore } from '@/store/document-store';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  showDocInfo?: boolean;
}

export function Header({ showDocInfo = true }: HeaderProps) {
  const document = useDocumentStore((state) => state.document);
  const reset = useDocumentStore((state) => state.reset);

  return (
    <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-[var(--border)] bg-[var(--surface)]/85 px-4 sm:px-6 backdrop-blur-md shadow-xs">
      {/* Left: Branding & home link */}
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="group flex items-center gap-2.5 text-base font-bold tracking-tight text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] rounded-md py-1"
          aria-label="PlainClause Home"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)] text-white shadow-xs group-hover:scale-105 transition-transform">
            <span className="font-document text-lg italic leading-none">§</span>
          </span>
          <span className="tracking-tight text-sm sm:text-base font-semibold">PlainClause</span>
        </Link>

        {/* Center/Context: Loaded document name and pages */}
        {showDocInfo && document && (
          <div className="hidden sm:flex items-center gap-2 text-xs text-[var(--text-secondary)] border-l border-[var(--border)] pl-4 max-w-md">
            <span className="font-medium text-[var(--text-primary)] truncate max-w-[180px] sm:max-w-[220px]" title={document.filename}>
              {document.filename}
            </span>
            {document.pageCount && (
              <span className="rounded-full bg-[var(--surface-elevated)] border border-[var(--border-subtle)] px-2 py-0.5 font-mono text-[10px] text-[var(--text-secondary)]">
                {document.pageCount} {document.pageCount === 1 ? 'page' : 'pages'}
              </span>
            )}
            <span className="rounded-full bg-[var(--surface-elevated)] border border-[var(--border-subtle)] px-2 py-0.5 font-mono text-[10px] text-[var(--text-secondary)]">
              {document.clauses.length} clauses
            </span>
          </div>
        )}
      </div>

      {/* Right: Navigation actions and theme toggle */}
      <nav aria-label="Main Navigation" className="flex items-center gap-2 sm:gap-3">
        {showDocInfo && document && (
          <Link
            href="/"
            onClick={() => reset()}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-secondary)] transition-all shadow-xs focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
            title="Upload or analyze another document"
          >
            <span>+</span>
            <span>New Document</span>
          </Link>
        )}

        <Link
          href="/about"
          className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] px-2.5 py-1.5 rounded-md hover:bg-[var(--surface-elevated)]"
        >
          About
        </Link>

        <ThemeToggle />
      </nav>
    </header>
  );
}
