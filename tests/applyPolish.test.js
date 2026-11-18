import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyPolish, keepFoundChanges, locateBefores } from '../js/lib/applyPolish.js';

const draft = 'He was very scared. The door creaked. He ran.';
const changes = [
  { before: 'He was very scared.', after: 'His hands shook.', why: 'Show it.', accepted: true },
  { before: 'The door creaked.', after: 'The door groaned on its hinges.', why: 'Sharper sound.', accepted: false },
  { before: 'He ran.', after: 'He bolted.', why: 'Stronger verb.', accepted: true },
];

test('only accepted changes are applied, in order', () => {
  const { text } = applyPolish(draft, changes);
  assert.equal(text, 'His hands shook. The door creaked. He bolted.');
});

test('rejecting everything leaves the draft untouched', () => {
  const { text, spans } = applyPolish(draft, changes.map((c) => ({ ...c, accepted: false })));
  assert.equal(text, draft);
  assert.deepEqual(spans, []);
});

test('spans point at the new text', () => {
  const { text, spans } = applyPolish(draft, changes);
  for (const s of spans) {
    assert.equal(text.slice(s.start, s.end), changes[s.index].after);
  }
});

test('changes whose quote is not in the draft are dropped', () => {
  const kept = keepFoundChanges(draft, [
    ...changes,
    { before: 'Not in the draft.', after: 'x', why: 'y' },
    { before: 'He ran.', after: 'He ran.', why: 'no change' },
  ]);
  assert.equal(kept.length, 3);
});

test('befores are located in the original draft', () => {
  const spans = locateBefores(draft, changes);
  assert.equal(draft.slice(spans[1].start, spans[1].end), 'The door creaked.');
});
