/**
 * PasteInput component.
 *
 * Direct text input fallback for contracts copied from email, Google Docs, or OCR.
 * Also displayed when a scanned PDF (no text layer) is uploaded.
 */
'use client';

import React, { useState } from 'react';

interface PasteInputProps {
  onSubmit: (text: string) => Promise<void> | void;
  onCancel?: () => void;
  isLoading?: boolean;
  initialText?: string;
  errorMessage?: string | null;
}

export function PasteInput({
  onSubmit,
  onCancel,
  isLoading = false,
  initialText = '',
  errorMessage,
}: PasteInputProps) {
  const [text, setText] = useState(initialText);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isLoading) return;
    await onSubmit(text.trim());
  };

  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="paste-contract-text" className="text-xs font-semibold text-[var(--text-secondary)]">
          Paste contract text
        </label>
        <textarea
          id="paste-contract-text"
          rows={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your rental agreement, offer letter, or agreement text here..."
          disabled={isLoading}
          required
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] disabled:opacity-50 resize-y font-mono leading-relaxed"
          aria-describedby="paste-counts"
        />
        <div id="paste-counts" className="flex justify-between items-center text-xs text-[var(--text-secondary)] font-mono">
          <span>{wordCount} words · {charCount} characters</span>
          {charCount > 0 && charCount < 50 && (
            <span className="text-[var(--severity-medium)]">Document may be too short to analyze accurately</span>
          )}
        </div>
      </div>

      {errorMessage && (
        <p role="alert" className="text-xs text-[var(--severity-high)] font-medium">
          {errorMessage}
        </p>
      )}

      <div className="flex items-center justify-end gap-3 pt-1">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading || !text.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
        >
          {isLoading && (
            <span
              className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-solid border-current border-r-transparent motion-reduce:animate-none"
              aria-hidden="true"
            />
          )}
          <span>{isLoading ? 'Parsing document…' : 'Analyze contract'}</span>
        </button>
      </div>
    </form>
  );
}
