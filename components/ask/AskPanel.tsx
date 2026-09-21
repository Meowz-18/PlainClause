'use client';

/**
 * AskPanel — Grounded Interactive Q&A with Bidirectional Citation Linking.
 *
 * Implements DESIGN.md §3.3 & TECH.md §5.3:
 * - Directs questions to /api/ask SSE stream
 * - Displays grounded citation pills that highlight & scroll the DocumentPane
 * - Renders emergency support resources when urgent distress is detected
 * - Contextual suggested questions based on triage document type
 */
import React, { useState, useRef, useEffect } from 'react';
import type { Clause, Triage, Citation, Intent } from '@/lib/types';
import { useDocumentStore } from '@/store/document-store';
import { getEmergencyResources } from '@/lib/safety/resources';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  intent?: Intent;
  citations?: Citation[];
  timestamp: number;
}

interface AskPanelProps {
  clauses: Clause[];
  triage: Triage | null;
  onSelectClause?: (clauseId: string) => void;
  className?: string;
  pendingQuery?: string | null;
  onClearPendingQuery?: () => void;
}

const RENTAL_SUGGESTIONS = [
  'What happens if I leave early?',
  'Can the landlord or counterparty terminate unilaterally?',
  'Who is responsible for repairs and maintenance?',
  'What are the rules on security deposit return?',
];

const EMPLOYMENT_SUGGESTIONS = [
  'What is the notice period for resigning?',
  'Is there a post-employment non-compete?',
  'What are the probation terms and confirmation rules?',
  'Are there any service bond or penalty clauses?',
];

const GENERIC_SUGGESTIONS = [
  'What are the primary termination conditions?',
  'What are the liabilities or indemnity caps?',
  'Which court or jurisdiction governs disputes?',
  'What are my mandatory payment obligations?',
];

let messageSeq = 0;
function createMessageId(prefix: string): string {
  messageSeq += 1;
  return `msg-${prefix}-${messageSeq}`;
}

export function AskPanel({
  clauses,
  triage,
  onSelectClause,
  className = '',
  pendingQuery,
  onClearPendingQuery,
}: AskPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamingText, setCurrentStreamingText] = useState('');
  const [currentCitations, setCurrentCitations] = useState<Citation[]>([]);
  const [currentIntent, setCurrentIntent] = useState<Intent | undefined>(undefined);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const highlightClauseInStore = useDocumentStore((s) => s.highlightClause);

  // Auto-scroll to bottom as messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentStreamingText]);

  // Handle incoming query from external actions (e.g., "Ask AI" button on findings)
  useEffect(() => {
    if (pendingQuery && pendingQuery.trim()) {
      const q = pendingQuery.trim();
      onClearPendingQuery?.();
      submitQuery(q);
      // Focus input field
      inputRef.current?.focus();
    }
  }, [pendingQuery]);

  // Suggested questions based on document type
  const suggestions =
    triage?.documentType === 'rental_residential'
      ? RENTAL_SUGGESTIONS
      : triage?.documentType === 'employment'
      ? EMPLOYMENT_SUGGESTIONS
      : GENERIC_SUGGESTIONS;

  const handleCitationClick = (clauseId: string) => {
    highlightClauseInStore(clauseId);
    if (onSelectClause) {
      onSelectClause(clauseId);
    }
    // Smooth scroll to the clause element in the reading pane
    const el = document.getElementById(`clause-${clauseId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const submitQuery = async (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed || isStreaming) return;

    // Abort previous stream if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const userMessage: ChatMessage = {
      id: createMessageId('user'),
      role: 'user',
      text: trimmed,
      timestamp: messageSeq,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputQuery('');
    setIsStreaming(true);
    setCurrentStreamingText('');
    setCurrentCitations([]);
    setCurrentIntent(undefined);

    try {
      const historyPayload = messages.slice(-4).map((m) => ({
        role: m.role,
        content: m.text,
      }));

      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: trimmed,
          clauses,
          triage,
          history: historyPayload,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error('Failed to connect to Q&A service');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedText = '';
      const accumulatedCitations: Citation[] = [];
      let detectedIntent: Intent | undefined = undefined;

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

            if (eventType === 'intent' && data.intent) {
              detectedIntent = data.intent as Intent;
              setCurrentIntent(detectedIntent);
            } else if (eventType === 'token' && typeof data.text === 'string') {
              accumulatedText += data.text;
              setCurrentStreamingText(accumulatedText);
            } else if (eventType === 'citation' && data.clauseId) {
              if (!accumulatedCitations.some((c) => c.clauseId === data.clauseId)) {
                accumulatedCitations.push(data as Citation);
                setCurrentCitations([...accumulatedCitations]);
              }
            } else if (eventType === 'done') {
              // Finish stream
            }
          } catch {
            // Ignore partial SSE json parsing issues
          }
        }
      }

      // Append assistant message once streaming completes
      const assistantMessage: ChatMessage = {
        id: createMessageId('assistant'),
        role: 'assistant',
        text: accumulatedText || 'No response generated.',
        intent: detectedIntent,
        citations: accumulatedCitations,
        timestamp: messageSeq,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      if (!controller.signal.aborted) {
        const errorMessage: ChatMessage = {
          id: createMessageId('error'),
          role: 'assistant',
          text: `⚠️ Could not complete answer: ${
            err instanceof Error ? err.message : 'Connection error'
          }`,
          timestamp: messageSeq,
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } finally {
      setIsStreaming(false);
      setCurrentStreamingText('');
      setCurrentCitations([]);
      setCurrentIntent(undefined);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitQuery(inputQuery);
    }
  };

  // Emergency resources based on triage jurisdiction
  const emergencyResources = getEmergencyResources(triage?.jurisdiction);

  // Helper to render inline citation pills in text
  const renderInlineCitationPills = (text: string) => {
    // Look for [#c-X], [Clause #c-X], [c-X], or 【#?c-X】 patterns
    const parts = text.split(/([\[【](?:Clause\s+)?#?[a-zA-Z0-9_-]+[\]】])/g);

    return parts.map((part, idx) => {
      const match = part.match(/[\[【](?:Clause\s+)?#?([a-zA-Z0-9_-]+)[\]】]/i);
      if (match) {
        const clauseId = match[1].toLowerCase();
        const isValidClause = clauses.some((c) => c.id.toLowerCase() === clauseId);
        if (isValidClause) {
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleCitationClick(clauseId)}
              className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.2 rounded font-mono text-[11px] font-bold bg-[var(--surface-raised)] border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-all shadow-2xs focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] cursor-pointer"
              title={`Jump to Clause #${clauseId}`}
            >
              <span>§</span>
              <span>{clauseId}</span>
            </button>
          );
        }
      }

      // Format bold markdown (**text**)
      const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
      if (boldParts.length > 1) {
        return (
          <React.Fragment key={idx}>
            {boldParts.map((bp, bIdx) => {
              if (bp.startsWith('**') && bp.endsWith('**')) {
                return <strong key={bIdx} className="font-bold text-[var(--text-primary)]">{bp.slice(2, -2)}</strong>;
              }
              return bp;
            })}
          </React.Fragment>
        );
      }

      return <React.Fragment key={idx}>{part}</React.Fragment>;
    });
  };

  // Helper to render rich markdown structure (headings, bullets, nested lists)
  const renderMessageContent = (text: string, citations?: Citation[]) => {
    const lines = text.split('\n');

    return (
      <div className="space-y-2.5 text-xs leading-relaxed text-[var(--text-primary)]">
        <div className="space-y-1.5">
          {lines.map((rawLine, idx) => {
            const line = rawLine.trimEnd();
            if (!line.trim()) {
              return <div key={idx} className="h-1" />;
            }

            // Heading 1, 2, 3 or bold heading line (e.g. **Document summary**)
            if (line.startsWith('### ')) {
              return (
                <h4 key={idx} className="font-bold text-sm text-[var(--text-primary)] pt-1 pb-0.5 border-b border-[var(--border-subtle)]">
                  {renderInlineCitationPills(line.slice(4))}
                </h4>
              );
            }
            if (line.startsWith('## ')) {
              return (
                <h3 key={idx} className="font-bold text-sm text-[var(--text-primary)] pt-1.5 pb-0.5 border-b border-[var(--border-subtle)]">
                  {renderInlineCitationPills(line.slice(3))}
                </h3>
              );
            }
            if (line.startsWith('# ')) {
              return (
                <h2 key={idx} className="font-extrabold text-base text-[var(--text-primary)] pt-1.5 pb-1">
                  {renderInlineCitationPills(line.slice(2))}
                </h2>
              );
            }

            // Top-level bullet items (- or *)
            if (/^\s*[-*•]\s+/.test(line)) {
              const indentLevel = line.match(/^(\s*)/)?.[1].length || 0;
              const content = line.replace(/^\s*[-*•]\s+/, '');
              return (
                <div
                  key={idx}
                  className={`flex items-start gap-2 ${indentLevel > 2 ? 'pl-5' : 'pl-1'}`}
                >
                  <span className="text-[var(--accent)] font-bold shrink-0 mt-0.5" aria-hidden="true">
                    {indentLevel > 2 ? '◦' : '•'}
                  </span>
                  <div className="flex-1 leading-relaxed">
                    {renderInlineCitationPills(content)}
                  </div>
                </div>
              );
            }

            // Numbered list items (e.g. 1. or 2.)
            if (/^\s*\d+\.\s+/.test(line)) {
              const numMatch = line.match(/^\s*(\d+)\.\s+(.*)/);
              if (numMatch) {
                return (
                  <div key={idx} className="flex items-start gap-2 pl-1">
                    <span className="text-[var(--accent)] font-mono font-bold shrink-0 text-[11px] mt-0.5">
                      {numMatch[1]}.
                    </span>
                    <div className="flex-1 leading-relaxed">
                      {renderInlineCitationPills(numMatch[2])}
                    </div>
                  </div>
                );
              }
            }

            // Standard paragraph line
            return (
              <p key={idx} className="leading-relaxed">
                {renderInlineCitationPills(line)}
              </p>
            );
          })}
        </div>

        {/* Cited Evidence Footer Pills */}
        {citations && citations.length > 0 && (
          <div className="pt-2.5 mt-2 border-t border-[var(--border-subtle)] flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] font-mono font-semibold">
              Cited Evidence:
            </span>
            {citations.map((c) => (
              <button
                key={c.clauseId}
                type="button"
                onClick={() => handleCitationClick(c.clauseId)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--surface-raised)] transition-all cursor-pointer shadow-2xs"
              >
                <span>§</span>
                <span>{c.clauseId}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-full min-h-0 overflow-hidden bg-[var(--surface)] border-l border-[var(--border)] ${className}`}>
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center justify-between px-4 border-b border-[var(--border)] bg-[var(--surface)] select-none shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent-ring)] text-xs shadow-2xs" aria-hidden="true">
            ✨
          </span>
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-primary)]">
            Ask Document
          </h2>
          <span className="text-[10px] font-mono text-[var(--text-tertiary)] hidden sm:inline">
            (Strict Grounding)
          </span>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => setMessages([])}
            className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors px-2 py-1 rounded hover:bg-[var(--surface-elevated)] cursor-pointer"
            title="Clear conversation history"
          >
            Clear
          </button>
        )}
      </div>

      {/* Message Stream */}
      <div
        ref={scrollRef}
        className="custom-scroll flex-1 min-h-0 overflow-y-auto p-4 space-y-4"
        tabIndex={0}
        aria-label="Conversation with document assistant"
      >
        {messages.length === 0 && !isStreaming && (
          <div className="space-y-4 pt-1">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3.5 text-xs text-[var(--text-secondary)] leading-relaxed shadow-xs">
              <p className="font-semibold text-[var(--text-primary)] mb-1 flex items-center gap-1.5">
                <span>🔍</span>
                <span>Grounded Interactive Legal Q&amp;A</span>
              </p>
              <p>
                Ask questions about risks, penalties, deposit returns, or termination terms. Every answer cites exact clauses you can verify in the reading pane.
              </p>
            </div>

            {/* Suggested Chips */}
            <div className="space-y-2">
              <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)]">
                Suggested Inquiries:
              </p>
              <div className="flex flex-col gap-2">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => submitQuery(s)}
                    className="text-left text-xs p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] hover:bg-[var(--surface-elevated)] hover:border-[var(--accent)] text-[var(--text-primary)] transition-all flex items-center justify-between group shadow-2xs focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] cursor-pointer"
                  >
                    <span className="font-medium pr-2">{s}</span>
                    <span className="text-xs text-[var(--text-tertiary)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition-all font-mono shrink-0">
                      →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Existing Messages */}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${
              m.role === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            {/* Emergency Statutory Card when urgent situation detected */}
            {m.role === 'assistant' && m.intent === 'urgent_situation' && (
              <div className="w-full mb-3 rounded-xl border-2 border-[var(--severity-high)] bg-[var(--sev-high-bg)] p-3 text-xs text-[var(--text-primary)] shadow-sm space-y-2.5">
                <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-[var(--sev-high-fg)] uppercase tracking-wider">
                  <span aria-hidden="true">🚨</span>
                  <span>Immediate Statutory Assistance &amp; Free Legal Aid</span>
                </div>
                <p className="text-[11px] leading-relaxed text-[var(--text-secondary)]">
                  If you are facing an unlawful lockout, immediate eviction, or intimidation, statutory protections exist. Contact statutory helplines immediately:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {emergencyResources.slice(0, 3).map((res, i) => (
                    <div key={i} className="rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] p-2 shadow-2xs">
                      <p className="font-bold text-[11px] text-[var(--text-primary)] truncate">{res.name}</p>
                      {res.phone && (
                        <a
                          href={`tel:${res.phone}`}
                          className="mt-1 inline-flex items-center gap-1 font-mono text-[11px] font-bold text-[var(--severity-high)] hover:underline"
                        >
                          <span>📞 Dial {res.phone}</span>
                          <span className="text-[9px] font-normal text-[var(--text-tertiary)]">({res.hours || '24/7'})</span>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div
              className={`max-w-[92%] rounded-2xl p-3.5 text-xs shadow-xs ${
                m.role === 'user'
                  ? 'bg-[var(--accent)] text-white font-medium rounded-br-xs'
                  : 'bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text-primary)] rounded-bl-xs'
              }`}
            >
              {m.role === 'assistant' ? (
                renderMessageContent(m.text, m.citations)
              ) : (
                <p className="whitespace-pre-wrap">{m.text}</p>
              )}
            </div>
          </div>
        ))}

        {/* Streaming In-Progress Message */}
        {isStreaming && (
          <div className="flex flex-col items-start w-full">
            {currentIntent === 'urgent_situation' && (
              <div className="w-full mb-3 rounded-xl border border-[var(--severity-high)] bg-[var(--sev-high-bg)] p-3 text-xs text-[var(--text-primary)] shadow-sm space-y-2">
                <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-[var(--sev-high-fg)] uppercase tracking-wider">
                  <span aria-hidden="true">🚨</span>
                  <span>Immediate Statutory Assistance &amp; Free Legal Aid</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="tel:15100"
                    className="inline-flex items-center gap-1 font-mono text-xs font-bold text-[var(--severity-high)] bg-[var(--surface-raised)] px-2 py-1 rounded border border-[var(--border)]"
                  >
                    📞 NALSA Legal Aid: 15100
                  </a>
                  <a
                    href="tel:112"
                    className="inline-flex items-center gap-1 font-mono text-xs font-bold text-[var(--severity-high)] bg-[var(--surface-raised)] px-2 py-1 rounded border border-[var(--border)]"
                  >
                    🚨 Emergency: 112
                  </a>
                </div>
              </div>
            )}

            <div className="max-w-[92%] rounded-2xl p-3.5 text-xs bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text-primary)] rounded-bl-xs shadow-xs">
              {currentStreamingText ? (
                renderMessageContent(currentStreamingText, currentCitations)
              ) : (
                <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-mono py-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-[var(--accent)] animate-ping" />
                  <span>Cross-referencing document clauses…</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <div className="shrink-0 p-3.5 border-t border-[var(--border)] bg-[var(--surface-raised)] shadow-xs">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitQuery(inputQuery);
          }}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this agreement..."
            disabled={isStreaming}
            className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] shadow-2xs focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] disabled:opacity-50 transition-all"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || isStreaming}
            className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-xs font-bold text-white hover:bg-[var(--accent-hover)] focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] disabled:opacity-50 transition-all font-mono shadow-xs hover:scale-105 active:scale-95 cursor-pointer"
          >
            Ask
          </button>
        </form>

        <p className="mt-2 text-[10px] text-center text-[var(--text-tertiary)] font-mono">
          Strict clause citations · Informational, not legal advice
        </p>
      </div>
    </div>
  );
}
