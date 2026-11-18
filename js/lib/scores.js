// Score math and grade checks.
import { RUBRIC, BAR } from '../config.js';

export const RUBRIC_KEYS = RUBRIC.map((r) => r.key);

// Average of the scored categories (dialogue can be null and is skipped).
export function average(scores) {
  const values = RUBRIC_KEYS.map((k) => scores?.[k]).filter((v) => typeof v === 'number');
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// Rounded to one decimal place, the same way it's shown.
export function roundedAverage(scores) {
  const avg = average(scores);
  return avg === null ? null : Math.round(avg * 10) / 10;
}

export function formatScore(value) {
  return typeof value === 'number' ? value.toFixed(1) : 'n/a';
}

export function clearsBar(scores, bar = BAR) {
  const avg = roundedAverage(scores);
  return avg !== null && avg >= bar;
}

// Makes quote comparison forgiving about curly quotes, spacing and italics
// markers, but still word for word.
function normalizeQuote(text) {
  return (text || '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Claude sometimes wraps a quote in quote marks. Those aren't part of the text.
function stripWrappingQuotes(text) {
  return text.replace(/^["']+/, '').replace(/["']+$/, '').trim();
}

export function quoteFound(quote, text) {
  const q = stripWrappingQuotes(normalizeQuote(quote));
  if (!q) return false;
  return normalizeQuote(text).includes(q);
}

// Cleans up a grade from Claude in place: numbers as numbers, missing parts as empty.
export function normalizeGrade(grade) {
  if (!grade || typeof grade !== 'object') return grade;
  grade.scores = grade.scores && typeof grade.scores === 'object' ? grade.scores : {};
  grade.evidence = grade.evidence && typeof grade.evidence === 'object' ? grade.evidence : {};
  grade.fixes = grade.fixes && typeof grade.fixes === 'object' ? grade.fixes : {};
  for (const key of RUBRIC_KEYS) {
    const v = grade.scores[key];
    if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) grade.scores[key] = Number(v);
    if (v === undefined && key === 'dialogue') grade.scores[key] = null;
  }
  return grade;
}

// Returns a description of what's wrong with the grade's shape, or null.
export function gradeShapeProblem(grade) {
  if (!grade || typeof grade !== 'object') return 'The reply was not a grade object.';
  for (const key of RUBRIC_KEYS) {
    const v = grade.scores?.[key];
    if (key === 'dialogue' && v === null) continue;
    if (!Number.isInteger(v) || v < 1 || v > 5) {
      return `scores.${key} must be a whole number from 1 to 5${key === 'dialogue' ? ', or null if there is no dialogue' : ''}.`;
    }
    if (typeof grade.evidence?.[key] !== 'string' || !grade.evidence[key].trim()) {
      return `evidence.${key} must be an exact quote from the text.`;
    }
    if (typeof grade.fixes?.[key] !== 'string' || !grade.fixes[key].trim()) {
      return `fixes.${key} must be one fix written as an instruction.`;
    }
  }
  if (typeof grade.strongest_line !== 'string' || !grade.strongest_line.trim()) return 'strongest_line must be an exact quote.';
  if (typeof grade.top_fix !== 'string' || !grade.top_fix.trim()) return 'top_fix must be an instruction.';
  return null;
}

// Lists the quotes that don't appear word for word in the text.
export function missingQuotes(grade, text) {
  const missing = [];
  for (const key of RUBRIC_KEYS) {
    if (grade.scores?.[key] === null) continue;
    const quote = grade.evidence?.[key];
    if (quote && !quoteFound(quote, text)) missing.push(key);
  }
  if (grade.strongest_line && !quoteFound(grade.strongest_line, text)) missing.push('strongest_line');
  return missing;
}
