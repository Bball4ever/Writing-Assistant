// The scene workspace. The outline sits on the side, the writing in the middle,
// and scores and feedback beside it.
// Coach: write, grade, rewrite, Skip. Polish: the same, then the Polisher and
// the compare view. Writer: the AI drafts, Zane directs with notes.
import { FOCUSES, BAR } from '../config.js';
import { gradeText, polishDraft, writeScene, reviseScene } from '../api.js';
import { touch, nowIso } from '../storage.js';
import {
  latestDraft, gradedDrafts, polishUnlocked, focusInfo, sceneText,
} from '../lib/storyModel.js';
import { clearsBar, average, formatScore } from '../lib/scores.js';
import { applyPolish, locateBefores } from '../lib/applyPolish.js';
import { wordCount } from '../lib/textFormat.js';
import { helpPanel } from './help.js';
import {
  el, add, tag, taskButton, writingBox, storyNav, gradePanel, storyText, select,
  dashFlag, listBlock, formatDate,
} from './shared.js';

const focusOptions = FOCUSES.map((f) => ({ id: f.id, label: f.label }));

function statusTag(scene) {
  if (scene.status === 'skipped') return tag('skipped', 'warn');
  if (scene.status === 'cleared') return tag(scene.drafts.some((d) => d.by === 'ai') ? 'approved' : 'cleared', 'good');
  return null;
}

function goNext(story, n, ctx) {
  if (story.scenes.some((s) => s.n === n + 1)) ctx.go(`story/${story.id}/scene/${n + 1}`);
  else finishStory(story, ctx);
}

function finishStory(story, ctx) {
  story.step = 'finish';
  story.finishedAt = story.finishedAt || nowIso();
  touch(story);
  ctx.go(`story/${story.id}/finish`);
}

function sideOutline(story, current, ctx) {
  const { beats } = story.outline;
  return el('aside', { class: 'side card' },
    el('h2', {}, 'Outline'),
    el('details', {},
      el('summary', {}, 'Pitch and beats'),
      el('p', {}, story.idea.pitch),
      el('p', {}, el('strong', {}, 'Beginning: '), beats.beginning),
      el('p', {}, el('strong', {}, 'Middle: '), beats.middle),
      el('p', {}, el('strong', {}, 'End: '), beats.end),
    ),
    el('ol', { class: 'scene-list' },
      story.scenes.map((scene) => {
        const card = story.outline.scenes.find((s) => s.n === scene.n);
        return el('li', { class: scene.n === current ? 'current' : '' },
          el('button', { type: 'button', class: 'link-button', onclick: () => ctx.go(`story/${story.id}/scene/${scene.n}`) },
            `${scene.n}. ${card?.summary || ''}`),
          ' ', statusTag(scene),
        );
      }),
    ),
    el('button', { type: 'button', class: 'link-button', onclick: () => ctx.go(`story/${story.id}/outline`) }, 'Edit outline'),
  );
}

function pastDrafts(scene) {
  if (scene.drafts.length < 2) return null;
  return el('section', { class: 'card' },
    el('h2', {}, 'Past drafts'),
    scene.drafts.map((d, i) => el('details', { class: 'past' },
      el('summary', {}, `Draft ${i + 1}`, d.by === 'ai' ? ' (AI)' : '',
        d.grade?.scores ? `: ${formatScore(average(d.grade.scores))}` : '',
        ` (${formatDate(d.at)})`),
      storyText(d.text),
      d.notes ? el('p', { class: 'muted' }, `Your notes: ${d.notes}`) : null,
    )),
  );
}

export function renderScene(container, ctx, story) {
  const n = Number(ctx.params[2]) || 1;
  const scene = story.scenes.find((s) => s.n === n);
  const card = story.outline.scenes.find((s) => s.n === n);
  if (!scene || !card) {
    add(container, 
      el('h1', {}, 'Scene not found'),
      el('p', {}, 'Approve the outline first, so the scenes exist.'),
      el('button', { type: 'button', onclick: () => ctx.go(`story/${story.id}/outline`) }, 'Go to the outline'),
    );
    return;
  }

  const main = el('div', { class: 'scene-main' },
    el('div', { class: 'scene-head' },
      el('h1', {}, `Scene ${n} of ${story.scenes.length}`, ' ', statusTag(scene)),
      el('p', { class: 'lead' }, card.summary),
      select({
        id: 'scene-focus', label: 'Skill focus', options: focusOptions, value: card.focus,
        onChange: (v) => { card.focus = v; touch(story); ctx.refresh(); },
      }),
      el('p', { class: 'muted' }, `${focusInfo(card.focus).asks}.`),
    ),
  );

  if (story.mode === 'writer') writerWork(main, ctx, story, scene, card);
  else coachWork(main, ctx, story, scene, card);

  add(main, helpPanel({
    story, step: 'scene',
    getContent: () => `Scene ${n}: ${card.summary}\nSkill focus: ${focusInfo(card.focus).label}\nText so far:\n${sceneText(scene)}`,
    onFill: () => {},
  }));
  add(main, pastDrafts(scene));

  add(container, 
    storyNav(story, 'scenes', ctx.go),
    el('div', { class: 'workspace' }, sideOutline(story, n, ctx), main),
  );
}

// Coach and Polish: Zane writes, the Grader grades.
function coachWork(main, ctx, story, scene, card) {
  const graded = gradedDrafts(scene);
  const latest = graded[graded.length - 1];
  const previous = graded[graded.length - 2];
  const message = el('p', { class: 'error-text', 'aria-live': 'polite' });
  const isLast = !story.scenes.some((s) => s.n === scene.n + 1);

  const grade = taskButton(graded.length ? 'Grade again' : 'Grade', async () => {
    const text = (scene.working || '').trim();
    if (!text) { message.textContent = 'Write something first.'; return; }
    const result = await gradeText({ text, focusId: card.focus, previousText: latest?.text ?? '' });
    scene.drafts.push({ by: 'you', text, grade: result, notes: '', at: nowIso() });
    if (clearsBar(result.scores)) scene.status = 'cleared';
    touch(story);
    ctx.refresh();
  });

  // Skip is always there, even before the first grade.
  const skip = el('button', {
    type: 'button',
    onclick: () => {
      if (scene.status !== 'cleared') scene.status = 'skipped';
      touch(story);
      if (story.mode === 'polish') ctx.refresh(); // skipping unlocks Polish, so stay and show it
      else goNext(story, scene.n, ctx);
    },
  }, story.mode === 'polish' && scene.status === 'writing' ? 'Skip (unlocks Polish)' : 'Skip');

  const canMoveOn = scene.status === 'cleared' || scene.status === 'skipped';
  const next = el('button', {
    type: 'button', class: 'primary', disabled: !canMoveOn,
    title: canMoveOn ? '' : `Clear the bar (${BAR}) or skip to move on`,
    onclick: () => goNext(story, scene.n, ctx),
  }, isLast ? 'Finish story' : 'Next scene');

  add(main, 
    el('section', { class: 'card' },
      writingBox({
        id: 'scene-text', rows: 16, label: 'Your scene', value: scene.working || '',
        onInput: (v) => { scene.working = v; touch(story); },
      }),
      el('p', { class: 'bar-note' }, `The bar: an average of ${BAR} or higher. Rewrite and grade again to climb.`),
      el('div', { class: 'button-row' }, grade.button, skip, next),
      message,
      grade.status,
    ),
    latest ? gradePanel(latest.grade, { previous: previous?.grade ?? null, title: `Draft ${graded.length}` }) : null,
  );

  if (story.mode === 'polish') polishSection(main, ctx, story, scene);
}

// Polish mode: the Polisher, the compare view, and accepting or rejecting each change.
function polishSection(main, ctx, story, scene) {
  const unlocked = polishUnlocked(scene);
  const graded = gradedDrafts(scene);
  const latest = graded[graded.length - 1];

  const runPolish = taskButton(scene.polish ? 'Polish again' : 'Polish', async () => {
    const source = (scene.working || '').trim() || latestDraft(scene)?.text || '';
    if (!source.trim()) throw new Error('Write the scene first, then polish it.');
    const changes = await polishDraft(story, { text: source, grade: latest?.grade });
    scene.polish = { source, changes, finalText: source };
    touch(story);
    ctx.refresh();
  }, { disabled: !unlocked, cls: scene.polish ? '' : 'primary' });

  const section = el('section', { class: 'card polish' },
    el('h2', {}, 'Polish'),
    unlocked
      ? el('p', { class: 'muted' }, 'The AI line-edits this scene. You accept or reject every change. You can also skip polishing and move on.')
      : el('p', { class: 'muted' }, `Unlocks when your latest draft averages ${BAR} or higher and you've rewritten it at least once, or as soon as you skip.`),
    el('div', { class: 'button-row' }, runPolish.button),
    runPolish.status,
  );
  add(main, section);
  if (!scene.polish) return;

  const { polish } = scene;
  const recompute = () => {
    polish.finalText = applyPolish(polish.source, polish.changes).text;
    touch(story);
    ctx.refresh();
  };

  if (!polish.changes.length) {
    add(section, el('p', {}, 'No changes suggested. Your draft stands as it is.'));
    return;
  }

  const applied = applyPolish(polish.source, polish.changes);
  const jumpTo = (i) => document.getElementById(`change-${i}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  const accepted = polish.changes.filter((c) => c.accepted).length;

  add(section, 
    el('div', { class: 'compare-view' },
      el('div', {},
        el('h3', {}, 'Your draft'),
        storyText(polish.source, { ranges: locateBefores(polish.source, polish.changes), onMarkClick: jumpTo }),
      ),
      el('div', {},
        el('h3', {}, `Polished (${accepted} of ${polish.changes.length} accepted)`),
        storyText(applied.text, { ranges: applied.spans, highlightDashes: true, onMarkClick: jumpTo }),
      ),
    ),
    el('div', { class: 'button-row' },
      el('button', { type: 'button', onclick: () => { polish.changes.forEach((c) => { c.accepted = true; }); recompute(); } }, 'Accept all'),
      el('button', { type: 'button', onclick: () => { polish.changes.forEach((c) => { c.accepted = false; }); recompute(); } }, 'Reject all'),
    ),
    el('ol', { class: 'change-list' },
      polish.changes.map((change, i) => el('li', { id: `change-${i}`, class: change.accepted ? 'accepted' : '' },
        el('div', { class: 'change-pair' },
          el('div', {}, el('span', { class: 'muted small' }, 'Before'), storyText(change.before)),
          el('div', {}, el('span', { class: 'muted small' }, 'After'), storyText(change.after, { highlightDashes: true })),
        ),
        el('p', { class: 'why' }, change.why),
        el('div', { class: 'button-row' },
          el('button', {
            type: 'button', class: change.accepted ? 'primary' : '', 'aria-pressed': String(change.accepted),
            onclick: () => { change.accepted = true; recompute(); },
          }, change.accepted ? 'Accepted' : 'Accept'),
          el('button', {
            type: 'button', class: change.accepted ? '' : 'primary', 'aria-pressed': String(!change.accepted),
            onclick: () => { change.accepted = false; recompute(); },
          }, change.accepted ? 'Reject' : 'Rejected'),
        ),
      )),
    ),
    dashFlag(
      () => polish.changes.map((c) => c.after),
      (fixed) => { polish.changes.forEach((c, i) => { c.after = fixed[i]; }); recompute(); },
    ),
  );
}

// Writer mode: the Scene writer drafts, the Reviser revises, Zane approves.
function writerWork(main, ctx, story, scene, card) {
  const latest = latestDraft(scene);
  const isLast = !story.scenes.some((s) => s.n === scene.n + 1);

  const write = taskButton(latest ? 'Write a fresh draft' : 'Write this scene', async () => {
    const result = await writeScene(story, scene.n);
    scene.drafts.push({ by: 'ai', text: result.text, grade: {}, notes: '', changes: [], at: nowIso() });
    touch(story);
    ctx.refresh();
  }, { cls: latest ? '' : 'primary' });

  if (!latest) {
    add(main, el('section', { class: 'card' },
      el('p', {}, 'The AI drafts this scene from your outline. Then you direct it with notes.'),
      el('div', { class: 'button-row' }, write.button),
      write.status,
    ));
    return;
  }

  const revise = taskButton('Revise', async () => {
    const notes = scene.notes || '';
    const result = await reviseScene(story, { text: latest.text, notes });
    scene.drafts.push({ by: 'ai', text: result.text, grade: {}, notes, changes: result.changes, at: nowIso() });
    scene.notes = '';
    touch(story);
    ctx.refresh();
  });

  const critique = taskButton('Critique check', async () => {
    latest.critique = await gradeText({ text: latest.text, focusId: card.focus });
    touch(story);
    ctx.refresh();
  }, { cls: '' });

  const approve = el('button', {
    type: 'button', class: 'primary',
    onclick: () => { scene.status = 'cleared'; touch(story); goNext(story, scene.n, ctx); },
  }, isLast ? 'Approve and finish story' : 'Approve and go to the next scene');

  add(main, 
    el('section', { class: 'card' },
      el('h2', {}, `Draft ${scene.drafts.length} `, tag('AI', 'ai')),
      storyText(latest.text, { highlightDashes: true }),
      el('p', { class: 'word-count' }, `${wordCount(latest.text)} words`),
      dashFlag(() => [latest.text], ([fixed]) => { latest.text = fixed; touch(story); ctx.refresh(); }),
      listBlock('What changed', latest.changes),
    ),
    el('section', { class: 'card' },
      writingBox({
        id: 'scene-notes', rows: 4, label: 'Notes for the next revision (optional)', value: scene.notes || '',
        placeholder: 'Leave blank and the AI critiques its own draft first.',
        onInput: (v) => { scene.notes = v; touch(story); },
      }),
      el('div', { class: 'button-row' }, revise.button, approve),
      revise.status,
      el('div', { class: 'button-row' }, critique.button, write.button),
      critique.status,
      write.status,
    ),
    latest.critique ? gradePanel(latest.critique, {
      title: 'Critique check',
      note: "What a coach would flag in the AI's draft. These grades don't count toward your scores.",
    }) : null,
  );
}
