# CLAUDE.md: Draft Pick

Draft Pick is a story-writing practice app for Zane. It takes a story from idea to outline to finished scenes in one of three modes (Coach, Polish, Writer), using the Claude API to grade, polish and write. It's a plain HTML, CSS and JavaScript site hosted on GitHub Pages.

This file is the full spec. Build only what's in it.

## How to work with Zane

Zane is building this to grow his coding and AI skills, so how you work matters as much as what you build.

- **Plan first, every checkpoint.** Before starting a checkpoint from the Build order, post a short plan: which files you'll create or change and what each one does. Wait for his OK before writing code.
- **Explain as you go.** Keep it short and plain. When a checkpoint is done, describe what each new or changed file does in a sentence or two.
- **Say what changed.** After each checkpoint, list what changed and give him that checkpoint's test to run. Wait for him to confirm it works before moving on.
- **Commit after each checkpoint passes,** with a message that names it, like `Checkpoint 2: quick drill loop`. Commits are how earlier versions are kept, so never rewrite or squash history.
- **Ask before pushing, deploying or turning on GitHub Pages.**
- **Never commit secrets.** The API key lives only in the browser. Never write a real key into any file, test or commit.
- **Stay in scope.** If you have an idea that isn't in this file, add it to Later ideas and ask instead of building it.
- **Flag anything out of date.** If an API detail or model name here looks wrong, check docs.claude.com and tell Zane what changed instead of guessing.

## Tech rules

- Use plain HTML, CSS and JavaScript (ES modules). No frameworks, no npm dependencies and no build step. GitHub Pages serves the repo's main branch as is.
- `package.json` exists only so `node --test` can run. It sets `"type": "module"` and has no dependencies.
- Keep pure logic (no DOM, no network) in `js/lib/` so Node can test it. Every checkpoint adds tests for its new logic in `tests/`.
- Never put AI text on the page with `innerHTML`. Use `textContent`, or build elements with `createElement` (see Text formatting for italics).
- Build the layout mobile-friendly from the start.
- Write comments that explain why, in plain words.

## Files

| File | What it holds |
| --- | --- |
| `index.html` | The page shell and screen containers |
| `css/style.css` | All styling |
| `js/app.js` | Starts the app and switches between screens |
| `js/config.js` | The model list, Auto's model choices, max tokens per job, the 3.5 bar, the Polish rewrite rule, the skill focus list |
| `js/api.js` | Every call to Claude, plus retries, JSON parsing and error messages |
| `js/prompts.js` | Every system prompt, one per job, all in one place so Zane can tweak them |
| `js/storage.js` | Saving, loading, auto-save, backup export and import |
| `js/export.js` | Turns a finished story into HTML and text files |
| `js/screens/*.js` | One file per screen, plus `shared.js` (building blocks every screen uses) and `help.js` (the Help button) |
| `js/lib/*.js` | Pure logic: the dash checker, applying polish changes, JSON extraction, score averages, focus rotation |
| `tests/*.test.js` | Node tests for everything in `js/lib/` |
| `package.json` | `"type": "module"` and a `test` script, nothing else |
| `CLAUDE.md` | This file |

## Claude API

- **Endpoint:** `POST https://api.anthropic.com/v1/messages`
- **Headers:** `x-api-key`, `anthropic-version: 2023-06-01`, `content-type: application/json` and `anthropic-dangerous-direct-browser-access: true` (the header that allows calls from a browser).
- **Body:** `model`, `max_tokens`, `system` (the job's prompt from `prompts.js`) and `messages` with one user message holding that job's input. Read the reply from the first content block whose `type` is `"text"`. Don't use `content[0].text`: the current models think before answering, so the first block is often a `thinking` block with empty text.
- **Max tokens:** These are set per job in `config.js`. Thinking counts toward `max_tokens`, so leave room. Start with 16000 for Scene writer and Reviser, 8000 for Grader and Polisher, and 4000 for everything else. You only pay for tokens actually used.
- **JSON replies:** Strip code fences, then parse from the first `{` to the last `}`. If that fails, retry once with a reminder to return only JSON. If it fails again, show an error with a Retry button.
- **Save first:** Save Zane's text before every call, so an error never loses his writing.
- **Reuse what works:** If Zane shares the API code from his Pick Your Fate project, match that approach where it fits.

**Errors** (every one gets a Retry button)

| Problem | Message |
| --- | --- |
| 401 | Your API key didn't work. Check it in Settings. |
| 429 | Too many requests. Wait a minute, then retry. |
| 529 or other 5xx | Claude is busy right now. Retry in a moment. |
| Model not found (404 or a not-found error) | Your account can't use that model, so I switched you back to Auto. (Then switch the setting to Auto.) |
| Network failure | No internet connection. |
| No API key saved | Add your API key in Settings first. |
| `stop_reason` is `refusal` | Claude declined this one. Try rewording it. |
| `stop_reason` is `max_tokens` | The reply got cut off. Retry, or raise this job's max tokens in `config.js`. |

### Model picker

Zane picks the model in the app, either in Settings or by tapping the model badge in the top bar of any screen.

| Choice | Model ID |
| --- | --- |
| Auto (default) | Small jobs use `claude-haiku-5-5`, and everything else uses `claude-sonnet-5-5` |
| Claude Fable 5.2 | `claude-fable-5-2` |
| Claude Opus 5.5 | `claude-opus-5-5` |
| Claude Sonnet 5.5 | `claude-sonnet-5-5` |
| Claude Haiku 5.5 | `claude-haiku-5-5` |

- **Small jobs in Auto:** Prompt maker, Helper, Dash fixer and Test connection.
- **The list lives in `config.js`,** so adding a model later is a one-line change.

## Storage

- **Keys:** Story data is saved under `draftpick:data` and the API key under `draftpick:key`, both in localStorage.
- **Auto-save:** Saves about 3 seconds after typing stops, and again before every API call.
- **Backup:** Export backup saves everything except the API key as one `.json` file. Import backup restores it.
- **Delete:** Deleting a story or drill asks for confirmation inside the app.

**Data shape**

```json
{
  "settings": { "model": "auto", "tone": "blunt" },
  "stories": [{
    "id": "s_001",
    "title": "Working title",
    "mode": "coach",
    "genre": "fantasy",
    "pov": "third-person limited",
    "length": "short",
    "step": "scenes",
    "idea": { "prompt": "", "pitch": "", "pitchBy": "you", "feedback": [] },
    "outline": {
      "beats": { "beginning": "", "middle": "", "end": "" },
      "scenes": [{ "n": 1, "summary": "", "focus": "open-mid-action", "by": "you" }]
    },
    "scenes": [{
      "n": 1,
      "status": "writing",
      "drafts": [{ "by": "you", "text": "", "grade": {}, "notes": "", "at": "" }],
      "polish": {
        "changes": [{ "before": "", "after": "", "why": "", "accepted": false }],
        "finalText": ""
      }
    }],
    "createdAt": "",
    "updatedAt": ""
  }],
  "drills": [{
    "id": "d_001",
    "prompt": "",
    "focus": "",
    "attempts": [{ "text": "", "grade": {}, "at": "" }]
  }]
}
```

- `mode` is `coach`, `polish` or `writer`.
- `status` is `writing`, `cleared` or `skipped`.
- `by` is `you` or `ai`. Anything the Help button fills in is saved with `"by": "ai"` and shows a small "AI" tag.
- `settings.model` is `auto` or a model ID from `config.js`, and `settings.tone` is `blunt` or `gentle`.
- **Extra fields the app also saves:** `story.style` (`{ "preset", "tense" }`, Writer only), `story.finishedAt`, `idea.seed` and `idea.pitches` (Writer), `outline.beatsBy` (which beats the AI filled) and `outline.feedback`, `scene.working` (the text Zane is typing), `scene.notes` (Writer notes for the next revision), `polish.source` (the draft the changes apply to), `draft.changes` and `draft.critique` (Writer), and `drill.draft`.

## Text formatting

- **Italics:** Wrap italic text in single asterisks, like `*this*`. On screen, the asterisks become `<em>` elements built with `createElement`. The HTML export uses `<em>`, and the `.txt` export strips the asterisks.
- **No dashes or ellipses in AI story text.** That means em dashes (—), en dashes (–), double hyphens (--), a spaced hyphen ( - ), the ellipsis character (…) and three dots (...). Hyphens inside words like "well-known" are fine.
  - `js/lib/dashCheck.js` finds them.
  - If AI text has any, ask once for a fixed version (the retry includes the first reply). If they're still there, show the text with those spots highlighted and a Fix again button, which runs the Dash fixer.
  - This applies to text from Scene writer, Reviser, the Polisher's `after` text, Helper fills, Pitch writer and Outline writer. The app never changes Zane's own writing on its own.

## The three modes

All three modes follow the same path of setup, idea, outline, scenes and finish. The only difference is who does the writing.

- **Coach:** Zane writes every word. The AI grades, quotes his sentences as proof and tells him what to fix. It never writes story sentences for him.
- **Polish:** This works like Coach until a scene clears the bar or Zane skips it. Then the AI line-edits the scene, and Zane accepts or rejects each change.
- **Writer:** The AI writes, and Zane directs. Notes are optional.

There's also the **Quick drill**, a fast Coach warm-up outside any story: a prompt and a skill focus, one paragraph, a grade, and a rewrite if he wants.

### The bar and Skip

- **The bar** is an average score of 3.5 or higher, set in `config.js`.
- **Coach:** A scene that clears the bar gets `status: "cleared"`. A Skip button is always available, even before the first grade, and moves on without clearing the bar. Skipped scenes get `status: "skipped"`, show a "skipped" tag and stay editable.
- **Polish:** The Polish button unlocks when the latest draft averages 3.5 or higher and has been rewritten at least once, or as soon as Zane hits Skip. He can also skip and move on without polishing.
- **Quick drills:** These show the bar too, and he can always move on.
- **Finishing:** A story can be finished even if it has skipped scenes. The read-through marks which scenes were skipped.

### Coach mode flow

1. **Setup:** Mode, genre, POV, length and an optional working title.
2. **Idea:** The Prompt maker gives a prompt, or Zane brings his own. He writes a one-paragraph pitch, and the Pitch critic flags weak spots. He revises until he's happy, then locks it.
3. **Outline:** Zane writes the beginning, middle and end beats, then lists the scenes. The Outline critic pokes holes. Each scene gets an auto-picked skill focus that he can change.
4. **Scenes:** Zane writes a scene and hits Grade. The Grader scores it, and he rewrites and grades again. The before and after scores show side by side. He moves on when the scene clears the bar or when he skips.
5. **Finish:** Read-through, word count, score summary and export.

### Polish mode flow

1. **Setup, idea and outline:** Same as Coach, except the Help button can also fill in gaps in the pitch and outline.
2. **Scenes:** Same Coach loop until the Polish button unlocks (see The bar and Skip).
3. **Polish:** The Polisher returns a list of changes. Each change quotes Zane's exact words in `before`.
4. **Compare:** Zane's draft and the polished version sit side by side, with every change highlighted and its one-line reason shown.
5. **Accept or reject:** Zane goes through the changes one at a time or accepts them all. `js/lib/applyPolish.js` applies only the accepted changes, in order, using find and replace. If a `before` quote isn't found in the draft, the app drops that change. Rejecting everything leaves the draft untouched. The result is saved in `polish.finalText`.
6. **Finish:** Export Zane's version, the polished version or both.

### Writer mode flow

1. **Setup:** Mode, genre, POV, length, style preset and an optional working title.
2. **Idea:** Zane types a seed. The Pitch writer returns three pitches, and he picks one or says which parts to combine.
3. **Outline:** The Outline writer drafts the beats and scenes. Zane approves it, edits it by hand or sends notes for a new version.
4. **Scenes:** The Scene writer drafts the scene. Zane can write notes or leave them blank, then hits Revise. The Reviser uses his notes, or its own critique if there are none, and lists what it changed. He approves the scene or goes again.
5. **Critique check (optional):** Runs the Grader on the AI's draft so Zane can see what a coach would flag. These grades don't count toward his scores.
6. **Finish:** Read-through and export.

### Help button

The Help button sits on the Idea, Outline and Scene workspace screens.

| Action | What it does | Coach | Polish | Writer |
| --- | --- | --- | --- | --- |
| Give me options | Three one-line directions: an idea angle, a twist, what the middle could be, what happens next | Yes | Yes | Yes |
| Ask me questions | One to three questions that get Zane unstuck | Yes | Yes | Yes |
| Fill in the gaps | Finishes what Zane started: completes a pitch, or fills empty outline beats and scene cards | Hidden | Idea and outline only | Idea and outline |

In Coach and Polish modes, options are short directions, never finished story sentences.

## Screens

| Screen | What's on it |
| --- | --- |
| Home | Quick drill and New story buttons, the story library (title, mode, current step, last edited), and links to Progress and Settings |
| New story setup | Mode (Coach, Polish or Writer); genre (fantasy, sci-fi/dystopian, western, mystery/horror, historical, realistic, or a custom one); POV (third-person limited, first person or omniscient), picked every time; length (single scene; short story, 3 to 5 scenes; long story, 6 to 12 scenes); style preset for Writer mode; optional working title |
| Quick drill | Prompt and focus card, a writing box with word count, Grade button, feedback panel, Rewrite, and the bar |
| Idea | Coach and Polish: prompt, pitch box, critique and Help button. Writer: seed box, three pitch cards and Help button |
| Outline | Beginning, middle and end beats, scene cards (summary, focus and an AI tag when filled in), critique or approve controls, and the Help button |
| Scene workspace | The outline on the side, the writing area in the middle, scores and feedback beside it, a list of past drafts, the Skip and Help buttons, and in Polish mode the Polish button and compare view |
| Finish | Read-through with skipped scenes marked, word count, score summary and export buttons (with the version choice in Polish mode) |
| Progress | Score chart and stats |
| Settings | API key, model picker, feedback tone, backup export and import |

Every screen's top bar shows the active model, and tapping it opens the picker.

## Grading rubric

There are five categories, each scored from 1 to 5. The app computes the overall score as the average of the scored categories, shown to one decimal place.

| Key | Category | A 1 looks like | A 3 looks like | A 5 looks like |
| --- | --- | --- | --- | --- |
| `showVsTell` | Show vs. tell | Emotions named outright ("he was nervous") | Some feelings shown, some named | Feelings come through actions, body language and choices |
| `pacing` | Pacing | Drags, or rushes past the big moment | Mostly even, with a slow or rushed spot | Speeds up and slows down on purpose, and big moments get room |
| `dialogue` | Dialogue | Stiff and speechy, everyone sounds the same | Natural, but with filler lines | Clipped, with distinct voices that reveal character |
| `sensory` | Sensory detail | Sight only, or nothing at all | A few senses, but generic | Specific sounds, smells and textures ground the scene |
| `focus` | Skill focus | Ignored | Tried, but weak | Nails it |

- `dialogue` is `null` when the piece has no dialogue, and it's left out of the average.
- Every score needs an exact quote from Zane's text as evidence. The app checks that each quote appears word for word, and retries once if one doesn't.
- Every category gets one fix, written as an instruction, plus a `strongest_line` (quoted) and a `top_fix`.
- The tone is blunt with a little humor by default, or gentle if Zane switches it in Settings.

## Skill focuses

| ID | Focus | What it asks |
| --- | --- | --- |
| `open-mid-action` | Open mid-action | Start in the middle of something happening, with no waking up or setup |
| `plant-an-object` | Plant an object | Mention one object early that matters later |
| `physical-tell` | Physical tell | Show one emotion only through what a body does |
| `punchy-big-moment` | Punchy big moment | At the peak, use short sentences and at least one one-line paragraph |
| `thoughts-in-italics` | Thoughts in italics | Give the POV character two or more direct thoughts in italics, with no quote marks |
| `clipped-dialogue` | Clipped dialogue | Nobody says more than a sentence or two at a time |
| `sound-and-crowd` | Sound and crowd | Use at least two sounds and one detail about the people around |
| `echo-line` | Echo line | Write a line early that means something different by the end |

- **In stories,** focuses go down the list in order, one per scene, wrapping around at the end.
- **In quick drills,** the focus matches Zane's weakest recent rubric category: `showVsTell` maps to `physical-tell`, `pacing` to `punchy-big-moment`, `dialogue` to `clipped-dialogue` and `sensory` to `sound-and-crowd`. With no grades yet, pick at random.
- **In drills,** `plant-an-object` and `echo-line` are graded on the setup only.
- Zane can always override the pick.

## Writer mode style presets

**Third-person limited (built in)**

- Stay in one character's head for the whole scene, with no head-hopping.
- Present tense by default, with a toggle for past tense.
- Open mid-action.
- Plant key objects early so they pay off later.
- Show instead of tell through what the POV character can see, especially small physical tells.
- Use short punchy sentences and one-line paragraphs at big moments.
- Add sound and crowd detail.
- Put thoughts in italics with no quote marks.
- Keep dialogue clipped and in double quotes, with a new paragraph for each speaker.
- Include lines that echo later for dramatic irony.

**First person and omniscient:** There are no presets yet. Write them plainly, still following the always-on rules (see Text formatting).

## AI jobs

Every system prompt in `prompts.js` follows these rules:

- Return only JSON in the job's shape.
- Use the tone setting (blunt or gentle).
- Coach and Polish critic jobs, and the Grader, never write story sentences for Zane. They quote his words exactly and give fixes as instructions.
- Writer jobs, the Polisher and Helper fills follow the chosen style preset and the always-on rules.
- Each call sends only what the job needs. For scenes, that means the pitch, the outline's scene summaries, the full text of the previous scene and the current scene. Never send the whole story.

| Job | Model in Auto | Input | Returns |
| --- | --- | --- | --- |
| Prompt maker | Small | Genre and focus (both optional) | `{"prompt": "", "focus": "focus-id"}` |
| Pitch critic | Big | Pitch, genre, POV, length | `{"strengths": [], "problems": [], "questions": []}`, flagging a missing goal, conflict or stakes, or a predictable ending |
| Pitch writer | Big | Seed, genre, POV, length | `{"pitches": [{"title": "", "summary": "", "hook": ""}]}`, exactly three that are actually different |
| Outline critic | Big | Pitch, beats, scenes | `{"holes": [], "questions": []}`, flagging scenes where nothing changes, a sagging middle or an unearned ending |
| Outline writer | Big | Pitch, length, notes | `{"beats": {"beginning": "", "middle": "", "end": ""}, "scenes": [{"summary": "", "focus": ""}]}`, with the scene count matching the length and focuses following the rotation |
| Grader | Big | Text, focus, previous draft if any, tone | `{"scores": {}, "evidence": {}, "fixes": {}, "strongest_line": "", "top_fix": ""}`, with `scores`, `evidence` and `fixes` keyed by the rubric keys |
| Polisher | Big | Draft, latest grade, style preset | `{"changes": [{"before": "", "after": "", "why": ""}]}`. `before` is an exact quote. It keeps the plot, events, voice and best lines, can't add events or cut moments, and fixes what the grade flagged |
| Scene writer | Big | Pitch, scene summaries, previous scene, this scene's summary and focus, POV, style preset | `{"text": ""}` |
| Reviser | Big | Draft, notes (may be empty), style preset | `{"text": "", "changes": []}`. With empty notes, it critiques its own draft first |
| Dash fixer | Small | A list of AI texts that still have dashes or ellipses | `{"texts": []}`, the same texts with only those spots fixed. Used by the Fix again button. |
| Helper | Small | Action, mode, step, current content | Options: `{"options": ["", "", ""]}`. Questions: `{"questions": []}` (one to three). Fill for the idea step: `{"fill": {"pitch": ""}}`. Fill for the outline step: `{"fill": {"beats": {}, "scenes": []}}`, filling only the empty parts |

## Progress screen

- **Score chart:** The average for each rubric category over time, one line per category, drawn in plain SVG.
- **Weakest and most improved:** The category with the lowest recent average, and the one that climbed the most. The weakest one picks the quick drill focus.
- **Rewrite gains:** How much the score goes up on average from first draft to final draft.
- **Polish edits per scene:** How many changes the Polisher makes per scene. Fewer over time means Zane's drafts are getting closer to finished on their own.
- **Skipped scenes:** The count, each one's skill focus, and a link back to each scene.
- **Totals:** Stories finished, scenes written, drills done and words written.
- **What counts:** Scores come from Coach drafts, drills and Zane's own Polish drafts before polishing. Polished text, Writer drafts and critique checks don't count.

## Export

- **`.html`:** Keeps italics, prints cleanly and pastes into Google Docs with its formatting.
- **`.txt`:** Plain text with the italic asterisks stripped.
- **Polish mode:** Zane picks his version, the polished version or both.

## Build order

There are eleven checkpoints. Plan each one, build it, have Zane run its test, and commit once it passes. Add Node tests for any new `js/lib/` logic at every checkpoint.

1. **Skeleton and Settings:** Screens switch, the API key saves, the model picker and top-bar badge work, and Test connection gets a reply from the chosen model. *Test:* Reload the page and check that the key and model are still there, then switch models and test again.
2. **Quick drill:** Prompt, write, grade, rewrite and grade again, with the bar shown. *Test:* Write a bad paragraph on purpose. The scores should be low, every score should quote the text, and no rewritten sentences should appear.
3. **Library and saving:** Auto-save, the Home list, and backup export and import. *Test:* Start two drills, close the tab and reopen it, and both should be there. Then clear storage and import a backup.
4. **Story setup, the idea step and the Help button:** All three modes, with Polish using Coach's idea step. *Test:* Coach critiques a pitch with no conflict, Writer returns three pitches that are actually different, Give me options returns three one-line options, and Fill in the gaps is hidden in Coach mode.
5. **Outline step:** All three modes, with Polish using Coach's outline step. *Test:* Coach flags a scene where nothing changes, and Writer's outline matches the chosen length.
6. **Coach scenes:** Write, grade, rewrite, before and after, the bar and Skip. *Test:* A scene that ignores its focus scores a 1 or 2 in that category. Skip works before the first grade, and a skipped scene shows its tag and can still be edited.
7. **Polish scenes:** The unlock rule, the polish, the compare view, and accepting or rejecting each change. *Test:* Polish unlocks when the bar is cleared or skipped, every change quotes Zane's exact words, and rejecting every change leaves his draft untouched.
8. **Writer scenes:** The style preset, optional notes, revise and the critique check. *Test:* Revise works with notes and without them, and the output has no dashes or ellipses.
9. **Finish and export:** *Test:* The exported HTML keeps italics, the text file opens clean, and Polish mode exports whichever version Zane picks.
10. **Progress screen:** *Test:* After three graded drills, the chart shows three points for each category.
11. **Final cleanup:** Phone screen sizes, word counts everywhere and friendly error messages. *Test:* Zane runs a full short story in each mode on his phone.

## Cost and safety

- **Spending limit:** Remind Zane to set a monthly limit in the Anthropic Console before the first real API call.
- **Auto mode:** Keeps small jobs on Haiku.
- **Small calls:** Each call sends only what its job needs.
- **Key safety:** The key lives only in the browser. It's never committed and it's left out of backups.
- **No raw HTML:** AI text is never inserted as HTML.

## Later ideas (not in version 1)

- Style presets for first person and omniscient.
- A read-aloud button using the browser's built-in speech.
- Export to Word (`.docx`).
- Character sheets the Grader checks for consistency across scenes.
- Picking a different model for each job.
- Sync across devices.
