// Every system prompt lives here, one per job, so they're easy to find and tweak.
// Story jobs get added at later checkpoints.

export const PROMPTS = {
  // Not a story job: just proves the key and model work.
  testConnection:
    'You are the connection check for Draft Pick, a story-writing practice app. ' +
    'Reply with one short, friendly sentence confirming the connection works. ' +
    'Do not use dashes or ellipses.',
};
