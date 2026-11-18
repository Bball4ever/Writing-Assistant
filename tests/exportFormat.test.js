import { test } from 'node:test';
import assert from 'node:assert/strict';
import { storyToHtml, storyToText, escapeHtml, fileName } from '../js/lib/exportFormat.js';

const story = {
  title: 'The <Well>',
  mode: 'polish',
  scenes: [
    { n: 1, working: 'She looked down. *Too deep*, she thought.', drafts: [], polish: { finalText: 'She stared down. *Too deep*, she thought.' } },
    { n: 2, working: 'Second scene.', drafts: [], polish: null },
  ],
};

test('HTML keeps italics and escapes everything else', () => {
  const html = storyToHtml(story, 'mine');
  assert.match(html, /<em>Too deep<\/em>/);
  assert.match(html, /The &lt;Well&gt;/);
  assert.doesNotMatch(html, /\*Too deep/);
});

test('text export strips the italic asterisks', () => {
  const text = storyToText(story, 'mine');
  assert.match(text, /Too deep, she thought\./);
  assert.doesNotMatch(text, /\*Too/);
});

test('Polish mode exports whichever version is picked', () => {
  assert.match(storyToText(story, 'polished'), /She stared down/);
  assert.doesNotMatch(storyToText(story, 'polished'), /She looked down/);
  const both = storyToText(story, 'both');
  assert.match(both, /YOUR VERSION/);
  assert.match(both, /POLISHED VERSION/);
  assert.match(both, /She looked down[\s\S]*She stared down/);
});

test('scenes without a polish fall back to Zane\'s version', () => {
  assert.match(storyToText(story, 'polished'), /Second scene\./);
});

test('escaping and file names', () => {
  assert.equal(escapeHtml('<a href="x">&\'</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
  assert.equal(fileName(story, 'html'), 'the-well.html');
});
