const env = require('../../config/env');
const logger = require('../../config/logger');

/**
 * Smart function selector — Blueprint Sec 21 (Step 8: Load active functions)
 *
 * When the project has more active functions than FUNCTION_INJECT_LIMIT,
 * we use keyword-based relevance scoring to filter down to only the functions
 * most likely to be useful for the user's current query.
 *
 * This keeps LLM prompt context tight, reduces token usage, and avoids
 * confusing the LLM with irrelevant tool definitions.
 *
 * Strategy:
 *   - If total active functions <= INJECT_LIMIT  → send all (no filtering)
 *   - If total active functions >  INJECT_LIMIT  → score each function by
 *     keyword overlap between (query tokens) and (function name + description),
 *     then take the top INJECT_LIMIT by score.
 *
 * This is NOT embedding/vector-based (that's Phase 2), but is significantly
 * better than sending everything blindly.
 */

/**
 * Tokenize a string into lowercase words, stripping punctuation.
 * @param {string} text
 * @returns {Set<string>}
 */
function tokenize(text) {
  if (!text || typeof text !== 'string') return new Set();
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9_\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 1) // ignore single-char tokens
  );
}

/**
 * Score a single function's relevance to the user query.
 * Returns a numeric score: higher = more relevant.
 * @param {object} fn - Function document from Firestore
 * @param {Set<string>} queryTokens
 * @returns {number}
 */
function scoreFunctionRelevance(fn, queryTokens) {
  const nameTokens = tokenize(fn.name);
  const descTokens = tokenize(fn.description || '');

  let score = 0;

  // Name matches are weighted higher (2x) than description matches
  for (const token of queryTokens) {
    if (nameTokens.has(token)) score += 2;
    if (descTokens.has(token)) score += 1;
  }

  // Bonus: if any query token is a substring of the function name
  // e.g. query "order" matches function "check_order_status"
  for (const token of queryTokens) {
    if (fn.name && fn.name.toLowerCase().includes(token)) score += 1;
    if (fn.description && fn.description.toLowerCase().includes(token)) score += 0.5;
  }

  return score;
}

/**
 * Select the most relevant functions for the given user query.
 *
 * @param {Array} activeFunctions - All active functions loaded from Firestore
 * @param {string} userQuery - The user's message text
 * @returns {Array} - Filtered (and sorted by relevance) subset of functions
 */
function selectRelevantFunctions(activeFunctions, userQuery) {
  const limit = env.FUNCTION_INJECT_LIMIT;

  if (!activeFunctions || activeFunctions.length === 0) {
    return [];
  }

  // If below limit, send all — no filtering needed
  if (activeFunctions.length <= limit) {
    logger.info(
      { totalFunctions: activeFunctions.length, limit },
      'Function count within inject limit — sending all to orchestrator'
    );
    return activeFunctions;
  }

  // Above limit — apply relevance scoring
  const queryTokens = tokenize(userQuery);

  logger.info(
    { totalFunctions: activeFunctions.length, limit, queryTokenCount: queryTokens.size },
    'Function count exceeds inject limit — applying relevance filter'
  );

  const scored = activeFunctions.map(fn => ({
    fn,
    score: scoreFunctionRelevance(fn, queryTokens),
  }));

  // Sort descending by score, then take top N
  scored.sort((a, b) => b.score - a.score);
  const selected = scored.slice(0, limit).map(s => s.fn);

  logger.info(
    {
      selected: selected.map(f => ({ name: f.name, score: scored.find(s => s.fn === f)?.score })),
    },
    'Relevance-filtered function list'
  );

  return selected;
}

module.exports = { selectRelevantFunctions, scoreFunctionRelevance, tokenize };
