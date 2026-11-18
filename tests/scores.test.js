import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  average, roundedAverage, clearsBar, formatScore, quoteFound,
  normalizeGrade, gradeShapeProblem, missingQuotes,
} from '../js/lib/scores.js';

const text = 'Mara gripped the rail. "Don\'t," she said. The deck groaned under her boots.';
function goodGrade() {
  return {
    scores: { showVsTell: 4, pacing: 3, dialogue: 2, sensory: 4, focus: 3 },
    evidence: {
      showVsTell: 'Mara gripped the rail.', pacing: 'The deck groaned', dialogue: '"Don\'t," she said.',
      sensory: 'The deck groaned under her boots.', focus: 'gripped the rail',
    },
    fixes: { showVsTell: 'a', pacing: 'b', dialogue: 'c', sensory: 'd', focus: 'e' },
    strongest_line: 'The deck groaned under her boots.',
    top_fix: 'Do the thing.',
  };
}

test('average skips a null dialogue score', () => {
  assert.equal(average({ showVsTell: 4, pacing: 3, dialogue: null, sensory: 4, focus: 1 }), 3);
  assert.equal(average({}), null);
});

test('the bar uses the rounded average', () => {
  assert.equal(roundedAverage({ showVsTell: 4, pacing: 3, dialogue: 3, sensory: 4, focus: 3 }), 3.4);
  assert.equal(clearsBar({ showVsTell: 4, pacing: 3, dialogue: 4, sensory: 4, focus: 3 }), true);
  assert.equal(clearsBar({ showVsTell: 3, pacing: 3, dialogue: 4, sensory: 4, focus: 3 }), false);
  assert.equal(formatScore(3.456), '3.5');
  assert.equal(formatScore(null), 'n/a');
});

test('quotes must appear word for word, curly quotes and spacing aside', () => {
  assert.equal(quoteFound('“Don’t,” she said.', text), true);
  assert.equal(quoteFound('Mara  gripped the rail.', text), true);
  assert.equal(quoteFound('Mara held the rail.', text), false);
  assert.equal(quoteFound('', text), false);
});

test('a good grade passes the shape and quote checks', () => {
  const g = normalizeGrade(goodGrade());
  assert.equal(gradeShapeProblem(g), null);
  assert.deepEqual(missingQuotes(g, text), []);
});

test('string scores are turned into numbers', () => {
  const g = goodGrade();
  g.scores.pacing = '3';
  normalizeGrade(g);
  assert.equal(g.scores.pacing, 3);
});

test('bad shapes are caught', () => {
  const g = goodGrade();
  g.scores.focus = 7;
  assert.match(gradeShapeProblem(g), /focus/);
  const h = goodGrade();
  h.evidence.sensory = '';
  assert.match(gradeShapeProblem(h), /evidence.sensory/);
});

test('null dialogue is allowed and its quote is not checked', () => {
  const g = goodGrade();
  g.scores.dialogue = null;
  g.evidence.dialogue = '';
  assert.equal(gradeShapeProblem(g), null);
  assert.deepEqual(missingQuotes(g, text), []);
});

test('made-up quotes are listed', () => {
  const g = goodGrade();
  g.evidence.pacing = 'She ran fast.';
  g.strongest_line = 'Not in the text.';
  assert.deepEqual(missingQuotes(g, text), ['pacing', 'strongest_line']);
});
