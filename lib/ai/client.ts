/**
 * Unified Multi-Provider AI Client Singleton (Groq + Anthropic).
 *
 * Supports GROQ_API_KEY (ultra-fast Llama 3.3 70B & Llama 3.1 8B)
 * and ANTHROPIC_API_KEY (Claude Sonnet 3.5/5 & Haiku 3.5).
 */
import Anthropic from '@anthropic-ai/sdk';
import Groq from 'groq-sdk';

let anthropicInstance: Anthropic | null = null;
let groqInstance: Groq | null = null;

export function isGroqConfigured(): boolean {
  const key = process.env.GROQ_API_KEY;
  return Boolean(key && !key.startsWith('mock-') && key !== 'your_groq_key_here');
}

export function isAnthropicConfigured(): boolean {
  const key = process.env.ANTHROPIC_API_KEY;
  return Boolean(key && !key.startsWith('mock-') && key !== 'your_api_key_here');
}

export function isAnyAiConfigured(): boolean {
  return isGroqConfigured() || isAnthropicConfigured();
}

export function getGroqClient(): Groq {
  if (!groqInstance) {
    const apiKey = process.env.GROQ_API_KEY || '';
    groqInstance = new Groq({
      apiKey,
      maxRetries: 3,
      timeout: 30000,
    });
  }
  return groqInstance;
}

export function getAnthropicClient(): Anthropic {
  if (!anthropicInstance) {
    const apiKey = process.env.ANTHROPIC_API_KEY || 'dummy-key-for-local-demo';
    anthropicInstance = new Anthropic({
      apiKey,
      maxRetries: 3,
      timeout: 35000,
    });
  }
  return anthropicInstance;
}
