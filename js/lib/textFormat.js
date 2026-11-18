// Turns story text into plain pieces the screens can draw safely: which parts
// are italic (*like this*), which parts to highlight, and where paragraphs break.
import { findDashes } from './dashCheck.js';

const ITALIC = /\*([^*\n]+?)\*/g;

export function stripItalics(text) {
  return (text || '').replace(ITALIC, '$1');
}

export function wordCount(text) {
  const plain = stripItalics(text).trim();
  return plain ? plain.split(/\s+/).length : 0;
}

// Splits text into segments: { text, italic, kind, index }.
// kind is 'dash' or 'change' for highlighted spots, otherwise null.
// ranges are { start, end, kind, index } positions in the raw text.
export function segment(text, { highlightDashes = false, ranges = [] } = {}) {
  const source = text || '';
  const n = source.length;
  const hidden = new Uint8Array(n);
  const italic = new Uint8Array(n);
  const mark = new Array(n).fill(null);

  for (const m of source.matchAll(ITALIC)) {
    const last = m.index + m[0].length - 1;
    hidden[m.index] = 1;
    hidden[last] = 1;
    for (let i = m.index + 1; i < last; i++) italic[i] = 1;
  }

  const all = [...ranges];
  if (highlightDashes) {
    for (const d of findDashes(source)) all.push({ start: d.start, end: d.end, kind: 'dash', index: null });
  }
  for (const r of all) {
    for (let i = Math.max(0, r.start); i < Math.min(n, r.end); i++) mark[i] = r;
  }

  const out = [];
  let current = null;
  for (let i = 0; i < n; i++) {
    if (hidden[i]) { current = null; continue; }
    const isItalic = italic[i] === 1;
    if (current && current.italic === isItalic && current.mark === mark[i]) {
      current.text += source[i];
    } else {
      current = { text: source[i], italic: isItalic, mark: mark[i] };
      out.push(current);
    }
  }
  return out.map((s) => ({
    text: s.text,
    italic: s.italic,
    kind: s.mark ? s.mark.kind : null,
    index: s.mark && s.mark.index !== undefined ? s.mark.index : null,
  }));
}

// Groups segments into paragraphs, breaking at newlines.
export function toParagraphs(segments) {
  const paragraphs = [[]];
  for (const seg of segments) {
    const parts = seg.text.split(/\n+/);
    parts.forEach((part, i) => {
      if (i > 0) paragraphs.push([]);
      if (part) paragraphs[paragraphs.length - 1].push({ ...seg, text: part });
    });
  }
  return paragraphs
    .map((p) => {
      // Trim the spaces left at the edges of each paragraph.
      if (p.length) {
        p[0] = { ...p[0], text: p[0].text.replace(/^\s+/, '') };
        const last = p.length - 1;
        p[last] = { ...p[last], text: p[last].text.replace(/\s+$/, '') };
      }
      return p.filter((s) => s.text);
    })
    .filter((p) => p.length);
}
