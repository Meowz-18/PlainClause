/**
 * Intent Classifier.
 *
 * Implements TECH.md §8.1:
 * Runs on every user question before generation.
 *
 * 5-way routing:
 * - 'urgent_situation'   → Emergency / legal aid resources first, then document context
 * - 'advice_seeking'     → Reframe to document options + offer prep pack / counsel reminder
 * - 'general_legal_info' → General legal background, flagged as not-from-your-document
 * - 'off_topic'          → Polite decline, redirect back to contract comprehension
 * - 'document_question'  → Grounded Q&A strictly anchored to document clauses
 *
 * Biased toward safety: When in doubt, prefer urgent_situation or advice_seeking.
 */
import type { Intent } from '@/lib/types';
import {
  getAnthropicClient,
  isAnthropicConfigured,
  getGroqClient,
  isGroqConfigured,
} from '@/lib/ai/client';
import { MODEL_HAIKU, GROQ_MODEL_FAST } from '@/lib/ai/models';

export interface IntentResult {
  intent: Intent;
  confidence: number;
  reasoning: string;
}

const URGENT_PATTERNS: RegExp[] = [
  /\b(evict(ed|ing)?\s+(today|now|immediately)|locked\s+(\w+\s+)?out|lockout|threw\s+my\s+bags|thrown\s+out)\b/i,
  /\b(police|arrest|jail|custody|fir|bail)\b/i,
  /\b(physically\s+threaten(ed|ing)?|threaten(ed|ing)?|assault|violence|hit\s+me|beating|danger)\b/i,
  /\b(harass(ed|ing)?|stalking|abusive|domestic\s+violence)\b/i,
  /\b(emergency|immediate\s+help|threat\s+to\s+life|suicide|harm)\b/i,
  /\b(passport\s+confiscat(ed)?|held\s+captive|forced\s+to\s+work)\b/i,
];

const ADVICE_PATTERNS: RegExp[] = [
  /\b(should\s+i\s+sign|would\s+you\s+sign|should\s+i\s+accept)\b/i,
  /\b(should\s+i\s+sue|can\s+i\s+sue|will\s+i\s+win|take\s+them\s+to\s+court)\b/i,
  /\b(is\s+this\s+a\s+good\s+deal|is\s+this\s+fair\s+for\s+me)\b/i,
  /\b(what\s+would\s+you\s+do|give\s+me\s+advice|advise\s+me)\b/i,
  /\b(how\s+do\s+i\s+break\s+this|can\s+i\s+get\s+away\s+with)\b/i,
];

const GENERAL_LEGAL_PATTERNS: RegExp[] = [
  /\bwhat\s+is\s+(section\s+\d+|the\s+law|the\s+rent\s+act|stamp\s+duty|rera)\b/i,
  /\bhow\s+does\s+(probation|notice\s+period|security\s+deposit|arbitration)\s+work\s+in\s+india\b/i,
  /\bexplain\s+(section\s+\d+|restraint\s+of\s+trade|liquidated\s+damages)\b/i,
];

const OFF_TOPIC_PATTERNS: RegExp[] = [
  /\b(recipe|weather|write\s+a\s+poem|joke|python\s+script|code|translate\s+french|movie)\b/i,
  /\b(who\s+won\s+the|sports|cricket\s+score|stock\s+price|bitcoin)\b/i,
];

/**
 * Deterministic intent classifier based on regex rules and safety bias.
 */
export function classifyIntentDeterministically(question: string): IntentResult {
  const q = question.trim();

  // 1. Safety first: Urgent situations
  for (const regex of URGENT_PATTERNS) {
    if (regex.test(q)) {
      return {
        intent: 'urgent_situation',
        confidence: 0.95,
        reasoning: 'Detected urgent indicators of imminent eviction, harm, threat, or legal emergency.',
      };
    }
  }

  // 2. Advice seeking
  for (const regex of ADVICE_PATTERNS) {
    if (regex.test(q)) {
      return {
        intent: 'advice_seeking',
        confidence: 0.9,
        reasoning: 'User is seeking prescriptive advice on whether to sign, sue, or pursue legal action.',
      };
    }
  }

  // 3. Off topic
  for (const regex of OFF_TOPIC_PATTERNS) {
    if (regex.test(q)) {
      return {
        intent: 'off_topic',
        confidence: 0.88,
        reasoning: 'Question appears unrelated to contracts, legal documents, or tenancy/employment.',
      };
    }
  }

  // 4. General legal info
  for (const regex of GENERAL_LEGAL_PATTERNS) {
    if (regex.test(q)) {
      return {
        intent: 'general_legal_info',
        confidence: 0.85,
        reasoning: 'Question asks about broad legal concepts or statutes rather than specific document clauses.',
      };
    }
  }

  // Default: Document question
  return {
    intent: 'document_question',
    confidence: 0.85,
    reasoning: 'Question pertains to document terms, clauses, obligations, or timelines.',
  };
}

/**
 * Main intent classification dispatcher.
 * Uses Claude Haiku when API key is available, falling back to deterministic classifier.
 */
export async function classifyIntent(
  question: string,
  signal?: AbortSignal
): Promise<IntentResult> {
  const deterministic = classifyIntentDeterministically(question);

  // If already flagged as urgent, preserve immediately for safety
  if (deterministic.intent === 'urgent_situation') {
    return deterministic;
  }

  if (isGroqConfigured()) {
    try {
      const groq = getGroqClient();
      const completion = await groq.chat.completions.create({
        model: GROQ_MODEL_FAST,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are the intent router for PlainClause legal assistant.
Classify the user's message into exactly one category:
- "urgent_situation": Imminent physical harm, lock-out, same-day eviction, police, domestic abuse, threats. (BIAS TOWARDS THIS IF IN DOUBT)
- "advice_seeking": Asking whether to sign, sue, take legal action, or asking for strategic advice.
- "general_legal_info": Asking about legal definitions, laws, or acts without reference to this specific contract.
- "off_topic": Unrelated topics like coding, recipes, casual chit-chat, sports.
- "document_question": Asking what the agreement says, rights, duties, notice period, or terms.

Respond with JSON only: {"intent": "urgent_situation"|"advice_seeking"|"general_legal_info"|"off_topic"|"document_question", "confidence": number, "reasoning": string}`,
          },
          { role: 'user', content: question },
        ],
      });

      const text = completion.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(text);
      if (
        ['urgent_situation', 'advice_seeking', 'general_legal_info', 'off_topic', 'document_question'].includes(
          parsed.intent
        )
      ) {
        return {
          intent: parsed.intent as Intent,
          confidence: Number(parsed.confidence) || 0.85,
          reasoning: String(parsed.reasoning || 'Classified by Groq model'),
        };
      }
    } catch {
      // Fall through to Anthropic or deterministic
    }
  }

  if (!isAnthropicConfigured()) {
    return deterministic;
  }

  try {
    const client = getAnthropicClient();
    const response = await client.messages.create(
      {
        model: MODEL_HAIKU,
        max_tokens: 150,
        temperature: 0,
        system: `You are the intent router for PlainClause legal assistant.
Classify the user's message into exactly one category:
- "urgent_situation": Imminent physical harm, lock-out, same-day eviction, police, domestic abuse, threats. (BIAS TOWARDS THIS IF IN DOUBT)
- "advice_seeking": Asking whether to sign, sue, take legal action, or asking for strategic advice.
- "general_legal_info": Asking about legal definitions, laws, or acts without reference to this specific contract.
- "off_topic": Unrelated topics like coding, recipes, casual chit-chat, sports.
- "document_question": Asking what the agreement says, rights, duties, notice period, or terms.

Respond with JSON only: {"intent": "...", "confidence": 0.0-1.0, "reasoning": "..."}`,
        messages: [{ role: 'user', content: question }],
      },
      { signal }
    );

    const firstBlock = response.content[0];
    if (firstBlock && firstBlock.type === 'text') {
      const parsed = JSON.parse(firstBlock.text);
      if (
        ['urgent_situation', 'advice_seeking', 'general_legal_info', 'off_topic', 'document_question'].includes(
          parsed.intent
        )
      ) {
        return {
          intent: parsed.intent as Intent,
          confidence: Number(parsed.confidence) || 0.85,
          reasoning: String(parsed.reasoning || 'Classified by model'),
        };
      }
    }
  } catch {
    // Fall back to deterministic on any error or timeout
  }

  return deterministic;
}
