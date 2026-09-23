# Resume personalizer

The stage on `/resume`: a search field over a heap of type. A visitor types a
role or pastes a job post. Matching skills and figures lift out of the heap,
the one-page resume below re-sets itself for that role, and **Download this
version** saves it as a PDF. With the field empty, the same typesetter shows
the general resume (`defaultBullets` in `resume.ts`, the published PDF's
bullets), so the page never switches renderers. There is no static resume
PDF: the chat bot's "Download the resume" link goes to `/resume?download`,
which saves the default version once it is typeset.

The template engine is ported from Resumator
(`../Resumator/resumator/docs/resume-templates.md`), LaTeX template only.

## How it works

```
keystroke ─► match.ts: parse query, rank bullets, pick chips     (plain JS, <1 ms)
               │
   180 ms ────►├─ fit.ts + layout.ts: fill one page in rank order (2–15 ms)
               │     └─ ResumePaper.tsx draws the layout plan as SVG
               │
   1.1 s idle ─┴─ bot POST /tailor (ids + query) ─► model rewords the chosen bullets
                     └─ verify.ts rejects any rewrite that changes a fact
                           └─ page re-fits with the survivors
Download ─► layout.ts draws the same plan with pdf-lib
```

Enter skips both waits. Typing again aborts a rewrite in progress.

| File | Role |
| --- | --- |
| `src/data/resume.ts` | The library: entries, bullets (fragments), skill rows, domain words. The only source of facts. |
| `src/lib/resume/match.ts` | Query → requirements → ranking (greedy weighted set cover) → chips. |
| `src/lib/resume/fit.ts` | Adds bullets in rank order while the real layout still fits one page. |
| `src/lib/resume/layout.ts` | Template spec, layout plan, PDF export. Lazy-loaded with pdf-lib and fontkit (~520 KB gzipped) when a visitor hovers or focuses the stage. |
| `src/lib/resume/verify.ts` | Rewrite checks, from Resumator's `verify.js`. |
| `src/lib/resume/tailor.ts` | Client for `/tailor`. |
| `src/components/resume/*` | Stage, heap, paper. |
| `bot/server.mjs` `handleTailor` | The endpoint. `bot/modes/tailor.md` is its prompt. |
| `public/fonts/lm/` | Latin Modern Roman, GUST Font License. |

## Rules that keep it honest

- **Facts live only in `resume.ts`.** Every bullet there comes from
  `resume/resume.tex`, the published PDF, or `src/data/*.ts`. The model can
  only reword a bullet, and the bot looks up the text by id, so the browser
  cannot send it arbitrary prose to rewrite.
- **Every rewrite is checked before it is shown.** `verify.ts` rejects a
  rewrite that drops or adds a number, drops a tool the bullet names, adds a
  technical term the bullet lacks, claims more ownership ("built" → "led"), or
  runs long. The original bullet stays, and "What was kept, and why" says what
  failed.
- **Citations are `fixed`** and never sent to the model.

## Rules that keep the PDF right

These carry over from Resumator. Each one fixes a failure that was seen there.

- **One plan, two renderers.** The SVG preview and the PDF draw the same
  commands, so there is no HTML layout to drift from the PDF.
- **Fonts embed whole** (`subset: false`), because fontkit's subsetter scrambles
  CFF glyphs in print while text extraction still passes.
- **Ligatures and kerning are off** in both renderers. That keeps "fi" as two
  letters for parsers, and it makes widths additive, which is why `layout.ts`
  can cache widths per word and fit the page in milliseconds.
- **Two strings on one line end the left one with a space** ("Engineer " then
  the dates), or extractors glue them together.
- **The bullet marker sits on the text's baseline**, lifted with text rise, so a
  parser reads "• Ported…" as one line.
- **The QR code's URL is also in the contact line as text**, and the code holds
  the full `https://` URL.

## Changing things

- **Add a bullet:** add a fragment to `fragments`, list its id in its entry's
  `bullets`, and give it `skills` (the tools named in its text) and `tags`
  (keys of `DOMAINS`). The bot needs a pull and restart before it can reword
  the new bullet (`TAILORABLE` is read at startup).
- **A short query matches nothing it should:** add the word to the right
  domain in `DOMAINS`.
- **Models:** `BOT_TAILOR_CHAIN` in `bot/.env`. On 2026-09-22, gpt-oss-120b on
  Groq answered nine bullets in about 2 s, and OpenRouter's free Nemotron took
  11 s to its first token.

## Checking it

```bash
npm run typecheck
```

The PDF can be produced headless: import `match.ts`, `fit.ts`, and `layout.ts`
in Node 24 (types strip on import), stub `fetch` for `/fonts/` to read
`public/fonts/`, and call `Typesetter.load()`, `fit()`, and `ts.pdf()`. Check
that the result is one page, that `pypdf` extracts whole words with each
"• text" on one line, and that the rendered page reads as Latin Modern.
To exercise `/tailor` without API keys, run the bot with a fetch mock that
answers `api.groq.com` (`node --import mock.mjs bot/server.mjs`).
