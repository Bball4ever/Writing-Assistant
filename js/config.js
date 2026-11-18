// Every setting Zane might want to tweak lives here, so changing the app's
// behavior is usually a one-line edit in this file.

// The model picker list. To add a model later, add one line here.
export const MODELS = [
  { id: 'auto', label: 'Auto' },
  { id: 'claude-fable-5-2', label: 'Claude Fable 5.2' },
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5' },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5' },
  { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5' },
];

// What Auto uses. Small jobs are cheap and simple, so they go to Haiku.
export const AUTO_MODELS = {
  small: 'claude-haiku-5-5',
  big: 'claude-sonnet-5-5',
};

// Jobs that count as "small" in Auto mode.
export const SMALL_JOBS = ['promptMaker', 'helper', 'testConnection'];

// Max tokens per job. Thinking counts toward this limit, so these leave room.
// You only pay for tokens actually used, not for the limit.
export const MAX_TOKENS = {
  sceneWriter: 16000,
  reviser: 16000,
  grader: 8000,
  polisher: 8000,
  default: 4000,
};

// The average score a scene or drill needs to clear the bar.
export const BAR = 3.5;

// Polish rule: the Polish button unlocks once the latest draft clears the bar
// and has been rewritten at least this many times (or Zane hits Skip).
export const POLISH_MIN_REWRITES = 1;

// Skill focuses, in the order stories rotate through them.
export const FOCUSES = [
  { id: 'open-mid-action', label: 'Open mid-action', asks: 'Start in the middle of something happening, with no waking up or setup' },
  { id: 'plant-an-object', label: 'Plant an object', asks: 'Mention one object early that matters later' },
  { id: 'physical-tell', label: 'Physical tell', asks: 'Show one emotion only through what a body does' },
  { id: 'punchy-big-moment', label: 'Punchy big moment', asks: 'At the peak, use short sentences and at least one one-line paragraph' },
  { id: 'thoughts-in-italics', label: 'Thoughts in italics', asks: 'Give the POV character two or more direct thoughts in italics, with no quote marks' },
  { id: 'clipped-dialogue', label: 'Clipped dialogue', asks: 'Nobody says more than a sentence or two at a time' },
  { id: 'sound-and-crowd', label: 'Sound and crowd', asks: 'Use at least two sounds and one detail about the people around' },
  { id: 'echo-line', label: 'Echo line', asks: 'Write a line early that means something different by the end' },
];

// Quick drills target the weakest rubric category with this focus.
export const RUBRIC_TO_FOCUS = {
  showVsTell: 'physical-tell',
  pacing: 'punchy-big-moment',
  dialogue: 'clipped-dialogue',
  sensory: 'sound-and-crowd',
};
