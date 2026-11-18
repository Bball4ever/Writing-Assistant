// Starts the app and switches screens. The screen lives in the URL hash,
// like #story/s_001/scene/2, so reloading keeps you where you were and Back works.
import { renderHome } from './screens/home.js';
import { renderSettings } from './screens/settings.js';
import { renderDrill } from './screens/drill.js';
import { renderSetup } from './screens/setup.js';
import { renderIdea } from './screens/idea.js';
import { renderOutline } from './screens/outline.js';
import { renderScene } from './screens/scene.js';
import { renderFinish } from './screens/finish.js';
import { renderProgress } from './screens/progress.js';
import { setupModelBadge } from './screens/modelPicker.js';
import { findStory } from './storage.js';
import { storyPath } from './lib/storyModel.js';
import { el } from './screens/shared.js';

const screens = {
  home: renderHome,
  settings: renderSettings,
  progress: renderProgress,
  drill: renderDrill,
  new: renderSetup,
  story: renderStory,
};

const storySteps = {
  idea: renderIdea,
  outline: renderOutline,
  scene: renderScene,
  finish: renderFinish,
};

// #story/<id>/<step>/<n>. With no step, open wherever the story is up to.
function renderStory(container, ctx) {
  const [id, step] = ctx.params;
  const story = findStory(id);
  if (!story) {
    container.append(el('h1', {}, 'Story not found'), el('button', { type: 'button', onclick: () => ctx.go('home') }, 'Home'));
    return;
  }
  const render = storySteps[step];
  if (!render) { ctx.go(storyPath(story), { replace: true }); return; }
  render(container, ctx, story);
}

function parseHash() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  return { name: parts[0] || 'home', params: parts.slice(1) };
}

// Draws the new screen straight away. (Setting location.hash would wait for
// the hashchange event, leaving a moment where the old screen still shows.)
function go(path, { replace = false } = {}) {
  if (location.hash !== `#${path}`) {
    if (replace) history.replaceState(null, '', `#${path}`);
    else history.pushState(null, '', `#${path}`);
  }
  show();
}

// The hash the current screen was drawn for, so Back/Forward and typed URLs
// redraw, but our own navigation isn't drawn twice.
let shownHash = null;

// Redraws the current screen after a change, keeping the scroll position.
function refresh() {
  const y = window.scrollY;
  show({ keepScroll: true });
  window.scrollTo(0, y);
}

function show({ keepScroll = false } = {}) {
  const { name, params } = parseHash();
  const render = screens[name] ?? screens.home;
  const container = document.getElementById('screen');
  shownHash = location.hash;
  container.replaceChildren();
  render(container, { go, refresh, params });
  if (!keepScroll) window.scrollTo(0, 0);
}

setupModelBadge();
const showIfChanged = () => { if (location.hash !== shownHash) show(); };
window.addEventListener('hashchange', showIfChanged);
window.addEventListener('popstate', showIfChanged);
show();
