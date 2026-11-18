// Progress: the score chart (plain SVG) and stats.
import { RUBRIC, RUBRIC_TO_FOCUS } from '../config.js';
import { getData } from '../storage.js';
import {
  gradedEntries, chartSeries, weakestCategory, mostImproved, rewriteGains,
  polishEdits, skippedScenes, totals,
} from '../lib/stats.js';
import { focusInfo } from '../lib/storyModel.js';
import { el, add } from './shared.js';

const SVG = 'http://www.w3.org/2000/svg';
function svg(tag, attrs = {}, ...children) {
  const node = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  node.append(...children);
  return node;
}

const label = (key) => RUBRIC.find((r) => r.key === key)?.label ?? key;

function scoreChart(entries) {
  const series = chartSeries(entries);
  const width = 640;
  const height = 260;
  const pad = { left: 40, right: 16, top: 16, bottom: 40 };
  const count = entries.length;
  const x = (i) => pad.left + (count <= 1 ? (width - pad.left - pad.right) / 2 : (i / (count - 1)) * (width - pad.left - pad.right));
  const y = (v) => pad.top + ((5 - v) / 4) * (height - pad.top - pad.bottom);

  const chart = svg('svg', { viewBox: `0 0 ${width} ${height}`, class: 'chart', role: 'img', 'aria-label': 'Average score per category over time' });
  for (let v = 1; v <= 5; v++) {
    chart.append(
      svg('line', { x1: pad.left, x2: width - pad.right, y1: y(v), y2: y(v), class: 'grid' }),
      svg('text', { x: pad.left - 10, y: y(v) + 4, 'text-anchor': 'end', class: 'axis' }, String(v)),
    );
  }
  chart.append(svg('text', { x: width / 2, y: height - 6, 'text-anchor': 'middle', class: 'axis' }, `Graded drafts, oldest to newest (${count})`));

  RUBRIC.forEach((r, i) => {
    const points = series[r.key];
    if (!points.length) return;
    const group = svg('g', { class: `series c${i}` });
    group.append(svg('title', {}, r.label));
    if (points.length > 1) {
      group.append(svg('polyline', { points: points.map((p) => `${x(p.x)},${y(p.y)}`).join(' '), fill: 'none' }));
    }
    for (const p of points) {
      group.append(svg('circle', { cx: x(p.x), cy: y(p.y), r: 4 }, svg('title', {}, `${r.label}: ${p.y}`)));
    }
    chart.append(group);
  });

  const legend = el('ul', { class: 'legend' },
    RUBRIC.map((r, i) => el('li', {}, el('span', { class: `swatch c${i}` }), r.label)));
  return el('div', { class: 'chart-wrap' }, chart, legend);
}

function stat(labelText, value) {
  return el('div', { class: 'stat' }, el('span', { class: 'stat-value' }, value), el('span', { class: 'stat-label' }, labelText));
}

export function renderProgress(container, { go }) {
  const data = getData();
  const entries = gradedEntries(data);
  const weakest = weakestCategory(entries);
  const improved = mostImproved(entries);
  const gains = rewriteGains(data);
  const edits = polishEdits(data);
  const skipped = skippedScenes(data);
  const total = totals(data);

  add(container, 
    el('h1', {}, 'Progress'),
    el('p', { class: 'muted' }, 'Counts drills, Coach drafts and your own Polish drafts. Polished text, Writer drafts and critique checks are left out.'),
    el('section', { class: 'stats' },
      stat('Stories finished', String(total.storiesFinished)),
      stat('Scenes written', String(total.scenesWritten)),
      stat('Drills done', String(total.drillsDone)),
      stat('Words written', String(total.wordsWritten)),
    ),
    el('section', { class: 'card' },
      el('h2', {}, 'Scores over time'),
      entries.length ? scoreChart(entries) : el('p', { class: 'muted' }, 'Grade a drill or a scene to start the chart.'),
    ),
    el('section', { class: 'card' },
      el('h2', {}, 'Weakest and most improved'),
      el('p', {}, el('strong', {}, 'Weakest: '), weakest
        ? `${label(weakest)}. Quick drills will practice ${focusInfo(RUBRIC_TO_FOCUS[weakest]).label}.`
        : 'Not enough grades yet.'),
      el('p', {}, el('strong', {}, 'Most improved: '), improved
        ? `${label(improved.key)} (up ${improved.gain.toFixed(1)})`
        : 'Not enough grades yet.'),
    ),
    el('section', { class: 'card' },
      el('h2', {}, 'Rewrite gains'),
      el('p', {}, gains.count
        ? `From first draft to final draft, your score goes ${gains.average >= 0 ? 'up' : 'down'} ${Math.abs(gains.average).toFixed(1)} on average (${gains.count} pieces rewritten).`
        : 'Grade something twice to see how much rewriting helps.'),
    ),
    el('section', { class: 'card' },
      el('h2', {}, 'Polish edits per scene'),
      edits.rows.length
        ? el('div', {},
          el('p', {}, `${edits.average.toFixed(1)} changes per scene on average. Fewer over time means your drafts are closer to finished on their own.`),
          el('ol', { class: 'edit-list' }, edits.rows.map((r) => el('li', {}, `${r.title}, scene ${r.n}: ${r.count} change${r.count === 1 ? '' : 's'}`))),
        )
        : el('p', { class: 'muted' }, 'No polished scenes yet.'),
    ),
    el('section', { class: 'card' },
      el('h2', {}, `Skipped scenes (${skipped.length})`),
      skipped.length
        ? el('ul', {}, skipped.map((s) => el('li', {},
          el('button', { type: 'button', class: 'link-button', onclick: () => go(`story/${s.storyId}/scene/${s.n}`) }, `${s.title}, scene ${s.n}`),
          ` (focus: ${focusInfo(s.focus).label})`,
        )))
        : el('p', { class: 'muted' }, 'None.'),
    ),
  );
}
