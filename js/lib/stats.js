// Numbers for the Progress screen and the quick drill focus pick.
import { RUBRIC_TO_FOCUS, FOCUSES, RECENT_COUNT } from '../config.js';
import { RUBRIC_KEYS, average } from './scores.js';
import { wordCount } from './textFormat.js';
import { sceneText, gradedDrafts } from './storyModel.js';

// Every grade that counts toward Zane's scores, oldest first: drill attempts,
// and his own drafts in Coach and Polish stories. Writer drafts, polished
// text and critique checks don't count.
export function gradedEntries(data) {
  const entries = [];
  for (const drill of data.drills || []) {
    for (const attempt of drill.attempts || []) {
      if (attempt.grade?.scores) entries.push({ at: attempt.at || '', scores: attempt.grade.scores, source: 'drill' });
    }
  }
  for (const story of data.stories || []) {
    if (story.mode !== 'coach' && story.mode !== 'polish') continue;
    for (const scene of story.scenes || []) {
      for (const draft of scene.drafts || []) {
        if (draft.by === 'you' && draft.grade?.scores) entries.push({ at: draft.at || '', scores: draft.grade.scores, source: 'scene' });
      }
    }
  }
  return entries.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
}

// One line per category: [{ x, y }] where x is the entry's position.
export function chartSeries(entries) {
  const series = {};
  for (const key of RUBRIC_KEYS) {
    series[key] = entries
      .map((e, x) => ({ x, y: e.scores[key] }))
      .filter((p) => typeof p.y === 'number');
  }
  return series;
}

function mean(values) {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

function categoryMean(entries, key) {
  return mean(entries.map((e) => e.scores[key]).filter((v) => typeof v === 'number'));
}

// The category with the lowest recent average. Only the four categories that
// map to a drill focus are considered ("Skill focus" changes every time).
export function weakestCategory(entries, recent = RECENT_COUNT) {
  const slice = entries.slice(-recent);
  let weakest = null;
  for (const key of Object.keys(RUBRIC_TO_FOCUS)) {
    const avg = categoryMean(slice, key);
    if (avg !== null && (weakest === null || avg < weakest.avg)) weakest = { key, avg };
  }
  return weakest ? weakest.key : null;
}

// The category that climbed the most from the first few grades to the latest few.
export function mostImproved(entries, window = 3) {
  if (entries.length < 2) return null;
  const size = Math.min(window, Math.floor(entries.length / 2)) || 1;
  const early = entries.slice(0, size);
  const late = entries.slice(-size);
  let best = null;
  for (const key of RUBRIC_KEYS) {
    const before = categoryMean(early, key);
    const after = categoryMean(late, key);
    if (before === null || after === null) continue;
    const gain = after - before;
    if (gain > 0 && (best === null || gain > best.gain)) best = { key, gain };
  }
  return best;
}

export function pickDrillFocus(data, random = Math.random) {
  const weakest = weakestCategory(gradedEntries(data));
  if (weakest) return { focus: RUBRIC_TO_FOCUS[weakest], reason: 'weakest', category: weakest };
  return { focus: FOCUSES[Math.floor(random() * FOCUSES.length)].id, reason: 'random', category: null };
}

// Average gain from the first graded draft to the last, for every drill and
// Coach/Polish scene graded at least twice.
export function rewriteGains(data) {
  const gains = [];
  const add = (grades) => {
    if (grades.length < 2) return;
    const first = average(grades[0].scores);
    const last = average(grades[grades.length - 1].scores);
    if (first !== null && last !== null) gains.push(last - first);
  };
  for (const drill of data.drills || []) add((drill.attempts || []).filter((a) => a.grade?.scores).map((a) => a.grade));
  for (const story of data.stories || []) {
    if (story.mode === 'writer') continue;
    for (const scene of story.scenes || []) {
      add(gradedDrafts(scene).filter((d) => d.by === 'you').map((d) => d.grade));
    }
  }
  return { average: mean(gains), count: gains.length };
}

// How many changes the Polisher made per scene, oldest story first.
export function polishEdits(data) {
  const rows = [];
  const stories = [...(data.stories || [])].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  for (const story of stories) {
    if (story.mode !== 'polish') continue;
    for (const scene of story.scenes || []) {
      if (scene.polish && Array.isArray(scene.polish.changes)) {
        rows.push({ storyId: story.id, title: story.title || 'Untitled', n: scene.n, count: scene.polish.changes.length });
      }
    }
  }
  return { rows, average: mean(rows.map((r) => r.count)) };
}

export function skippedScenes(data) {
  const rows = [];
  for (const story of data.stories || []) {
    for (const scene of story.scenes || []) {
      if (scene.status === 'skipped') {
        const card = story.outline?.scenes?.find((s) => s.n === scene.n);
        rows.push({ storyId: story.id, title: story.title || 'Untitled', n: scene.n, focus: card?.focus ?? '' });
      }
    }
  }
  return rows;
}

// Words written counts Zane's own words: his latest drill attempts and his
// version of every Coach and Polish scene.
export function totals(data) {
  let scenesWritten = 0;
  let wordsWritten = 0;
  for (const story of data.stories || []) {
    for (const scene of story.scenes || []) {
      const text = sceneText(scene, 'mine');
      if (!text.trim()) continue;
      scenesWritten += 1;
      if (story.mode !== 'writer') wordsWritten += wordCount(text);
    }
  }
  let drillsDone = 0;
  for (const drill of data.drills || []) {
    const attempts = drill.attempts || [];
    if (attempts.length) {
      drillsDone += 1;
      wordsWritten += wordCount(attempts[attempts.length - 1].text);
    }
  }
  const storiesFinished = (data.stories || []).filter((s) => s.step === 'finish').length;
  return { storiesFinished, scenesWritten, drillsDone, wordsWritten };
}
