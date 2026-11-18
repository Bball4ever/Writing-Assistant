// Home: start a drill or story, and the library of everything saved.
import { MODES, STEPS } from '../config.js';
import { getData, loadKey, deleteStory, deleteDrill } from '../storage.js';
import { storyPath, focusInfo } from '../lib/storyModel.js';
import { average, formatScore } from '../lib/scores.js';
import { el, add, tag, formatDate, confirmDialog } from './shared.js';

export function renderHome(container, { go, refresh }) {
  const data = getData();
  const stories = [...data.stories].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  const drills = [...data.drills].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

  const storyRows = stories.map((story) => el('li', { class: 'library-row' },
    el('button', { type: 'button', class: 'row-main', onclick: () => go(storyPath(story)) },
      el('strong', {}, story.title || 'Untitled story'),
      el('span', { class: 'row-meta' },
        tag(MODES[story.mode]?.label ?? story.mode),
        tag(STEPS[story.step] ?? story.step, story.step === 'finish' ? 'good' : ''),
        el('span', { class: 'muted' }, `Edited ${formatDate(story.updatedAt)}`),
      ),
    ),
    el('button', {
      type: 'button', class: 'link-button danger-text',
      'aria-label': `Delete ${story.title || 'untitled story'}`,
      onclick: async () => {
        if (await confirmDialog(`Delete "${story.title || 'Untitled story'}"? This can't be undone.`)) { deleteStory(story.id); refresh(); }
      },
    }, 'Delete'),
  ));

  const drillRows = drills.map((drill) => {
    const scores = drill.attempts.map((a) => average(a.grade?.scores)).filter((v) => v !== null);
    const best = scores.length ? Math.max(...scores) : null;
    return el('li', { class: 'library-row' },
      el('button', { type: 'button', class: 'row-main', onclick: () => go(`drill/${drill.id}`) },
        el('strong', {}, drill.prompt.length > 80 ? `${drill.prompt.slice(0, 80).trim()} (more)` : drill.prompt),
        el('span', { class: 'row-meta' },
          tag(focusInfo(drill.focus).label),
          el('span', { class: 'muted' }, `${drill.attempts.length} graded${best !== null ? `, best ${formatScore(best)}` : ''}`),
          el('span', { class: 'muted' }, formatDate(drill.updatedAt)),
        ),
      ),
      el('button', {
        type: 'button', class: 'link-button danger-text', 'aria-label': 'Delete drill',
        onclick: async () => {
          if (await confirmDialog("Delete this drill? This can't be undone.")) { deleteDrill(drill.id); refresh(); }
        },
      }, 'Delete'),
    );
  });

  add(container, 
    el('h1', {}, 'Draft Pick'),
    el('p', { class: 'lead' }, 'Idea to outline to finished scenes, one draft at a time.'),

    loadKey() ? null : el('div', { class: 'notice' },
      el('p', {}, 'Add your Claude API key to get started.'),
      el('button', { type: 'button', class: 'primary', onclick: () => go('settings') }, 'Open Settings'),
    ),

    el('div', { class: 'button-row big' },
      el('button', { type: 'button', class: 'primary', onclick: () => go('drill') }, 'Quick drill'),
      el('button', { type: 'button', class: 'primary', onclick: () => go('new') }, 'New story'),
    ),

    el('section', { class: 'card' },
      el('h2', {}, 'Your stories'),
      storyRows.length ? el('ul', { class: 'library' }, storyRows) : el('p', { class: 'muted' }, 'No stories yet. Start one with New story.'),
    ),

    el('section', { class: 'card' },
      el('h2', {}, 'Your drills'),
      drillRows.length ? el('ul', { class: 'library' }, drillRows) : el('p', { class: 'muted' }, 'No drills yet. A quick drill is a good warm-up.'),
    ),

    el('nav', { class: 'link-row' },
      el('button', { type: 'button', class: 'link-button', onclick: () => go('progress') }, 'Progress'),
      el('button', { type: 'button', class: 'link-button', onclick: () => go('settings') }, 'Settings'),
    ),
  );
}
