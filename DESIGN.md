# DESIGN.md

Design decisions for gmango.dev that are expensive to reverse. Each entry is dated; later entries may supersede earlier ones and must say so.

## Home hero (2026-10-21)

**Decision.** The home hero is a statement, not a bio. Small Playfair name (`h1`, 1.5rem, the site's white-to-gold gradient), the statement "I build machine learning into products people use." (white up to "learning", then "into products people use." in `var(--accent)` so the outcome carries the colour; 2.5rem/650, 22ch, balanced wrap; 1.875rem under 620px), one supporting line (1.125rem, 52ch) naming only Geometry Health, LegacyScribe and Georgia Tech, then three actions in this order: View résumé (solid gold, the only element with depth), Get in touch (outline), Experience (quiet). Three stats sit under the portrait on desktop, stacked and left-aligned to the photo's edge; under 940px they become a row of three after the buttons, with shorter phone wording under 620px. No title label above the name, and no entrance motion beyond the existing route fade.

Why: the old hero was ~120 words of jargon before the first button and read like an interview answer to new visitors. "Software Engineer" was dropped from the hero and from the home title/description because the owner is aiming at both founding-engineer and ML-engineer roles; the title is now "Genova Mongalo | ML Engineer & Founding Engineer", which keeps both search terms.

Colour: superseded by "Palette B" below.

## Palette B: warm ink with a ruby accent (2026-10-24)

**Decision.** Supersedes the red-gradient/gold palette sitewide (`global.css` tokens; for Elmo mode see "Elmo mode: the red room"). Canvas `--canvas-top` #1c1513 to `--canvas-bottom` #0f0b0a. Text `--text-light` #f5efe9, `--text-muted`/`--text-soft` #c9b8b1, `--text-faint`/`--text-caption` #a8968f. Ruby comes in two tokens: `--accent` #ef6b62 for text and small marks on the canvas (hover `--accent-strong` #f58e86), and `--accent-fill` #b3172a for solid backgrounds with white `--on-accent` text (hover `--accent-fill-strong` #c42236). On the home hero the accent appears only in "into products people use." and the View résumé button. The active nav tab, outline buttons and all `h1`s are neutral (no gold, no gradient). The only glow is a faint ruby one in the bottom-right (`--glow`).

Why: the old full-bleed saturated red left nothing able to stand out, and gold appeared in five places on the home hero, so the headline accent and the primary button competed. Option B was picked over "oxblood" (same red, darker) and "cream editorial" (light theme) because it reads most like an engineering portfolio.

Contrast (measured): text-light 15.8:1 on #1c1513; text-muted 9.4:1; text-faint 6.4:1 on #1c1513 and 6.9:1 on #0f0b0a; accent 6.0:1 on #1c1513 and 5.3:1 on #2a1f1c; white on accent-fill 6.8:1, on accent-fill-strong 5.8:1.

## Hero finishing (2026-10-24)

**Decision.** Option B of three. The portrait ring is two neutral concentric hairlines (border 1px `--border-strong`, outline 1px `--border` at 6px offset) instead of the ruby band. The page's one glow sits behind the portrait (`.hero .profile-container::before`, `--portrait-glow` rgba(179,23,42,0.3); transparent in Elmo mode, where the red ring already marks it), and the corner glow is dropped on the home page (`body:has(.hero)::before`). The nav glass now bleeds to the window edges at every width.

Why: the ruby band read as muddy brown on the ink canvas, and the corner glow belonged to nothing; anchored to the photo, it groups the photo with the stats. Rejected: A, an "Open to founding-engineer and ML roles" status line, because any role label on the site narrows which roles recruiters bring (same reason as no title label in "Home hero"); C, stats in Playfair, because it competes with the name.

States: buttons keep hover (lift, lighter fill), active (scale 0.985) and the global `:focus-visible` ring (2px `--accent`, 3px offset, 6.0:1 on the canvas), checked by keyboard. The hero has no disabled, loading, empty or error states: it is static links.

## Elmo mode: the red room (2026-10-24)

**Decision.** Elmo mode (right-click or long-press the portrait) is the inversion of Palette B. In Palette B, ruby is a small accent on a dark room; in Elmo mode, red is the room and Elmo's nose orange is the accent. Tokens are in `:root[data-theme='elmo']` in `global.css`:
- Canvas: `--canvas-top` #b00e20 to `--canvas-bottom` #6e0913.
- Orange: `--accent` #ffcf70 for text, `--accent-fill` #ffc24d for fills, which always carry dark `--on-accent` #2a0a00.
- Text: white, with `--text-muted`/`--text-soft` #ffe3de and `--text-faint`/`--text-caption` #ffd3cc.
- Surfaces and borders: white at low alpha; shadows: a deep red-black.
- The portrait gets a bright red ring: `--elmo-ring` #ff2d2d, 6px solid plus a 16px halo at 28%.
- `h1` is a white-to-orange gradient.

Why: Palette B took Elmo's old black-and-red as the everyday look, so the old Elmo palette was no longer a change of atmosphere. The user picked option 1 ("Elmo red") with option 3's red ring, over "lights on" (a light theme, too much work) and "spotlight" (still dark next to Palette B).

Contrast (measured): white 7.2:1 on #b00e20; `--accent` 4.9:1 there; soft text 5.9:1; captions 5.3:1; `--on-accent` on the fill 10.5:1.

## Education, Skills, Projects, Research: featured + index (2026-10-24)

**Decision.** All four pages share one structure, option A of three ("featured + index"): a page leads with its two or three strongest items given room, and everything else is a compact index row (title, years, first sentence) that opens in place to the full write-up. Picks:
- **Projects:** LegacyScribe (large, with its product-page link), AWS DeepRacer and Care Beyond featured; the other nine are index rows. The tag filter stays, quieter, above the index.
- **Research:** the publications featured; the research projects are index rows.
- **Education:** the two degrees featured; in-progress and graduate courses are index rows; undergraduate stays as area lines. The single card that wrapped the page goes.
- **Skills:** ML & Data and Specialized Skills featured; the rest are compact rows.

Rules for all four:
- Balanced density, as on the résumé section.
- Palette B, with ruby only on links and the one primary action. Section headings, labels and bullets go neutral.
- Cards never stretch to a taller neighbour.
- A chat-bot deep link (`#anchor`) opens its row.

Rejected: "grouped by theme" (the strongest argument, but it merges Skills into Projects and changes the nav) and a one-column ledger by year (calm, but features nothing).

Why: every item was weighted the same (LegacyScribe got the same card as the phonebook app), write-ups ran 40–300 words with no line to scan, and the accent was on every heading, label and bullet.

### Build spec (2026-10-24)

**Shared pieces** (new files; `ProjectCard` is imported only inside `Projects.tsx`, so it is deleted, not kept).
- `src/lib/firstSentence.ts`: `firstSentence(text)` returns `text.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? text`. Decimal points ("5.3%", "0.809") are followed by a digit, so they survive. Never hand-written copy.
- `src/components/Featured.tsx`: `<Featured as='h2'|'h3' id? title meta? large?>children</Featured>` → `<article class="feat" id>` with the title as the given heading level (`.feat-title`, font-ui 18px/600 `--text-light`), `.feat-meta` 14px `--text-faint` tabular, then children. No `href` on the title: links live in a `.links` row.
- `src/components/IndexRow.tsx`: `<IndexList>` = `<ul class="idx">`; `<IndexRow id? title meta? summary>children</IndexRow>` = `<li class="idx-row" id>` holding one `<button type="button" class="idx-toggle" aria-expanded aria-controls>` whose contents are `<h3 class="idx-title">`, `.idx-meta`, `.idx-summary` (`-webkit-line-clamp: 2`), and `.idx-more` text "More"/"Less"; then `<div id=… class="idx-panel" hidden={!open}>children</div>`. Initial `open` = `useLocation().hash === '#'+id`; an effect re-opens the row when the hash changes to it. No expand animation; colour transitions only.
- `.links`: 14px/600 `--accent` (hover `--accent-strong` underline), gap `--sp-4`. Labels: "GitHub", "Product page →", "DOI", "Preprint (arXiv)", "Copy citation", "Live site" for Care Beyond.
- Tags: existing `.tag-static` (12px, `--text-faint`), gap `--sp-2`.

**Type and spacing** (Balanced scale). Section `h2.fx-heading`: Playfair 24px/1.2 `--text-light`, left-aligned, margin `--sp-6 0 --sp-4`, with an optional `<small>` 14px `--text-faint` (term, school line). Featured blurb 16px/26px `--text-muted`. Row title 16px/600; summary, meta, More/Less and expanded blurb 14px/22px; tags 12px. `.feat` padding `--sp-5`, `--surface`, 1px `--border`, `--r-md`, `--shadow-sm`, no hover lift or border tint. `.feat-grid`: `repeat(auto-fit, minmax(min(360px,100%),1fr))`, gap `--sp-5`, `align-items: start`; `.feat.is-large { grid-column: 1 / -1 }`. Rows: padding `--sp-3 0`, `border-top: 1px solid var(--border)`, last row also border-bottom; the button fills the row, min-height 44px, `text-align: left`; head grid desktop `"title meta" / "summary more"` with `minmax(0,1fr) auto`. Panel padding `0 0 --sp-4`; blurb, then links (margin-top `--sp-3`), then tags (margin-top `--sp-3`). Pages wrap their content in `<div class="fx">`; `components.css` adds `.fx h2, .fx h3 { color: var(--text-light) }`, `.fx ul.bullet-list > li::before { background: var(--text-faint) }`, `.fx ul.sub-bullet li::before { background: var(--border-strong) }`. `global.css` is not edited.

**Per page.**
- *Projects:* `featured?: true` on LegacyScribe, DeepRacer, Care Beyond in `projects.ts`. Order: h1, intro, `.feat-grid` (LegacyScribe `large`, h2 titles), `h2.fx-heading` "All projects", tag row, `IndexList` of the non-featured nine in data order (h3 rows). Filter: `.tag-row` left-aligned, 12px, padding 4px 10px, gap 6px; active chip keeps `--accent-fill`/`--on-accent` (the page's one solid). With a tag active the featured block stays as is and the index lists *every* match, featured included, so the count is honest and nothing above the chips moves. Hash still clears the filter.
- *Research:* h2 "Publications" → `Featured as='h3'` per paper (authors, venue, blurb, links DOI/Preprint/Copy citation, tags). h2 "Research projects" → rows.
- *Education:* `.feat-grid` of the two degrees (h2 school; degree 16px `--text-light`, not ruby; date 14px faint; note 14px muted under a hairline). h2 "In progress" `<small>`=`inProgressTerm`, h2 "Graduate coursework" `<small>`="Georgia Tech, M.S. Computer Science, AI emphasis": rows with `summary = points[0]`, panel = both points as `ul.bullet-list`. h2 "Undergraduate coursework": area `h3` 14px/600 `--text-light` (no uppercase), course line 14px muted, single column. The `.content-card` wrapper goes.
- *Skills:* `featured?: true` on ML & Data and Specialized Skills (replace `wide`); each a `Featured as='h2'` with items as `ul.bullet-list`. The other five are a `<dl class="skill-rows">`: desktop grid `160px 1fr`, `dt` 14px/600 `--text-light`, `dd` 14px muted items joined by " · ", hairline between rows. No expand.

**Deep links.** `useHashHighlight` (App) keeps scrolling and flashing; change the selector at `components.css` ~1677 from `.project-item[id]` to `.feat[id], .idx-row[id]` (scroll-margin-top 5.5rem). Rows open themselves (above); featured items carry the same `anchors.*` id, so every key the bot can emit lands.

**≤620px.** One column everywhere; `.feat` padding `--sp-4`; `fx-heading` 20px; row head grid `"title more" / "meta meta" / "summary summary"`, summary clamp 3; `.skill-rows` stacks `dt` over `dd`; tag row wraps left.

**Motion.** One `Reveal` per section, no per-card delay. No hover lift anywhere on these pages. Reduced motion needs nothing new: `.reveal`, `.is-target` and `scrollIntoView` already honour it.

**Removed from `components.css`:** `.skills-grid*`, `.is-wide*`, `.skill-card*`, `.project-grid*`, `.project-item*`, `.project-head`, `.project-title`, `.project-years`, `.project-tags`, `.section-heading`, `.pub-item > p:last-of-type`, `.degree-grid`, `.degree-card*`, `.course-grid*`, `.section-head*`; `.course-groups h3` loses uppercase and ruby. Kept: `.pub-authors`, `.pub-venue`, `.pub-links` (restyled as `.links`), `.tag*`, `.empty-note`.

**Acceptance.**
1. `npm run typecheck` and `npm run build` pass; `ProjectCard` no longer exists.
2. Each page: ruby appears only on `.links`, the active filter chip, and focus rings. Headings, bullets, degree names, area labels are neutral.
3. Side-by-side cards end at their own content (DeepRacer taller than Care Beyond).
4. Every index summary equals `firstSentence(blurb)` or `points[0]`; no text in the DOM that is not in `src/data`, apart from "More", "Less", "All projects", link labels.
5. Keyboard: Tab reaches each row button, Enter/Space toggles, `aria-expanded` flips, panel content is hidden when collapsed.
6. `/projects#unbound-family-portal`, `/research#cognitive-load-aware-conversational`, `/research#securing-virtual-reality` open the row (or land on the featured card), scroll under the nav, and flash once.
7. Clicking "Reinforcement Learning" lists DeepRacer, LunarLander, Overcooked as rows while the featured block does not move; "All" restores nine rows.
8. Heading order per page is h1 → h2 → h3 with no skips (axe or Lighthouse ≥ 95).
9. At 390px: no horizontal scroll, row buttons ≥ 44px tall.
10. Reduce Motion: no transitions on open/close, flash is the static ring.

**As built (2026-10-24), changes from the spec:**
- **Index rows** follow the accordion pattern: `h3 > button`, not a button holding the heading (that is invalid HTML and flattens the heading for screen readers). The button's `::after` covers the row, so anywhere on it toggles, and the focus ring outlines the whole row.
- **Featured projects and publications** show their first two sentences (`leadSentences`) with a More/Less toggle. The full write-ups (132–166 words) rebuilt the walls of text the change was meant to remove, and two papers side by side need to balance.
- **Publications** (2026-10-24): an accepted paper is listed once, at its latest stage. Its meta reads "2026 · Accepted", the venue line says "to appear", and its earlier presentation sits on a line inside the entry (`history`), not in a second entry. There is no DOI link until it has one, and the citation drops the DOI. The home stat reads "2 IEEE papers / 2025, and one accepted for 2026"; switch it to "2025 and 2026" once the paper is out in December 2026.
- **Education course rows** are static, with both points inline joined by " · ". A toggle that revealed one more line was more cost than content (the risk the spec named).
- The filter's first chip reads "All (9)", counting the index it filters. Tag hover is neutral.
- The real anchor for the conversational-design study is `#cognitive-load-aware`.

**Verify (2026-10-25).** The diagnostic scored 10/10 after these fixes:
- Elmo links and tag text moved a step lighter on the cards (they were 4.42:1 and 4.18:1).
- Links and More reach a 24px target.
- `.feat` lost its glass blur and shadow, keeping the hairline only.
- Featured, row and skill prose is capped at `--measure` (it ran to about 130 characters).

Measured by script on all four pages in both themes:
- Lowest contrast 4.71:1 (normal) and 4.68:1 (Elmo).
- One `h1` per page, no skipped heading levels, no load errors.
- No horizontal scroll at 390px; expandable rows are 99px+ tall there.

Blur and grayscale tests were run on Projects. The row-title buttons measure under 24px on their own, but their `::after` covers the whole row, so the target is the row.

## Shop (2026-10-25)

**Decision.**
- **New piece:** "Not My Problem (Digital Collage, 1 of 1)", $999, sold out like the rest. It's the owner's photo of themself walking away from a burning car with an ice cream. Its square crop centres right (`focus: '84% 50%'`) so the subject isn't cut off. It lives only here, where the shop's sold-out joke gives it context, not anywhere a visitor meets it cold.
- **Featured lot:** The Whole Collection leads the page as a wide card (art 3fr, text 2fr) with "All eight pieces, in one lot." The eight singles sit below in a 4 × 2 grid (2 × 4 on phones), with rows of equal height.
- **"Sold out" moved off the art** onto the price line ("~~$120~~ · Sold out"), since the art is the content. The click stamp stays as the payoff. The resting dim eased from grayscale 40% / brightness 0.76 to 15% / 0.9.
- **Tagline** is neutral (`--text-muted`), since ruby is for links and the primary action.
- **Card titles** are spans, not headings, because the card is a button.

Measured: lowest contrast 5.54:1 (normal theme) and 4.73:1 (Elmo), no horizontal scroll at 390px.

## LegacyScribe page (2026-10-17)

**Decision.** `/LegacyScribe` is a standalone light product page in the SPA, not a portfolio page: hero option A's look (white, SF stack, system blue, no Playfair, no red/gold), rendered without the portfolio nav, chat widget or pet, tied back to the portfolio by one "← gmango.dev" link. Eight sections, six of them with a small demo that plays once on scroll-in and is static under Reduce Motion. Every number comes from `docs/bench-results.md` or `CLAUDE.md` in the LegacyScribe repo and is labelled "on my voice, on an M5"; the release version and zip size are read live from the GitHub releases API, never typed in.

Why not the site theme: the live site is a red gradient with gold accents (`global.css`), which reads as a personal portfolio; the audience here (testers, judges, people leaving Wispr Flow or Superwhisper) needs a page that reads as a Mac app's. Why off-nav: the nav is the portfolio's segmented control; the page is linked from Projects instead, as decided.

Fixed inputs: `/Users/shankyshako/Documents/Homework/AI/LegacyScribe/.claude/site-mock/render.html` (frame A is the hero, frame C's table is the comparison), `README.md`, `PRIVACY.md`, `install.sh` in the same repo.

### Sections, in order

1. **Hero** (A). Left: `h1` "Talk, and it's typed. On your Mac."; sub-line as in A ("Hold Right ⌥, say it, let go. LegacyScribe writes what you meant into whatever app you're in, with the ums and false starts taken out. Speech recognition and the AI run on your Mac. Free and open source."); install block (item 9); Download button + note; facts row "Free, MIT licence · Works offline · No account". Right: `HeroDemo`.
2. **Modes.** Eyebrow "Three ways to paste"; `h2` "One dictation, three results." `ModesDemo`. One line under: "Switch with ⌃⌥, like ⌘-Tab. Clean is the default."
3. **Compare.** `h2` "We do it, <s>but like</s> better." Sub-line: "Wispr Flow and Superwhisper dictate too. The crutch word is struck out because LegacyScribe's Speech Coach would count it." Then frame C's table (rows Price, Speech recognition, AI clean-up, Source code, Meeting notes; LegacyScribe column first and tinted) and the source line "From each app's website, 17 October 2026." No rows beyond C's five: nothing unverified about competitors.
4. **Speech Coach.** Eyebrow "The better part"; `h2` "Hear your own habits." `CoachDemo`. Copy: "Off by default. It listens to your own History recordings on your Mac and counts fillers, crutch words, hedges, restarts, pace and pauses, with clips of you saying them next to a clean sentence of yours."
5. **Numbers.** `h2` "Measured on my voice, on an M5." `Numbers`: WER bars + facts. Footnote: "20 of my own clips, 3 warm runs. Method and every table: docs/bench-results.md" (link to the file on GitHub).
6. **Private mode.** `h2` "Nothing leaves the Mac unless you say so." `PrivateDemo` + three facts from PRIVACY.md: speech recognition, Notes and the coach always run on the Mac; text goes out only if you choose a cloud AI with your own key; no account, analytics or crash reporting. Link "Everything stored, read and sent: PRIVACY.md".
7. **More** (static grid, six cards, one line each, from README copy): Spoken instructions ("Legacy, make this friendlier" rewrites the selection); Notes (tap once, talk for up to 2 hours, speaker labels, trim a tangent out of the notes); Fits the sentence (lowercases mid-sentence, fixes spacing); Nothing lost (Esc has Undo for 30 s, failed dictations are kept with Retry); Code talk ("slash review" reaches the assistant as `/review`); Read-aloud practice (280 sentences covering all 39 English sounds).
8. **Get it** (footer). Install block again, Download button + Open Anyway note, FAQ (four `<details>`: "Why does macOS block the download?", "What does it need?" (Apple Silicon, macOS 26; Cohere is a 1.4 GB download and ~2 GB of memory while loaded, unloaded after each dictation; the recommended 4B rewrite model wants a 16 GB Mac, the 1.7B runs on 8 GB; Apple Speech and Parakeet take under 100 MB), "What is sent where?", "Who made it?"). Credit line: "LegacyScribe is a fork of Hex by Kit Langton (MIT). Built by Genova Mongalo; entered in UMKC Hack-A-Roo, 13 November 2026." Links: GitHub, Privacy, Changelog, Report a problem (GitHub issues), "← gmango.dev" (to `/projects`).

Cut from the candidate list: a Notes demo (two chips appearing is not a demo anyone reads; one card in §7 carries it), a separate Legacy-instructions demo (same), a separate open-source section (folded into §8), vocabulary/practice detail.

### Demos: exactly what each shows

Shared hook `usePlayOnce(ref)` → `{ phase: 'idle' | 'playing' | 'done', reduced: boolean }`. `reduced` = `prefers-reduced-motion: reduce`; when true `phase` is `'done'` from the first render and nothing animates. Otherwise an IntersectionObserver (threshold 0.4) flips `idle → playing` once and disconnects; the component schedules its steps with `setTimeout`s cleared on unmount. The hero starts 400 ms after mount instead (it is on screen). Each demo is a fixed script with no randomness. After `done`, a small text button "Replay" (13 px, muted) appears under the demo; it re-runs the script. All motion is `opacity` and `transform` only.

- **HeroDemo** (frame A's window, ~4.6 s): the field is empty; capsule bars scale in height on a 120 ms loop while "recording"; caption words appear one every 170 ms from the list `so um let's move the demo to friday no thursday at two and uh I'll bring the poster`, the newest word at 55 % opacity, earlier ones solid. Then the capsule stops and tints blue for 500 ms (transcribing) and purple for 500 ms (rewriting); the caption fades out (200 ms); "Let's move the demo to Thursday at 2. I'll bring the poster." fades into the field with the blue highlight, which fades out over 600 ms. End state = frame A exactly, caption shown static beneath with the label "What you said, as the live caption showed it". Reduced motion shows the end state at once.
- **ModesDemo**: a mode bar of three pills (Raw · Clean · Prompt) with a sliding selection (transform, 220 ms); left column "You said" with the raw text, right column "Pasted as <mode>". Text for the three: Raw `okay so um I need the login page to remember the email no actually remember the whole form and uh can we also add a test for the empty email case`; Clean `I need the login page to remember the whole form. Can we also add a test for the empty email case?`; Prompt `1. Make the login page remember the whole form, not only the email.` / `2. Can we also add a test for the empty-email case?`. On play it steps Raw → Clean → Prompt, 1.6 s each, text crossfading (180 ms); then the pills are clickable. Reduced motion: Clean selected, pills clickable, instant swap.
- **Compare strike**: `<s>` with `text-decoration: none` and an `::after` line 2 px, `transform: scaleX(0)` → `scaleX(1)`, origin left, 450 ms, starting 250 ms after the heading's `.reveal` fires; the struck words go to the muted colour at the same time. Reduced motion: drawn.
- **CoachDemo** (3 s): transcript line `so um I think we should like move the meeting to uh Thursday`; a word-by-word highlight passes left to right (each word 100 % → 60 % opacity as the "playhead" leaves it); when it passes um/uh/like each gets an orange underline mark and the counters tick: Fillers 0 → 2, Crutch words 0 → 1. Beside it a card "A clean sentence of yours": `Let's move the meeting to Thursday.` (static). Reduced motion: end state.
- **Numbers**: three bars, lower is better, labelled with the value: Cohere Transcribe 5.3 %, Parakeet v3 8.8 %, Apple Speech 8.8 % (word error rate, 20 clips). Bars `scaleX` from 0 over 600 ms on reveal; reduced motion: full. Facts under the bars: Cohere ~320 ms per 10 s of audio; Parakeet v3 ~73 ms; on-device rewrite (Qwen3 4B, 4-bit) 0.4–1.5 s for a dictation of up to 55 words, 2.9 s for 107; live caption first word a median 0.74 s after you start speaking (5 clips, in-app test). No other numbers.
- **PrivateDemo** (3 s): a toggle "Private mode" slides on (knob transform, 250 ms); a lock appears on a small menu-bar icon (opacity); four stage labels Recording → Transcribing → Rewriting → Pasted light up in turn (opacity), while the line "Network connections opened: 0" stays 0 throughout. Caption: "Checked by a test that samples the app's sockets every 10 ms during a real dictation." Reduced motion: toggle on, "Pasted" lit, 0.

### Motion rules (impeccable-slop)

Purposeful only: every animation shows a thing the app does. Transform and opacity only; no colour-cycling, pulsing dots, glows, marquees, parallax, hover lifts, or counters that run for decoration. Each demo plays once on scroll-in; the only repeat is the user's Replay. Durations 150–600 ms per step, easing `var(--ease)` from `global.css`. `prefers-reduced-motion: reduce` → every demo renders its end state, the strike is drawn, bars are full, `Reveal` already handles itself. Nothing autoplays sound. Section reveals reuse the existing `Reveal` component (one per section, no per-card stagger).

### Visual system

White `#fff` page, text `#1d1d1f`, secondary `#3a3a3c`, muted `#6e6e73`, hairlines `#d2d2d7`, panel `#f5f5f7`, button `#0071e3` (hover `#0077ed`), check green `#1a7f37`, orange marks `#c25400`, caption/code block `#1d1d1f` with `#f5f5f7` text. Type: `var(--font-ui)`, 16 px/1.5; `h1` 52 px/1.08 (36 px under 640 px), `h2` 34 px/1.15 (28 px), eyebrow 13 px uppercase tracked. Radii 8/10/12 px; one soft shadow on windows (`0 1px 3px rgba(0,0,0,.18)`). `.key` as in the mock-up. All page CSS is scoped under `.ls-page` and overrides the global `h1`/`h2`/`a`/`:focus-visible` styles there (no gradient text, left-aligned, focus ring `#0071e3`). Content width 1120 px (`--content-w`), section padding 72 px / 20 px on mobile. Elmo mode has no effect on this page.

### Global chrome on this route

In `App.tsx`'s `Shell`, `const product = /^\/legacyscribe\/?$/i.test(pathname)`. When `product`: render `<main key={pathname} className="route-enter">` with the `Routes` and no `.container`/`Nav`; still render `<AudioBar />` (its decks must stay mounted; the bar only shows if the visitor started the music themselves) and `<DesktopPet />` (add `'/LegacyScribe'` to `BANISHED` in `DesktopPet.tsx`, lowercase-insensitively: change the `Set.has` checks to a helper that lowercases); do not render `<ChatWidget />`. An effect sets `document.documentElement.dataset.page = 'legacyscribe'` and removes it on cleanup; `legacyscribe.css` uses `:root[data-page='legacyscribe'] body { background: #fff; color: #1d1d1f; } :root[data-page='legacyscribe'] body::before { display: none; }`. The route's own top bar: icon + "LegacyScribe" (not a link), anchors "Compare", "Privacy", "GitHub", and "← gmango.dev" right-aligned; not sticky.

### Install line, Download, Open Anyway

- Short install: `curl -fsSL https://gmango.dev/LegacyScribe/install | bash`. `vercel.json` gets, in the existing `routes` array (that array already coexists with `rewrites`, so use the same mechanism rather than a new `redirects` key): `{ "src": "/[Ll]egacy[Ss]cribe/install", "status": 307, "headers": { "Location": "https://raw.githubusercontent.com/ShankyShako/LegacyScribe/main/install.sh" } }` and `{ "src": "/legacyscribe", "status": 308, "headers": { "Location": "/LegacyScribe" } }`. Add `LegacyScribe/install|legacyscribe/install|` to the rewrite's negative lookahead as a second guard. curl's `-L` follows the 307.
- `InstallBlock` (used in §1 and §8): dark code block with a non-selectable `$ ` prefix, the command wraps on narrow screens (`overflow-wrap: anywhere`, no horizontal scroll), Copy button → "Copied" for 1.6 s via `navigator.clipboard.writeText`.
- `useLatestRelease()`: `fetch('https://api.github.com/repos/ShankyShako/LegacyScribe/releases/latest', { headers: { Accept: 'application/vnd.github+json' } })` with a 4 s AbortController; pick the asset whose `name` matches `/^LegacyScribe-.*\.zip$/`; return `{ url, version: tag_name without the leading v, sizeMB: Math.round(size / 1e6) }` or `null`. Download button: with data, `href = url`, note "LegacyScribe <version> · Apple Silicon, macOS 26 or later · <sizeMB> MB"; without (pending or failed), `href = https://github.com/ShankyShako/LegacyScribe/releases/latest`, note "Apple Silicon, macOS 26 or later". No spinner, no layout shift (reserve the note's line).
- Open Anyway note under every Download button: "The app isn't notarized yet, so macOS blocks a browser download the first time: open it once, then System Settings → Privacy & Security → Open Anyway. The curl line checks the signature itself and skips that step."

### Files

New: `src/pages/legacyscribe/LegacyScribe.tsx` (page, composes sections), `HeroDemo.tsx`, `ModesDemo.tsx`, `CoachDemo.tsx`, `PrivateDemo.tsx`, `Compare.tsx`, `Numbers.tsx`, `InstallBlock.tsx`, `usePlayOnce.ts`, `useLatestRelease.ts`, `legacyscribe.css` (imported by the page only); `public/image/legacyscribe-icon.png` (copy of `.claude/site-mock/icon.png`, 256 px); `public/image/legacyscribe-og.png` (1200×630: icon, "LegacyScribe", "Talk, and it's typed. On your Mac.", "Free · Open source · Runs on your Mac"; produced by the head agent from a static `src/pages/legacyscribe/og.html` the builder writes; until the PNG exists the route keeps the site's default image).

Edited: `src/App.tsx` (route `<Route path="/LegacyScribe" element={<LegacyScribe />} />`, product shell, meta lookup over `nav` and `extraRoutes`); `src/data/site.ts` (new `export const extraRoutes: NavItem[]` with one entry `{ path: '/LegacyScribe', label: 'LegacyScribe', title: 'LegacyScribe | Free, open-source dictation for your Mac', description: 'Hold a key, talk, let go: clean text in any app. Speech recognition and the AI run on your Mac. Free, MIT, Apple Silicon.' }`, formatted exactly like the `nav` entries so `prerender-meta.mjs`'s regex picks it up unchanged); `src/hooks/useSeo.ts` (optional `image` argument, default `site.ogImage`, upserting `og:image` and `twitter:image`); `scripts/prerender-meta.mjs` (a `const OG_IMAGES = { '/LegacyScribe': ORIGIN + '/image/legacyscribe-og.png' }` map applied to `og:image`/`twitter:image` when present); `src/components/DesktopPet.tsx` (BANISHED); `src/components/ChatWidget.tsx` (not rendered on the route; done in `App.tsx`, no change needed if the shell omits it); `src/data/projects.ts` (optional `page?: string` on `Project`, set to `/LegacyScribe` on the LegacyScribe entry) and `src/pages/Projects.tsx` (`ProjectCard` renders a `<Link to={project.page}>Product page →</Link>` after the blurb when set); `vercel.json` (above).

Not touched: `global.css` tokens, `components.css`, `Nav.tsx`, `index.html`.

### Mobile

One column everywhere under 900 px; the hero demo window sits under the copy; the mode pills and the comparison table scroll horizontally inside their own wrapper (first table column sticky), never the page; `h1` 36 px; tap targets ≥ 44 px; the Replay button is a real button. Checked at 390 and 768 px wide.

### Done-checklist for the reviewer

1. `npm run typecheck` and `npm run build` pass; `dist/LegacyScribe/index.html` exists with the page's title, description, canonical and (if the PNG exists) og:image; `sitemap.xml` lists `/LegacyScribe`; no other route's meta changed.
2. `npm run dev`: `/LegacyScribe` and `/legacyscribe` both render the page; no portfolio tab bar, no chat bubble, no pet; the body is white with no red bleed at the edges or behind the footer; navigating back to `/projects` restores the red theme, nav and pet.
3. Hero demo plays once on load and ends as frame A; Replay re-runs it; with "Reduce motion" on (System Settings → Accessibility → Display) every demo is static and the strike is drawn.
4. Modes, strike, coach, bars and private demos each start only when scrolled to and run exactly once; no animation changes anything other than `opacity`/`transform`.
5. Install block: Copy copies the exact short line; `curl -fsSL http://localhost:<port>/LegacyScribe/install` cannot be tested locally, so verify the `vercel.json` entries by review, and after deploy run `curl -fsSIL https://gmango.dev/LegacyScribe/install | grep -i location` → the raw install.sh URL.
6. Download: with network, the button links to the versioned zip and the note shows version and size from the API; with the API blocked (devtools offline), it links to the releases page and the note has no version; no layout shift between the two.
7. Every number on the page appears in `docs/bench-results.md` or `CLAUDE.md` with the same value, and each is labelled "on my voice, on an M5" or sits under that heading; no number is typed for version or zip size.
8. The comparison table has only C's five rows and the dated source line.
9. Lighthouse (desktop) accessibility ≥ 95: headings in order (one `h1`), the `<s>` heading reads sensibly, colour contrast passes for muted text (`#6e6e73` on white is 4.5:1 or larger), all buttons labelled.
10. Projects page shows "Product page →" on the LegacyScribe card and the link works.
11. Nothing is pushed: the user sees the local dev build first (push deploys).

### Risks

- Vercel may reject `status`/`headers` entries in `routes` next to `rewrites`; if `vercel build` complains, move the redirects to a `redirects` key and, if that is also refused alongside `routes`, replace the transform route with an `api/` edge function and keep `redirects`. Check with `npx vercel build` before pushing.
- GitHub's unauthenticated API allows 60 requests an hour per IP; a demo table of judges on one network could hit it. The fallback link covers it, so no change unless it shows.
- Competitor cells go stale; the dated line is the honesty mechanism. Re-check both sites on the day of publishing and change the date.

### Review of the build (2026-10-17)

- Dropped the `/legacyscribe` → `/LegacyScribe` 308 from `vercel.json`: Vercel's route matching may be case-insensitive and would loop; the SPA matches both spellings and `useSeo` gets `route.path`, so the canonical is `/LegacyScribe` either way. The rewrite's lookahead stays as the second guard for the install route.
- `useDevtoolsTrap` and `useImageGuard` are off on this route (an open-source product page must not bounce a developer who opens the inspector); they stay on everywhere else.
- Accepted as built: hero highlight settles at frame A's 12 % tint instead of fading out; marked fillers in the coach demo stay at full opacity; no Replay under Reduce Motion; §7 `h2` "A few more things."; struck words transition `color` (the spec asked for it); hero script runs ~5 s, not 4.6.
- Copy fixes: "Who made it?" uses the README's words (no job title); "Apple Speech and Parakeet use under 100 MB of memory" (the download is larger).

## Résumé section: what it is made of (2026-10-24)

**Decision.** The `/resume` personalizer keeps these pieces and only these:
1. A one-line promise above the field: what you get ("rewritten for your role, still one page, ready as a PDF"), not how it works.
2. Example queries that stay visible after typing, so roles can be compared with one click.
3. Changes marked on the page: a margin bar beside each reworded bullet, a dotted one beside a bullet whose rewrite was rejected; hovering a marked bullet shows the original wording.
4. A two-way switch, **Original | Tailored**, shown once a query is active. Never echo the query or a role in the label.
5. The lifting chips, with the heap made smaller so it no longer outsizes the page.
7. A "nothing invented" line: every fact comes from the published résumé, and code rejects a rewrite that drops a number, adds a tool or claims more.
8. The four steps (Match, Fit, Reword, Check) with real counts, folded behind "How this works".
9. Download stays the one solid button and names no role ("Download this version" / "Download PDF").

Rejected: a match score (a visitor typing a role the owner doesn't fit would see the site grade its owner low), a shareable `?for=` link (rewording re-runs on open and depends on the bot being up), and "For <role>" on the switch or the button (puts a role label on the site; see "Home hero" and `site-positioning`).

Why: the section worked but gave no reason to start and no proof it had done anything. The pieces split into invite (1, 2), reward (3, 4, 5), trust (7, 8) and take-away (9).

**Layout (2026-10-24).** Option A of three: on desktop, the controls sit in the left column in this order: promise, field, examples, lifted chips, status line + "How this works", a smaller heap, then the trust line. The Original | Tailored switch and Download sit in a toolbar directly above the page on the right. Rejected B (all controls on the left, so the eye crosses over to act on the page) and C (field across the top, page centred, which needs a scroll to see the page change). Phone order for any option: promise, field, examples, chips, toolbar, page, trust line. Built (2026-10-24): the heap fills whatever height the left column has left and sinks out of sight when "How this works" is open; the open steps make the section taller instead of scrolling in a box, and the page keeps its size. Lifted chips are capped at two rows, left-aligned with the field.

**Density (2026-10-24).** Chosen: Balanced, with Compact's example chips. Promise `h2` 30px (24px under 620px); sub-line 16px on a 28px line; field text 20px on a 28px line (18px on phones); status, "How this works", switch and trust line 14px, step tags 12px. Example chips are 12px with 4px/10px padding and a 6px gap, so they sit on two rows instead of three. Spacing: promise to field 24px, field to chips 12px, chips to lifted row 16px; grid gaps 24px between rows and 32px between columns. Rejected: Compact overall (12px text everywhere reads as an admin tool) and Generous (the left column fills up and the heap sinks out of sight on a 1440×1000 screen).

**Heap (2026-10-24).** Chosen: "Quiet" with less tilt. Resting heap pieces are solid and dim:
- Skill chips: #2b221f with a #3a2f2b edge and #8a7a73 labels.
- Number blobs: #4d161c with #c9a7a2 labels.
- Loose letters: #3d322e.

Solid fills, so overlapping pieces hide one another instead of muddying. A chip turns paper (and a number turns ruby) only when it lifts, so brightness means "relevant to this role". The colours crossfade over `--dur`. Tilt is ±7° (it was ±28°). Every piece and the loose letters stay. The tokens are `--heap-*` on `.tailor`, with darker-red values under Elmo. The heap is `aria-hidden`, so its labels are decoration and need no text contrast. Rejected: "Tidy" alone (it calms the shape but stays the loudest thing on the left) and "Quiet + tidy" with the loose letters removed (it reads as a list, not a pile).

**States and finishing (2026-10-24).**
- **State fixes.** The field placeholder is #75665c (5.2:1 on the paper; it is the field's only visible label). A selected example chip gets a ✓, brighter text and a `--text-faint` edge (6.4:1), so it differs from hover by more than colour. The unselected half of Original | Tailored lights up on hover.
- **Change marks.** Reworded bullets get a ruby bar (`--paper-mark` #b3172a, 6.8:1 on the paper); kept bullets keep a dotted grey one (`--paper-mark-kept` #6b655f), so shape differs as well as colour.
- **Tooltip** (option C of three). Hovering or tapping a reworded bullet shows "Changed from the original" with a word-level diff (`src/lib/resume/diff.ts`): struck words were dropped, tinted words are new. Below that, a "Checked:" line lists the bullet's figures and named tools (`extractNumbers`, `technologiesOf`) as still present, plus "no new tools · no bigger claims". That line restates checks `verify.ts` already passed and never comes from the model. Kept bullets keep their one-line reason.
  - Contrast: struck words 8.7:1, new words 11.1:1, label and facts 8.7:1.
  - Rejected: a model-written "why it was reworded" note, because it can't be verified, would undercut "nothing invented", and would add latency.
- **Download while rewording.** The button becomes the progress bar: "Rewording N of M…", with an `--accent-fill` fill over `--accent-track` (#4a1518; Elmo #ffe3ad) and full opacity instead of the faded disabled look. The status line still announces progress.
- **Rejected:** a change count on the switch ("Tailored · 11"), because the marks already show it.

**Verify (2026-10-24).** The diagnostic scored 10/10 after these fixes:
- Field radius 22px → `--r-lg`.
- Panel radius 36px → 24px, so it nests with the page (8px corner + 16px padding).
- Raw 12px and 16px gaps → spacing tokens.
- 4rem of bottom room on the stacked layout, so the chat bubble no longer covers the trust line at the end of the page.

Accepted, with reasons:
- Example chips are 12px and 29px tall on phones (user's choice; above WCAG 2.5.8's 24px, below the 44px platform guideline).
- Heap tile sizes (15/16/34px) are decorative and `aria-hidden`.
- The panel keeps its faint top-left highlight inside the shade pool, the one "soft spotlight" item the slop pass flags. It is the panel's light-from-above, and removing it flattens the pool.
