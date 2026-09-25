/**
 * Workspace Page — /analyze
 *
 * Implements DESIGN.md §3.2 & §8 and TECH.md §5.2:
 * - Three-column workspace grid: Findings Rail (380px), Reading Pane (1fr), Ask Panel (340px)
 * - Triage banner with document type, jurisdiction, language, and playbook override
 * - Progressive reveal: document is immediately readable as soon as parsed
 * - Connects to SSE streaming analysis endpoint (/api/analyze)
 * - Bidirectional linking between findings and document clauses
 * - Mobile responsive with segmented control (Findings · Document · Ask)
 */
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Header } from '@/components/ui/Header';
import { FindingsRail } from '@/components/findings/FindingsRail';
import { DocumentPane } from '@/components/document/DocumentPane';
import { TriageBanner } from '@/components/findings/TriageBanner';
import { AskPanel } from '@/components/ask/AskPanel';
import { StatusAnnouncer } from '@/components/a11y/StatusAnnouncer';
import { LiveRegion } from '@/components/a11y/LiveRegion';
import { useDocumentStore } from '@/store/document-store';
import type { ClauseFinding, MissingFinding } from '@/lib/types';

export default function AnalyzePage() {
  const {
    document: doc,
    triage,
    phase,
    findings,
    missingFindings,
    analyzedClauseCount,
    totalClauseCount,
    riskScore,
    highlightedClauseId,
    activePanel,
    expandedSeverities,
    setTriage,
    setPhase,
    addFinding,
    setMissingFindings,
    setRiskScore,
    setAnalysisError,
    highlightClause,
    setActivePanel,
    toggleSeverity,
  } = useDocumentStore();

  const [activePlaybookId, setActivePlaybookId] = useState<string | undefined>(undefined);
  const [pendingAskQuery, setPendingAskQuery] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Run triage and streaming analysis for the loaded document.
   */
  const startAnalysis = useCallback(
    async (
      playbookIdOverride?: string,
      controllerParam?: AbortController
    ) => {
      if (!doc) return;

      const controller = controllerParam || new AbortController();
      if (!controllerParam) {
        abortControllerRef.current?.abort();
        abortControllerRef.current = controller;
      }

      try {
        let activeT = playbookIdOverride ? null : useDocumentStore.getState().triage;

        // Step 1: Triage if not yet resolved
        if (!activeT) {
          setPhase('triaging');
          const sampleText = doc.normalizedText.slice(0, 4000);
          const headings = doc.clauses
            .map((c) => c.heading)
            .filter((h): h is string => Boolean(h));

          const triageRes = await fetch('/api/triage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sample: sampleText, headings }),
            signal: controller.signal,
          });

          if (triageRes.ok) {
            activeT = await triageRes.json();
            if (activeT && !controller.signal.aborted) setTriage(activeT);
          }
        }

        if (controller.signal.aborted) return;

        // Step 2: Stream clause analysis
        setPhase('analyzing');

        const analyzeRes = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clauses: doc.clauses,
            normalizedText: doc.normalizedText,
            triage: activeT,
            playbookId: playbookIdOverride,
          }),
          signal: controller.signal,
        });

        if (!analyzeRes.ok || !analyzeRes.body) {
          throw new Error('Analysis stream failed to open');
        }

        const reader = analyzeRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const blocks = buffer.split('\n\n');
          buffer = blocks.pop() || '';

          for (const block of blocks) {
            if (!block.trim()) continue;

            const lines = block.split('\n');
            let eventType = '';
            let dataStr = '';

            for (const line of lines) {
              if (line.startsWith('event: ')) {
                eventType = line.slice(7).trim();
              } else if (line.startsWith('data: ')) {
                dataStr = line.slice(6).trim();
              }
            }

            if (!dataStr) continue;

            try {
              const data = JSON.parse(dataStr);

              if (eventType === 'finding' && data.finding) {
                addFinding(data.finding as ClauseFinding);
              } else if (eventType === 'missing' && data.findings) {
                setMissingFindings(data.findings as MissingFinding[]);
              } else if (eventType === 'complete') {
                if (typeof data.riskScore === 'number') {
                  setRiskScore(data.riskScore);
                }
                setPhase('complete');
              } else if (eventType === 'error') {
                setAnalysisError(data.message || 'Error during analysis');
                setPhase('error');
              }
            } catch {
              // Ignore partial JSON parse errors
            }
          }
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setAnalysisError(
            err instanceof Error ? err.message : 'Analysis failed'
          );
          setPhase('error');
        }
      }
    },
    [doc, setTriage, setPhase, addFinding, setMissingFindings, setRiskScore, setAnalysisError]
  );

  // Trigger analysis on document load
  useEffect(() => {
    if (!doc) return;
    const controller = new AbortController();
    abortControllerRef.current = controller;
    startAnalysis(undefined, controller);

    return () => {
      controller.abort();
    };
  }, [doc, startAnalysis]);

  // Handle playbook override from user
  const handlePlaybookChange = (newPlaybookId: string) => {
    setActivePlaybookId(newPlaybookId);
    useDocumentStore.setState({
      findings: [],
      missingFindings: [],
      riskScore: null,
      analyzedClauseCount: 0,
    });
    startAnalysis(newPlaybookId);
  };

  // If no document is loaded in memory
  if (!doc) {
    return (
      <div className="flex min-h-screen flex-col bg-[var(--surface)] text-[var(--text-primary)]">
        <Header showDocInfo={false} />
        <main id="main-content" tabIndex={-1} className="flex flex-1 flex-col items-center justify-center p-6 text-center focus:outline-none">
          <div className="card max-w-md p-8 space-y-4">
            <h1 className="text-lg font-bold">No Document Loaded</h1>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              PlainClause operates strictly in-memory and does not persist contracts to a database.
              Upload a document or pick a sample to start analysis.
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-md bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-hover)] focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] transition-colors"
            >
              ← Return to upload
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const handleSelectClause = (clauseId: string) => {
    highlightClause(clauseId);
    setActivePanel('document');
  };

  const handleClauseClickInDoc = (clauseId: string) => {
    highlightClause(clauseId);
    const matchingFinding = findings.find((f) => f.clauseId === clauseId);
    if (matchingFinding && typeof window !== 'undefined') {
      const el = window.document.getElementById(`finding-${matchingFinding.id}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };


  // Status message for screen readers
  const statusMessage =
    phase === 'parsing'
      ? 'Document parsed. Preparing analysis.'
      : phase === 'triaging'
        ? 'Classifying document jurisdiction and playbook.'
        : phase === 'analyzing'
          ? `Analyzing document: ${findings.length} findings identified so far.`
          : phase === 'complete'
            ? `Analysis complete. ${findings.length} findings identified.`
            : 'Document ready.';

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--surface)] text-[var(--text-primary)]">
      <Header showDocInfo={true} />

      {/* Screen reader announcers */}
      <StatusAnnouncer message={statusMessage} />
      <LiveRegion message={`${findings.length} findings so far`} />

      {/* Triage Banner with Playbook Override Dropdown */}
      <TriageBanner
        triage={triage}
        redactionCount={doc.redactions.length}
        charCount={doc.charCount}
        clauseCount={doc.clauses.length}
        activePlaybookId={activePlaybookId}
        onPlaybookChange={handlePlaybookChange}
        disabled={phase === 'analyzing'}
      />

      {/* Mobile Tab Control (<768px) per DESIGN.md §8 */}
      <div
        role="tablist"
        aria-label="Workspace views"
        className="flex md:hidden border-b border-[var(--border)] bg-[var(--surface)] text-xs font-semibold"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activePanel === 'findings'}
          onClick={() => setActivePanel('findings')}
          className={`flex-1 py-2.5 text-center transition-colors border-b-2 ${
            activePanel === 'findings'
              ? 'border-[var(--accent)] text-[var(--accent)]'
              : 'border-transparent text-[var(--text-secondary)]'
          }`}
        >
          Findings ({findings.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activePanel === 'document'}
          onClick={() => setActivePanel('document')}
          className={`flex-1 py-2.5 text-center transition-colors border-b-2 ${
            activePanel === 'document'
              ? 'border-[var(--accent)] text-[var(--accent)]'
              : 'border-transparent text-[var(--text-secondary)]'
          }`}
        >
          Document
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activePanel === 'ask'}
          onClick={() => setActivePanel('ask')}
          className={`flex-1 py-2.5 text-center transition-colors border-b-2 ${
            activePanel === 'ask'
              ? 'border-[var(--accent)] text-[var(--accent)]'
              : 'border-transparent text-[var(--text-secondary)]'
          }`}
        >
          Ask
        </button>
      </div>

      {/* Main Workspace 3-Column Grid */}
      <main id="main-content" tabIndex={-1} className="flex-1 min-h-0 overflow-hidden focus:outline-none">
        <div className="workspace-grid h-full">
          {/* Column 1: Findings Rail (Left) */}
          <div
            className={`h-full overflow-hidden ${
              activePanel === 'findings' ? 'block' : 'hidden md:block'
            }`}
          >
            <FindingsRail
              findings={findings}
              missingFindings={missingFindings}
              clauses={doc.clauses}
              triage={triage}
              filename={doc.filename}
              isLoading={phase === 'analyzing' || phase === 'triaging'}
              analyzedCount={analyzedClauseCount}
              totalCount={totalClauseCount}
              riskScore={riskScore}
              highlightedClauseId={highlightedClauseId}
              expandedSeverities={expandedSeverities}
              onToggleSeverity={toggleSeverity}
              onSelectClause={handleSelectClause}
              onAskAboutFinding={(queryText: string) => {
                setPendingAskQuery(queryText);
                setActivePanel('ask');
              }}
            />
          </div>

          {/* Column 2: Reading Pane (Center) */}
          <div
            className={`h-full overflow-hidden ${
              activePanel === 'document' ? 'block' : 'hidden md:block'
            }`}
          >
            <DocumentPane
              clauses={doc.clauses}
              findings={findings}
              highlightedClauseId={highlightedClauseId}
              onClauseClick={handleClauseClickInDoc}
            />
          </div>

          {/* Column 3: Ask Panel (Right) */}
          <section
            id="ask-panel"
            aria-labelledby="ask-panel-heading"
            className={`h-full min-h-0 overflow-hidden ${
              activePanel === 'ask' ? 'block' : 'hidden lg:block'
            }`}
          >
            <AskPanel
              clauses={doc.clauses}
              triage={triage}
              onSelectClause={handleSelectClause}
              pendingQuery={pendingAskQuery}
              onClearPendingQuery={() => setPendingAskQuery(null)}
            />
          </section>
        </div>
      </main>
    </div>
  );
}
