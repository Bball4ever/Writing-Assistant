// Quick drill: a prompt and a skill focus, one paragraph, a grade, and a
// rewrite if Zane wants. A fast Coach warm-up outside any story.
import { FOCUSES, GENRES, BAR, RUBRIC } from '../config.js';
import { getData, findDrill, addDrill, touch, nowIso } from '../storage.js';
import { makePrompt, gradeText } from '../api.js';
import { pickDrillFocus } from '../lib/stats.js';
import { focusInfo } from '../lib/storyModel.js';
import { average, formatScore } from '../lib/scores.js';
import { el, add, taskButton, writingBox, gradePanel, select, storyText, formatDate } from './shared.js';

const focusOptions = FOCUSES.map((f) => ({ id: f.id, label: f.label }));

export function renderDrill(container, ctx) {
  const id = ctx.params[0];
  if (!id) return renderNewDrill(container, ctx);
  const drill = findDrill(id);
  if (!drill) {
    add(container, el('h1', {}, 'Drill not found'), el('button', { type: 'button', onclick: () => ctx.go('home') }, 'Home'));
    return;
  }
  return renderDrillWork(container, ctx, drill);
}

function renderNewDrill(container, { go }) {
  const pick = pickDrillFocus(getData());
  let focus = pick.focus;
  let genre = '';
  let ownPrompt = '';

  const why = pick.reason === 'weakest'
    ? `Picked to work on your weakest recent category: ${RUBRIC.find((r) => r.key === pick.category).label}.`
    : 'Picked at random, since you have no grades yet.';
  const focusAsks = el('p', { class: 'muted' }, `${focusInfo(focus).asks}.`);

  const getPrompt = taskButton('Get a prompt', async () => {
    const result = await makePrompt({ genre, focus });
    const drill = addDrill({ prompt: result.prompt, focus });
    go(`drill/${drill.id}`);
  });

  add(container, 
    el('h1', {}, 'Quick drill'),
    el('p', { class: 'lead' }, 'One paragraph, one skill, one grade. Rewrite if you want.'),
    el('section', { class: 'card' },
      el('h2', {}, 'Skill focus'),
      select({ id: 'drill-focus', options: focusOptions, value: focus, onChange: (v) => { focus = v; focusAsks.textContent = `${focusInfo(v).asks}.`; } }),
      focusAsks,
      el('p', { class: 'muted small' }, why),
    ),
    el('section', { class: 'card' },
      el('h2', {}, 'Prompt'),
      select({
        id: 'drill-genre', label: 'Genre (optional)',
        options: [{ id: '', label: 'Any genre' }, ...GENRES], value: '', onChange: (v) => { genre = v; },
      }),
      el('div', { class: 'button-row' }, getPrompt.button),
      getPrompt.status,
      el('p', { class: 'muted' }, 'Or bring your own prompt:'),
      el('textarea', { id: 'own-prompt', rows: 3, 'aria-label': 'Your own prompt', oninput: (e) => { ownPrompt = e.target.value; } }),
      el('div', { class: 'button-row' },
        el('button', {
          type: 'button',
          onclick: () => {
            if (!ownPrompt.trim()) return;
            const drill = addDrill({ prompt: ownPrompt.trim(), focus });
            go(`drill/${drill.id}`);
          },
        }, 'Use my prompt'),
      ),
    ),
  );
}

function renderDrillWork(container, { go, refresh }, drill) {
  const attempts = drill.attempts;
  const latest = attempts[attempts.length - 1];
  const previous = attempts[attempts.length - 2];
  const message = el('p', { class: 'muted', 'aria-live': 'polite' });

  const box = writingBox({
    id: 'drill-text', rows: 9, label: 'Your paragraph', value: drill.draft || '',
    onInput: (value) => { drill.draft = value; touch(drill); },
  });

  const grade = taskButton(attempts.length ? 'Grade again' : 'Grade', async () => {
    const text = (drill.draft || '').trim();
    if (!text) { message.textContent = 'Write something first.'; return; }
    const result = await gradeText({ text, focusId: drill.focus, previousText: latest?.text ?? '', drill: true });
    drill.attempts.push({ text, grade: result, at: nowIso() });
    touch(drill);
    refresh();
  });

  const rewrite = el('button', {
    type: 'button',
    onclick: () => { const area = container.querySelector('#drill-text'); area.focus(); area.scrollIntoView({ block: 'center' }); },
  }, 'Rewrite');

  add(container, 
    el('h1', {}, 'Quick drill'),
    el('section', { class: 'card prompt-card' },
      el('h2', {}, 'Prompt'),
      el('p', {}, drill.prompt),
      select({
        id: 'focus-pick', label: 'Skill focus', options: focusOptions, value: drill.focus,
        onChange: (v) => { drill.focus = v; touch(drill); refresh(); },
      }),
      el('p', { class: 'muted' }, `${focusInfo(drill.focus).asks}.`),
      el('p', { class: 'bar-note' }, `The bar: an average of ${BAR} or higher. You can move on any time.`),
    ),
    el('section', { class: 'card' },
      box,
      el('div', { class: 'button-row' }, grade.button, latest ? rewrite : null),
      message,
      grade.status,
    ),
    latest ? gradePanel(latest.grade, { previous: previous?.grade ?? null, title: `Attempt ${attempts.length}` }) : null,
    attempts.length > 1 ? pastAttempts(attempts) : null,
    el('div', { class: 'button-row' },
      el('button', { type: 'button', onclick: () => go('drill') }, 'New drill'),
      el('button', { type: 'button', onclick: () => go('home') }, 'Done'),
    ),
  );
}

function pastAttempts(attempts) {
  return el('section', { class: 'card' },
    el('h2', {}, 'Past attempts'),
    attempts.map((a, i) => el('details', { class: 'past' },
      el('summary', {}, `Attempt ${i + 1}: ${formatScore(average(a.grade?.scores))} (${formatDate(a.at)})`),
      storyText(a.text),
    )),
  );
}
