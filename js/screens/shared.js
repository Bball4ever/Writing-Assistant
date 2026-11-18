// Building blocks every screen uses. Everything is built with createElement
// and text nodes, never innerHTML, so AI text can't inject HTML.
import { RUBRIC, BAR, STEPS } from '../config.js';
import { segment, toParagraphs, wordCount } from '../lib/textFormat.js';
import { average, formatScore, clearsBar } from '../lib/scores.js';
import { anyHasDashes, hasDashes } from '../lib/dashCheck.js';
import { touch } from '../storage.js';
import { fixDashes } from '../api.js';

// el('button', { class: 'primary', onclick: fn }, 'Save')
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (name === 'class') node.className = value;
    else if (name.startsWith('on')) node.addEventListener(name.slice(2).toLowerCase(), value);
    else if (name in node) node[name] = value;
    else node.setAttribute(name, value === true ? '' : value);
  }
  // append() turns strings into text nodes, which is what keeps this safe.
  for (const child of children.flat(Infinity)) {
    if (child !== null && child !== undefined && child !== false) node.append(child);
  }
  return node;
}

// Like parent.append(), but skips null and false. (The browser's own append()
// would put the word "null" on the page.)
export function add(parent, ...children) {
  for (const child of children.flat(Infinity)) {
    if (child !== null && child !== undefined && child !== false) parent.append(child);
  }
  return parent;
}

export function formatDate(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

// Shows a notice at the bottom of the screen that stays until dismissed.
export function notify(message) {
  const bar = document.getElementById('notice');
  if (!bar || !message) return;
  bar.querySelector('p').textContent = message;
  bar.hidden = false;
  bar.querySelector('[data-dismiss]').onclick = () => { bar.hidden = true; };
}

export function tag(text, kind = '') {
  return el('span', { class: `tag ${kind}`.trim() }, text);
}

// Every error gets a message and a Retry button.
export function errorBox(message, onRetry) {
  return el('div', { class: 'error-box', role: 'alert' },
    el('p', {}, message),
    onRetry ? el('button', { type: 'button', onclick: onRetry }, 'Retry') : null,
  );
}

// A button that runs an AI task: shows it's working, and on failure shows
// the friendly message with a Retry button.
export function taskButton(label, task, { cls = 'primary', status = null, disabled = false } = {}) {
  const statusEl = status ?? el('div', { class: 'task-status', 'aria-live': 'polite' });
  const button = el('button', { type: 'button', class: cls, disabled }, label);
  let running = false;
  async function run() {
    if (running) return;
    running = true;
    button.disabled = true;
    button.textContent = 'Working';
    statusEl.replaceChildren(el('p', { class: 'muted working' }, 'Waiting for Claude. This can take a little while.'));
    try {
      await task();
      statusEl.replaceChildren();
    } catch (error) {
      console.error(error);
      statusEl.replaceChildren(errorBox(error.message || 'Something went wrong.', run));
    } finally {
      running = false;
      button.disabled = false;
      button.textContent = label;
    }
  }
  button.addEventListener('click', run);
  return { button, status: statusEl, run };
}

// A writing box with a live word count. Calls onInput(value) as Zane types.
export function writingBox({ value = '', onInput, rows = 10, label, id, placeholder = '' }) {
  const count = el('span', { class: 'word-count' });
  const showCount = (text) => {
    const n = wordCount(text);
    count.textContent = `${n} word${n === 1 ? '' : 's'}`;
  };
  const area = el('textarea', {
    id, rows, placeholder, value,
    oninput: () => { showCount(area.value); onInput(area.value); },
  });
  showCount(value);
  return el('div', { class: 'writing-box' },
    label ? el('label', { for: id }, label) : null,
    area,
    count,
  );
}

// Draws story text: paragraphs, *italics* as <em>, and optional highlights
// (dash spots, or polish changes by index).
export function storyText(text, { highlightDashes = false, ranges = [], onMarkClick = null } = {}) {
  const box = el('div', { class: 'story-text' });
  const paragraphs = toParagraphs(segment(text || '', { highlightDashes, ranges }));
  if (!paragraphs.length) box.append(el('p', { class: 'muted' }, 'Nothing here yet.'));
  for (const para of paragraphs) {
    const p = el('p');
    for (const seg of para) {
      let node = document.createTextNode(seg.text);
      if (seg.italic) node = el('em', {}, node);
      if (seg.kind) {
        node = el('mark', {
          class: seg.kind === 'dash' ? 'dash-mark' : 'change-mark',
          'data-index': seg.index ?? '',
          onclick: onMarkClick && seg.index !== null ? () => onMarkClick(seg.index) : null,
        }, node);
      }
      p.append(node);
    }
    box.append(p);
  }
  return box;
}

// Shown when AI story text still has dashes or ellipses after the automatic
// retry: the spots are highlighted, and Fix again asks for a fixed version.
// getTexts() returns the current texts, onFixed(newTexts) stores the fix.
export function dashFlag(getTexts, onFixed) {
  const texts = getTexts();
  if (!anyHasDashes(texts)) return null;
  const { button, status } = taskButton('Fix again', async () => {
    const fixed = await fixDashes(getTexts());
    onFixed(fixed);
  }, { cls: '' });
  return el('div', { class: 'dash-flag' },
    el('p', {}, 'Some dashes or ellipses slipped into the AI text. They are highlighted:'),
    texts.filter((t) => hasDashes(t)).map((t) => storyText(t, { highlightDashes: true })),
    button,
    status,
  );
}

// In-app confirmation (instead of the browser's confirm box). Resolves true or false.
export function confirmDialog(message, confirmLabel = 'Delete') {
  return new Promise((resolve) => {
    const dialog = el('dialog', { class: 'confirm' });
    const finish = (answer) => { dialog.close(); dialog.remove(); resolve(answer); };
    dialog.append(
      el('p', {}, message),
      el('div', { class: 'button-row' },
        el('button', { type: 'button', class: 'danger', onclick: () => finish(true) }, confirmLabel),
        el('button', { type: 'button', onclick: () => finish(false) }, 'Cancel'),
      ),
    );
    dialog.addEventListener('cancel', (e) => { e.preventDefault(); finish(false); });
    document.body.append(dialog);
    dialog.showModal();
  });
}

function barBadge(scores) {
  return clearsBar(scores)
    ? tag(`Cleared the bar (${BAR})`, 'good')
    : tag(`Bar: ${BAR}`, '');
}

// The scores and feedback for one grade. previous shows before and after side by side.
export function gradePanel(grade, { previous = null, title = 'Feedback', note = '' } = {}) {
  if (!grade?.scores) return null;
  const avg = average(grade.scores);
  const panel = el('section', { class: 'card grade-panel' },
    el('div', { class: 'grade-head' },
      el('h3', {}, title),
      el('span', { class: 'overall' }, `Overall ${formatScore(avg)}`),
      barBadge(grade.scores),
    ),
    note ? el('p', { class: 'muted' }, note) : null,
  );

  if (previous?.scores) {
    const prevAvg = average(previous.scores);
    panel.append(el('table', { class: 'compare' },
      el('thead', {}, el('tr', {}, el('th', {}, 'Category'), el('th', {}, 'Before'), el('th', {}, 'After'))),
      el('tbody', {},
        RUBRIC.map((r) => el('tr', {},
          el('td', {}, r.label),
          el('td', {}, previous.scores[r.key] ?? 'n/a'),
          el('td', {}, grade.scores[r.key] ?? 'n/a'),
        )),
        el('tr', { class: 'total' }, el('td', {}, 'Overall'), el('td', {}, formatScore(prevAvg)), el('td', {}, formatScore(avg))),
      ),
    ));
  }

  const list = el('div', { class: 'rubric-list' });
  for (const r of RUBRIC) {
    const score = grade.scores[r.key];
    list.append(el('div', { class: 'rubric-item' },
      el('div', { class: 'rubric-top' },
        el('strong', {}, r.label),
        el('span', { class: `score s${score ?? 0}` }, score === null ? 'No dialogue' : `${score}/5`),
      ),
      grade.evidence?.[r.key] ? storyText(grade.evidence[r.key]) : null,
      grade.fixes?.[r.key] ? el('p', { class: 'fix' }, el('strong', {}, 'Fix: '), grade.fixes[r.key]) : null,
    ));
  }
  panel.append(list);
  if (grade.strongest_line) panel.append(el('h4', {}, 'Strongest line'), storyText(grade.strongest_line));
  if (grade.top_fix) panel.append(el('h4', {}, 'Top fix'), el('p', {}, grade.top_fix));
  if (grade.warning) panel.append(el('p', { class: 'muted' }, grade.warning));
  return panel;
}

// The Idea, Outline, Scenes, Finish trail at the top of story screens.
export function storyNav(story, current, go) {
  const order = ['idea', 'outline', 'scenes', 'finish'];
  const reached = order.indexOf(story.step);
  const nav = el('nav', { class: 'story-nav', 'aria-label': 'Story steps' });
  order.forEach((step, i) => {
    const label = step === 'finish' ? 'Finish' : STEPS[step];
    const path = step === 'scenes' ? `story/${story.id}/scene/1` : `story/${story.id}/${step}`;
    if (step === current) nav.append(el('span', { class: 'current', 'aria-current': 'step' }, label));
    else if (i <= reached) nav.append(el('button', { type: 'button', class: 'link-button', onclick: () => go(path) }, label));
    else nav.append(el('span', { class: 'muted' }, label));
  });
  return nav;
}

// Saves a story change: marks it edited and schedules the auto-save.
export function edited(item) {
  touch(item);
}

export function select({ id, options, value, onChange, label }) {
  const node = el('select', { id, onchange: () => onChange(node.value) },
    options.map((o) => el('option', { value: o.id, selected: o.id === value }, o.label)));
  return label ? el('div', { class: 'field' }, el('label', { for: id }, label), node) : node;
}

export function radioGroup({ name, options, value, onChange, legend }) {
  return el('fieldset', { class: 'choices' },
    legend ? el('legend', {}, legend) : null,
    options.map((o) => el('label', { class: 'choice' },
      el('input', { type: 'radio', name, value: o.id, checked: o.id === value, onchange: () => onChange(o.id) }),
      el('span', {}, o.label),
      o.hint ? el('small', {}, o.hint) : null,
    )),
  );
}

export function listBlock(title, items, kind = '') {
  if (!items || !items.length) return null;
  return el('div', { class: `list-block ${kind}`.trim() },
    el('h4', {}, title),
    el('ul', {}, items.map((item) => el('li', {}, item))),
  );
}
