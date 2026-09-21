/**
 * Model IDs and Task Selection.
 *
 * Implements TECH.md §5.2:
 * Configured with active models for Groq alongside Anthropic.
 */

// Groq models active on your account
export const GROQ_MODEL_FAST = 'openai/gpt-oss-20b';
export const GROQ_MODEL_POWER = 'openai/gpt-oss-120b';

// Anthropic Claude models
export const MODEL_HAIKU = 'claude-haiku-4-5-20251001';
export const MODEL_SONNET = 'claude-sonnet-5';

export const TASK_MODELS = {
  triage: MODEL_HAIKU,
  intent: MODEL_HAIKU,
  analyze: MODEL_SONNET,
  ask: MODEL_SONNET,
  compare: MODEL_SONNET,
  generate: MODEL_SONNET,
} as const;

export type TaskType = keyof typeof TASK_MODELS;

export function getModelForTask(task: TaskType): string {
  return TASK_MODELS[task];
}
