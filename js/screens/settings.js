// Settings: API key, model, feedback tone and the connection test.
// Backup export and import arrive in Checkpoint 3.
import { loadKey, saveKey, removeKey, loadSettings, updateSettings } from '../storage.js';
import { callClaude } from '../api.js';
import { PROMPTS } from '../prompts.js';
import { buildModelChoices } from './modelPicker.js';
import { el, errorBox } from './shared.js';

export function renderSettings(container) {
  container.append(
    el('h1', {}, 'Settings'),
    keySection(),
    el('section', { class: 'card' },
      el('h2', {}, 'Model'),
      buildModelChoices(),
    ),
    toneSection(),
    testSection(),
  );
}

function keyStatusText(key) {
  return key ? `Key saved (ends in ${key.slice(-4)}).` : 'No key saved yet.';
}

function keySection() {
  const input = el('input', {
    type: 'password', id: 'api-key', autocomplete: 'off', spellcheck: false,
    placeholder: 'sk-ant-...', value: loadKey(),
  });
  const status = el('p', { class: 'muted', 'aria-live': 'polite' }, keyStatusText(loadKey()));

  const showButton = el('button', {
    type: 'button',
    onclick: () => {
      const hidden = input.type === 'password';
      input.type = hidden ? 'text' : 'password';
      showButton.textContent = hidden ? 'Hide' : 'Show';
    },
  }, 'Show');

  const save = () => {
    const key = input.value.trim();
    if (!key) { status.textContent = 'Paste a key first.'; return; }
    status.textContent = saveKey(key) ? keyStatusText(key) : "Couldn't save. Is this a private browsing window?";
  };

  return el('section', { class: 'card' },
    el('h2', {}, 'API key'),
    el('p', { class: 'muted' }, 'Stays in this browser only. It is never put in backups or files.'),
    el('label', { for: 'api-key' }, 'Claude API key'),
    input,
    el('div', { class: 'button-row' },
      el('button', { type: 'button', class: 'primary', onclick: save }, 'Save key'),
      showButton,
      el('button', {
        type: 'button',
        onclick: () => { removeKey(); input.value = ''; status.textContent = keyStatusText(''); },
      }, 'Remove'),
    ),
    status,
  );
}

function toneSection() {
  const current = loadSettings().tone;
  const option = (value, label, hint) => el('label', { class: 'choice' },
    el('input', {
      type: 'radio', name: 'tone', value, checked: current === value,
      onchange: () => updateSettings({ tone: value }),
    }),
    el('span', {}, label),
    el('small', {}, hint),
  );
  return el('section', { class: 'card' },
    el('h2', {}, 'Feedback tone'),
    el('fieldset', { class: 'choices' },
      el('legend', { class: 'sr-only' }, 'Feedback tone'),
      option('blunt', 'Blunt', 'Straight talk with a little humor.'),
      option('gentle', 'Gentle', 'Same notes, softer delivery.'),
    ),
  );
}

function testSection() {
  const result = el('div', { 'aria-live': 'polite' });
  const button = el('button', { type: 'button', class: 'primary' }, 'Test connection');

  async function runTest() {
    button.disabled = true;
    result.replaceChildren(el('p', { class: 'muted' }, 'Asking Claude'));
    try {
      const { text, model } = await callClaude({
        job: 'testConnection',
        system: PROMPTS.testConnection,
        input: 'Check the connection, please.',
      });
      result.replaceChildren(
        el('p', { class: 'success' }, `It works. Reply from ${model}:`),
        el('blockquote', {}, text),
      );
    } catch (error) {
      result.replaceChildren(errorBox(error.message, runTest));
    } finally {
      button.disabled = false;
    }
  }
  button.addEventListener('click', runTest);

  return el('section', { class: 'card' },
    el('h2', {}, 'Test connection'),
    el('p', { class: 'muted' }, 'Before your first real call, set a monthly spending limit in the Anthropic Console.'),
    button,
    result,
  );
}
