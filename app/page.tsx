/**
 * Landing Page — /
 *
 * Implements DESIGN.md §3.1:
 * - Single decision: give us a document
 * - Upload zone (drop, browse, paste text fallback)
 * - Sample contract buttons (1-click evaluation)
 * - Prominent privacy guarantee above the fold
 * - Information, not legal advice notice
 * - No sign-up, no email capture, no modals
 */
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/ui/Header';
import { UploadZone } from '@/components/upload/UploadZone';
import { SampleButtons } from '@/components/upload/SampleButtons';
import { useDocumentStore } from '@/store/document-store';
import type { ParsedDocument } from '@/lib/types';
import { ERROR_CODE } from '@/lib/constants';

export default function LandingPage() {
  const router = useRouter();
  const setDocument = useDocumentStore((state) => state.setDocument);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scannedPdfDetected, setScannedPdfDetected] = useState(false);

  /** Handle file upload */
  const handleFileSelected = async (file: File) => {
    setIsLoading(true);
    setErrorMessage(null);
    setScannedPdfDetected(false);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/parse', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === ERROR_CODE.NO_TEXT_LAYER) {
          setScannedPdfDetected(true);
          setErrorMessage(
            data.message ||
              'This PDF has no selectable text layer. It appears to be a scan or photo. PlainClause requires text to analyze. You can paste the text instead.'
          );
        } else {
          setErrorMessage(data.message || data.error || 'Failed to parse document');
        }
        return;
      }

      // Success
      setDocument(data as ParsedDocument);
      router.push('/analyze');
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Network error uploading document. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  /** Handle text paste submission */
  const handleTextSubmitted = async (text: string) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          filename: 'Pasted Contract.txt',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.message || data.error || 'Failed to parse text');
        return;
      }

      // Success
      setDocument(data as ParsedDocument);
      router.push('/analyze');
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Network error submitting text. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  /** Handle sample contract selection */
  const handleSelectSample = async (sampleId: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    setScannedPdfDetected(false);

    try {
      const sampleRes = await fetch(`/api/sample?name=${encodeURIComponent(sampleId)}`);
      if (!sampleRes.ok) {
        throw new Error('Failed to load sample contract');
      }
      const sampleData = await sampleRes.json();

      const parseRes = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sampleData.text,
          filename: sampleData.filename,
        }),
      });

      const parsedData = await parseRes.json();

      if (!parseRes.ok) {
        throw new Error(parsedData.message || 'Failed to parse sample contract');
      }

      setDocument(parsedData as ParsedDocument);
      router.push('/analyze');
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to load sample. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--surface)] text-[var(--text-primary)] relative overflow-hidden">
      {/* Background ambient lighting aura */}
      <div className="pointer-events-none absolute inset-0 ambient-hero-glow z-0" aria-hidden="true" />

      <Header showDocInfo={false} />

      <main id="main-content" tabIndex={-1} className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6 sm:py-16 focus:outline-none">
        <div className="flex w-full max-w-3xl flex-col items-center text-center">
          {/* Badge Pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-3.5 py-1 text-xs font-medium text-[var(--accent)] shadow-xs mb-6">
            <span className="flex h-2 w-2 rounded-full bg-[var(--accent)] animate-pulse" />
            <span className="font-mono text-[11px] tracking-wide uppercase">
              100% In-Memory · Indian Jurisdiction Optimized
            </span>
          </div>

          {/* Tagline */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--text-primary)] leading-[1.15]">
            Read the contract you&apos;re <br className="hidden sm:inline" />
            <span className="font-document italic text-[var(--accent)] font-normal">about to sign</span>.
          </h1>

          <p className="mt-4 max-w-xl text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
            Upload a rental lease, employment offer letter, or freelance contract.
            PlainClause surfaces what&apos;s unusual, what standard terms are missing, and what to ask.
          </p>

          {/* Upload Drop Zone / Paste Form */}
          <div className="mt-8 w-full flex justify-center">
            <UploadZone
              onFileSelected={handleFileSelected}
              onTextSubmitted={handleTextSubmitted}
              isLoading={isLoading}
              errorMessage={errorMessage}
              scannedPdfDetected={scannedPdfDetected}
            />
          </div>

          {/* Sample contract buttons */}
          <div className="mt-8 w-full flex justify-center">
            <SampleButtons
              onSelectSample={handleSelectSample}
              disabled={isLoading}
            />
          </div>

          {/* 3-Column Trust & Privacy Guarantees */}
          <section aria-labelledby="trust-heading" className="mt-14 pt-10 border-t border-[var(--border)] w-full max-w-3xl text-left">
            <h2 id="trust-heading" className="sr-only">
              Security and Privacy Guarantees
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4.5 w-full">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-5 shadow-xs hover:shadow-card hover:-translate-y-0.5 transition-all duration-200">
                <div className="flex items-center gap-2.5 mb-2">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20 text-sm shadow-2xs"
                    aria-hidden="true"
                  >
                    🔒
                  </span>
                  <p className="font-bold text-xs text-[var(--text-primary)] tracking-tight">Zero Retention</p>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Processed strictly in volatile browser memory. Discarded permanently the moment you close this tab.
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-5 shadow-xs hover:shadow-card hover:-translate-y-0.5 transition-all duration-200">
                <div className="flex items-center gap-2.5 mb-2">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--sev-low-bg)] text-[var(--sev-low-fg)] border border-[var(--sev-low-border)] text-sm shadow-2xs"
                    aria-hidden="true"
                  >
                    🛡️
                  </span>
                  <p className="font-bold text-xs text-[var(--text-primary)] tracking-tight">Auto PII Redaction</p>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  PAN, Aadhaar, phone numbers, and emails are masked with synthetic tokens before model analysis.
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-5 shadow-xs hover:shadow-card hover:-translate-y-0.5 transition-all duration-200">
                <div className="flex items-center gap-2.5 mb-2">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent-ring)] text-sm shadow-2xs"
                    aria-hidden="true"
                  >
                    ⚖️
                  </span>
                  <p className="font-bold text-xs text-[var(--text-primary)] tracking-tight">Clause-Grounded</p>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Every risk is anchored to clause numbers with market norm comparisons and suggested negotiation asks.
                </p>
              </div>
            </div>
          </section>

          <p className="mt-6 text-xs text-[var(--text-secondary)] max-w-lg">
            PlainClause provides document comprehension and information. It is not legal advice and not a substitute for an advocate.
          </p>
        </div>
      </main>
    </div>
  );
}
