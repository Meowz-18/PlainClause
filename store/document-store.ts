/**
 * Client-side document state — Zustand store.
 *
 * In-memory only. No persistence, no sync. Document state lives in the user's
 * tab and is discarded on close. This is the privacy guarantee.
 */
import { create } from 'zustand';
import type { ParsedDocument, Triage, ClauseFinding, MissingFinding } from '@/lib/types';

type AnalysisPhase = 'idle' | 'uploading' | 'parsing' | 'triaging' | 'analyzing' | 'complete' | 'error';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: { clauseId: string; start: number; end: number }[];
  intent?: string;
}

interface DocumentState {
  /* ── Document ──────────────────────────────────────────────────── */
  document: ParsedDocument | null;
  triage: Triage | null;

  /* ── Analysis ──────────────────────────────────────────────────── */
  phase: AnalysisPhase;
  findings: ClauseFinding[];
  missingFindings: MissingFinding[];
  analyzedClauseCount: number;
  totalClauseCount: number;
  riskScore: number | null;
  analysisError: string | null;

  /* ── Chat ──────────────────────────────────────────────────────── */
  chatMessages: ChatMessage[];
  isAnswering: boolean;

  /* ── UI ────────────────────────────────────────────────────────── */
  highlightedClauseId: string | null;
  activePanel: 'findings' | 'document' | 'ask';
  expandedSeverities: Set<string>;

  /* ── Actions ───────────────────────────────────────────────────── */
  setDocument: (doc: ParsedDocument) => void;
  setTriage: (triage: Triage) => void;
  setPhase: (phase: AnalysisPhase) => void;
  addFinding: (finding: ClauseFinding) => void;
  setMissingFindings: (findings: MissingFinding[]) => void;
  setAnalyzedCount: (count: number) => void;
  setRiskScore: (score: number) => void;
  setAnalysisError: (error: string | null) => void;
  highlightClause: (clauseId: string | null) => void;
  setActivePanel: (panel: 'findings' | 'document' | 'ask') => void;
  toggleSeverity: (severity: string) => void;
  addChatMessage: (message: ChatMessage) => void;
  setIsAnswering: (answering: boolean) => void;
  clearChat: () => void;
  reset: () => void;
}

const initialState = {
  document: null,
  triage: null,
  phase: 'idle' as AnalysisPhase,
  findings: [] as ClauseFinding[],
  missingFindings: [] as MissingFinding[],
  analyzedClauseCount: 0,
  totalClauseCount: 0,
  riskScore: null,
  analysisError: null,
  chatMessages: [] as ChatMessage[],
  isAnswering: false,
  highlightedClauseId: null,
  activePanel: 'findings' as const,
  expandedSeverities: new Set(['high']),
};

export const useDocumentStore = create<DocumentState>((set) => ({
  ...initialState,

  setDocument: (doc) =>
    set({
      document: doc,
      totalClauseCount: doc.clauses.length,
      phase: 'parsing',
      findings: [],
      missingFindings: [],
      analyzedClauseCount: 0,
      riskScore: null,
      analysisError: null,
      chatMessages: [],
    }),

  setTriage: (triage) => set({ triage }),

  setPhase: (phase) => set({ phase }),

  addFinding: (finding) =>
    set((state) => ({
      findings: [...state.findings, finding].sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.severity] - order[b.severity];
      }),
      analyzedClauseCount: state.analyzedClauseCount + 1,
    })),

  setMissingFindings: (findings) => set({ missingFindings: findings }),

  setAnalyzedCount: (count) => set({ analyzedClauseCount: count }),

  setRiskScore: (score) => set({ riskScore: score }),

  setAnalysisError: (error) => set({ analysisError: error }),

  highlightClause: (clauseId) => set({ highlightedClauseId: clauseId }),

  setActivePanel: (panel) => set({ activePanel: panel }),

  toggleSeverity: (severity) =>
    set((state) => {
      const next = new Set(state.expandedSeverities);
      if (next.has(severity)) {
        next.delete(severity);
      } else {
        next.add(severity);
      }
      return { expandedSeverities: next };
    }),

  addChatMessage: (message) =>
    set((state) => ({
      chatMessages: [...state.chatMessages, message],
    })),

  setIsAnswering: (answering) => set({ isAnswering: answering }),

  clearChat: () => set({ chatMessages: [] }),

  reset: () => set(initialState),
}));
