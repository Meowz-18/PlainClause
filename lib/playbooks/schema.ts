/**
 * Playbook Schema.
 *
 * Implements TECH.md §4.1:
 * Playbooks are typed, version-controlled, unit-testable data — code, not prompt.
 * Supplies reviewed norms and jurisdiction notes to eliminate runtime hallucination.
 */
import { z } from 'zod';
import { DocumentTypeSchema, SeveritySchema } from '@/lib/types';

export const PlaybookCategorySchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
});
export type PlaybookCategory = z.infer<typeof PlaybookCategorySchema>;

export const PlaybookRequiredSchema = z.object({
  id: z.string(),
  title: z.string(),
  detect: z.object({
    keywords: z.array(z.string()), // deterministic keyword pre-check
    categoryId: z.string(),        // expected category
  }),
  whyItMatters: z.string(),
  severityIfMissing: SeveritySchema,
  suggestedAsk: z.string(),
});
export type PlaybookRequired = z.infer<typeof PlaybookRequiredSchema>;

export const PlaybookRedFlagSchema = z.object({
  id: z.string(),
  title: z.string(),
  signals: z.array(z.string()), // guidance provided to model
  severity: SeveritySchema,
  whyItMatters: z.string(),
  suggestedAsk: z.string(),
});
export type PlaybookRedFlag = z.infer<typeof PlaybookRedFlagSchema>;

export const PlaybookNormSchema = z.object({
  categoryId: z.string(),
  statement: z.string(),
  sourceIndex: z.number().int().nonnegative().optional(),
});
export type PlaybookNorm = z.infer<typeof PlaybookNormSchema>;

export const PlaybookJurisdictionNoteSchema = z.object({
  categoryId: z.string(),
  note: z.string(),
  sourceIndex: z.number().int().nonnegative(),
});
export type PlaybookJurisdictionNote = z.infer<typeof PlaybookJurisdictionNoteSchema>;

export const PlaybookSourceSchema = z.object({
  label: z.string(),
  url: z.string().url(),
});
export type PlaybookSource = z.infer<typeof PlaybookSourceSchema>;

export const PlaybookSchema = z.object({
  id: z.string(),
  documentType: DocumentTypeSchema,
  jurisdiction: z.string(),
  displayName: z.string(),
  lastReviewed: z.string(), // ISO date (YYYY-MM-DD) for audit trail
  sources: z.array(PlaybookSourceSchema),

  /** Taxonomy the analyser must classify clauses into */
  categories: z.array(PlaybookCategorySchema),

  /** Clauses that ought to exist. Absence becomes a MissingFinding */
  required: z.array(PlaybookRequiredSchema),

  /** Patterns that are notable or unfavourable when present */
  redFlags: z.array(PlaybookRedFlagSchema),

  /** The "is this normal?" baseline. Shown verbatim; never model-invented */
  norms: z.array(PlaybookNormSchema),

  /** Enforceability / statutory notes for the jurisdiction */
  jurisdictionNotes: z.array(PlaybookJurisdictionNoteSchema),
});
export type Playbook = z.infer<typeof PlaybookSchema>;
