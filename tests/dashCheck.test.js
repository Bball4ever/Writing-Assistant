import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findDashes, hasDashes, anyHasDashes } from '../js/lib/dashCheck.js';

test('finds every banned dash and ellipsis', () => {
  const text = 'One—two–three--four - five…six...seven';
  assert.deepEqual(findDashes(text).map((d) => d.match), ['—', '–', '--', '-', '…', '...']);
});

test('hyphens inside words are fine', () => {
  assert.equal(hasDashes('A well-known, half-built, run-down shack.'), false);
});

test('positions point at the right characters', () => {
  const [spot] = findDashes('Wait—what?');
  assert.deepEqual(spot, { start: 4, end: 5, match: '—' });
});

test('anyHasDashes checks a list', () => {
  assert.equal(anyHasDashes(['fine', 'also fine']), false);
  assert.equal(anyHasDashes(['fine', 'not...']), true);
});
