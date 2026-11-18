// Every call to Claude lives here: the raw request, the JSON retry, and one
// function per job that builds that job's input and checks its reply.
import { loadKey, loadSettings, updateSettings, saveNow } from './storage.js';
import { PROMPTS, styleText } from './prompts.js';
import { RUBRIC, FOCUSES } from './config.js';
import {
  MESSAGES, resolveModel, buildRequestBody, extractText,
  describeHttpError, describeReplyProblem, formatInput, retryInput,
} from './lib/claudeHelpers.js';
import { extractJson } from './lib/jsonExtract.js';
import { findDashes } from './lib/dashCheck.js';
import { normalizeGrade, gradeShapeProblem, missingQuotes } from './lib/scores.js';
import { keepFoundChanges } from './lib/applyPolish.js';
import { focusInfo, lengthInfo, sceneText } from './lib/storyModel.js';
import { SETUP_ONLY_IN_DRILLS } from './config.js';

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
  // Save first, so an error can never lose Zane's writing.
  saveNow();

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

// Asks for JSON and checks it. check(value) returns null when the reply is
// fine, or { hard, note, warning } when it isn't. Any problem gets one retry.
// If a soft problem (like a leftover dash) survives the retry, the reply is
// still returned with a warning. A hard problem twice becomes an error.
export async function callJson({ job, system, input, check = () => null }) {
  const first = await callClaude({ job, system, input });
  const firstResult = inspect(first.text, check);
  if (!firstResult.issue) return { value: firstResult.value, model: first.model };

  const second = await callClaude({ job, system, input: retryInput(input, first.text, firstResult.issue.note) });
  const secondResult = inspect(second.text, check);
  if (!secondResult.issue) return { value: secondResult.value, model: second.model };
  if (secondResult.value && !secondResult.issue.hard) {
    return { value: secondResult.value, model: second.model, warning: secondResult.issue.warning || secondResult.issue.note };
  }
  throw new ClaudeError({ kind: 'json', message: MESSAGES.badJson });
}

function inspect(text, check) {
  const parsed = extractJson(text);
  if (!parsed.ok) {
    return { value: null, issue: { hard: true, note: 'Your reply was not valid JSON. Return only the JSON object.' } };
  }
  return { value: parsed.value, issue: check(parsed.value) };
}

// Small helpers for building checks.
const hard = (note) => ({ hard: true, note });

function dashIssue(texts) {
  const spots = texts.flatMap((t) => findDashes(t).map((d) => d.match));
  if (!spots.length) return null;
  return {
    hard: false,
    note: `Your story text still has ${spots.length} dash or ellipsis spot(s) (${[...new Set(spots)].join(' ')}). Replace each one with a comma, a period or a sentence break.`,
    warning: 'Some dashes or ellipses are still in the text. They are highlighted.',
  };
}

function isStringList(value) {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

function context(story, { keepTense = false } = {}) {
  return { tone: loadSettings().tone, mode: story?.mode, style: story ? styleText(story, { keepTense }) : '' };
}

function storyBasics(story) {
  return [
    ['GENRE', story.genre],
    ['POINT OF VIEW', story.pov],
    ['LENGTH', `${lengthInfo(story.length).label} (${lengthInfo(story.length).hint})`],
  ];
}

function scenesList(story) {
  return story.outline.scenes
    .map((s) => `${s.n}. ${s.summary || '(empty)'} [focus: ${focusInfo(s.focus).label}]`)
    .join('\n');
}

function beatsText(story) {
  const b = story.outline.beats;
  return `Beginning: ${b.beginning || '(empty)'}\nMiddle: ${b.middle || '(empty)'}\nEnd: ${b.end || '(empty)'}`;
}

// A short summary of a grade, for the Polisher.
function gradeSummary(grade) {
  if (!grade?.scores) return '';
  const lines = RUBRIC.map((r) => {
    const score = grade.scores[r.key];
    return `${r.label}: ${score === null ? 'no dialogue' : `${score}/5`}. Fix: ${grade.fixes?.[r.key] || ''}`;
  });
  return `${lines.join('\n')}\nTop fix: ${grade.top_fix || ''}`;
}

// The jobs

export async function makePrompt({ genre, focus }) {
  const input = formatInput([
    ['GENRE', genre || 'any'],
    ['SKILL FOCUS', focus ? `${focus} (${focusInfo(focus).label}: ${focusInfo(focus).asks})` : 'any'],
  ]);
  const result = await callJson({
    job: 'promptMaker',
    system: PROMPTS.promptMaker(context(null)),
    input,
    check: (v) => (typeof v.prompt === 'string' && v.prompt.trim() ? null : hard('"prompt" must be a non-empty string.')),
  });
  const value = result.value;
  if (!FOCUSES.some((f) => f.id === value.focus)) value.focus = focus || FOCUSES[0].id;
  return value;
}

export async function critiquePitch(story) {
  const input = formatInput([...storyBasics(story), ['PITCH', story.idea.pitch]]);
  const { value } = await callJson({
    job: 'pitchCritic',
    system: PROMPTS.pitchCritic(context(story)),
    input,
    check: (v) => (['strengths', 'problems', 'questions'].every((k) => v[k] === undefined || isStringList(v[k]))
      ? null : hard('strengths, problems and questions must each be a list of strings.')),
  });
  return { strengths: value.strengths || [], problems: value.problems || [], questions: value.questions || [] };
}

// combine: { pitches, notes } to merge parts of earlier pitches into one.
export async function writePitches(story, combine = null) {
  const expected = combine ? 1 : 3;
  const input = formatInput([
    ...storyBasics(story),
    ['SEED', story.idea.seed],
    ['EARLIER PITCHES', combine ? combine.pitches.map((p, i) => `${i + 1}. ${p.title}: ${p.summary} ${p.hook}`).join('\n') : ''],
    ['COMBINE NOTES', combine ? combine.notes : ''],
  ]);
  const { value, warning } = await callJson({
    job: 'pitchWriter',
    system: PROMPTS.pitchWriter(context(story)),
    input,
    check: (v) => {
      const list = v.pitches;
      if (!Array.isArray(list) || list.length < expected) return hard(`Return exactly ${expected} pitch(es) in "pitches".`);
      if (list.length > expected) v.pitches = list.slice(0, expected);
      if (!v.pitches.every((p) => p && ['title', 'summary', 'hook'].every((k) => typeof p[k] === 'string'))) {
        return hard('Each pitch needs "title", "summary" and "hook" strings.');
      }
      return dashIssue(v.pitches.flatMap((p) => [p.title, p.summary, p.hook]));
    },
  });
  return { pitches: value.pitches, warning };
}

export async function critiqueOutline(story) {
  const input = formatInput([
    ['PITCH', story.idea.pitch],
    ['BEATS', beatsText(story)],
    ['SCENES', scenesList(story)],
  ]);
  const { value } = await callJson({
    job: 'outlineCritic',
    system: PROMPTS.outlineCritic(context(story)),
    input,
    check: (v) => (['holes', 'questions'].every((k) => v[k] === undefined || isStringList(v[k]))
      ? null : hard('holes and questions must each be a list of strings.')),
  });
  return { holes: value.holes || [], questions: value.questions || [] };
}

export async function writeOutline(story, notes) {
  const { min, max } = lengthInfo(story.length);
  const input = formatInput([
    ['PITCH', story.idea.pitch],
    ['LENGTH', `${lengthInfo(story.length).label}: between ${min} and ${max} scenes`],
    ['CURRENT OUTLINE (make a new version of this)', notes && story.outline.scenes.length ? `${beatsText(story)}\nScenes:\n${scenesList(story)}` : ''],
    ['NOTES FROM THE WRITER', notes],
  ]);
  const { value, warning } = await callJson({
    job: 'outlineWriter',
    system: PROMPTS.outlineWriter(context(story)),
    input,
    check: (v) => {
      const beatsOk = v.beats && ['beginning', 'middle', 'end'].every((k) => typeof v.beats[k] === 'string');
      const scenesOk = Array.isArray(v.scenes) && v.scenes.length && v.scenes.every((s) => s && typeof s.summary === 'string');
      if (!beatsOk || !scenesOk) return hard('Return "beats" with beginning, middle and end strings, and a non-empty "scenes" list of {"summary"}.');
      if (v.scenes.length < min || v.scenes.length > max) {
        return { hard: false, note: `The outline must have between ${min} and ${max} scenes, but it has ${v.scenes.length}.`, warning: `The outline has ${v.scenes.length} scenes instead of ${min} to ${max}.` };
      }
      return dashIssue([v.beats.beginning, v.beats.middle, v.beats.end, ...v.scenes.map((s) => s.summary)]);
    },
  });
  value.scenes = value.scenes.slice(0, max);
  return { beats: value.beats, scenes: value.scenes, warning };
}

// Grades Zane's text (or, for a critique check, the AI's).
export async function gradeText({ text, focusId, previousText = '', drill = false }) {
  const focus = focusInfo(focusId);
  const setupOnly = drill && SETUP_ONLY_IN_DRILLS.includes(focus.id)
    ? ' This is a one-paragraph drill, so grade this focus on the setup only. The payoff can come later.'
    : '';
  const input = formatInput([
    ['SKILL FOCUS', `${focus.label}: ${focus.asks}.${setupOnly}`],
    ['PREVIOUS DRAFT (context only, do not grade it)', previousText],
    ['TEXT TO GRADE', text],
  ]);
  const { value, warning } = await callJson({
    job: 'grader',
    system: PROMPTS.grader(context(null)),
    input,
    check: (v) => {
      normalizeGrade(v);
      const shape = gradeShapeProblem(v);
      if (shape) return hard(shape);
      const missing = missingQuotes(v, text);
      if (missing.length) {
        return {
          hard: false,
          note: `These quotes are not word for word from the text: ${missing.join(', ')}. Copy each quote exactly from TEXT TO GRADE.`,
          warning: `Some quotes didn't match your text exactly (${missing.join(', ')}).`,
        };
      }
      return null;
    },
  });
  if (warning) value.warning = warning;
  return value;
}

export async function polishDraft(story, { text, grade }) {
  const input = formatInput([
    ['LATEST GRADE', gradeSummary(grade)],
    ['DRAFT', text],
  ]);
  const { value } = await callJson({
    job: 'polisher',
    system: PROMPTS.polisher(context(story, { keepTense: true })),
    input,
    check: (v) => {
      if (!Array.isArray(v.changes) || !v.changes.every((c) => c && ['before', 'after', 'why'].every((k) => typeof c[k] === 'string'))) {
        return hard('"changes" must be a list of {"before", "after", "why"} strings.');
      }
      const notFound = v.changes.filter((c) => !text.includes(c.before)).length;
      if (notFound) {
        return { hard: false, note: `${notFound} "before" quote(s) are not copied exactly from the draft. Copy each one character for character.` };
      }
      return dashIssue(v.changes.map((c) => c.after));
    },
  });
  // Changes whose quote still isn't in the draft are dropped.
  return keepFoundChanges(text, value.changes).map((c) => ({ before: c.before, after: c.after, why: c.why, accepted: false }));
}

export async function writeScene(story, n) {
  const card = story.outline.scenes.find((s) => s.n === n);
  const previous = story.scenes.find((s) => s.n === n - 1);
  const input = formatInput([
    ['PITCH', story.idea.pitch],
    ['ALL SCENES', scenesList(story)],
    ['PREVIOUS SCENE (full text)', previous ? sceneText(previous) : ''],
    ['THIS SCENE', `Scene ${n}: ${card?.summary || ''}`],
    ['SKILL FOCUS', `${focusInfo(card?.focus).label}: ${focusInfo(card?.focus).asks}`],
    ['POINT OF VIEW', story.pov],
  ]);
  const { value, warning } = await callJson({
    job: 'sceneWriter',
    system: PROMPTS.sceneWriter(context(story)),
    input,
    check: (v) => (typeof v.text === 'string' && v.text.trim() ? dashIssue([v.text]) : hard('"text" must be the scene.')),
  });
  return { text: value.text.trim(), warning };
}

export async function reviseScene(story, { text, notes }) {
  const input = formatInput([
    ['DRAFT', text],
    ['NOTES FROM THE WRITER', notes && notes.trim() ? notes : '(none: critique the draft yourself first)'],
  ]);
  const { value, warning } = await callJson({
    job: 'reviser',
    system: PROMPTS.reviser(context(story)),
    input,
    check: (v) => {
      if (typeof v.text !== 'string' || !v.text.trim()) return hard('"text" must be the full revised scene.');
      if (v.changes !== undefined && !isStringList(v.changes)) return hard('"changes" must be a list of strings.');
      return dashIssue([v.text]);
    },
  });
  return { text: value.text.trim(), changes: value.changes || [], warning };
}

// action: 'options', 'questions' or 'fill'. step: 'idea', 'outline' or 'scene'.
export async function askHelper({ story, step, action, content }) {
  const { min, max } = lengthInfo(story.length);
  const input = formatInput([
    ['ACTION', action],
    ['MODE', story.mode],
    ['STEP', step],
    ['GENRE', story.genre],
    ['SCENE COUNT', step === 'outline' ? `between ${min} and ${max}` : ''],
    ['WHAT THEY HAVE SO FAR', content || '(nothing yet)'],
  ]);
  const { value, warning } = await callJson({
    job: 'helper',
    system: PROMPTS.helper(context(story)),
    input,
    check: (v) => {
      if (action === 'options') {
        if (!isStringList(v.options) || v.options.length < 3) return hard('Return {"options": [three strings]}.');
        v.options = v.options.slice(0, 3);
        return null;
      }
      if (action === 'questions') {
        if (!isStringList(v.questions) || !v.questions.length) return hard('Return {"questions": [one to three strings]}.');
        v.questions = v.questions.slice(0, 3);
        return null;
      }
      if (step === 'idea') {
        if (typeof v.fill?.pitch !== 'string' || !v.fill.pitch.trim()) return hard('Return {"fill": {"pitch": "..."}}.');
        return dashIssue([v.fill.pitch]);
      }
      if (!v.fill || typeof v.fill !== 'object') return hard('Return {"fill": {"beats": {...}, "scenes": [...]}}.');
      const texts = [
        ...Object.values(v.fill.beats || {}),
        ...(Array.isArray(v.fill.scenes) ? v.fill.scenes.map((s) => (typeof s === 'string' ? s : s?.summary)) : []),
      ].filter((t) => typeof t === 'string');
      return dashIssue(texts);
    },
  });
  return { ...value, warning };
}

// The Fix again button: sends the flagged texts back to have only the dashes fixed.
export async function fixDashes(texts) {
  const input = formatInput([['TEXTS', JSON.stringify(texts)]]);
  const { value } = await callJson({
    job: 'dashFixer',
    system: PROMPTS.dashFixer(),
    input,
    check: (v) => {
      if (!isStringList(v.texts) || v.texts.length !== texts.length) return hard(`Return {"texts": [...]} with exactly ${texts.length} strings.`);
      return dashIssue(v.texts);
    },
  });
  return value.texts;
}
