// Backup files: everything except the API key, which is stored separately
// and never placed in data in the first place.
import { withDefaults } from './dataShape.js';

export function makeBackup(data, now) {
  const { settings, stories, drills } = data;
  return { app: 'draftpick', version: 1, exportedAt: now, data: { settings, stories, drills } };
}

// Reads a backup file's text. Returns { ok: true, data } or { ok: false, error }.
export function readBackup(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file isn't a Draft Pick backup (it isn't valid JSON)." };
  }
  // Accept the wrapped format and a bare data object.
  const raw = parsed && parsed.app === 'draftpick' ? parsed.data : parsed;
  if (!raw || typeof raw !== 'object' || (!Array.isArray(raw.stories) && !Array.isArray(raw.drills))) {
    return { ok: false, error: "That file isn't a Draft Pick backup." };
  }
  const data = withDefaults(raw);
  // Belt and braces: never let a key sneak in through an edited file.
  delete data.key;
  delete data.apiKey;
  return { ok: true, data };
}
