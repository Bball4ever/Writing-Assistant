// Starts the app and switches screens. The screen name lives in the URL hash
// (#settings), so reloading keeps you where you were and Back works.
import { renderHome } from './screens/home.js';
import { renderSettings } from './screens/settings.js';
import { setupModelBadge } from './screens/modelPicker.js';

const screens = {
  home: renderHome,
  settings: renderSettings,
};

function go(name) {
  location.hash = name;
}

function showCurrentScreen() {
  const name = location.hash.slice(1);
  const render = screens[name] ?? screens.home;
  const container = document.getElementById('screen');
  container.replaceChildren();
  render(container, { go });
  window.scrollTo(0, 0);
}

setupModelBadge();
window.addEventListener('hashchange', showCurrentScreen);
showCurrentScreen();
