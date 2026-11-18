// The Help button on the Idea, Outline and Scene workspace screens.
import { askHelper } from '../api.js';
import { el, taskButton, listBlock } from './shared.js';

// Fill in the gaps is hidden in Coach mode, and only offered on the idea and
// outline steps in Polish and Writer modes.
export function canFill(mode, step) {
  return mode !== 'coach' && (step === 'idea' || step === 'outline');
}

// getContent() returns what Zane has so far as text. onFill(fill) applies a fill.
export function helpPanel({ story, step, getContent, onFill }) {
  const output = el('div', { class: 'help-output', 'aria-live': 'polite' });
  const status = el('div', { class: 'task-status' });

  const run = (action) => async () => {
    const result = await askHelper({ story, step, action, content: getContent() });
    if (action === 'options') output.replaceChildren(listBlock('Options', result.options));
    else if (action === 'questions') output.replaceChildren(listBlock('Questions', result.questions));
    else onFill(result.fill, result.warning);
  };

  const buttons = [
    taskButton('Give me options', run('options'), { cls: '', status }).button,
    taskButton('Ask me questions', run('questions'), { cls: '', status }).button,
    canFill(story.mode, step) ? taskButton('Fill in the gaps', run('fill'), { cls: '', status }).button : null,
  ];

  return el('details', { class: 'card help' },
    el('summary', {}, 'Help'),
    el('div', { class: 'button-row' }, buttons),
    status,
    output,
  );
}
