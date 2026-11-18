import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultData, withDefaults } from '../js/lib/dataShape.js';

test('nothing saved gives the default data', () => {
  assert.deepEqual(withDefaults(null), defaultData());
  assert.deepEqual(withDefaults('junk'), defaultData());
  assert.deepEqual(withDefaults([]), defaultData());
});

test('saved settings are kept', () => {
  const data = withDefaults({ settings: { model: 'claude-opus-5-5', tone: 'gentle' } });
  assert.equal(data.settings.model, 'claude-opus-5-5');
  assert.equal(data.settings.tone, 'gentle');
  assert.deepEqual(data.stories, []);
  assert.deepEqual(data.drills, []);
});

test('bad settings fall back to Auto and blunt', () => {
  const data = withDefaults({ settings: { model: 'claude-gone-1', tone: 'shouty' } });
  assert.equal(data.settings.model, 'auto');
  assert.equal(data.settings.tone, 'blunt');
});

test('existing stories and drills are kept', () => {
  const data = withDefaults({ stories: [{ id: 's_001' }], drills: [{ id: 'd_001' }] });
  assert.equal(data.stories[0].id, 's_001');
  assert.equal(data.drills[0].id, 'd_001');
});
