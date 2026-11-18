import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveModel, maxTokensFor, buildRequestBody, extractText,
  describeHttpError, describeReplyProblem, isKnownModel, modelLabel, MESSAGES,
} from '../js/lib/claudeHelpers.js';

test('Auto sends small jobs to Haiku and everything else to Sonnet', () => {
  assert.equal(resolveModel('auto', 'promptMaker'), 'claude-haiku-5-5');
  assert.equal(resolveModel('auto', 'helper'), 'claude-haiku-5-5');
  assert.equal(resolveModel('auto', 'testConnection'), 'claude-haiku-5-5');
  assert.equal(resolveModel('auto', 'grader'), 'claude-sonnet-5-5');
  assert.equal(resolveModel('auto', 'sceneWriter'), 'claude-sonnet-5-5');
});

test('a picked model is used for every job', () => {
  assert.equal(resolveModel('claude-opus-5-5', 'helper'), 'claude-opus-5-5');
  assert.equal(resolveModel('claude-fable-5-2', 'grader'), 'claude-fable-5-2');
});

test('an unknown or missing model setting falls back to Auto', () => {
  assert.equal(resolveModel('claude-made-up-1', 'grader'), 'claude-sonnet-5-5');
  assert.equal(resolveModel(undefined, 'helper'), 'claude-haiku-5-5');
});

test('model list helpers', () => {
  assert.ok(isKnownModel('auto'));
  assert.ok(!isKnownModel('gpt'));
  assert.equal(modelLabel('claude-haiku-5-5'), 'Claude Haiku 5.5');
});

test('max tokens per job, with a default', () => {
  assert.equal(maxTokensFor('sceneWriter'), 16000);
  assert.equal(maxTokensFor('grader'), 8000);
  assert.equal(maxTokensFor('helper'), 4000);
});

test('request body has one user message with the input', () => {
  const body = buildRequestBody({ model: 'm', job: 'grader', system: 'sys', input: 'hi' });
  assert.deepEqual(body, {
    model: 'm', max_tokens: 8000, system: 'sys',
    messages: [{ role: 'user', content: 'hi' }],
  });
});

test('extractText skips a thinking block that comes first', () => {
  const body = { content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: 'Hello' }] };
  assert.equal(extractText(body), 'Hello');
});

test('extractText handles a plain reply and broken replies', () => {
  assert.equal(extractText({ content: [{ type: 'text', text: 'Hi' }] }), 'Hi');
  assert.equal(extractText({ content: [] }), '');
  assert.equal(extractText(null), '');
});

test('HTTP errors map to the friendly messages', () => {
  assert.equal(describeHttpError(401, null).message, MESSAGES.auth);
  assert.equal(describeHttpError(429, null).message, MESSAGES.rate);
  assert.equal(describeHttpError(529, null).message, MESSAGES.busy);
  assert.equal(describeHttpError(500, null).message, MESSAGES.busy);
  assert.equal(describeHttpError(404, null).kind, 'notFound');
  assert.equal(describeHttpError(400, { error: { type: 'not_found_error' } }).kind, 'notFound');
});

test('other errors include Claude\'s explanation', () => {
  const problem = describeHttpError(400, { error: { type: 'invalid_request_error', message: 'bad thing' } });
  assert.equal(problem.kind, 'other');
  assert.match(problem.message, /400/);
  assert.match(problem.message, /bad thing/);
});

test('refusals, cut-off and empty replies are caught', () => {
  assert.equal(describeReplyProblem('refusal', '').kind, 'refusal');
  assert.equal(describeReplyProblem('max_tokens', 'half a').kind, 'cutoff');
  assert.equal(describeReplyProblem('end_turn', '   ').kind, 'empty');
  assert.equal(describeReplyProblem('end_turn', 'Fine'), null);
});
