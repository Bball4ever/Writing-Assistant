// The shape of everything saved under draftpick:data. Pure, so Node can test it.
import { isKnownModel } from './claudeHelpers.js';

export function defaultData() {
  return { settings: { model: 'auto', tone: 'blunt' }, stories: [], drills: [] };
}

// Fills in anything missing or broken, so old or hand-edited saves still load.
export function withDefaults(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return defaultData();
  const settings = raw.settings && typeof raw.settings === 'object' ? raw.settings : {};
  return {
    ...raw,
    settings: {
      ...settings,
      model: isKnownModel(settings.model) ? settings.model : 'auto',
      tone: settings.tone === 'gentle' ? 'gentle' : 'blunt',
    },
    stories: Array.isArray(raw.stories) ? raw.stories : [],
    drills: Array.isArray(raw.drills) ? raw.drills : [],
  };
}
