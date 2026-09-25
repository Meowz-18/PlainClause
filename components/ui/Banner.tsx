/**
 * Reusable Banner component.
 *
 * Used for triage status, safety notices, model errors, and informational banners.
 * Semantic role="alert" or role="status" depending on severity/type.
 */
'use client';

import React from 'react';

type BannerVariant = 'info' | 'warning' | 'error' | 'neutral';

interface BannerProps {
  variant?: BannerVariant;
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  role?: 'alert' | 'status' | 'region';
}

export function Banner({
  variant = 'info',
  title,
  children,
  action,
  className = '',
  role,
}: BannerProps) {
  const defaultRole = variant === 'error' ? 'alert' : variant === 'warning' ? 'alert' : 'status';
  const effectiveRole = role || defaultRole;

  const variantStyles = {
    info: 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-primary)]',
    neutral: 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)]',
    warning: 'border-[var(--severity-medium)] bg-[var(--surface-raised)] text-[var(--text-primary)]',
    error: 'border-[var(--severity-high)] bg-[var(--surface-raised)] text-[var(--text-primary)]',
  }[variant];

  const iconMap = {
    info: 'ℹ',
    neutral: '•',
    warning: '⚠',
    error: '▲',
  }[variant];

  return (
    <div
      role={effectiveRole}
      className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm transition-colors ${variantStyles} ${className}`}
    >
      <div className="flex items-start gap-2.5 min-w-0">
        <span aria-hidden="true" className="font-mono text-base font-bold select-none shrink-0">
          {iconMap}
        </span>
        <div className="min-w-0">
          {title && <p className="font-semibold mb-0.5">{title}</p>}
          <div className="text-xs leading-relaxed">{children}</div>
        </div>
      </div>
      {action && <div className="shrink-0 ml-2">{action}</div>}
    </div>
  );
}
