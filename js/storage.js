// Saving and loading. Story data and the API key are stored separately so the
// key can never end up in a backup file.
import { withDefaults } from './lib/dataShape.js';

const DATA_KEY = 'draftpick:data';
const API_KEY_KEY = 'draftpick:key';

// localStorage can throw (private browsing, storage full), so never let that crash the app.
function read(name) {
  try { return localStorage.getItem(name); } catch { return null; }
}
function write(name, value) {
  try { localStorage.setItem(name, value); return true; } catch { return false; }
}

export function loadData() {
  const raw = read(DATA_KEY);
  let parsed = null;
  if (raw) {
    try { parsed = JSON.parse(raw); } catch { parsed = null; }
  }
  return withDefaults(parsed);
}

export function saveData(data) {
  return write(DATA_KEY, JSON.stringify(data));
}

export function loadSettings() {
  return loadData().settings;
}

// Saves setting changes and tells the rest of the page (like the top-bar badge).
export function updateSettings(changes) {
  const data = loadData();
  data.settings = { ...data.settings, ...changes };
  const ok = saveData(data);
  window.dispatchEvent(new CustomEvent('draftpick:settings', { detail: data.settings }));
  return ok;
}

export function loadKey() {
  return (read(API_KEY_KEY) || '').trim();
}

export function saveKey(key) {
  return write(API_KEY_KEY, key.trim());
}

export function removeKey() {
  try { localStorage.removeItem(API_KEY_KEY); } catch { /* nothing to remove */ }
}
