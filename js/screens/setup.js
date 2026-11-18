// New story setup: mode, genre, POV, length, style preset (Writer) and title.
import { MODES, GENRES, POVS, LENGTHS } from '../config.js';
import { addStory } from '../storage.js';
import { el, add, radioGroup } from './shared.js';

export function renderSetup(container, { go }) {
  // Kept in this closure until Create; nothing is saved until then.
  const choice = {
    mode: 'coach',
    genre: 'fantasy',
    customGenre: '',
    pov: '', // picked every time, so no default
    length: 'short',
    tense: 'present',
    title: '',
  };
  const message = el('p', { class: 'error-text', 'aria-live': 'polite' });
  const writerOnly = el('div');

  function drawWriterOptions() {
    if (choice.mode !== 'writer') { writerOnly.replaceChildren(); return; }
    const preset = choice.pov === 'third-person limited'
      ? 'Third-person limited (built in)'
      : choice.pov ? 'None yet for this point of view, so it will be written plainly.' : 'Pick a point of view first.';
    writerOnly.replaceChildren(el('section', { class: 'card' },
      el('h2', {}, 'Style preset'),
      el('p', {}, preset),
      radioGroup({
        name: 'tense', legend: 'Tense', value: choice.tense,
        options: [{ id: 'present', label: 'Present tense' }, { id: 'past', label: 'Past tense' }],
        onChange: (v) => { choice.tense = v; },
      }),
    ));
  }

  const customGenre = el('input', {
    type: 'text', id: 'custom-genre', placeholder: 'Your own genre', hidden: true,
    oninput: () => { choice.customGenre = customGenre.value; },
  });

  add(container, 
    el('h1', {}, 'New story'),
    el('section', { class: 'card' },
      radioGroup({
        name: 'mode', legend: 'Mode', value: choice.mode,
        options: Object.entries(MODES).map(([id, m]) => ({ id, label: m.label, hint: m.blurb })),
        onChange: (v) => { choice.mode = v; drawWriterOptions(); },
      }),
    ),
    el('section', { class: 'card' },
      radioGroup({
        name: 'genre', legend: 'Genre', value: choice.genre,
        options: [...GENRES, { id: 'custom', label: 'Something else' }],
        onChange: (v) => { choice.genre = v; customGenre.hidden = v !== 'custom'; if (v === 'custom') customGenre.focus(); },
      }),
      customGenre,
    ),
    el('section', { class: 'card' },
      radioGroup({
        name: 'pov', legend: 'Point of view', value: choice.pov,
        options: POVS,
        onChange: (v) => { choice.pov = v; drawWriterOptions(); },
      }),
    ),
    el('section', { class: 'card' },
      radioGroup({
        name: 'length', legend: 'Length', value: choice.length,
        options: Object.entries(LENGTHS).map(([id, l]) => ({ id, label: l.label, hint: l.hint })),
        onChange: (v) => { choice.length = v; },
      }),
    ),
    writerOnly,
    el('section', { class: 'card' },
      el('label', { for: 'story-title' }, 'Working title (optional)'),
      el('input', { type: 'text', id: 'story-title', oninput: (e) => { choice.title = e.target.value; } }),
    ),
    message,
    el('div', { class: 'button-row' },
      el('button', {
        type: 'button', class: 'primary',
        onclick: () => {
          if (!choice.pov) { message.textContent = 'Pick a point of view.'; return; }
          const genre = choice.genre === 'custom' ? choice.customGenre.trim() : choice.genre;
          if (!genre) { message.textContent = 'Type your genre, or pick one from the list.'; return; }
          const story = addStory({
            mode: choice.mode,
            genre,
            pov: choice.pov,
            length: choice.length,
            title: choice.title,
            style: { preset: choice.pov === 'third-person limited' ? 'third-person-limited' : 'plain', tense: choice.tense },
          });
          go(`story/${story.id}/idea`);
        },
      }, 'Create story'),
      el('button', { type: 'button', onclick: () => go('home') }, 'Cancel'),
    ),
  );
  drawWriterOptions();
}
