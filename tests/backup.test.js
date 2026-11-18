import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeBackup, readBackup } from '../js/lib/backup.js';

const data = { settings: { model: 'auto', tone: 'gentle' }, stories: [{ id: 's_001' }], drills: [] };

test('a backup round-trips', () => {
  const text = JSON.stringify(makeBackup(data, 'now'));
  const result = readBackup(text);
  assert.equal(result.ok, true);
  assert.equal(result.data.settings.tone, 'gentle');
  assert.equal(result.data.stories[0].id, 's_001');
});

test('a backup never carries a key', () => {
  const backup = makeBackup({ ...data, apiKey: 'should-not-be-here' }, 'now');
  assert.equal(JSON.stringify(backup).includes('should-not-be-here'), false);
  const edited = readBackup(JSON.stringify({ ...data, apiKey: 'x', key: 'y' }));
  assert.equal(edited.data.apiKey, undefined);
  assert.equal(edited.data.key, undefined);
});

test('junk files are rejected with a message', () => {
  assert.equal(readBackup('not json').ok, false);
  assert.equal(readBackup('{"hello": 1}').ok, false);
});
