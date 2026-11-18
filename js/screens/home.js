// Home: the starting point. Drills, stories and the library arrive in later checkpoints.
import { loadKey } from '../storage.js';
import { el } from './shared.js';

export function renderHome(container, { go }) {
  container.append(
    el('h1', {}, 'Draft Pick'),
    el('p', { class: 'lead' }, 'Idea to outline to finished scenes, one draft at a time.'),

    loadKey() ? null : el('div', { class: 'notice' },
      el('p', {}, 'Add your Claude API key to get started.'),
      el('button', { type: 'button', class: 'primary', onclick: () => go('settings') }, 'Open Settings'),
    ),

    el('div', { class: 'button-row' },
      el('button', { type: 'button', class: 'primary', disabled: true, title: 'Coming in Checkpoint 2' }, 'Quick drill'),
      el('button', { type: 'button', disabled: true, title: 'Coming in Checkpoint 4' }, 'New story'),
    ),

    el('section', { class: 'card' },
      el('h2', {}, 'Your stories'),
      el('p', { class: 'muted' }, 'Stories and drills will show up here.'),
    ),

    el('nav', { class: 'link-row' },
      el('button', { type: 'button', class: 'link-button', disabled: true, title: 'Coming in Checkpoint 10' }, 'Progress'),
      el('button', { type: 'button', class: 'link-button', onclick: () => go('settings') }, 'Settings'),
    ),
  );
}
