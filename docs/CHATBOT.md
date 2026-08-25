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

---

## 1. Pull the model

```bash
ollama pull qwen3:8b
```

5.2 GB. On the M5 that answers in about 3 seconds warm, and roughly 15 on the
first message of the day while the weights load.

### Why this one

| Model          | Size   | Notes                                                        |
| -------------- | ------ | ------------------------------------------------------------ |
| **`qwen3:8b`** | 5.2 GB | **Recommended on the Mac.** Measurably more grounded than 4b — it is the difference between answering a thin question honestly and filling the gap with plausible ML vocabulary, which is the failure mode that actually costs you in an interview. |
| `qwen3:4b`     | 2.6 GB | The right choice on a 6 GB GPU (see below). Perfectly good; embellishes a little more freely. |
| `llama3.2:3b`  | 2.0 GB | Fallback, no thinking mode to disable. More prone to inventing details. |
| `qwen3:1.7b`   | 1.4 GB | Instant, but drifts off-persona. The floor. |
| `gemma3:4b`    | 3.3 GB | Nicer prose, weaker at following a long rule list — and this prompt is a long rule list. |

Swapping is one env var — `BOT_MODEL` — and a restart.

### On the second laptop (GTX 1660 Ti Mobile, 6 GB VRAM)

**Run `qwen3:4b` there, not 8b.** The 16 GB of system RAM is not the binding
constraint; the 6 GB of VRAM is, and the arithmetic does not work:

| | qwen3:8b | qwen3:4b |
| --- | --- | --- |
| weights (Q4_K_M) | 5.2 GB | 2.6 GB |
| KV cache @ 8192 ctx | ~1.2 GB | ~0.6 GB |
| compute buffers | ~0.4 GB | ~0.3 GB |
| **total** | **~6.8 GB** — over | **~3.5 GB** — fits |

Over budget means Ollama offloads layers to the CPU, and a partially offloaded
8B on a mobile Turing card runs at maybe a third of the speed. Job-description
mode makes it worse, not better: `BOT_JD_NUM_CTX=16384` pushes an 8B model to
roughly 8 GB.

Because `BOT_MODEL` is per-machine config in `bot/.env`, this costs nothing —
same code, `qwen3:8b` on the Mac, `qwen3:4b` on the Windows laptop. If you do
want 8b there, set `BOT_NUM_CTX=4096` and `BOT_JD_NUM_CTX=6144` and expect it
to be slow rather than broken.

The three big models already on the Mac (`qwen3.6:27b`, `deepseek-v2:16b`,
`qwen-summarizer`) are all far too heavy to keep resident for a chat bubble.

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

## 6. Running it on a different machine

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

## 7. Keep it running

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

## 8. Teach it about you

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

## What the bot can do besides talk

Replies stream token by token, and the model can also act on the page by
printing a directive on its own line. The gateway strips those out before the
browser sees them and turns the valid ones into `{"a": ...}` events.

| Directive              | Effect                                                    |
| ---------------------- | --------------------------------------------------------- |
| `[[LINK]] key`         | A button under the answer. "Where's the resume?" → *Right here.* + a Resume button that routes client-side. Max two per reply. |
| `[[SUGGEST]] a \| b`   | Up to three follow-up chips. Shown only on the newest turn — older ones go stale. |
| `[[MUSIC]] on\|off`    | Mutes or unmutes the background music, when it is running. |
| `[[LEAD]] {json}`      | Emails you. **Never forwarded to the browser at all.**     |

Link keys come in two shapes. `/experience` goes to the page;
`/experience#afrl-sensors-directorate` scrolls to that one card and flashes it
for two seconds. The prompt tells the model to prefer the second whenever a
question is about one specific role or project — sending someone to a page of
five entries when they asked about AFRL is the "guess where it is" problem the
deep links exist to solve.

Those slugs come from `src/data/anchors.ts`, which is also what the pages use
to write their `id=` attributes. One module, so a link the bot offers always
lands on a card that exists.

### The rule that makes this safe

**The model picks a key from a menu; it never authors a URL.** Valid keys live
in `bot/links.generated.json`, written by `build-context.mjs` from `src/data`,
and the same list is rendered into the prompt so the menu the model sees and
the menu the server accepts cannot drift apart. Anything unrecognised is
dropped and logged.

That distinction is the whole security story for this feature. A model that
could emit arbitrary hrefs is one successful prompt injection away from
serving phishing links under your domain's chat bubble. A model that can only
say `/resume` or `federated-blockchain` can, at worst, link a visitor to a
page of your own site.

The same reasoning is why there is no directive that writes, deletes, submits a
form, or spends anything. The bot's entire capability surface is: navigate,
suggest, mute, and email Genova.

The gateway also tells the model, each turn, which page the visitor is on and
whether music is playing — allowlisted values from the client, not free text.
That is what lets it answer "turn the music off" without guessing, and stops it
offering a link to the page already on screen.

Adding a link is a `src/data` change plus `npm run bot:context`. Adding a
*kind* of action means a case in `resolve()` in `bot/server.mjs`, a branch in
`renderActions()` in `ChatWidget.tsx`, and a paragraph in `00-persona.md`.

---

## Job-description mode

The highest-value thing on the site for a recruiter: they paste a posting, and
the bot maps it against Genova's actual experience — including where he does
not match.

The 📋 button beside the chat input turns it on, and it is offered as a chip on
the first turn so people discover it. It is a per-message mode, not a
conversation state: one long paste, one longer answer, then back to normal.

Server-side it selects a different profile, because a chat turn and a pasted
posting want different budgets:

| | chat | jd |
| --- | --- | --- |
| max message | 1000 chars | 8000 chars |
| `num_ctx` | `BOT_NUM_CTX` (8192) | `BOT_JD_NUM_CTX` (16384) |
| `num_predict` | `BOT_MAX_TOKENS` (400) | `BOT_JD_MAX_TOKENS` (700) |
| extra prompt | — | `bot/modes/jd.md` |

Two deliberate details. The long message allowance applies only to the turn
being sent, not to the whole back-scroll — otherwise a posting would be
replayed on every subsequent turn and the context would grow without bound. And
`bot/modes/jd.md` is loaded per request rather than folded into the base
prompt, so a "where's the resume?" turn does not pay for 600 tokens of
job-matching instructions.

`bot/modes/jd.md` is worth reading and editing — it is what makes the bot admit
gaps instead of claiming he matches everything. A bot that says yes to every
posting is worth nothing to a recruiter, and they will notice.

---

## The question log

Every question lands in `bot/questions.jsonl` — gitignored, never leaves the
laptop.

```bash
npm run bot:questions        # last 30 days
npm run bot:questions 7      # last week
```

You get counts, which pages people ask from, and — the actually useful part —
the questions themselves, newest first. **A question the bot gets asked twice
is a question the site should have answered on the page.** That is free user
research from people who were interested enough to type.

Addresses are hashed against a salt generated once into `bot/.log-salt` (mode
600, gitignored) rather than stored. That still tells one visitor from another,
which is all the log is for, without keeping a record of who read what. Set
`BOT_LOG_QUESTIONS=false` to turn it off entirely.

---

## What is actually protecting the laptop

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

**"NetworkError when attempting to fetch", fan spinning, nothing on screen.**
The classic one, and it is almost never the network. Check the gateway's
startup lines — `npm run bot` measures the real prompt size against `num_ctx`
and says so:

```
[bot] warmup: 7,666 prompt tokens in 9.5s (806 tok/s)
[bot] STOP: the system prompt is 7,666 tokens and BOT_NUM_CTX is 8,192 — 94% …
```

That state means the prompt loads and leaves nothing for the conversation. On a
small GPU the model plus KV cache stops fitting in VRAM, the prompt pass spills
to CPU, and it grinds — Ollama's log shows `POST /api/chat` returning 500 after
exactly `5m0s`, and cloudflared logs `context canceled` because the browser gave
up long before. Raise `BOT_NUM_CTX` to the value the STOP message names, or trim
`bot/knowledge/*.md`.

The gateway reports itself unhealthy in that state, so the site hides the chat
button rather than offering one that hangs.

### How much context fits in VRAM

KV cache grows linearly with `num_ctx`. For `qwen3:4b` (36 layers, 8 KV heads,
128 head dim, fp16) on a **6 GB GTX 1660 Ti**:

| `num_ctx` | KV cache | model + KV + buffers | verdict |
| --------- | -------- | -------------------- | ------- |
| 8 192     | 1.12 GB  | 4.12 GB              | fits, but too small for the prompt |
| **12 288**| 1.69 GB  | **4.69 GB**          | **the sweet spot on this card** |
| 16 384    | 2.25 GB  | 5.25 GB              | fits; needed for JD mode |
| 20 480    | 2.81 GB  | 5.81 GB              | spills to CPU |

`qwen3:8b` roughly doubles the weights to ~5.2 GB and does **not** leave room
for a usable KV cache on 6 GB. Run 8b on the 24 GB Mac and 4b on the 1660 Ti —
`BOT_MODEL` is per-machine config, so one repo serves both.

Job-description mode carries its own budget (`BOT_JD_NUM_CTX`, default 16384)
because a pasted posting is 1-2k tokens before the model writes anything.

---

**Replies are slow to start.** First message after an idle period pays for
loading the weights. Raise `BOT_KEEP_ALIVE`.

**It invents things.** This is the failure mode to actually worry about, and no
amount of prompt-wording fully removes it. Observed on 8b during setup: asked
about AFRL with only the site blurb to go on, it produced "low-light imagery"
and "mode collapse, mitigated by adjusting the payoff structure" — fluent,
confident, and entirely made up.

Two things helped, in this order:

1. **Fill in `20-about.md`.** The model embellishes where the context is thin.
   Thin context is the cause; more rules are not the cure.
2. **`BOT_TEMPERATURE`** is 0.4 rather than the usual 0.7. Sampling temperature
   is the biggest single dial on willingness to invent a plausible detail.

The prompt's hard rules cover the rest, and the residual tends to be small
overreach in the *last* sentence of an answer — "the repo includes detailed
documentation" — rather than wholesale fiction. Watch that sentence when you
spot-check it.

**It emits markdown.** It will, occasionally, whatever the prompt says. That is
why `plain()` in `ChatWidget.tsx` strips it at render rather than the prompt
being asked to guarantee it. If a new artefact shows up, add it there — a
deterministic three-line regex beats another paragraph of instructions.

**It answers with its own reasoning out loud.** `BOT_THINK` is not `false`, or
the model ignores the flag. Check `bot/.env`.

**Replies get cut off mid-sentence.** `BOT_MAX_TOKENS` is doing its job.
Raise it, or tighten the length instruction in `00-persona.md` — preferably the
second one.
