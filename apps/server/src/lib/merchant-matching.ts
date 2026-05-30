export interface MatchableMerchant {
  id: string;
  name: string;
  keywords?: { keyword: string }[];
}

/** Minimum length for loose (substring) matching to prevent false positives */
const MIN_LOOSE_MATCH_LENGTH = 4;

/** Threshold score for auto-matching (not just suggestions) */
const AUTO_MATCH_THRESHOLD = 35;

/**
 * Checks if a character is a word boundary (whitespace, punctuation, or undefined).
 */
function isWordBoundary(char: string | undefined): boolean {
  return !char || /[\s\W_]/.test(char);
}

/**
 * Calculates a match score for a needle in a haystack.
 * Higher scores = better, more confident matches.
 */
function calculateMatchScore(
  needle: string,
  haystack: string,
  baseScore: number,
): number {
  const n = needle.toLowerCase().trim();
  const h = haystack.toLowerCase().trim();

  if (n.length === 0) return 0;

  // Exact match: highest confidence
  if (h === n) return baseScore + n.length;

  // Too short for loose matching (prevents false positives with "the", "eat", etc.)
  if (n.length < MIN_LOOSE_MATCH_LENGTH) return 0;

  const idx = h.indexOf(n);
  if (idx === -1) return 0;

  const before = h[idx - 1];
  const after = h[idx + n.length];

  // Whole-word or boundary match: "spotify" in "spotify p9r09wwr0" or "spotify.com"
  if (isWordBoundary(before) && isWordBoundary(after)) {
    return baseScore - 50 + n.length;
  }

  // Partial-word match (e.g., "spotify" in "spotify123")
  // Only allow for longer needles to reduce false positives
  if (n.length >= 5) {
    return baseScore - 60 + n.length;
  }

  return 0;
}

/**
 * Scores how well a merchant matches a transaction description.
 * Considers both merchant name and keywords.
 */
export function scoreMerchantMatch(
  merchant: MatchableMerchant,
  details: string,
): number {
  const detail = details.toLowerCase().trim();
  if (!detail) return 0;

  let bestScore = 0;

  // Match on merchant name (treats name as an implicit keyword)
  const name = merchant.name.toLowerCase().trim();
  if (name.length > 0) {
    bestScore = Math.max(bestScore, calculateMatchScore(name, detail, 100));
  }

  // Match on explicit keywords
  for (const k of merchant.keywords ?? []) {
    const kw = k.keyword.toLowerCase().trim();
    if (kw.length === 0) continue;
    bestScore = Math.max(bestScore, calculateMatchScore(kw, detail, 90));
  }

  return bestScore;
}

/**
 * Finds the single best matching merchant for auto-assignment.
 * Returns null if no match meets the confidence threshold.
 */
export function findBestMatchingMerchant(
  merchants: MatchableMerchant[],
  details?: string | null,
): MatchableMerchant | null {
  if (!details?.trim()) return null;

  let bestMatch: MatchableMerchant | null = null;
  let bestScore = 0;

  for (const merchant of merchants) {
    const score = scoreMerchantMatch(merchant, details);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = merchant;
    }
  }

  // Only auto-match if confidence is high enough
  if (bestScore < AUTO_MATCH_THRESHOLD) {
    return null;
  }

  return bestMatch;
}

/**
 * Finds all matching merchants sorted by relevance (highest score first).
 * Use this for suggestions where user confirmation is required.
 */
export function findAllMatchingMerchants(
  merchants: MatchableMerchant[],
  details?: string | null,
): Array<{ merchant: MatchableMerchant; score: number }> {
  if (!details?.trim()) return [];

  const matches: Array<{ merchant: MatchableMerchant; score: number }> = [];

  for (const merchant of merchants) {
    const score = scoreMerchantMatch(merchant, details);
    if (score > 0) {
      matches.push({ merchant, score });
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}
