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
export const MAX_TOKENS_PER_BATCH = 6_000;
export const MAX_CONCURRENCY = 3;
export const MAX_TOTAL_TOKENS = 180_000;
export const MAX_FINDINGS = 50;
export const MIN_CONFIDENCE = 0.5;
export const LOW_TRIAGE_CONFIDENCE = 0.6;

/* ── Segmentation ────────────────────────────────────────────────────── */

export const MIN_CLAUSE_CHARS = 120;
export const MAX_CLAUSE_TOKENS = 1_500;
/** Rough token estimate: 1 token ≈ 4 characters. */
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

export const TRIAGE_SAMPLE_CHARS = 4_000;
