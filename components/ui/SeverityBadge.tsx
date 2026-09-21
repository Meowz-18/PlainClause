/**
 * SeverityBadge component.
 *
 * Implements DESIGN.md §4.2:
 * Severity is NEVER communicated by colour alone — always glyph + label + colour.
 * High: ▲ HIGH
 * Medium: ◆ MEDIUM
 * Low: ● LOW
 * Missing / Absent: ○ NOT IN DOCUMENT
 */
'use client';

import React from 'react';
import type { Severity } from '@/lib/types';

interface SeverityBadgeProps {
  severity: Severity | 'absent';
  count?: number;
  className?: string;
}

export function SeverityBadge({ severity, count, className = '' }: SeverityBadgeProps) {
  let glyph = '';
  let label = '';
  let colorClass = '';

  switch (severity) {
    case 'high':
      glyph = '▲';
      label = 'HIGH';
      colorClass = 'severity-high';
      break;
    case 'medium':
      glyph = '◆';
      label = 'MEDIUM';
      colorClass = 'severity-medium';
      break;
    case 'low':
      glyph = '●';
      label = 'LOW';
      colorClass = 'severity-low';
      break;
    case 'absent':
      glyph = '○';
      label = 'NOT IN DOCUMENT';
      colorClass = 'severity-absent';
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-wider ${colorClass} ${className}`}
      aria-label={`Severity: ${label}${count !== undefined ? `, count ${count}` : ''}`}
    >
      <span aria-hidden="true" className="text-[11px] leading-none">
        {glyph}
      </span>
      <span>{label}</span>
      {count !== undefined && (
        <span className="opacity-75 font-normal">×{count}</span>
      )}
    </span>
  );
}
