// Finds the dashes and ellipses that AI story text isn't allowed to use:
// em dash, en dash, double hyphen, a hyphen with spaces on both sides,
// the ellipsis character and three dots. Hyphens inside words are fine.
const DASH_PATTERN = /—|–|-{2,}|(?<=\s)-(?=\s)|…|\.{3,}/g;

// Returns [{ start, end, match }] for every spot found.
export function findDashes(text) {
  if (typeof text !== 'string' || !text) return [];
  return [...text.matchAll(DASH_PATTERN)].map((m) => ({
    start: m.index,
    end: m.index + m[0].length,
    match: m[0],
  }));
}

export function hasDashes(text) {
  return findDashes(text).length > 0;
}

export function anyHasDashes(texts) {
  return texts.some((t) => hasDashes(t));
}
