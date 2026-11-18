import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  gradedEntries, chartSeries, weakestCategory, mostImproved, pickDrillFocus,
  rewriteGains, polishEdits, skippedScenes, totals,
} from '../js/lib/stats.js';

const g = (showVsTell, pacing, dialogue, sensory, focus = 3) => ({ scores: { showVsTell, pacing, dialogue, sensory, focus } });

function sampleData() {
  return {
    settings: {},
    drills: [
      { id: 'd_001', attempts: [
        { text: 'one two three', grade: g(2, 3, null, 4), at: '2026-01-01' },
        { text: 'one two three four', grade: g(3, 3, null, 4), at: '2026-01-02' },
      ] },
      { id: 'd_002', attempts: [{ text: 'five six', grade: g(4, 2, 3, 5), at: '2026-01-03' }] },
    ],
    stories: [
      { id: 's_001', mode: 'coach', step: 'finish', createdAt: '2026-01-01', title: 'A',
        outline: { scenes: [{ n: 1, focus: 'echo-line' }, { n: 2, focus: 'physical-tell' }] },
        scenes: [
          { n: 1, status: 'cleared', working: 'a b c d', drafts: [{ by: 'you', text: 'a b c', grade: g(3, 3, 3, 3), at: '2026-01-04' }] },
          { n: 2, status: 'skipped', working: '', drafts: [] },
        ] },
      { id: 's_002', mode: 'writer', step: 'scenes', createdAt: '2026-01-02', title: 'B',
        outline: { scenes: [{ n: 1, focus: 'open-mid-action' }] },
        scenes: [{ n: 1, status: 'cleared', drafts: [{ by: 'ai', text: 'ai words here', grade: {}, critique: g(5, 5, 5, 5), at: '2026-01-05' }] }] },
      { id: 's_003', mode: 'polish', step: 'scenes', createdAt: '2026-01-03', title: 'C',
        outline: { scenes: [{ n: 1, focus: 'open-mid-action' }] },
        scenes: [{ n: 1, status: 'cleared', working: 'x y', drafts: [], polish: { changes: [{}, {}, {}] } }] },
    ],
  };
}

test('only drills and Zane\'s own Coach/Polish drafts count, oldest first', () => {
  const entries = gradedEntries(sampleData());
  assert.equal(entries.length, 4);
  assert.deepEqual(entries.map((e) => e.at), ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04']);
});

test('three graded drills give three points per category', () => {
  const data = { drills: [1, 2, 3].map((i) => ({ attempts: [{ text: 't', grade: g(i, i, i, i, i), at: `2026-01-0${i}` }] })), stories: [] };
  const series = chartSeries(gradedEntries(data));
  for (const key of ['showVsTell', 'pacing', 'dialogue', 'sensory', 'focus']) assert.equal(series[key].length, 3);
});

test('null dialogue scores leave gaps in the chart', () => {
  const series = chartSeries(gradedEntries(sampleData()));
  assert.equal(series.dialogue.length, 2);
  assert.equal(series.showVsTell.length, 4);
});

test('weakest category and the drill focus it picks', () => {
  const data = sampleData();
  assert.equal(weakestCategory(gradedEntries(data)), 'pacing');
  assert.deepEqual(pickDrillFocus(data), { focus: 'punchy-big-moment', reason: 'weakest', category: 'pacing' });
});

test('with no grades the drill focus is random', () => {
  const pick = pickDrillFocus({ drills: [], stories: [] }, () => 0);
  assert.equal(pick.reason, 'random');
  assert.equal(pick.focus, 'open-mid-action');
});

test('most improved finds the biggest climb', () => {
  const entries = [g(1, 3, 3, 3), g(2, 3, 3, 3), g(4, 3, 3, 3), g(5, 3, 3, 3)].map((x, i) => ({ at: String(i), scores: x.scores }));
  assert.equal(mostImproved(entries).key, 'showVsTell');
  assert.equal(mostImproved(entries.slice(0, 1)), null);
});

test('rewrite gains, polish edits, skipped scenes and totals', () => {
  const data = sampleData();
  const gains = rewriteGains(data);
  assert.equal(gains.count, 1);
  assert.ok(Math.abs(gains.average - 0.25) < 1e-9);
  assert.deepEqual(polishEdits(data), { rows: [{ storyId: 's_003', title: 'C', n: 1, count: 3 }], average: 3 });
  assert.deepEqual(skippedScenes(data), [{ storyId: 's_001', title: 'A', n: 2, focus: 'physical-tell' }]);
  assert.deepEqual(totals(data), { storiesFinished: 1, scenesWritten: 3, drillsDone: 2, wordsWritten: 4 + 2 + 4 + 2 });
});
