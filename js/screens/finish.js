// Finish: the read-through (skipped scenes marked), word count, score summary
// and export. In Polish mode Zane picks his version, the polished one or both.
import { MODES } from '../config.js';
import { sceneText, gradedDrafts } from '../lib/storyModel.js';
import { average, formatScore } from '../lib/scores.js';
import { wordCount } from '../lib/textFormat.js';
import { exportStoryHtml, exportStoryText } from '../export.js';
import { el, add, tag, storyNav, storyText, radioGroup } from './shared.js';

export function renderFinish(container, ctx, story) {
  const isPolish = story.mode === 'polish';
  let version = isPolish ? 'polished' : 'mine';
  const readThrough = el('div');
  const words = el('p', { class: 'lead' });

  const keys = () => (version === 'both' ? ['mine', 'polished'] : [version]);

  function draw() {
    const total = keys().map((key) => story.scenes.reduce((sum, s) => sum + wordCount(sceneText(s, key)), 0));
    words.textContent = version === 'both'
      ? `Your version: ${total[0]} words. Polished: ${total[1]} words.`
      : `${total[0]} words.`;
    readThrough.replaceChildren(...story.scenes.map((scene) => {
      const card = story.outline.scenes.find((s) => s.n === scene.n);
      return el('section', { class: 'card read-scene' },
        el('h2', {}, `Scene ${scene.n}`, ' ', scene.status === 'skipped' ? tag('skipped', 'warn') : null),
        el('p', { class: 'muted small' }, card?.summary ?? ''),
        keys().map((key) => el('div', {},
          version === 'both' ? el('h3', {}, key === 'mine' ? 'Your version' : 'Polished version') : null,
          storyText(sceneText(scene, key)),
        )),
      );
    }));
  }

  const skipped = story.scenes.filter((s) => s.status === 'skipped').length;

  add(container, 
    storyNav(story, 'finish', ctx.go),
    el('h1', {}, story.title || 'Untitled story'),
    el('p', { class: 'muted' }, `${MODES[story.mode].label} mode. ${story.scenes.length} scene${story.scenes.length === 1 ? '' : 's'}${skipped ? `, ${skipped} skipped` : ''}.`),
    words,
    story.mode === 'writer' ? null : scoreSummary(story),
    el('section', { class: 'card' },
      el('h2', {}, 'Export'),
      isPolish ? radioGroup({
        name: 'version', legend: 'Which version?', value: version,
        options: [
          { id: 'mine', label: 'Your version' },
          { id: 'polished', label: 'Polished version' },
          { id: 'both', label: 'Both' },
        ],
        onChange: (v) => { version = v; draw(); },
      }) : null,
      el('div', { class: 'button-row' },
        el('button', { type: 'button', class: 'primary', onclick: () => exportStoryHtml(story, version) }, 'Download .html'),
        el('button', { type: 'button', onclick: () => exportStoryText(story, version) }, 'Download .txt'),
      ),
      el('p', { class: 'muted small' }, 'The .html file keeps italics, prints cleanly and pastes into Google Docs with its formatting.'),
    ),
    el('h2', {}, 'Read-through'),
    readThrough,
  );
  draw();
}

function scoreSummary(story) {
  const rows = story.scenes.map((scene) => {
    const graded = gradedDrafts(scene).filter((d) => d.by === 'you');
    const first = graded[0] ? average(graded[0].grade.scores) : null;
    const last = graded.length ? average(graded[graded.length - 1].grade.scores) : null;
    return { scene, graded: graded.length, first, last };
  });
  const finals = rows.map((r) => r.last).filter((v) => v !== null);
  const overall = finals.length ? finals.reduce((a, b) => a + b, 0) / finals.length : null;
  return el('section', { class: 'card' },
    el('h2', {}, 'Scores'),
    el('table', { class: 'compare' },
      el('thead', {}, el('tr', {}, el('th', {}, 'Scene'), el('th', {}, 'Grades'), el('th', {}, 'First'), el('th', {}, 'Final'))),
      el('tbody', {},
        rows.map((r) => el('tr', {},
          el('td', {}, `${r.scene.n}`, r.scene.status === 'skipped' ? ' (skipped)' : ''),
          el('td', {}, String(r.graded)),
          el('td', {}, formatScore(r.first)),
          el('td', {}, formatScore(r.last)),
        )),
        el('tr', { class: 'total' }, el('td', {}, 'Average'), el('td', {}, ''), el('td', {}, ''), el('td', {}, formatScore(overall))),
      ),
    ),
  );
}
