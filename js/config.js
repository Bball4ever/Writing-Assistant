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
export const SMALL_JOBS = ['promptMaker', 'helper', 'testConnection', 'dashFixer'];

// Max tokens per job. Thinking counts toward this limit, so these leave room.
// You only pay for tokens actually used, not for the limit.
export const MAX_TOKENS = {
  sceneWriter: 16000,
  reviser: 16000,
  dashFixer: 16000, // it may have to send a whole scene back
  grader: 8000,
  polisher: 8000,
  default: 4000,
};

// The average score a scene or drill needs to clear the bar.
export const BAR = 3.5;

// Polish rule: the Polish button unlocks once the latest draft clears the bar
// and has been rewritten at least this many times (or Zane hits Skip).
export const POLISH_MIN_REWRITES = 1;

// How many recent grades count as "recent" for the weakest category.
export const RECENT_COUNT = 5;

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

// In a one-paragraph drill there's no room for the payoff, so these are graded on the setup only.
export const SETUP_ONLY_IN_DRILLS = ['plant-an-object', 'echo-line'];

// Quick drills target the weakest rubric category with this focus.
export const RUBRIC_TO_FOCUS = {
  showVsTell: 'physical-tell',
  pacing: 'punchy-big-moment',
  dialogue: 'clipped-dialogue',
  sensory: 'sound-and-crowd',
};

// The grading rubric. The prompts and the score screens both read from this.
export const RUBRIC = [
  { key: 'showVsTell', label: 'Show vs. tell', one: 'Emotions named outright ("he was nervous")', three: 'Some feelings shown, some named', five: 'Feelings come through actions, body language and choices' },
  { key: 'pacing', label: 'Pacing', one: 'Drags, or rushes past the big moment', three: 'Mostly even, with a slow or rushed spot', five: 'Speeds up and slows down on purpose, and big moments get room' },
  { key: 'dialogue', label: 'Dialogue', one: 'Stiff and speechy, everyone sounds the same', three: 'Natural, but with filler lines', five: 'Clipped, with distinct voices that reveal character' },
  { key: 'sensory', label: 'Sensory detail', one: 'Sight only, or nothing at all', three: 'A few senses, but generic', five: 'Specific sounds, smells and textures ground the scene' },
  { key: 'focus', label: 'Skill focus', one: 'Ignored', three: 'Tried, but weak', five: 'Nails it' },
];

export const MODES = {
  coach: { label: 'Coach', blurb: 'You write every word. The AI grades it and tells you what to fix.' },
  polish: { label: 'Polish', blurb: 'Like Coach, then the AI line-edits each finished scene and you accept or reject every change.' },
  writer: { label: 'Writer', blurb: 'The AI writes and you direct.' },
};

export const GENRES = [
  { id: 'fantasy', label: 'Fantasy' },
  { id: 'sci-fi/dystopian', label: 'Sci-fi / dystopian' },
  { id: 'western', label: 'Western' },
  { id: 'mystery/horror', label: 'Mystery / horror' },
  { id: 'historical', label: 'Historical' },
  { id: 'realistic', label: 'Realistic' },
];

export const POVS = [
  { id: 'third-person limited', label: 'Third-person limited' },
  { id: 'first person', label: 'First person' },
  { id: 'omniscient', label: 'Omniscient' },
];

export const LENGTHS = {
  single: { label: 'Single scene', hint: '1 scene', min: 1, max: 1 },
  short: { label: 'Short story', hint: '3 to 5 scenes', min: 3, max: 5 },
  long: { label: 'Long story', hint: '6 to 12 scenes', min: 6, max: 12 },
};

export const STEPS = {
  idea: 'Idea',
  outline: 'Outline',
  scenes: 'Scenes',
  finish: 'Finished',
};

// The built-in Writer mode style preset (third-person limited).
export const TPL_PRESET_RULES = [
  "Stay in one character's head for the whole scene, with no head-hopping.",
  'Open mid-action.',
  'Plant key objects early so they pay off later.',
  'Show instead of tell through what the POV character can see, especially small physical tells.',
  'Use short punchy sentences and one-line paragraphs at big moments.',
  'Add sound and crowd detail.',
  'Put thoughts in italics with no quote marks.',
  'Keep dialogue clipped and in double quotes, with a new paragraph for each speaker.',
  'Include lines that echo later for dramatic irony.',
];
