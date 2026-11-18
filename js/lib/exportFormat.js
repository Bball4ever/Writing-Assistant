// Builds the .html and .txt versions of a finished story.
import { segment, toParagraphs, stripItalics } from './textFormat.js';
import { sceneText } from './storyModel.js';

export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// version is 'mine', 'polished' or 'both'.
function versions(story, version) {
  if (story.mode !== 'polish' || version === 'mine') return [{ key: 'mine', heading: null }];
  if (version === 'polished') return [{ key: 'polished', heading: null }];
  return [{ key: 'mine', heading: 'Your version' }, { key: 'polished', heading: 'Polished version' }];
}

function textToHtml(text) {
  return toParagraphs(segment(text))
    .map((para) => `<p>${para.map((s) => (s.italic ? `<em>${escapeHtml(s.text)}</em>` : escapeHtml(s.text))).join('')}</p>`)
    .join('\n');
}

function title(story) {
  return story.title || 'Untitled story';
}

export function storyToHtml(story, version = 'mine') {
  const body = versions(story, version).map(({ key, heading }) => {
    const scenes = story.scenes.map((scene, i) => {
      const sep = i > 0 ? '<p class="break">* * *</p>\n' : '';
      return sep + textToHtml(sceneText(scene, key));
    }).join('\n');
    return (heading ? `<h2>${escapeHtml(heading)}</h2>\n` : '') + scenes;
  }).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title(story))}</title>
<style>
  body { font-family: Georgia, "Times New Roman", serif; max-width: 40em; margin: 2em auto; padding: 0 1em; line-height: 1.6; color: #111; }
  h1 { text-align: center; }
  h2 { margin-top: 2em; }
  .break { text-align: center; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
<h1>${escapeHtml(title(story))}</h1>
${body}
</body>
</html>
`;
}

export function storyToText(story, version = 'mine') {
  const parts = versions(story, version).map(({ key, heading }) => {
    const scenes = story.scenes.map((scene) => stripItalics(sceneText(scene, key)).trim()).join('\n\n* * *\n\n');
    return (heading ? `${heading.toUpperCase()}\n\n` : '') + scenes;
  });
  return `${title(story)}\n\n${parts.join('\n\n\n')}\n`;
}

// A safe file name from the story title.
export function fileName(story, extension) {
  const base = title(story).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'story';
  return `${base}.${extension}`;
}
