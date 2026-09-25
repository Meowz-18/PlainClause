/**
 * UploadZone component.
 *
 * Implements DESIGN.md §3.1:
 * Drag-and-drop target + file input + paste fallback trigger.
 * Handles PDF, DOCX, TXT files up to 10MB.
 */
'use client';

import React, { useState, useRef, useCallback } from 'react';
import { MAX_FILE_SIZE_BYTES } from '@/lib/constants';
import { PasteInput } from './PasteInput';

interface UploadZoneProps {
  onFileSelected: (file: File) => Promise<void> | void;
  onTextSubmitted: (text: string) => Promise<void> | void;
  isLoading?: boolean;
  errorMessage?: string | null;
  scannedPdfDetected?: boolean;
}

export function UploadZone({
  onFileSelected,
  onTextSubmitted,
  isLoading = false,
  errorMessage = null,
  scannedPdfDetected = false,
}: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [manualPasteMode, setManualPasteMode] = useState<boolean | null>(null);
  const isPasteMode = manualPasteMode ?? scannedPdfDetected;
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndProcessFile = useCallback(
    async (file: File) => {
      setLocalError(null);

      if (file.size > MAX_FILE_SIZE_BYTES) {
        setLocalError(
          `File is ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum allowed size is 10MB.`
        );
        return;
      }

      const lowerName = file.name.toLowerCase();
      const isValidExt =
        lowerName.endsWith('.pdf') ||
        lowerName.endsWith('.docx') ||
        lowerName.endsWith('.txt');

      if (!isValidExt) {
        setLocalError('Please upload a PDF, DOCX, or plain text (.txt) document.');
        return;
      }

      await onFileSelected(file);
    },
    [onFileSelected]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoading) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (isLoading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndProcessFile(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      validateAndProcessFile(file);
      // Reset input value so re-selecting same file triggers change
      e.target.value = '';
    }
  };

  if (isPasteMode) {
    return (
      <div className="w-full max-w-xl card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Paste Document Text</h2>
          <button
            type="button"
            onClick={() => setManualPasteMode(false)}
            className="text-xs text-[var(--accent)] hover:underline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] rounded"
          >
            ← Back to file upload
          </button>
        </div>

        {scannedPdfDetected && (
          <div role="alert" className="mb-4 rounded-md border border-[var(--severity-medium)] bg-[var(--surface)] p-3 text-xs leading-relaxed text-[var(--text-primary)]">
            <p className="font-semibold text-[var(--severity-medium)] mb-1">
              Scanned or Image-only PDF Detected
            </p>
            <p>
              This PDF has no selectable text layer — it appears to be a scan or photo.
              PlainClause runs on selectable text. You can paste the document text below or try a text-based copy.
            </p>
          </div>
        )}

        <PasteInput
          onSubmit={onTextSubmitted}
          onCancel={() => setManualPasteMode(false)}
          isLoading={isLoading}
          errorMessage={localError || errorMessage}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl flex flex-col gap-3">
      <div
        data-testid="upload-zone"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`drop-zone upload-zone group flex flex-col items-center justify-center gap-5 p-8 sm:p-12 rounded-3xl border-2 border-dashed border-[var(--border-strong)] bg-[var(--surface-raised)] shadow-card hover:shadow-elevated hover:border-[var(--accent)] transition-all duration-200 cursor-pointer ${
          isDragOver ? 'drag-over scale-[1.01] border-[var(--accent)] ring-4 ring-[var(--accent-ring)]' : ''
        } ${isLoading ? 'opacity-60 cursor-wait' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          onChange={handleFileInputChange}
          disabled={isLoading}
          aria-label="Upload document file"
          className="sr-only"
          tabIndex={-1}
        />

        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--surface-elevated)] to-[var(--accent-subtle)] border border-[var(--border)] text-3xl shadow-xs group-hover:scale-110 group-hover:border-[var(--accent)] transition-all duration-200" aria-hidden="true">
          {isLoading ? (
            <span className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-solid border-[var(--accent)] border-r-transparent" />
          ) : (
            <span aria-hidden="true">📄</span>
          )}
        </div>

        <div className="flex flex-col items-center text-center gap-2">
          <p className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
            {isLoading ? 'Reading and preparing document…' : 'Drop your contract here'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-[var(--text-secondary)]">
            <span>or</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--surface-elevated)] border border-[var(--border)] text-xs font-semibold text-[var(--accent)] hover:bg-[var(--accent-subtle)] hover:border-[var(--accent)] focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] transition-all cursor-pointer shadow-2xs"
            >
              <span aria-hidden="true">📁</span>
              <span>browse from device</span>
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setManualPasteMode(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--surface-elevated)] border border-[var(--border)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface)] hover:border-[var(--accent)] focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] transition-all cursor-pointer shadow-2xs"
            >
              <span aria-hidden="true">📋</span>
              <span>paste text</span>
            </button>
          </div>
        </div>

        {/* File Format Pill Badges */}
        <div className="flex items-center gap-2 pt-1">
          <span className="rounded-md bg-[var(--surface-elevated)] border border-[var(--border-subtle)] px-2.5 py-1 font-mono text-[10px] font-bold text-[var(--text-secondary)] shadow-2xs">
            PDF
          </span>
          <span className="rounded-md bg-[var(--surface-elevated)] border border-[var(--border-subtle)] px-2.5 py-1 font-mono text-[10px] font-bold text-[var(--text-secondary)] shadow-2xs">
            DOCX
          </span>
          <span className="rounded-md bg-[var(--surface-elevated)] border border-[var(--border-subtle)] px-2.5 py-1 font-mono text-[10px] font-bold text-[var(--text-secondary)] shadow-2xs">
            TXT
          </span>
          <span className="text-[11px] text-[var(--text-tertiary)] font-mono ml-1">
            (up to 10MB)
          </span>
        </div>
      </div>

      {(localError || errorMessage) && (
        <div role="alert" className="rounded-md border border-[var(--severity-high)] bg-[var(--sev-high-bg)] p-3 text-center text-xs font-medium text-[var(--sev-high-fg)]">
          {localError || errorMessage}
        </div>
      )}
    </div>
  );
}
