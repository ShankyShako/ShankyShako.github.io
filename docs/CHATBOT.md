# The site chat bot

A small open-weight model, running on Genova's laptop, answering questions
about him on gmango.dev — and emailing him when someone wants to be contacted.

The point of the exercise is that it is *his* model on *his* hardware. No API
key pointed at somebody else's inference. The cost of that honesty is that the
laptop is asleep most of the time, so the whole widget is conditional: the site
probes the bot on load and, if it does not answer, renders nothing at all.

```
  Browser on gmango.dev  (Vercel, static)
        │
        │  GET  /health   every 90s + on tab focus   → button appears or doesn't
        │  POST /chat     NDJSON stream of tokens
        ▼
  Tailscale Funnel or Cloudflare Tunnel   ← public HTTPS, no open ports
        ▼
  bot/server.mjs   :8787                  ← CORS, rate limits, system prompt,
        │                                    lead capture. Zero dependencies.
        ▼
  Ollama  127.0.0.1:11434                 ← never exposed to the internet
```

**Ollama is not published directly, and should not be.** Its API has no auth,
no rate limit, and lets the caller choose the model, replace the system prompt,
and ask for unbounded generations. Putting that on a public URL hands a
stranger the GPU. `bot/server.mjs` is the part that is safe to expose.

---

## 1. Pull the model

```bash
ollama pull qwen3:4b
```

~2.6 GB. On any recent Apple Silicon machine with 16 GB or more, that answers
fast enough that a four-sentence reply lands in about a second. Pull it on
**the machine that will host the bot**, not necessarily the one you develop on
— see [Running it somewhere else](#running-it-somewhere-else).

### Why this one

| Model          | Size   | Notes                                                        |
| -------------- | ------ | ------------------------------------------------------------ |
| **`qwen3:4b`** | 2.6 GB | **Recommended.** Best instruction-following per byte at this size — it actually respects a long list of persona rules, which is the whole job here. Thinking mode is switched off (`BOT_THINK=false`) so it does not burn tokens the visitor never sees. |
| `qwen3:8b`     | 5.2 GB | Noticeably better at synthesis and at staying grounded. Worth it if the host machine has 16 GB+ and is not doing anything else. Try it once the persona is dialled in and see whether you can tell. |
| `llama3.2:3b`  | 2.0 GB | Good fallback, no thinking mode to disable. Slightly more prone to inventing plausible-sounding details, which is the failure mode that matters most for a resume bot. |
| `qwen3:1.7b`   | 1.4 GB | Fast enough to feel instant, but it drifts off-persona and pads. Only if you want the absolute floor. |
| `gemma3:4b`    | 3.3 GB | Nicer prose, weaker at following a long rule list. |

Swapping is one env var — `BOT_MODEL` — and a restart. Nothing else changes.

The big models already on the dev machine (`qwen3.6:27b`, `deepseek-v2:16b`,
`qwen-summarizer`) are all far too heavy to keep resident for a chat bubble.

---

## 2. Configure

```bash
cp bot/.env.example bot/.env
```

Then edit `bot/.env`. The only value you must set is `RESEND_API_KEY`, and only
if you want lead emails — everything else has a working default. Reuse the same
Resend key the contact form uses (Vercel → project → Settings → Environment
Variables). Without it the bot still runs and just logs leads to the console.

`bot/.env` is gitignored. Do not put the key in `.env.example`.

---

## 3. Run it locally and try it

```bash
npm run bot
```

That regenerates the facts file from `src/data/*.ts`, then starts the gateway
on `:8787`. Check it:

```bash
curl -s localhost:8787/health
```

You want `{"ok":true,...,"modelInstalled":true}`. Then, in a second terminal:

```bash
npm run dev
```

`http://localhost:5173` is already in the allowed-origins default, so the chat
button appears at the bottom right as soon as the gateway is up. Close the
gateway, wait ~90 seconds or switch tabs and back, and the button disappears —
that is the availability check doing its job.

---

## 4. Put it on the internet

Two good options. **Tailscale Funnel** gets you working in five minutes.
**Cloudflare Tunnel** is the better permanent answer, because gmango.dev is
already on Cloudflare and you end up with `bot.gmango.dev` instead of a
machine-name URL.

### Option A — Tailscale Funnel

```bash
brew install --cask tailscale
```

Open the app, sign in, then:

```bash
tailscale funnel --bg 8787
```

Three things to know:

- Funnel needs **HTTPS certificates enabled** for your tailnet: admin console →
  **DNS** → **Enable HTTPS**. If it is off, the command tells you and links you
  to the switch.
- Funnel also needs the `funnel` node attribute in your tailnet policy. On a
  personal tailnet the first run prints the exact link to grant it.
- `tailscale funnel status` prints your public URL. It looks like
  `https://your-macbook.tailXXXX.ts.net`.

> **`serve` instead of `funnel` = a private bot.** `tailscale serve --bg 8787`
> publishes to your tailnet only, so the chat button appears for you and your
> own devices and is invisible to everyone else. Genuinely useful for showing
> the thing off in an interview without leaving your laptop exposed for weeks.

### Option B — Cloudflare Tunnel

```bash
brew install cloudflared
cloudflared tunnel login
cloudflared tunnel create gmango-bot
cloudflared tunnel route dns gmango-bot bot.gmango.dev
```

Then `~/.cloudflared/config.yml`:

```yaml
tunnel: gmango-bot
credentials-file: /Users/shankyshako/.cloudflared/<TUNNEL-ID>.json
ingress:
  - hostname: bot.gmango.dev
    service: http://localhost:8787
  - service: http_status:404
```

```bash
cloudflared tunnel run gmango-bot
```

You get `https://bot.gmango.dev`, on your own domain, with Cloudflare absorbing
anything abusive before it reaches the laptop. The DNS record it creates is a
proxied CNAME and does not collide with anything in [DEPLOY.md](DEPLOY.md) —
it is a new subdomain, and it touches neither the apex A records nor any MX or
TXT record.

---

## 5. Tell the site where to find it

Vercel → project → **Settings** → **Environment Variables**:

| Key            | Value                                    |
| -------------- | ---------------------------------------- |
| `VITE_BOT_URL` | `https://bot.gmango.dev` (no trailing slash) |

Tick Production, Preview, and Development, then **redeploy** — Vite inlines
`VITE_*` values at build time, so an existing deploy will not pick it up.

Two consequences of that inlining, both fine but worth knowing:

- The URL ends up visible in the JS bundle. It has to be; the browser is what
  calls it. This is why the gateway rate-limits rather than relying on secrecy.
- **With `VITE_BOT_URL` unset the widget short-circuits** — no button, no
  probe, no request ever leaves the page. The component still ships in the
  bundle (a couple of KB), it simply never renders. That is the right default
  for previews.

Last step: add your public origin to `BOT_ALLOWED_ORIGINS` in `bot/.env` if you
serve the site anywhere other than `gmango.dev`, then restart the gateway.

---

## Running it somewhere else

The bot should live on whichever machine has the most reliable uptime, and that
does not have to be the one you write code on. The split works cleanly:

- **`bot/` has zero dependencies.** No `npm install` on the host — just Node 20+
  and Ollama. Everything it needs is in the standard library.
- **It does need the repo**, though, because `build-context.mjs` reads
  `src/data/*.ts` to regenerate the facts file. Clone it:

  ```bash
  git clone https://github.com/ShankyShako/ShankyShako.github.io.git
  cd ShankyShako.github.io
  cp bot/.env.example bot/.env      # then fill in RESEND_API_KEY
  npm run bot
  ```

- **The tunnel runs on the host too** — whichever of §4's options you pick, it
  points at that machine's `localhost:8787`.
- **`git pull` on the host after any content change.** Editing `src/data/` or
  `bot/knowledge/` on the dev machine and deploying the site does not move
  those files to the host; only a pull does. If the bot starts describing an
  outdated version of a project, this is why.

Node 20+ is the one real requirement, because `build-context.mjs` relies on
Node stripping the types when it imports the `.ts` data modules directly. On
older Node it fails immediately with a syntax error rather than silently
producing a stale file.

---

## 6. Keep it running

`npm run bot` dies with the terminal. To have it come back on login and restart
if it crashes, save this as
`~/Library/LaunchAgents/dev.gmango.bot.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>dev.gmango.bot</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/node</string>
    <string>/Users/shankyshako/Documents/Homework/AI/ShankyShako.github.io/bot/server.mjs</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>/tmp/gmango-bot.log</string>
  <key>StandardErrorPath</key><string>/tmp/gmango-bot.err</string>
</dict>
</plist>
```

```bash
launchctl load ~/Library/LaunchAgents/dev.gmango.bot.plist
```

Two paths to fix before this works on the host machine: run `which node`
(Homebrew on Apple Silicon usually puts it at `/opt/homebrew/bin/node`, not
`/usr/local/bin/node`), and correct the path to `server.mjs` to wherever you
cloned the repo there.

Ollama's menubar app already starts itself at login, and both tunnels can be
installed as services (`tailscale funnel --bg` persists; `cloudflared service
install` for Cloudflare).

**None of this defeats the lid.** A closed laptop means no bot, which is
exactly why the site checks first.

---

## 7. Teach it about you

This is the part that decides whether the bot is impressive or embarrassing,
and it is the only part no amount of engineering substitutes for.

`bot/knowledge/` is loaded alphabetically into the system prompt, and re-read
whenever a file changes — **edit a file and the next message reflects it, no
restart.**

| File                | What it is                                                        |
| ------------------- | ----------------------------------------------------------------- |
| `00-persona.md`     | Voice, boundaries, and the lead-capture protocol. Tune the tone here. |
| `10-site-facts.md`  | **Generated** from `src/data/*.ts` by `bot/build-context.mjs`. Never edit it — change the site data and it follows. |
| `20-about.md`       | **The one you fill in.** Everything the site does not say. |
| `*.local.md`        | Gitignored. Anything you would not publish to a public repo. |

`20-about.md` ships as a questionnaire with the answers left blank. Filling it
in is the difference between a bot that paraphrases your projects page and one
that can say *why* the game-theoretic GAN framing was the interesting part.

The highest-value sections, in order: what you are looking for right now; the
through-line connecting five scattered-looking roles; what was actually hard in
the AFRL and ransomware work; and three or four opinions you will defend.

### Should the prompt live in the model instead?

You can bake it in with a Modelfile:

```
FROM qwen3:4b
SYSTEM """...everything from bot/knowledge/..."""
PARAMETER temperature 0.7
```

```bash
ollama create gmango-bot -f bot/Modelfile   # then BOT_MODEL=gmango-bot
```

**It is not worth it here**, for three reasons:

1. **No speed win.** Ollama already caches the processed prompt prefix in the
   KV cache between requests, and `server.mjs` puts the knowledge first
   precisely so that prefix is byte-identical every time. Baking it in
   re-processes exactly the same tokens.
2. **You lose the hot reload.** Right now you edit `20-about.md`, send a
   message, and hear the difference. With a Modelfile every tweak is an
   `ollama create` and a restart, which is enough friction that the persona
   stops getting tuned.
3. **You lose the generated half.** `10-site-facts.md` is derived from
   `src/data/*.ts` on every start, so adding a project to the site cannot
   leave the bot describing an outdated one. A baked prompt goes stale silently.

The one case where a Modelfile earns its keep: handing someone a single
self-contained artifact — `ollama create` then `ollama push` — so they can run
the bot without this repo. Not the situation.

---

## 8. What is actually protecting the laptop

CORS is in there, but treat it as cosmetic — `curl` ignores it entirely. It
stops another website embedding your bot as theirs; it stops nothing else. The
real limits, all in `LIMITS` at the top of `bot/server.mjs`:

- **12 chat requests per IP per minute**, and at most **2 generations at once**
  across all visitors. This is the one that matters. Without it a single script
  pins the GPU indefinitely.
- **1000 chars per message, 12 turns of history, 400 tokens out, 8192 ctx.**
  Bounded work per request, and bounded KV cache.
- **No client control over anything.** Model, system prompt, temperature, and
  length all live server-side. The browser sends conversation turns and a page
  path, and that is all that is read off the request.
- **No public lead endpoint.** Lead emails only fire from inside a completed
  generation, when the model prints its sentinel. A `/lead` route on a public
  URL would be an open spam relay. Even so, leads are capped at one per IP per
  10 minutes and 20 per hour globally, because a visitor *can* talk the model
  into printing the sentinel.
- **Prompt injection is assumed, not prevented.** `00-persona.md` tells the
  model to ignore instructions inside visitor messages, which helps and is not
  a guarantee. The reason that is acceptable: the bot has no tools, no file
  access, and no ability to send anything except a capped, rate-limited email
  to Genova's own inbox. The blast radius of a successful injection is a rude
  answer and possibly one junk email.

Worth an occasional look at `/tmp/gmango-bot.log` for `[bot] lead` lines and
429s.

---

## Troubleshooting

**Button never appears.** In the browser console, `fetch('<VITE_BOT_URL>/health')`.
`TypeError` means the tunnel is down or the origin is not in
`BOT_ALLOWED_ORIGINS`. A `503` means the gateway is up but Ollama is not, or
`BOT_MODEL` names something you have not pulled — `curl -s localhost:8787/health`
says which. If the console shows no request at all, `VITE_BOT_URL` was not set
at build time; redeploy.

**Button appears, messages fail.** Almost always CORS: the browser blocks the
response and `fetch` throws a `TypeError`, which makes the widget hide itself.
Check the exact origin, scheme and all, against `BOT_ALLOWED_ORIGINS`.

**Replies are slow to start.** First message after an idle period pays for
loading the weights. Raise `BOT_KEEP_ALIVE`.

**It invents things.** Expected at 4B, and the reason `20-about.md` matters.
Add the correct fact rather than adding another rule telling it not to lie.
If it persists, try `qwen3:8b` — the jump in groundedness is the clearest
quality difference between the two sizes.

**It answers with its own reasoning out loud.** `BOT_THINK` is not `false`, or
the model ignores the flag. Check `bot/.env`.

**Replies get cut off mid-sentence.** `BOT_MAX_TOKENS` is doing its job.
Raise it, or tighten the length instruction in `00-persona.md` — preferably the
second one.
