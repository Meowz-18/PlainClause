/**
 * Zod Schemas for Model Outputs.
 *
 * Implements TECH.md §7.2 & §7.3:
 * Shapes model tool-use / structured JSON outputs and verifies them at runtime.
 */
import { z } from 'zod';
import { DocumentTypeSchema, SeveritySchema, FavoursSchema } from '@/lib/types';

/** Model output for document triage */
export const TriageOutputSchema = z.object({
  documentType: DocumentTypeSchema,
  confidence: z.number().min(0).max(1),
  jurisdiction: z.string().default('unknown'),
  language: z.string().default('en'),
  parties: z
    .array(
      z.object({
        role: z.string(),
        name: z.string().nullable(),
      })
    )
    .default([]),
  reasoning: z.string().default(''),
});
export type TriageOutput = z.infer<typeof TriageOutputSchema>;

/** Raw clause analysis item returned by the model before playbook enrichment */
export const RawClauseAnalysisItemSchema = z.object({
  clauseId: z.string(),
  categoryId: z.string(),
  title: z.string().max(120),
  plainSummary: z.string(),
  severity: SeveritySchema,
  favours: FavoursSchema,
  whyItMatters: z.string(),
  matchedRedFlagId: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1),
});
export type RawClauseAnalysisItem = z.infer<typeof RawClauseAnalysisItemSchema>;

/** Batch output from clause analysis call */
export const ClauseAnalysisBatchOutputSchema = z.object({
  findings: z.array(RawClauseAnalysisItemSchema),
});
export type ClauseAnalysisBatchOutput = z.infer<typeof ClauseAnalysisBatchOutputSchema>;
