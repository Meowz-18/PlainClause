/**
 * Theme toggle button.
 *
 * Switches between light and dark theme using the ThemeProvider context.
 * Accessible with explicit aria-label and visible focus indicator.
 */
'use client';

import React from 'react';
import { useTheme } from './ThemeProvider';

interface ThemeToggleProps {
  className?: string;
}

const emptySubscribe = () => () => {};

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isMounted = React.useSyncExternalStore(emptySubscribe, () => true, () => false);

  if (!isMounted) {
    return (
      <div
        className={`inline-flex items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs min-h-[32px] min-w-[72px] ${className}`}
        aria-hidden="true"
      >
        <span className="opacity-0">Theme</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-secondary)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] min-h-[32px] min-w-[32px] cursor-pointer ${className}`}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
    >
      <span className="flex items-center gap-1.5">
        {theme === 'light' ? (
          <>
            <span aria-hidden="true">🌙</span>
            <span>Dark</span>
          </>
        ) : (
          <>
            <span aria-hidden="true">☀️</span>
            <span>Light</span>
          </>
        )}
      </span>
    </button>
  );
}
