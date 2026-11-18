// Pure helpers for talking to Claude: no DOM and no network, so Node can test them.
import { MODELS, AUTO_MODELS, SMALL_JOBS, MAX_TOKENS } from '../config.js';

// The friendly messages Zane sees when something goes wrong.
export const MESSAGES = {
  noKey: 'Add your API key in Settings first.',
  auth: "Your API key didn't work. Check it in Settings.",
  rate: 'Too many requests. Wait a minute, then retry.',
  busy: 'Claude is busy right now. Retry in a moment.',
  notFound: "Your account can't use that model, so I switched you back to Auto.",
  network: 'No internet connection.',
  refusal: 'Claude declined this one. Try rewording it.',
  cutoff: "The reply got cut off. Retry, or raise this job's max tokens in config.js.",
  empty: 'Claude sent back an empty reply. Retry in a moment.',
  badJson: "Claude's reply came back in the wrong shape twice. Retry in a moment.",
};

// Builds a job's input as labeled sections, skipping empty ones, so each
// call sends only what the job needs.
export function formatInput(sections) {
  return sections
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
    .map(([label, value]) => `${label}:\n${String(value).trim()}`)
    .join('\n\n');
}

// The second try includes the first reply and what was wrong with it, so
// Claude can send back a fixed version instead of starting over.
export function retryInput(input, previousReply, problemNote) {
  return formatInput([
    ['ORIGINAL REQUEST', input],
    ['YOUR PREVIOUS REPLY', previousReply],
    ['PROBLEM', `${problemNote} Send the full corrected reply as only the JSON object.`],
  ]);
}

export function isKnownModel(id) {
  return MODELS.some((m) => m.id === id);
}

export function modelLabel(id) {
  return MODELS.find((m) => m.id === id)?.label ?? id;
}

// Turns the picker setting into a real model ID for this job.
// An unknown setting falls back to Auto so a stale save can't break calls.
export function resolveModel(setting, job) {
  if (setting && setting !== 'auto' && isKnownModel(setting)) return setting;
  return SMALL_JOBS.includes(job) ? AUTO_MODELS.small : AUTO_MODELS.big;
}

export function maxTokensFor(job) {
  return MAX_TOKENS[job] ?? MAX_TOKENS.default;
}

export function buildRequestBody({ model, job, system, input }) {
  return {
    model,
    max_tokens: maxTokensFor(job),
    system,
    messages: [{ role: 'user', content: input }],
  };
}

// The current models often put a "thinking" block first, so look for the
// first block that's actually text instead of trusting content[0].
export function extractText(body) {
  const blocks = Array.isArray(body?.content) ? body.content : [];
  const block = blocks.find((b) => b && b.type === 'text' && typeof b.text === 'string');
  return block ? block.text : '';
}

// Maps a failed HTTP response to { kind, message }.
export function describeHttpError(status, body) {
  const type = body?.error?.type;
  if (status === 404 || type === 'not_found_error') return { kind: 'notFound', message: MESSAGES.notFound };
  if (status === 401 || type === 'authentication_error') return { kind: 'auth', message: MESSAGES.auth };
  if (status === 429 || type === 'rate_limit_error') return { kind: 'rate', message: MESSAGES.rate };
  if (status >= 500 || type === 'overloaded_error') return { kind: 'busy', message: MESSAGES.busy };
  // Anything else (like a 400) is unexpected, so show Claude's own explanation.
  const detail = body?.error?.message ? ` ${body.error.message}` : '';
  return { kind: 'other', message: `Something went wrong (error ${status}).${detail}` };
}

// A 200 reply can still be unusable. Returns { kind, message } or null if fine.
export function describeReplyProblem(stopReason, text) {
  if (stopReason === 'refusal') return { kind: 'refusal', message: MESSAGES.refusal };
  if (stopReason === 'max_tokens') return { kind: 'cutoff', message: MESSAGES.cutoff };
  if (!text || !text.trim()) return { kind: 'empty', message: MESSAGES.empty };
  return null;
}
