/**
 * Named constants for PlainClause.
 *
 * No magic strings. Model IDs, severity values, error codes, event names,
 * and limits are defined here and imported everywhere else.
 */

/* ── Model IDs ───────────────────────────────────────────────────────── */

export const MODEL_HAIKU = 'claude-haiku-4-5-20251001' as const;
export const MODEL_SONNET = 'claude-sonnet-4-5-20250514' as const;

/** Model selection by task — cheap model for cheap tasks. */
export const TASK_MODEL = {
  triage: MODEL_HAIKU,
  intent: MODEL_HAIKU,
  analyze: MODEL_SONNET,
  ask: MODEL_SONNET,
  compare: MODEL_SONNET,
  generate: MODEL_SONNET,
} as const;

/* ── Severity glyphs & labels (never colour alone) ───────────────────── */

export const SEVERITY_DISPLAY = {
  high: { glyph: '▲', label: 'HIGH' },
  medium: { glyph: '◆', label: 'MEDIUM' },
  low: { glyph: '●', label: 'LOW' },
  missing: { glyph: '○', label: 'NOT IN DOCUMENT' },
} as const;

/* ── Pipeline limits ─────────────────────────────────────────────────── */

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_PAGE_COUNT = 60;

/**
 * Maximum tokens sent to the model per analysis batch.
 *
 * 6,000 was chosen after empirical testing:
 * - Below ~3,000 tokens, clause density is too low for reliable cross-clause
 *   pattern detection (e.g. spotting asymmetric notice periods).
 * - Above ~8,000 tokens, Groq latency rises sharply with no precision gain.
 * - 6,000 tokens fits a full 5-page section in one round trip, minimising
 *   model calls for typical documents.
 *
 * Changing this value directly affects cost and latency — update EFFICIENCY.md.
 */
export const MAX_TOKENS_PER_BATCH = 6_000;

/**
 * Maximum number of batch requests running concurrently.
 *
 * 3 balances throughput and rate-limit safety:
 * - Groq free tier: 30 req/min. At 3 concurrent × ~2 s/batch we stay comfortably
 *   under the limit even for large (10-batch) documents.
 * - Anthropic Tier 1: 5 req/min — reduce to 1 if seeing 429s on the Anthropic path.
 * - Values above 5 risk provider rate limits without meaningful wall-clock gain
 *   (batches are I/O-bound, not CPU-bound).
 */
export const MAX_CONCURRENCY = 3;

export const MAX_TOTAL_TOKENS = 180_000;  // Hard cap — ~60-page contract at 3 tokens/word
export const MAX_FINDINGS = 50;
export const MIN_CONFIDENCE = 0.5;
export const LOW_TRIAGE_CONFIDENCE = 0.6;

/* ── Segmentation ────────────────────────────────────────────────────── */

/**
 * Minimum characters a clause must contain after segmentation.
 *
 * Clauses below 120 chars are almost always headings, list markers, or
 * partial sentences from noisy PDF extraction. Merging them into their
 * neighbour prevents single-sentence clauses from consuming a full model
 * batch call and reduces total batch count for heavily-formatted documents.
 */
export const MIN_CLAUSE_CHARS = 120;

/**
 * Maximum tokens allowed in a single clause before it is split.
 *
 * 1,500 tokens (~6,000 chars) limits exposure to very long clauses that
 * would otherwise fill an entire batch alone. A clause at this limit is
 * still analysed in full context; anything longer is split at the nearest
 * sentence boundary and analysed as two clauses.
 */
export const MAX_CLAUSE_TOKENS = 1_500;

/** Rough token estimate: 1 token ≈ 4 characters (GPT-3/4/Llama convention). */
export const CHARS_PER_TOKEN = 4;

/* ── Rate limits (per IP, per hour) ──────────────────────────────────── */

export const RATE_LIMITS = {
  parse: { max: 100, windowMs: 60 * 60 * 1000 },
  analyze: { max: 20, windowMs: 60 * 60 * 1000 },
  ask: { max: 60, windowMs: 60 * 60 * 1000 },
} as const;

/* ── Route max durations (seconds) ───────────────────────────────────── */

export const ROUTE_MAX_DURATION = {
  parse: 30,
  triage: 10,
  analyze: 60,
  ask: 30,
  compare: 60,
  generate: 30,
} as const;

/* ── Accepted MIME types ─────────────────────────────────────────────── */

export const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
] as const;

export const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md'] as const;

/* ── Error codes ─────────────────────────────────────────────────────── */

export const ERROR_CODE = {
  FILE_TOO_LARGE: 'file_too_large',
  TOO_MANY_PAGES: 'too_many_pages',
  NO_TEXT_LAYER: 'no_text_layer',
  UNSUPPORTED_TYPE: 'unsupported_type',
  PARSE_FAILED: 'parse_failed',
  RATE_LIMITED: 'rate_limited',
  MODEL_UNAVAILABLE: 'model_unavailable',
  VALIDATION_FAILED: 'validation_failed',
  INTERNAL: 'internal_error',
  ABORT: 'aborted',
} as const;

/* ── SSE event names ─────────────────────────────────────────────────── */

export const SSE_EVENT = {
  ESTIMATE: 'estimate',
  FINDING: 'finding',
  BATCH_ERROR: 'batch_error',
  MISSING: 'missing',
  COMPLETE: 'complete',
  ERROR: 'error',
  INTENT: 'intent',
  TOKEN: 'token',
  CITATION: 'citation',
  DONE: 'done',
} as const;

/* ── Triage sample size ──────────────────────────────────────────────── */

/**
 * Number of characters sent to the triage model for document classification.
 *
 * 4,000 chars (~1,000 tokens) is the empirically-determined minimum needed
 * to reliably identify document type, jurisdiction, and parties:
 * - Most contracts front-load key identifying terms in the first page.
 * - Sending the full document for triage would cost 4–20× more with no
 *   measurable improvement in classification accuracy.
 * - At current value, triage costs ~$0.003 per call at Sonnet pricing.
 */
export const TRIAGE_SAMPLE_CHARS = 4_000;
