// Applies the Polisher's changes to Zane's draft with plain find and replace.

// Keeps only changes whose `before` really is in the draft and that change something.
export function keepFoundChanges(text, changes) {
  return (Array.isArray(changes) ? changes : []).filter((c) =>
    c && typeof c.before === 'string' && c.before && typeof c.after === 'string'
    && c.before !== c.after && text.includes(c.before));
}

// Applies accepted changes in order. Returns the new text plus where each
// change landed ({ start, end, index }), so the compare view can highlight it.
// Rejecting everything returns the draft untouched.
export function applyPolish(text, changes) {
  let out = text;
  let spans = [];
  (changes || []).forEach((change, index) => {
    if (!change.accepted) return;
    const at = out.indexOf(change.before);
    if (at === -1) return; // an earlier change may have rewritten this spot
    const end = at + change.before.length;
    const delta = change.after.length - change.before.length;
    spans = spans
      .filter((s) => s.end <= at || s.start >= end)
      .map((s) => (s.start >= end ? { ...s, start: s.start + delta, end: s.end + delta } : s));
    out = out.slice(0, at) + change.after + out.slice(end);
    spans.push({ start: at, end: at + change.after.length, index, kind: 'change' });
  });
  return { text: out, spans };
}

// Where each change's `before` sits in the original draft, for highlighting.
export function locateBefores(text, changes) {
  const spans = [];
  (changes || []).forEach((change, index) => {
    const at = text.indexOf(change.before);
    if (at !== -1) spans.push({ start: at, end: at + change.before.length, index, kind: 'change' });
  });
  return spans;
}
