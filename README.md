# gmango.dev

Personal site for Genova Mongalo. Vite + React + TypeScript, deployed on Vercel.

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

`build` runs `tsc`, then Vite, then `scripts/prerender-meta.mjs`, which writes a
per-route `index.html` with that route's title/description/OG tags baked in
(social scrapers don't run JS), plus `sitemap.xml` and `robots.txt`.

## Contact form

`api/contact.ts` runs as a Vercel function and sends through Resend. Set these
environment variables in the Vercel dashboard:

| Variable         | Example              | Notes                              |
| ---------------- | -------------------- | ---------------------------------- |
| `RESEND_API_KEY` | `re_...`             | from resend.com                    |
| `CONTACT_TO`     | `genova@gmango.dev`  | where messages land                |
| `CONTACT_FROM`   | `site@gmango.dev`    | must be on a Resend-verified domain |

The form is protected by a hidden honeypot field and a per-instance rate limit.

## Pose counter

`api/stats.ts` counts how many poses the desktop pet has struck for everyone
who has ever found him, and prints the total under his feet. Storage is
Upstash Redis over its REST API — no driver, no connection to keep warm.

| Variable                  | Notes                                            |
| ------------------------- | ------------------------------------------------ |
| `UPSTASH_REDIS_REST_URL`  | from the Upstash console                          |
| `UPSTASH_REDIS_REST_TOKEN`| the same database's REST token                    |
| `ADMIN_STATS_KEY`         | any long random string; unlocks the full breakdown |

Without them the endpoint answers `204` and no counter is drawn — the pet is
otherwise unaffected. Only the pose count is ever public. Activations, throws,
escapes, idle poses, Elmo toggles, and chat usage are recorded too, and read
back only with the key:

```
curl 'https://gmango.dev/api/stats?key=<ADMIN_STATS_KEY>'
```

A wrong key gets the ordinary public answer rather than a 401, so the endpoint
does not advertise that there is anything behind it. Counts are batched in the
browser and flushed every ten seconds (and on tab close via `sendBeacon`), and
`DNT: 1` visitors read the number without contributing to it.

## Chat bot

An optional chat bubble, bottom right, backed by a small Ollama model running
on Genova's laptop behind a tunnel — not a hosted API. Because the laptop is
usually asleep, the site probes the gateway's `/health` before rendering
anything; when it does not answer, the widget does not exist. With
`VITE_BOT_URL` unset it never renders and never probes at all, which is what
previews and `npm run dev` get by default.

```bash
ollama pull qwen3:4b
cp bot/.env.example bot/.env
npm run bot
```

`bot/server.mjs` is a zero-dependency gateway: it holds the system prompt,
rate-limits callers, and emails Genova when a visitor wants to be contacted.
Ollama itself stays on `127.0.0.1` and is never exposed.

Replies stream token by token, and the model can attach buttons to an answer —
"where's the resume?" comes back with a Resume button, and a question about one
role deep-links to that card and flashes it. It does that by naming a key from a
server-side menu (`bot/links.generated.json`), never by writing a URL: a model
that can emit arbitrary hrefs is one prompt injection away from serving phishing
links under your own domain.

Two things beyond chat: paste a job description (📋 in the composer) and it maps
the posting against his actual experience, gaps included; and every question is
appended to a local `bot/questions.jsonl`, which `npm run bot:questions`
summarises. A question asked twice is one the site should have answered itself. What the bot knows
lives in `bot/knowledge/` — `10-site-facts.md` is generated from `src/data/` so
it cannot drift from the site, and `20-about.md` is where the context that
isn't on any page goes.

Full setup, model comparison, and tunnel options: [docs/CHATBOT.md](docs/CHATBOT.md).

## Easter eggs

Preserved from the original site — don't "clean these up":

- **Elmo mode** — right-click (desktop) or long-press (mobile) the profile
  photo. Inverts the palette to black-and-red, swaps the portrait for the
  decoy, and switches the soundtrack. `src/components/ProfilePhoto.tsx`
- **Silent start** — music and the volume bar stay hidden until that first
  Elmo interaction. `src/context/AudioContext.tsx`
- **Crossfade decks** — two `<audio>` elements alternate a 2-track playlist per
  theme, random starting track, 700ms crossfade. The decks live in the app
  shell so navigation never interrupts playback.
- **Shop** — everything is sold out. Clicking a piece opens "Too late." with a
  50/50 coin flip between two gifs.
- **Image protection** — social previews point at the watermarked decoy, never
  the master; right-click/drag saving is deterred site-wide.
- **Devtools trap** — `src/hooks/useDevtoolsTrap.ts`, production builds only so
  `npm run dev` stays usable.
- **Volume bar sits bottom-left**, not bottom-right — the chat bubble has the
  right corner. Don't move it back.

## Content

Page content lives in `src/data/` as typed modules — edit those, not the JSX.
Adding a project or role is a one-object change; `nav` in `src/data/site.ts`
drives the tab bar, the routes' SEO tags, and the sitemap together.
