/**
 * Core domain types for PlainClause.
 *
 * Zod schemas are the single source of truth — TypeScript types are derived
 * with z.infer. Never hand-write a type that duplicates a schema.
 */
import { z } from 'zod';

/* ── Enums & primitives ─────────────────────────────────────────────── */

export const DocumentTypeSchema = z.enum([
  'rental_residential',
  'employment',
  'freelance_services',
  'nda',
  'loan',
  'terms_of_service',
  'other',
]);
export type DocumentType = z.infer<typeof DocumentTypeSchema>;

export const SeveritySchema = z.enum(['high', 'medium', 'low']);
export type Severity = z.infer<typeof SeveritySchema>;

export const FavoursSchema = z.enum(['you', 'them', 'neutral', 'unclear']);
export type Favours = z.infer<typeof FavoursSchema>;

export const IntentSchema = z.enum([
  'document_question',
  'general_legal_info',
  'advice_seeking',
  'urgent_situation',
  'off_topic',
]);
export type Intent = z.infer<typeof IntentSchema>;

/* ── Clause ──────────────────────────────────────────────────────────── */

/** A contiguous, addressable span of the source document. */
export const ClauseSchema = z.object({
  id: z.string(),
  label: z.string().nullable(),
  heading: z.string().nullable(),
  text: z.string(),
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
  page: z.number().int().nonnegative().nullable(),
  tokenEstimate: z.number().int().nonnegative(),
});
export type Clause = z.infer<typeof ClauseSchema>;

/* ── Redaction ───────────────────────────────────────────────────────── */

export const RedactionSchema = z.object({
  original: z.string(),
  token: z.string(),
  kind: z.string(),
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
});
export type Redaction = z.infer<typeof RedactionSchema>;

/* ── ParsedDocument ──────────────────────────────────────────────────── */

export const ParsedDocumentSchema = z.object({
  filename: z.string(),
  mimeType: z.string(),
  normalizedText: z.string(),
  clauses: z.array(ClauseSchema),
  pageCount: z.number().int().nonnegative().nullable(),
  charCount: z.number().int().nonnegative(),
  hasTextLayer: z.boolean(),
  redactions: z.array(RedactionSchema),
});
export type ParsedDocument = z.infer<typeof ParsedDocumentSchema>;

/* ── Triage ──────────────────────────────────────────────────────────── */

export const TriagePartySchema = z.object({
  role: z.string(),
  name: z.string().nullable(),
});

export const TriageSchema = z.object({
  documentType: DocumentTypeSchema,
  confidence: z.number().min(0).max(1),
  jurisdiction: z.string(),
  language: z.string(),
  parties: z.array(TriagePartySchema),
  reasoning: z.string(),
});
export type Triage = z.infer<typeof TriageSchema>;

/* ── Findings ────────────────────────────────────────────────────────── */

/** Something present in the document that the user should look at. */
export const ClauseFindingSchema = z.object({
  kind: z.literal('present'),
  id: z.string(),
  clauseId: z.string(),
  category: z.string(),
  title: z.string(),
  plainSummary: z.string(),
  severity: SeveritySchema,
  favours: FavoursSchema,
  whyItMatters: z.string(),
  marketNorm: z.string().nullable(),
  suggestedAsk: z.string().nullable(),
  jurisdictionNote: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});
export type ClauseFinding = z.infer<typeof ClauseFindingSchema>;

/** A protection the playbook expects that the document does not contain. */
export const MissingFindingSchema = z.object({
  kind: z.literal('missing'),
  id: z.string(),
  requirementId: z.string(),
  title: z.string(),
  whyItMatters: z.string(),
  severity: SeveritySchema,
  suggestedAsk: z.string(),
});
export type MissingFinding = z.infer<typeof MissingFindingSchema>;

export const FindingSchema = z.discriminatedUnion('kind', [
  ClauseFindingSchema,
  MissingFindingSchema,
]);
export type Finding = z.infer<typeof FindingSchema>;

/* ── Obligations ─────────────────────────────────────────────────────── */

export const ObligationSchema = z.object({
  id: z.string(),
  clauseId: z.string(),
  who: z.enum(['you', 'them', 'both']),
  what: z.string(),
  when: z.string(),
  dueDate: z.string().nullable(),
  noticePeriodDays: z.number().int().nonnegative().nullable(),
});
export type Obligation = z.infer<typeof ObligationSchema>;

/* ── Citation & Answer ───────────────────────────────────────────────── */

export const CitationSchema = z.object({
  clauseId: z.string(),
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
});
export type Citation = z.infer<typeof CitationSchema>;

export const AnswerSchema = z.object({
  text: z.string(),
  citations: z.array(CitationSchema),
  groundedInDocument: z.boolean(),
  intent: IntentSchema,
});
export type Answer = z.infer<typeof AnswerSchema>;

/* ── Analysis events (SSE) ───────────────────────────────────────────── */

export const AnalysisEstimateSchema = z.object({
  type: z.literal('estimate'),
  batches: z.number().int().nonnegative(),
  inputTokens: z.number().int().nonnegative(),
  estimatedCostUsd: z.number().nonnegative(),
});

export const AnalysisFindingEventSchema = z.object({
  type: z.literal('finding'),
  finding: ClauseFindingSchema,
});

export const AnalysisBatchErrorSchema = z.object({
  type: z.literal('batch_error'),
  clauseIds: z.array(z.string()),
  retryable: z.boolean(),
});

export const AnalysisMissingEventSchema = z.object({
  type: z.literal('missing'),
  findings: z.array(MissingFindingSchema),
});

export const AnalysisCompleteSchema = z.object({
  type: z.literal('complete'),
  riskScore: z.number().min(0).max(1),
  counts: z.object({
    high: z.number().int().nonnegative(),
    medium: z.number().int().nonnegative(),
    low: z.number().int().nonnegative(),
    missing: z.number().int().nonnegative(),
  }),
});

export const AnalysisErrorSchema = z.object({
  type: z.literal('error'),
  code: z.string(),
  message: z.string(),
});

export const AnalysisEventSchema = z.discriminatedUnion('type', [
  AnalysisEstimateSchema,
  AnalysisFindingEventSchema,
  AnalysisBatchErrorSchema,
  AnalysisMissingEventSchema,
  AnalysisCompleteSchema,
  AnalysisErrorSchema,
]);
export type AnalysisEvent = z.infer<typeof AnalysisEventSchema>;

/* ── API error ───────────────────────────────────────────────────────── */

export const ApiErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  hint: z.string().optional(),
  limit: z.string().optional(),
  accepted: z.array(z.string()).optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
