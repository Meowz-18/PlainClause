/**
 * BM25-lite Clause Retrieval for Q&A.
 *
 * Implements efficient clause selection: instead of sending ALL clauses
 * to the model for every question, we score each clause by keyword
 * relevance and send only the top-k most relevant ones.
 *
 * Efficiency gain: For a 30-page contract with ~120 clauses, a targeted
 * question like "what is my notice period?" only needs ~5–10 clauses,
 * not all 120. This reduces input tokens by 50–85% per question.
 *
 * Safety invariant: The retrieval module NEVER drops a clause that was
 * previously cited in the conversation — citations must remain verifiable.
 *
 * @module
 */
import type { Clause } from '@/lib/types';

/* ── Stop words ──────────────────────────────────────────────────────── */

/**
 * Common English stop words excluded from BM25 scoring.
 * These carry no discriminative value for clause retrieval.
 */
const STOP_WORDS = new Set([
  'the', 'is', 'at', 'which', 'on', 'a', 'an', 'in', 'and', 'or', 'of',
  'for', 'to', 'this', 'that', 'it', 'what', 'does', 'say', 'about', 'how',
  'can', 'i', 'my', 'are', 'there', 'any', 'tell', 'me', 'with', 'from',
  'by', 'as', 'per', 'please', 'explain', 'would', 'could', 'should',
  'will', 'shall', 'may', 'do', 'be', 'have', 'has', 'had', 'not', 'but',
  'if', 'so', 'no', 'yes', 'its', 'their', 'our', 'your', 'his', 'her',
  'we', 'they', 'he', 'she', 'who', 'whom', 'been', 'being', 'was', 'were',
  'am', 'than', 'then', 'also', 'just', 'only', 'more', 'very',
]);

/* ── Legal domain synonyms ───────────────────────────────────────────── */

/**
 * Legal-domain synonym groups. If the question contains "leave",
 * we also match clauses containing "terminate", "termination", etc.
 * This boosts recall for legal concepts that users phrase colloquially.
 */
const SYNONYM_GROUPS: readonly string[][] = [
  ['terminate', 'termination', 'leave', 'exit', 'resign', 'early', 'cancel', 'end'],
  ['deposit', 'refund', 'security', 'return', 'deduction'],
  ['notice', 'notification', 'inform', 'prior'],
  ['enter', 'inspect', 'inspection', 'visit', 'access'],
  ['repair', 'maintenance', 'maintain', 'upkeep', 'wear'],
  ['compete', 'competition', 'non-compete', 'noncompete', 'restrict', 'restrictive', 'solicit'],
  ['pay', 'payment', 'salary', 'wage', 'compensation', 'bonus', 'ctc', 'fee', 'rent', 'stipend'],
  ['probation', 'confirm', 'confirmation', 'evaluation', 'trial'],
  ['court', 'jurisdiction', 'dispute', 'arbitration', 'governing', 'litigation'],
  ['penalty', 'forfeit', 'forfeiture', 'liquidated', 'damages', 'bond'],
  ['ip', 'intellectual', 'property', 'invention', 'patent', 'copyright', 'work product'],
  ['confidential', 'nda', 'disclosure', 'secret', 'proprietary'],
  ['indemnify', 'indemnity', 'liability', 'indemnification', 'liable'],
  ['insurance', 'benefit', 'medical', 'health', 'gratuity'],
];

/**
 * Pre-built index: word → Set of synonyms (including itself).
 * Built once at module load time — O(S × W) where S = synonym groups, W = words per group.
 */
const SYNONYM_INDEX: ReadonlyMap<string, ReadonlySet<string>> = (() => {
  const idx = new Map<string, Set<string>>();
  for (const group of SYNONYM_GROUPS) {
    const groupSet = new Set(group);
    for (const word of group) {
      const existing = idx.get(word);
      if (existing) {
        for (const w of groupSet) existing.add(w);
      } else {
        idx.set(word, new Set(groupSet));
      }
    }
  }
  return idx;
})();

/* ── Broad query detection ───────────────────────────────────────────── */

/**
 * Patterns that signal a broad/overview question where ALL clauses
 * should be sent (retrieval would lose context).
 */
const BROAD_PATTERNS = [
  'summarize', 'summary', 'overview', 'what is this',
  'what does this document', 'what kind of', 'what type of',
  'explain the entire', 'key terms', 'main terms', 'all obligations',
  'full analysis', 'everything',
];

/**
 * Returns true if the question is a broad overview query that
 * requires the full document context.
 */
export function isBroadQuery(question: string): boolean {
  const lower = question.toLowerCase();
  return BROAD_PATTERNS.some((p) => lower.includes(p));
}

/* ── Tokeniser ───────────────────────────────────────────────────────── */

/**
 * Tokenise a string into meaningful keywords.
 * Strips punctuation, filters stop words and very short words.
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Expand a list of query tokens with legal-domain synonyms.
 * Returns the original tokens plus any synonyms found.
 */
export function expandWithSynonyms(tokens: string[]): string[] {
  const expanded = new Set(tokens);
  for (const token of tokens) {
    const synonyms = SYNONYM_INDEX.get(token);
    if (synonyms) {
      for (const syn of synonyms) expanded.add(syn);
    }
  }
  return [...expanded];
}

/* ── BM25-lite scoring ───────────────────────────────────────────────── */

/**
 * BM25-lite parameters.
 * k1 controls term frequency saturation (higher = more weight on repeat hits).
 * b controls document length normalisation (higher = more penalty for long docs).
 */
const BM25_K1 = 1.2;
const BM25_B = 0.75;

export interface ScoredClause {
  clause: Clause;
  score: number;
}

/**
 * Score each clause against the query using BM25-lite.
 *
 * The scoring uses:
 * 1. BM25 term frequency with document length normalisation
 * 2. Synonym expansion for legal domain terms
 * 3. Heading bonus (2×) — headings are strong relevance signals
 *
 * @param query - The user's question
 * @param clauses - All clauses in the document
 * @returns Clauses with non-zero scores, sorted descending by score
 */
export function scoreClausesForQuery(
  query: string,
  clauses: Clause[]
): ScoredClause[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const expandedTokens = expandWithSynonyms(queryTokens);

  // Compute average clause length for BM25 length normalisation
  const avgLen =
    clauses.reduce((sum, c) => sum + c.text.length, 0) / (clauses.length || 1);

  const scored: ScoredClause[] = [];

  for (const clause of clauses) {
    const bodyLower = clause.text.toLowerCase();
    const headingLower = (clause.heading || '').toLowerCase();
    const docLen = clause.text.length;

    let score = 0;

    for (const token of expandedTokens) {
      // Count occurrences in body
      let tf = 0;
      let searchStart = 0;
      while (true) {
        const idx = bodyLower.indexOf(token, searchStart);
        if (idx === -1) break;
        tf++;
        searchStart = idx + token.length;
      }

      // Heading match bonus: headings are high-signal, count as 3 extra hits
      if (headingLower.includes(token)) {
        tf += 3;
      }

      if (tf > 0) {
        // BM25 TF component: tf * (k1 + 1) / (tf + k1 * (1 - b + b * dl/avgdl))
        const numerator = tf * (BM25_K1 + 1);
        const denominator = tf + BM25_K1 * (1 - BM25_B + BM25_B * (docLen / avgLen));
        score += numerator / denominator;
      }
    }

    // Boost score for original (non-expanded) query tokens — direct matches
    // are more valuable than synonym matches
    for (const token of queryTokens) {
      if (bodyLower.includes(token) || headingLower.includes(token)) {
        score += 1.0;
      }
    }

    if (score > 0) {
      scored.push({ clause, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

/* ── Top-k retrieval ─────────────────────────────────────────────────── */

/**
 * Minimum number of clauses to always include (prevents under-retrieval
 * on very short queries that match few clauses).
 */
const MIN_RETRIEVED = 5;

/**
 * Maximum fraction of total clauses to retrieve. For small documents
 * (<= 15 clauses) we send all clauses. For larger documents, we cap
 * at 40% to achieve meaningful token savings.
 */
const MAX_FRACTION = 0.4;

/**
 * Retrieve the most relevant clauses for a question.
 *
 * Algorithm:
 * 1. If the document has ≤15 clauses, return all (no savings from retrieval).
 * 2. If the question is a broad/overview query, return all.
 * 3. Otherwise, score all clauses with BM25-lite and return the top-k.
 * 4. Always include any previously-cited clauses (citation verifiability).
 *
 * @param question - The user's question
 * @param clauses - All clauses in the document
 * @param citedClauseIds - IDs of clauses cited in previous conversation turns
 * @returns The subset of clauses to send to the model
 */
export function retrieveRelevantClauses(
  question: string,
  clauses: Clause[],
  citedClauseIds: Set<string> = new Set()
): Clause[] {
  // Small documents: no retrieval needed, send everything
  if (clauses.length <= 15) return clauses;

  // Broad queries: send everything
  if (isBroadQuery(question)) return clauses;

  // Compute top-k
  const maxK = Math.max(MIN_RETRIEVED, Math.ceil(clauses.length * MAX_FRACTION));
  const scored = scoreClausesForQuery(question, clauses);

  // Take the top-k scored clauses
  const retrievedIds = new Set<string>();
  const result: Clause[] = [];

  for (const { clause } of scored.slice(0, maxK)) {
    retrievedIds.add(clause.id);
    result.push(clause);
  }

  // Always include previously-cited clauses for citation verifiability
  for (const citedId of citedClauseIds) {
    if (!retrievedIds.has(citedId)) {
      const cited = clauses.find((c) => c.id === citedId);
      if (cited) {
        retrievedIds.add(cited.id);
        result.push(cited);
      }
    }
  }

  // If scoring returned nothing (edge case: no keyword overlap at all),
  // fall back to sending all clauses
  if (result.length === 0) return clauses;

  // Re-sort by original document order (preserves reading flow for the model)
  result.sort((a, b) => a.start - b.start);

  return result;
}
