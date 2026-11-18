// The idea step. Coach and Polish: a prompt, Zane's pitch and the Pitch critic.
// Writer: a seed, three pitch cards to pick from or combine.
import { makePrompt, critiquePitch, writePitches } from '../api.js';
import { touch, nowIso } from '../storage.js';
import { MODES } from '../config.js';
import { helpPanel } from './help.js';
import {
  el, add, tag, taskButton, writingBox, storyNav, listBlock, storyText, dashFlag,
} from './shared.js';

export function renderIdea(container, ctx, story) {
  add(container, 
    storyNav(story, 'idea', ctx.go),
    el('h1', {}, story.title || 'Untitled story'),
    el('p', { class: 'lead' }, `${MODES[story.mode].label} mode. ${story.genre}, ${story.pov}.`),
  );
  if (story.mode === 'writer') renderWriterIdea(container, ctx, story);
  else renderCoachIdea(container, ctx, story);
}

// Fills the pitch box from the Help button (Polish and Writer only).
function onFill(story, refresh) {
  return (fill) => {
    if (fill?.pitch) {
      story.idea.pitch = fill.pitch.trim();
      story.idea.pitchBy = 'ai';
      touch(story);
    }
    refresh();
  };
}

function pitchBox(story) {
  return writingBox({
    id: 'pitch', rows: 6, value: story.idea.pitch,
    label: 'Your pitch (one paragraph)',
    placeholder: 'Who wants what, what stands in the way, and what happens if they fail?',
    onInput: (v) => { story.idea.pitch = v; touch(story); },
  });
}

// Shown under an AI-filled pitch if dashes or ellipses survived the retry.
function pitchDashFlag(story, refresh) {
  if (story.idea.pitchBy !== 'ai') return null;
  return dashFlag(() => [story.idea.pitch], ([fixed]) => { story.idea.pitch = fixed; touch(story); refresh(); });
}

function lockButton(story, ctx, message) {
  return el('button', {
    type: 'button', class: 'primary',
    onclick: () => {
      if (!story.idea.pitch.trim()) { message.textContent = 'Write a pitch first.'; return; }
      if (story.step === 'idea') story.step = 'outline';
      touch(story);
      ctx.go(`story/${story.id}/outline`);
    },
  }, 'Lock pitch and go to the outline');
}

function renderCoachIdea(container, ctx, story) {
  const message = el('p', { class: 'error-text', 'aria-live': 'polite' });
  const latest = story.idea.feedback[story.idea.feedback.length - 1];

  const getPrompt = taskButton('Get a prompt', async () => {
    const result = await makePrompt({ genre: story.genre });
    story.idea.prompt = result.prompt;
    touch(story);
    ctx.refresh();
  }, { cls: '' });

  const critique = taskButton(latest ? 'Critique again' : 'Critique my pitch', async () => {
    if (!story.idea.pitch.trim()) { message.textContent = 'Write a pitch first.'; return; }
    const result = await critiquePitch(story);
    story.idea.feedback.push({ ...result, at: nowIso() });
    touch(story);
    ctx.refresh();
  });

  add(container, 
    el('section', { class: 'card' },
      el('h2', {}, 'Prompt'),
      el('p', { class: 'muted' }, 'Get one, or type your own idea. Optional.'),
      el('textarea', {
        id: 'idea-prompt', rows: 3, value: story.idea.prompt, 'aria-label': 'Prompt',
        oninput: (e) => { story.idea.prompt = e.target.value; touch(story); },
      }),
      el('div', { class: 'button-row' }, getPrompt.button),
      getPrompt.status,
    ),
    el('section', { class: 'card' },
      el('h2', {}, 'Pitch ', story.idea.pitchBy === 'ai' ? tag('AI', 'ai') : null),
      pitchBox(story),
      pitchDashFlag(story, ctx.refresh),
      el('div', { class: 'button-row' }, critique.button),
      message,
      critique.status,
    ),
    latest ? el('section', { class: 'card' },
      el('h2', {}, 'Critique'),
      listBlock('Strengths', latest.strengths, 'good'),
      listBlock('Problems', latest.problems, 'bad'),
      listBlock('Questions', latest.questions),
      el('p', { class: 'muted small' }, 'Revise and critique again until you are happy, then lock it.'),
    ) : null,
    helpPanel({ story, step: 'idea', getContent: () => `Prompt: ${story.idea.prompt}\nPitch: ${story.idea.pitch}`, onFill: onFill(story, ctx.refresh) }),
    el('div', { class: 'button-row' }, lockButton(story, ctx, message)),
  );
}

function renderWriterIdea(container, ctx, story) {
  const message = el('p', { class: 'error-text', 'aria-live': 'polite' });
  const pitches = story.idea.pitches || [];
  let combineNotes = '';

  const write = taskButton(pitches.length ? 'Write three new pitches' : 'Write three pitches', async () => {
    if (!story.idea.seed.trim()) { message.textContent = 'Type a seed idea first.'; return; }
    const result = await writePitches(story);
    story.idea.pitches = result.pitches;
    touch(story);
    ctx.refresh();
  });

  const combine = taskButton('Combine them', async () => {
    if (!combineNotes.trim()) { message.textContent = 'Say which parts to combine.'; return; }
    const result = await writePitches(story, { pitches, notes: combineNotes });
    story.idea.pitches = [...pitches, ...result.pitches];
    touch(story);
    ctx.refresh();
  }, { cls: '' });

  const usePitch = (p) => {
    story.idea.pitch = `${p.summary} ${p.hook}`.trim();
    story.idea.pitchBy = 'ai';
    if (!story.title) story.title = p.title;
    touch(story);
    ctx.refresh();
  };

  const cards = pitches.map((p, i) => el('article', { class: 'card pitch-card' },
    el('h3', {}, p.title, ' ', tag('AI', 'ai')),
    storyText(p.summary, { highlightDashes: true }),
    el('p', { class: 'hook' }, el('strong', {}, 'Hook: '), p.hook),
    el('button', { type: 'button', onclick: () => usePitch(p) }, i >= 3 ? 'Use this combined pitch' : 'Use this one'),
  ));

  add(container, 
    el('section', { class: 'card' },
      el('h2', {}, 'Seed'),
      writingBox({
        id: 'seed', rows: 3, value: story.idea.seed, label: 'A few words about the story you want',
        onInput: (v) => { story.idea.seed = v; touch(story); },
      }),
      el('div', { class: 'button-row' }, write.button),
      message,
      write.status,
    ),
    cards.length ? el('div', { class: 'pitch-grid' }, cards) : null,
    dashFlag(
      () => pitches.flatMap((p) => [p.title, p.summary, p.hook]),
      (fixed) => {
        pitches.forEach((p, i) => { [p.title, p.summary, p.hook] = fixed.slice(i * 3, i * 3 + 3); });
        touch(story);
        ctx.refresh();
      },
    ),
    pitches.length ? el('section', { class: 'card' },
      el('h2', {}, 'Combine parts'),
      el('textarea', {
        rows: 3, 'aria-label': 'Which parts to combine',
        placeholder: 'For example: the setting from pitch 1 with the twist from pitch 3',
        oninput: (e) => { combineNotes = e.target.value; },
      }),
      el('div', { class: 'button-row' }, combine.button),
      combine.status,
    ) : null,
    el('section', { class: 'card' },
      el('h2', {}, 'Chosen pitch ', story.idea.pitchBy === 'ai' && story.idea.pitch ? tag('AI', 'ai') : null),
      pitchBox(story),
      pitchDashFlag(story, ctx.refresh),
    ),
    helpPanel({ story, step: 'idea', getContent: () => `Seed: ${story.idea.seed}\nPitch: ${story.idea.pitch}`, onFill: onFill(story, ctx.refresh) }),
    el('div', { class: 'button-row' }, lockButton(story, ctx, message)),
  );
}
