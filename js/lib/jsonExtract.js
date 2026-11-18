// Pulls a JSON object out of a reply, even if Claude wrapped it in code fences
// or added a sentence around it.

// Returns { ok: true, value } or { ok: false }.
export function extractJson(text) {
  if (typeof text !== 'string') return { ok: false };
  const cleaned = text.replace(/```(?:json)?/gi, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) return { ok: false };
  try {
    const value = JSON.parse(cleaned.slice(start, end + 1));
    if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false };
    return { ok: true, value };
  } catch {
    return { ok: false };
  }
}
