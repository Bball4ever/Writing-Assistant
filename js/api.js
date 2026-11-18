// Every call to Claude goes through callClaude(), so headers, model choice and
// error messages are handled in one place.
import { loadKey, loadSettings, updateSettings } from './storage.js';
import {
  MESSAGES, resolveModel, buildRequestBody, extractText,
  describeHttpError, describeReplyProblem,
} from './lib/claudeHelpers.js';

const API_URL = 'https://api.anthropic.com/v1/messages';

// An error that carries a friendly message plus a kind the screen can react to.
export class ClaudeError extends Error {
  constructor({ kind, message }) {
    super(message);
    this.name = 'ClaudeError';
    this.kind = kind;
  }
}

// job: a key from config (like 'grader'), used to pick the model and max tokens.
// Returns { text, model }. Throws ClaudeError with a message ready to show.
export async function callClaude({ job, system, input }) {
  const key = loadKey();
  if (!key) throw new ClaudeError({ kind: 'noKey', message: MESSAGES.noKey });

  const setting = loadSettings().model;
  const model = resolveModel(setting, job);

  let response;
  try {
    response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        // Required for calling the API straight from a browser page.
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(buildRequestBody({ model, job, system, input })),
    });
  } catch {
    // fetch only throws when the request never reached the server.
    throw new ClaudeError({ kind: 'network', message: MESSAGES.network });
  }

  let body = null;
  try { body = await response.json(); } catch { body = null; }

  if (!response.ok) {
    const problem = describeHttpError(response.status, body);
    if (problem.kind === 'notFound') {
      if (setting === 'auto') {
        problem.message = `Your account can't use ${model}, which Auto picked for this job.`;
      } else {
        updateSettings({ model: 'auto' });
      }
    }
    throw new ClaudeError(problem);
  }

  const text = extractText(body);
  const problem = describeReplyProblem(body?.stop_reason, text);
  if (problem) throw new ClaudeError(problem);

  return { text, model: body?.model || model };
}
