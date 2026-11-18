// Saves files to Zane's device: story exports and backups.
import { storyToHtml, storyToText, fileName } from './lib/exportFormat.js';

export function downloadFile(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before freeing the file.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// version is 'mine', 'polished' or 'both' (the last two only matter in Polish mode).
export function exportStoryHtml(story, version) {
  const suffix = story.mode === 'polish' && version !== 'mine' ? `-${version}` : '';
  downloadFile(fileName(story, 'html').replace('.html', `${suffix}.html`), storyToHtml(story, version), 'text/html');
}

export function exportStoryText(story, version) {
  const suffix = story.mode === 'polish' && version !== 'mine' ? `-${version}` : '';
  downloadFile(fileName(story, 'txt').replace('.txt', `${suffix}.txt`), storyToText(story, version), 'text/plain');
}
