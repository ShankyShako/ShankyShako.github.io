# Deploying gmango.dev

Starting state (verified 2026-08-23):

- Nameservers: `olga.ns.cloudflare.com`, `melnicoff.ns.cloudflare.com` — DNS is
  already managed in Cloudflare, so no nameserver migration is needed.
- Apex `gmango.dev`: four A records pointing at GitHub Pages
  (`185.199.108–111.153`)
- `www`: CNAME → `shankyshako.github.io`
- **No MX records, no TXT records** — email is a clean slate.

Do the steps in order. Steps 1–3 do not touch the live site; step 4 is the only
cutover, and it is reversible.

---

## 1. Receive mail at genova@gmango.dev (Cloudflare Email Routing)

Free, and independent of everything else.

1. Go to <https://dash.cloudflare.com> → select **gmango.dev**.
2. Sidebar → **Email** → **Email Routing** → **Get started**.
3. Under **Custom addresses**, create:
   - Custom address: `genova@gmango.dev`
   - Action: **Send to an email**
   - Destination: `genova.mongalo@gmail.com`
4. Cloudflare emails that Gmail address a verification link. Click it.
5. Cloudflare then offers to **add the required DNS records automatically**.
   Accept. It adds three `route*.mx.cloudflare.net` MX records and one SPF TXT
   record. Let it do this rather than typing them by hand.
6. Send yourself a test message at `genova@gmango.dev` and confirm it lands.

Optional: enable **Catch-all** to route anything `@gmango.dev` to the same
inbox — useful for per-service addresses like `netflix@gmango.dev`.

> **This is receive-only.** Replies from Gmail will still come *from* your
> gmail.com address. To send *as* `genova@gmango.dev`, add it in Gmail under
> Settings → Accounts → "Send mail as", using SMTP credentials from Resend
> (step 2). Do that after Resend is verified.

---

## 2. Sending mail for the contact form (Resend)

1. Sign up at <https://resend.com>.
2. **Domains** → **Add Domain** → `gmango.dev`. Pick the region closest to you.
3. Resend shows a set of DNS records. Expect roughly:

   | Type | Name                        | Value                                    |
   | ---- | --------------------------- | ---------------------------------------- |
   | MX   | `send`                      | `feedback-smtp.<region>.amazonses.com` (priority 10) |
   | TXT  | `send`                      | `v=spf1 include:amazonses.com ~all`      |
   | TXT  | `resend._domainkey`         | long DKIM public key                     |

   Copy the exact values from the Resend dashboard — the region varies.

4. Add each one in Cloudflare → **DNS** → **Records** → **Add record**.
   Leave all of them **DNS only** (grey cloud). MX and TXT records are never
   proxied anyway.

   > **Why this doesn't break step 1:** Resend's MX record sits on the `send`
   > subdomain, while Cloudflare Email Routing's MX records sit on the apex.
   > Two MX sets at the *same* name would conflict; these are at different
   > names, so both work. Do not "tidy up" by moving Resend's MX to the apex.

5. Back in Resend, click **Verify**. It usually completes in a few minutes.
6. **API Keys** → **Create API Key** → permission **Sending access**. Copy the
   `re_...` value now; it is shown once.

`CONTACT_FROM` (`site@gmango.dev`) is send-only and needs no mailbox — it just
has to be on the verified domain.

---

## 3. Deploy to Vercel (still no DNS change)

1. Push the branch if you haven't: `git push -u origin react-migration`
2. <https://vercel.com> → sign in **with GitHub** → **Add New** → **Project** →
   import the `ShankyShako.github.io` repo.
3. Framework preset should auto-detect **Vite** (from `vercel.json`). Build
   command `npm run build`, output directory `dist`. Leave as detected.
4. Before the first deploy, open **Environment Variables** and add all three,
   ticking **Production**, **Preview**, *and* **Development** for each:

   | Key              | Value                             |
   | ---------------- | --------------------------------- |
   | `RESEND_API_KEY` | the `re_...` key from step 2      |
   | `CONTACT_TO`     | `genova@gmango.dev`               |
   | `CONTACT_FROM`   | `site@gmango.dev`                 |

   If these are missing the form returns "Mail is not configured yet."

5. Deploy. You get a `*.vercel.app` URL. **Test it there before touching DNS:**
   - right-click the profile photo → Elmo mode flips and music starts
   - navigate to another tab → music keeps playing without a gap
   - open `/projects` directly in a new tab → loads (not a 404)
   - submit the contact form → the message arrives in your Gmail
   - a shop item → "Too late." modal
6. When it all works, merge to `main` so production tracks it:
   ```
   git checkout main && git merge react-migration && git push
   ```
   (Or set **Settings → Git → Production Branch** to `react-migration`.)

---

## 4. Point the domain at Vercel (the cutover)

Only after step 3 checks out.

1. Vercel → project → **Settings** → **Domains** → add `gmango.dev`, then
   `www.gmango.dev`.
2. Vercel displays the exact records it wants. **Use the values it shows** —
   Vercel has changed its apex IP and its CNAME targets are now per-project, so
   don't copy values from an old blog post.
3. In Cloudflare → **DNS** → **Records**, delete exactly these:

   | Name                                | Type | Value                          |
   | ----------------------------------- | ---- | ------------------------------ |
   | `gmango.dev`                        | A    | `185.199.108.153` (and .109, .110, .111 — four records) |
   | `www`                               | CNAME| `shankyshako.github.io`        |
   | `_github-pages-challenge-shankyshako` | TXT | Pages verification token — delete *after* the cutover works |

   Then add the apex and `www` records Vercel specified.

   > **Sort the list by Type before deleting anything.** Five rows are named
   > `gmango.dev`: four are the A records above, the rest are MX and TXT
   > records that must survive. Deleting by name will take out your mail.

   **Everything below stays. Do not touch it:**

   | Name                  | Type | Purpose                                   |
   | --------------------- | ---- | ----------------------------------------- |
   | `gmango.dev`          | MX   | `route1/2/3.mx.cloudflare.net` — inbound mail (3 records, locked) |
   | `gmango.dev`          | TXT  | `v=spf1 include:_spf.mx.cloudflare.net ~all` |
   | `cf2024-1._domainkey` | TXT  | Cloudflare Email Routing DKIM (locked)    |
   | `send`                | MX   | `feedback-smtp.us-east-1.amazonses.com`   |
   | `send`                | TXT  | `v=spf1 include:amazonses.com ~all`       |
   | `resend._domainkey`   | TXT  | Resend DKIM                               |

   A 🔒 padlock means Cloudflare manages the record for Email Routing. Nothing
   locked should ever be deleted here.

   > **The apex SPF looks incomplete but is correct.** It lists Cloudflare and
   > not Amazon SES, even though the contact form sends via Resend. SPF
   > validates the *envelope* sender, which Resend places on `send.gmango.dev`,
   > and that subdomain's SPF does include `amazonses.com`. DKIM at
   > `resend._domainkey` is what aligns with the visible `From` address. Adding
   > SES to the apex SPF is unnecessary.

4. Set both new records to **DNS only** (grey cloud, not orange). Vercel issues
   and renews its own TLS certificate. Proxying through Cloudflare on top of
   that causes a redirect loop unless Cloudflare's SSL/TLS mode is
   **Full (strict)** — simplest to leave it unproxied.
5. Wait for Vercel's domain status to go green (certificate issuance, a few
   minutes). Then load `https://gmango.dev` and re-run the step 3 checks.
6. Optional: in the GitHub repo, **Settings → Pages**, set Source to **None**,
   so the old site can't be served by accident.

### Rolling back

Re-add the four A records on the apex and point `www` back to
`shankyshako.github.io`. GitHub Pages will serve `main` again — which is why
it's worth keeping the old markup at `legacy-index.html` until you're settled.

---

## Afterwards

- `npm run build` regenerates `sitemap.xml`; submit `https://gmango.dev/sitemap.xml`
  once in Google Search Console so the new per-section URLs get indexed.
- Every push to the production branch redeploys. Pull requests get their own
  preview URL automatically.
