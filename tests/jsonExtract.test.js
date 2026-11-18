import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractJson } from '../js/lib/jsonExtract.js';

test('plain JSON parses', () => {
  assert.deepEqual(extractJson('{"a": 1}'), { ok: true, value: { a: 1 } });
});

test('code fences and chatter around the JSON are ignored', () => {
  const reply = 'Sure! Here it is:\n```json\n{"prompt": "A storm", "focus": "echo-line"}\n```\nEnjoy.';
  assert.equal(extractJson(reply).value.prompt, 'A storm');
});

test('broken or missing JSON fails cleanly', () => {
  assert.equal(extractJson('no json here').ok, false);
  assert.equal(extractJson('{"a": }').ok, false);
  assert.equal(extractJson(null).ok, false);
  assert.equal(extractJson('[1, 2]').ok, false);
});
