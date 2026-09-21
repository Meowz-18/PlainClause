/**
 * SkeletonCard component.
 *
 * Implements DESIGN.md §3.2 & §4.3:
 * Shimmer placeholder during streaming analysis.
 * Uses .skeleton shimmer class (respects prefers-reduced-motion).
 */
'use client';

import React from 'react';

export function SkeletonCard() {
  return (
    <li className="card flex flex-col gap-3 list-none">
      <div className="flex items-center justify-between">
        <div className="skeleton h-4 w-20" />
        <div className="skeleton h-3 w-28" />
      </div>
      <div className="skeleton h-5 w-4/5" />
      <div className="space-y-1.5">
        <div className="skeleton h-3.5 w-full" />
        <div className="skeleton h-3.5 w-5/6" />
      </div>
      <div className="skeleton h-3 w-2/3" />
      <div className="flex justify-between pt-1">
        <div className="skeleton h-6 w-24 rounded-sm" />
      </div>
    </li>
  );
}
