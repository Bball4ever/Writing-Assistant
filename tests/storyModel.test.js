import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  nextId, createStory, createDrill, focusForSceneIndex, addOutlineScene, mergeOutlineFill,
  buildScenesFromOutline, sceneText, polishUnlocked, currentSceneNumber, storyPath,
} from '../js/lib/storyModel.js';

const grade = (n) => ({ scores: { showVsTell: n, pacing: n, dialogue: n, sensory: n, focus: n } });
const fields = { mode: 'coach', genre: 'fantasy', pov: 'first person', length: 'short', title: ' The Well ' };

test('ids count up from the highest one', () => {
  assert.equal(nextId('s', []), 's_001');
  assert.equal(nextId('s', [{ id: 's_001' }, { id: 's_009' }]), 's_010');
});

test('new stories and drills start empty', () => {
  const story = createStory(fields, [], 'now');
  assert.equal(story.id, 's_001');
  assert.equal(story.title, 'The Well');
  assert.equal(story.step, 'idea');
  assert.equal(story.style, null);
  const drill = createDrill({ prompt: 'p', focus: 'echo-line' }, [{ id: 'd_003' }], 'now');
  assert.equal(drill.id, 'd_004');
  assert.deepEqual(drill.attempts, []);
});

test('scene focuses rotate and wrap around', () => {
  assert.equal(focusForSceneIndex(0), 'open-mid-action');
  assert.equal(focusForSceneIndex(7), 'echo-line');
  assert.equal(focusForSceneIndex(8), 'open-mid-action');
});

test('Helper fill only fills empty parts', () => {
  const story = createStory(fields, [], 'now');
  story.outline.beats.beginning = 'Mine.';
  addOutlineScene(story.outline, 'My scene one');
  addOutlineScene(story.outline, '');
  mergeOutlineFill(story.outline, {
    beats: { beginning: 'AI beginning', middle: 'AI middle', end: '' },
    scenes: [{ summary: 'AI one' }, { summary: 'AI two' }, { summary: 'AI three' }],
  }, 'short');
  assert.equal(story.outline.beats.beginning, 'Mine.');
  assert.equal(story.outline.beats.middle, 'AI middle');
  assert.equal(story.outline.beatsBy.middle, 'ai');
  assert.equal(story.outline.scenes[0].summary, 'My scene one');
  assert.equal(story.outline.scenes[1].summary, 'AI two');
  assert.equal(story.outline.scenes[1].by, 'ai');
  assert.equal(story.outline.scenes[2].focus, 'physical-tell');
  assert.equal(story.outline.scenes.length, 3);
});

test('fill never goes past the longest length', () => {
  const story = createStory({ ...fields, length: 'single' }, [], 'now');
  mergeOutlineFill(story.outline, { scenes: ['one', 'two', 'three'] }, 'single');
  assert.equal(story.outline.scenes.length, 1);
});

test('approving the outline keeps work already done', () => {
  const story = createStory(fields, [], 'now');
  addOutlineScene(story.outline, 'a');
  addOutlineScene(story.outline, 'b');
  buildScenesFromOutline(story);
  story.scenes[0].working = 'kept';
  addOutlineScene(story.outline, 'c');
  buildScenesFromOutline(story);
  assert.equal(story.scenes.length, 3);
  assert.equal(story.scenes[0].working, 'kept');
});

test('sceneText prefers the working text, then the latest draft, then polish', () => {
  const scene = { working: '', drafts: [{ text: 'draft one' }, { text: 'draft two' }], polish: { finalText: 'polished' } };
  assert.equal(sceneText(scene), 'draft two');
  assert.equal(sceneText(scene, 'polished'), 'polished');
  scene.working = 'working';
  assert.equal(sceneText(scene), 'working');
});

test('Polish unlocks after a rewrite that clears the bar, or a skip', () => {
  const scene = { status: 'writing', drafts: [{ by: 'you', grade: grade(4) }] };
  assert.equal(polishUnlocked(scene), false, 'one draft is not a rewrite');
  scene.drafts.push({ by: 'you', grade: grade(3) });
  assert.equal(polishUnlocked(scene), false, 'latest draft is under the bar');
  scene.drafts.push({ by: 'you', grade: grade(4) });
  assert.equal(polishUnlocked(scene), true);
  assert.equal(polishUnlocked({ status: 'skipped', drafts: [] }), true);
});

test('coming back to a story opens the first unfinished scene', () => {
  const story = createStory(fields, [], 'now');
  story.step = 'scenes';
  story.scenes = [{ n: 1, status: 'cleared' }, { n: 2, status: 'skipped' }, { n: 3, status: 'writing' }];
  assert.equal(currentSceneNumber(story), 3);
  assert.equal(storyPath(story), 'story/s_001/scene/3');
});
