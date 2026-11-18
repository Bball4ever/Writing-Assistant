// Saving and loading. Story data and the API key are stored separately so the
// key can never end up in a backup file.
//
// The app keeps one copy of the data in memory. Screens change it directly,
// then call scheduleSave() (saves ~3 seconds after typing stops) or saveNow().
import { withDefaults } from './lib/dataShape.js';
import { makeBackup, readBackup } from './lib/backup.js';
import { createStory, createDrill } from './lib/storyModel.js';

const DATA_KEY = 'draftpick:data';
const API_KEY_KEY = 'draftpick:key';
const AUTO_SAVE_DELAY = 3000;

let data = null;
let saveTimer = null;

// localStorage can throw (private browsing, storage full), so never let that crash the app.
function read(name) {
  try { return localStorage.getItem(name); } catch { return null; }
}
function write(name, value) {
  try { localStorage.setItem(name, value); return true; } catch { return false; }
}

export function nowIso() {
  return new Date().toISOString();
}

export function getData() {
  if (!data) {
    const raw = read(DATA_KEY);
    let parsed = null;
    if (raw) {
      try { parsed = JSON.parse(raw); } catch { parsed = null; }
    }
    data = withDefaults(parsed);
  }
  return data;
}

export function saveNow() {
  clearTimeout(saveTimer);
  saveTimer = null;
  const ok = write(DATA_KEY, JSON.stringify(getData()));
  window.dispatchEvent(new CustomEvent('draftpick:saved', { detail: { ok } }));
  return ok;
}

export function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, AUTO_SAVE_DELAY);
}

// Don't lose the last few seconds of typing when the tab closes or hides.
window.addEventListener('pagehide', () => { if (saveTimer) saveNow(); });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && saveTimer) saveNow();
});

// Marks a story or drill as just edited and schedules a save.
export function touch(item) {
  if (item) item.updatedAt = nowIso();
  scheduleSave();
}

export function loadSettings() {
  return getData().settings;
}

// Saves setting changes and tells the rest of the page (like the top-bar badge).
export function updateSettings(changes) {
  const d = getData();
  d.settings = { ...d.settings, ...changes };
  const ok = saveNow();
  window.dispatchEvent(new CustomEvent('draftpick:settings', { detail: d.settings }));
  return ok;
}

// Stories and drills

export function findStory(id) {
  return getData().stories.find((s) => s.id === id) ?? null;
}

export function findDrill(id) {
  return getData().drills.find((d) => d.id === id) ?? null;
}

export function addStory(fields) {
  const d = getData();
  const story = createStory(fields, d.stories, nowIso());
  d.stories.push(story);
  saveNow();
  return story;
}

export function addDrill(fields) {
  const d = getData();
  const drill = createDrill(fields, d.drills, nowIso());
  d.drills.push(drill);
  saveNow();
  return drill;
}

export function deleteStory(id) {
  const d = getData();
  d.stories = d.stories.filter((s) => s.id !== id);
  saveNow();
}

export function deleteDrill(id) {
  const d = getData();
  d.drills = d.drills.filter((x) => x.id !== id);
  saveNow();
}

// Backup

export function exportBackupText() {
  saveNow();
  return JSON.stringify(makeBackup(getData(), nowIso()), null, 2);
}

// Returns { ok, error }. Replaces everything except the API key.
export function importBackupText(text) {
  const result = readBackup(text);
  if (!result.ok) return result;
  data = result.data;
  saveNow();
  window.dispatchEvent(new CustomEvent('draftpick:settings', { detail: data.settings }));
  return { ok: true };
}

// The API key

export function loadKey() {
  return (read(API_KEY_KEY) || '').trim();
}

export function saveKey(key) {
  return write(API_KEY_KEY, key.trim());
}

export function removeKey() {
  try { localStorage.removeItem(API_KEY_KEY); } catch { /* nothing to remove */ }
}
