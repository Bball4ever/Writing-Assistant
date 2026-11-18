// The model picker, used both in Settings and in the popup from the top-bar badge.
import { MODELS, AUTO_MODELS } from '../config.js';
import { loadSettings, updateSettings } from '../storage.js';
import { modelLabel } from '../lib/claudeHelpers.js';
import { el } from './shared.js';

// Each picker needs its own radio group name, or two pickers on the page
// (Settings plus the popup) would fight over one group.
let pickerCount = 0;

export function buildModelChoices(onPick) {
  const name = `model-choice-${++pickerCount}`;
  const current = loadSettings().model;

  const inputs = MODELS.map((m) => el('input', {
    type: 'radio', name, value: m.id, checked: m.id === current,
    onchange: () => { updateSettings({ model: m.id }); if (onPick) onPick(); },
  }));

  const list = el('fieldset', { class: 'choices' },
    el('legend', { class: 'sr-only' }, 'Model'),
    MODELS.map((m, i) => el('label', { class: 'choice' },
      inputs[i],
      el('span', {}, m.label),
      m.id === 'auto'
        ? el('small', {}, `Small jobs use ${modelLabel(AUTO_MODELS.small)}, everything else uses ${modelLabel(AUTO_MODELS.big)}.`)
        : null,
    )),
  );

  // Stay in sync if the model changes somewhere else (the other picker, or an
  // automatic switch back to Auto). Stop listening once this picker is gone.
  function sync(event) {
    if (!list.isConnected) { window.removeEventListener('draftpick:settings', sync); return; }
    for (const input of inputs) input.checked = input.value === event.detail.model;
  }
  window.addEventListener('draftpick:settings', sync);

  return list;
}

export function setupModelBadge() {
  const badge = document.getElementById('model-badge');
  const dialog = document.getElementById('model-dialog');

  const refresh = () => {
    const label = modelLabel(loadSettings().model);
    badge.textContent = label;
    badge.setAttribute('aria-label', `Model: ${label}. Tap to change.`);
  };
  refresh();
  window.addEventListener('draftpick:settings', refresh);

  badge.addEventListener('click', () => {
    dialog.querySelector('.dialog-body').replaceChildren(buildModelChoices(() => dialog.close()));
    dialog.showModal();
  });
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  // Tapping the dark area outside the popup closes it too.
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
}
