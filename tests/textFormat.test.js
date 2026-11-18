import { test } from 'node:test';
import assert from 'node:assert/strict';
import { segment, toParagraphs, stripItalics, wordCount } from '../js/lib/textFormat.js';

test('italics become italic segments without the asterisks', () => {
  const segs = segment('She thought, *not again*, and ran.');
  assert.deepEqual(segs.map((s) => [s.text, s.italic]), [
    ['She thought, ', false], ['not again', true], [', and ran.', false],
  ]);
});

test('stripItalics and wordCount ignore asterisks', () => {
  assert.equal(stripItalics('*Run*, she thought.'), 'Run, she thought.');
  assert.equal(wordCount('*Run*, she thought.'), 3);
  assert.equal(wordCount('   '), 0);
});

test('dash highlights are marked', () => {
  const segs = segment('Wait—what?', { highlightDashes: true });
  assert.deepEqual(segs.map((s) => [s.text, s.kind]), [['Wait', null], ['—', 'dash'], ['what?', null]]);
});

test('change ranges carry their index', () => {
  const segs = segment('The cat sat.', { ranges: [{ start: 4, end: 7, kind: 'change', index: 2 }] });
  const marked = segs.find((s) => s.kind === 'change');
  assert.equal(marked.text, 'cat');
  assert.equal(marked.index, 2);
});

test('paragraphs split at newlines', () => {
  const paras = toParagraphs(segment('First *one*.\n\nSecond.\nThird.'));
  assert.equal(paras.length, 3);
  assert.equal(paras[0][1].text, 'one');
  assert.equal(paras[0][1].italic, true);
  assert.equal(paras[2][0].text, 'Third.');
});
