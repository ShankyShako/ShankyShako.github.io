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

## Content

Page content lives in `src/data/` as typed modules — edit those, not the JSX.
Adding a project or role is a one-object change; `nav` in `src/data/site.ts`
drives the tab bar, the routes' SEO tags, and the sitemap together.
