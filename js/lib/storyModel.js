// Creating and reading stories, scenes and drills. Pure, so Node can test it.
import { FOCUSES, LENGTHS, BAR, POLISH_MIN_REWRITES } from '../config.js';
import { clearsBar } from './scores.js';

// IDs like s_001 and d_014. Picks the next number after the highest one used.
export function nextId(prefix, items) {
  const used = (items || [])
    .map((item) => Number(String(item.id || '').split('_')[1]))
    .filter((n) => Number.isFinite(n));
  const next = (used.length ? Math.max(...used) : 0) + 1;
  return `${prefix}_${String(next).padStart(3, '0')}`;
}

export function focusForSceneIndex(index) {
  return FOCUSES[index % FOCUSES.length].id;
}

export function focusInfo(id) {
  return FOCUSES.find((f) => f.id === id) ?? FOCUSES[0];
}

export function lengthInfo(length) {
  return LENGTHS[length] ?? LENGTHS.short;
}

export function createStory({ mode, genre, pov, length, title, style }, existing, now) {
  return {
    id: nextId('s', existing),
    title: (title || '').trim(),
    mode,
    genre,
    pov,
    length,
    style: mode === 'writer' ? style : null,
    step: 'idea',
    idea: { prompt: '', seed: '', pitch: '', pitchBy: 'you', pitches: [], feedback: [] },
    outline: {
      beats: { beginning: '', middle: '', end: '' },
      beatsBy: {},
      scenes: [],
      feedback: [],
    },
    scenes: [],
    createdAt: now,
    updatedAt: now,
    finishedAt: '',
  };
}

export function createDrill({ prompt, focus }, existing, now) {
  return {
    id: nextId('d', existing),
    prompt,
    focus,
    draft: '',
    attempts: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function newScene(n) {
  return { n, status: 'writing', working: '', notes: '', drafts: [], polish: null };
}

// Adds a scene card to the outline with the next focus in the rotation.
export function addOutlineScene(outline, summary = '', by = 'you') {
  const index = outline.scenes.length;
  outline.scenes.push({ n: index + 1, summary, focus: focusForSceneIndex(index), by });
}

export function renumberOutline(outline) {
  outline.scenes.forEach((s, i) => { s.n = i + 1; });
}

// Fills only the empty beats and scene cards from a Helper fill.
export function mergeOutlineFill(outline, fill, length) {
  const { max } = lengthInfo(length);
  outline.beatsBy = outline.beatsBy || {};
  for (const key of ['beginning', 'middle', 'end']) {
    const value = fill?.beats?.[key];
    if (!(outline.beats[key] || '').trim() && typeof value === 'string' && value.trim()) {
      outline.beats[key] = value.trim();
      outline.beatsBy[key] = 'ai';
    }
  }
  const scenes = Array.isArray(fill?.scenes) ? fill.scenes : [];
  scenes.forEach((item, i) => {
    const summary = typeof item === 'string' ? item : item?.summary;
    if (typeof summary !== 'string' || !summary.trim()) return;
    const existing = outline.scenes[i];
    if (!existing) {
      if (outline.scenes.length < max) addOutlineScene(outline, summary.trim(), 'ai');
    } else if (!(existing.summary || '').trim()) {
      existing.summary = summary.trim();
      existing.by = 'ai';
    }
  });
  renumberOutline(outline);
  return outline;
}

// Turns the approved outline into scenes, keeping any work already done.
export function buildScenesFromOutline(story) {
  renumberOutline(story.outline);
  story.scenes = story.outline.scenes.map((os) =>
    story.scenes.find((s) => s.n === os.n) ?? newScene(os.n));
  return story.scenes;
}

export function latestDraft(scene) {
  const drafts = scene?.drafts || [];
  return drafts.length ? drafts[drafts.length - 1] : null;
}

export function gradedDrafts(scene) {
  return (scene?.drafts || []).filter((d) => d.grade && d.grade.scores);
}

// The text that counts as this scene right now. 'polished' falls back to
// Zane's version when there's no polish yet.
export function sceneText(scene, version = 'mine') {
  if (!scene) return '';
  if (version === 'polished' && scene.polish?.finalText) return scene.polish.finalText;
  if (scene.working && scene.working.trim()) return scene.working;
  return latestDraft(scene)?.text ?? '';
}

// Polish unlocks once the latest draft clears the bar and has been rewritten
// at least once (so at least two graded drafts), or as soon as Zane skips.
export function polishUnlocked(scene, bar = BAR) {
  if (!scene) return false;
  if (scene.status === 'skipped') return true;
  const graded = gradedDrafts(scene);
  const latest = graded[graded.length - 1];
  return Boolean(latest) && graded.length >= 1 + POLISH_MIN_REWRITES && clearsBar(latest.grade.scores, bar);
}

// The scene to open when Zane comes back to a story.
export function currentSceneNumber(story) {
  const open = story.scenes.find((s) => s.status === 'writing');
  return open ? open.n : (story.scenes.length ? story.scenes[story.scenes.length - 1].n : 1);
}

export function storyPath(story) {
  if (story.step === 'outline') return `story/${story.id}/outline`;
  if (story.step === 'scenes') return `story/${story.id}/scene/${currentSceneNumber(story)}`;
  if (story.step === 'finish') return `story/${story.id}/finish`;
  return `story/${story.id}/idea`;
}
