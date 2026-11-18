// The outline step: beginning, middle and end beats plus scene cards.
// Coach and Polish: Zane writes it and the Outline critic pokes holes.
// Writer: the Outline writer drafts it, and Zane approves, edits or sends notes.
import { FOCUSES, MODES } from '../config.js';
import { critiqueOutline, writeOutline } from '../api.js';
import { touch, nowIso } from '../storage.js';
import {
  addOutlineScene, renumberOutline, mergeOutlineFill, buildScenesFromOutline,
  lengthInfo, focusInfo, focusForSceneIndex,
} from '../lib/storyModel.js';
import { helpPanel } from './help.js';
import {
  el, add, tag, taskButton, writingBox, storyNav, listBlock, select, dashFlag, notify,
} from './shared.js';

const focusOptions = FOCUSES.map((f) => ({ id: f.id, label: f.label }));

function outlineAsText(story) {
  const { beats, scenes } = story.outline;
  return [
    `Pitch: ${story.idea.pitch}`,
    `Beginning: ${beats.beginning}`,
    `Middle: ${beats.middle}`,
    `End: ${beats.end}`,
    'Scene cards:',
    ...scenes.map((s) => `${s.n}. ${s.summary}`),
  ].join('\n');
}

export function renderOutline(container, ctx, story) {
  const { outline } = story;
  outline.beatsBy = outline.beatsBy || {};
  outline.feedback = outline.feedback || [];
  const length = lengthInfo(story.length);
  const message = el('p', { class: 'error-text', 'aria-live': 'polite' });
  const isWriter = story.mode === 'writer';
  let notes = '';

  const beatBox = (key, label) => el('div', { class: 'beat' },
    writingBox({
      id: `beat-${key}`, rows: 3, value: outline.beats[key],
      label: `${label}${outline.beatsBy[key] === 'ai' ? ' (AI)' : ''}`,
      onInput: (v) => { outline.beats[key] = v; touch(story); },
    }),
  );

  const sceneCards = outline.scenes.map((scene, i) => el('div', { class: 'scene-card' },
    el('div', { class: 'scene-card-head' },
      el('strong', {}, `Scene ${scene.n}`),
      scene.by === 'ai' ? tag('AI', 'ai') : null,
      el('button', {
        type: 'button', class: 'link-button danger-text', 'aria-label': `Remove scene ${scene.n}`,
        onclick: () => { outline.scenes.splice(i, 1); renumberOutline(outline); touch(story); ctx.refresh(); },
      }, 'Remove'),
    ),
    el('textarea', {
      rows: 2, value: scene.summary, 'aria-label': `Scene ${scene.n} summary`,
      oninput: (e) => { scene.summary = e.target.value; touch(story); },
    }),
    select({
      id: `focus-${scene.n}`, label: 'Skill focus', options: focusOptions, value: scene.focus,
      onChange: (v) => { scene.focus = v; touch(story); },
    }),
    el('p', { class: 'muted small' }, `${focusInfo(scene.focus).asks}.`),
  ));

  const addScene = el('button', {
    type: 'button',
    disabled: outline.scenes.length >= length.max,
    onclick: () => { addOutlineScene(outline); touch(story); ctx.refresh(); },
  }, 'Add a scene');

  const critique = taskButton(outline.feedback.length ? 'Critique again' : 'Critique my outline', async () => {
    if (!outline.scenes.some((s) => s.summary.trim())) { message.textContent = 'Add at least one scene first.'; return; }
    const result = await critiqueOutline(story);
    outline.feedback.push({ ...result, at: nowIso() });
    touch(story);
    ctx.refresh();
  }, { cls: isWriter ? '' : 'primary' });

  const draft = taskButton(outline.scenes.length ? 'New version with my notes' : 'Write the outline', async () => {
    const result = await writeOutline(story, notes);
    outline.beats = { beginning: result.beats.beginning, middle: result.beats.middle, end: result.beats.end };
    outline.beatsBy = { beginning: 'ai', middle: 'ai', end: 'ai' };
    // Focuses always follow the rotation, whatever the model suggested.
    outline.scenes = result.scenes.map((s, i) => ({ n: i + 1, summary: s.summary.trim(), focus: focusForSceneIndex(i), by: 'ai' }));
    touch(story);
    ctx.refresh();
    if (result.warning) notify(result.warning);
  });

  const approve = el('button', {
    type: 'button', class: 'primary',
    onclick: () => {
      const filled = outline.scenes.filter((s) => s.summary.trim());
      if (!filled.length) { message.textContent = 'Add at least one scene with a summary.'; return; }
      if (filled.length !== outline.scenes.length) { message.textContent = 'Fill in or remove the empty scene cards first.'; return; }
      buildScenesFromOutline(story);
      if (story.step === 'idea' || story.step === 'outline') story.step = 'scenes';
      touch(story);
      ctx.go(`story/${story.id}/scene/1`);
    },
  }, isWriter ? 'Approve outline' : 'Start writing scenes');

  const latest = outline.feedback[outline.feedback.length - 1];
  const countNote = `${length.label}: ${length.hint}. You have ${outline.scenes.length}.`;

  add(container, 
    storyNav(story, 'outline', ctx.go),
    el('h1', {}, 'Outline'),
    el('p', { class: 'lead' }, `${MODES[story.mode].label} mode. ${countNote}`),
    el('section', { class: 'card' },
      el('h2', {}, 'Pitch'),
      el('p', {}, story.idea.pitch || 'No pitch yet.'),
    ),
    isWriter ? el('section', { class: 'card' },
      el('h2', {}, 'Outline writer'),
      el('textarea', {
        rows: 3, 'aria-label': 'Notes for the outline writer', placeholder: 'Notes (optional)',
        oninput: (e) => { notes = e.target.value; },
      }),
      el('div', { class: 'button-row' }, draft.button),
      draft.status,
    ) : null,
    el('section', { class: 'card' },
      el('h2', {}, 'Beats'),
      beatBox('beginning', 'Beginning'),
      beatBox('middle', 'Middle'),
      beatBox('end', 'End'),
    ),
    el('section', { class: 'card' },
      el('h2', {}, 'Scenes'),
      sceneCards.length ? sceneCards : el('p', { class: 'muted' }, 'No scene cards yet.'),
      el('div', { class: 'button-row' }, addScene),
    ),
    dashFlag(
      () => [outline.beats.beginning, outline.beats.middle, outline.beats.end, ...outline.scenes.map((s) => s.summary)]
        .filter((_, i) => (i < 3 ? outline.beatsBy[['beginning', 'middle', 'end'][i]] === 'ai' : outline.scenes[i - 3].by === 'ai')),
      (fixed) => {
        // Put each fixed text back in the AI-written field it came from.
        let next = 0;
        ['beginning', 'middle', 'end'].forEach((k) => { if (outline.beatsBy[k] === 'ai') outline.beats[k] = fixed[next++]; });
        outline.scenes.forEach((s) => { if (s.by === 'ai') s.summary = fixed[next++]; });
        touch(story);
        ctx.refresh();
      },
    ),
    el('section', { class: 'card' },
      el('div', { class: 'button-row' }, critique.button),
      critique.status,
      latest ? el('div', {},
        listBlock('Holes', latest.holes, 'bad'),
        listBlock('Questions', latest.questions),
      ) : null,
    ),
    helpPanel({
      story, step: 'outline', getContent: () => outlineAsText(story),
      onFill: (fill, fillWarning) => {
        mergeOutlineFill(outline, fill, story.length);
        touch(story);
        ctx.refresh();
        if (fillWarning) notify(fillWarning);
      },
    }),
    message,
    el('div', { class: 'button-row' }, approve),
  );
}
