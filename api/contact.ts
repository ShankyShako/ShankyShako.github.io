import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

/**
 * Contact endpoint. Runs on Vercel, so the API key never reaches the browser.
 *
 * Uses the Node handler signature — `export default (req, res)` — because that
 * is what Vercel invokes for functions in /api. A Web-standard
 * `(Request) => Response` handler is NOT called with a Fetch Request here, and
 * fails at runtime the moment you touch `req.headers.get(...)`.
 *
 * `resend` must stay in `dependencies`, not `devDependencies`: Vercel prunes
 * dev deps when bundling the function, and the import fails at runtime.
 *
 * Keep this file self-contained — see the template banner below.
 *
 * Required env vars (set in the Vercel dashboard):
 *   RESEND_API_KEY  — from resend.com
 *   CONTACT_TO      — where mail lands (e.g. genova@gmango.dev)
 *   CONTACT_FROM    — verified sender on your domain (e.g. site@gmango.dev)
 */

/* ---------------------------------------------------------------------------
 * Email template.
 *
 * Deliberately kept in this file rather than a separate module. Vercel skips
 * `_`-prefixed paths under /api, and a helper placed there can be missing from
 * the deployed bundle — the import then fails at runtime and the function dies
 * with FUNCTION_INVOCATION_FAILED before running a line. One file, no import,
 * no ambiguity.
 *
 * Email clients are not browsers, so this uses table layout, fully inlined
 * styles, no external images, and width="100%" with max-width rather than a
 * fixed width attribute, which overflows on phones. A text/plain alternative
 * always ships alongside the HTML; HTML-only mail scores worse with filters.
 * ------------------------------------------------------------------------ */

type ContactMessage = {
  name: string;
  email: string;
  message: string;
  sentAt?: Date;
};

const RED = '#9b111e';
const GOLD = '#b8912f'; // darkened from the site's #d4af37 for contrast on white
const INK = '#1a1a1a';
const MUTED = '#6b6b6b';
const RULE = '#e6e2d9';
const CREAM = '#f5f1e8';

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}

/* Preserve the sender's paragraph breaks without relying on white-space:
   pre-wrap, which several clients drop. */
function toParagraphs(message: string) {
  return escapeHtml(message)
    .split(/\n{2,}/)
    .map(
      (block) =>
        `<p style="margin:0 0 14px;color:${INK};font-size:15px;line-height:1.65;">${block.replace(
          /\n/g,
          '<br />',
        )}</p>`,
    )
    .join('');
}

function buildContactEmail({ name, email, message, sentAt = new Date() }: ContactMessage) {
  const subject = `New message from ${name} — gmango.dev`;

  const stamp = sentAt.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Chicago',
  });

  /* Shown in the inbox list preview, then hidden in the body itself. */
  const preheader = `${name} <${email}> — ${message.slice(0, 90).replace(/\s+/g, ' ')}`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="color-scheme" content="light" />
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:${CREAM};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px;">${escapeHtml(
    preheader,
  )}</div>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${CREAM};padding:28px 12px;">
<tr>
<td align="center">

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background-color:#ffffff;border:1px solid ${RULE};border-radius:12px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">

    <tr>
      <td style="background-color:${RED};padding:20px 28px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="color:#ffffff;font-size:17px;font-weight:700;letter-spacing:0.3px;">gmango.dev</td>
            <td align="right" style="color:rgba(255,255,255,0.85);font-size:12px;letter-spacing:1.2px;text-transform:uppercase;">Contact form</td>
          </tr>
        </table>
      </td>
    </tr>
    <tr><td style="height:3px;background-color:${GOLD};font-size:0;line-height:0;">&nbsp;</td></tr>

    <tr>
      <td style="padding:28px 28px 8px;">
        <p style="margin:0 0 20px;color:${MUTED};font-size:13px;">${escapeHtml(stamp)}</p>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:22px;">
          <tr>
            <td width="70" style="padding:6px 0;color:${MUTED};font-size:12px;letter-spacing:0.8px;text-transform:uppercase;vertical-align:top;">From</td>
            <td style="padding:6px 0;color:${INK};font-size:15px;font-weight:600;">${escapeHtml(name)}</td>
          </tr>
          <tr>
            <td width="70" style="padding:6px 0;color:${MUTED};font-size:12px;letter-spacing:0.8px;text-transform:uppercase;vertical-align:top;">Email</td>
            <td style="padding:6px 0;font-size:15px;">
              <a href="mailto:${escapeHtml(email)}" style="color:${RED};text-decoration:none;font-weight:500;">${escapeHtml(email)}</a>
            </td>
          </tr>
        </table>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#fbfaf7;border-left:3px solid ${GOLD};border-radius:0 6px 6px 0;">
          <tr><td style="padding:18px 20px;">${toParagraphs(message)}</td></tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding:20px 28px 28px;">
        <a href="mailto:${escapeHtml(email)}?subject=${encodeURIComponent('Re: your message via gmango.dev')}"
           style="display:inline-block;background-color:${RED};color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:11px 22px;border-radius:6px;">Reply to ${escapeHtml(
             name,
           )}</a>
        <p style="margin:14px 0 0;color:${MUTED};font-size:12px;line-height:1.6;">
          Replying to this notification also reaches them — the reply-to address is set to ${escapeHtml(
            email,
          )}.
        </p>
      </td>
    </tr>

    <tr><td style="height:1px;background-color:${RULE};font-size:0;line-height:0;">&nbsp;</td></tr>
    <tr>
      <td style="padding:14px 28px;color:${MUTED};font-size:11px;line-height:1.6;">
        Sent by the contact form at gmango.dev.
      </td>
    </tr>

  </table>

</td>
</tr>
</table>
</body>
</html>`;

  const text = [
    `New message from gmango.dev`,
    ``,
    `From:  ${name}`,
    `Email: ${email}`,
    `Sent:  ${stamp}`,
    ``,
    `------------------------------------------------------------`,
    ``,
    message,
    ``,
    `------------------------------------------------------------`,
    ``,
    `Reply directly to this email to reach ${name} at ${email}.`,
  ].join('\n');

  return { subject, html, text };
}

const MAX = { name: 120, email: 200, message: 5000 };

/* Crude per-instance rate limit: enough to blunt casual floods. */
const hits = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const LIMIT = 3;

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > LIMIT;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const fwd = req.headers['x-forwarded-for'];
  const ip = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(',')[0]?.trim() || 'unknown';
  if (rateLimited(ip)) return res.status(429).json({ error: 'Slow down a moment.' });

  /* Vercel parses JSON bodies, but a string can still arrive if the client
     sent an unexpected content-type. */
  let body: Record<string, unknown>;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {});
  } catch {
    return res.status(400).json({ error: 'Malformed request.' });
  }

  const name = String(body.name ?? '').trim();
  const email = String(body.email ?? '').trim();
  const message = String(body.message ?? '').trim();
  const company = String(body.company ?? '').trim(); // honeypot

  /* A filled honeypot means a bot. Return success so it stops retrying. */
  if (company) return res.status(200).json({ ok: true });

  if (name.length < 2 || name.length > MAX.name) {
    return res.status(400).json({ error: 'Invalid name.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > MAX.email) {
    return res.status(400).json({ error: 'Invalid email.' });
  }
  if (message.length < 10 || message.length > MAX.message) {
    return res.status(400).json({ error: 'Invalid message.' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO;
  const from = process.env.CONTACT_FROM;

  if (!apiKey || !to || !from) {
    console.error('contact: missing RESEND_API_KEY / CONTACT_TO / CONTACT_FROM');
    return res.status(500).json({ error: 'Mail is not configured yet.' });
  }

  try {
    const { subject, html, text } = buildContactEmail({ name, email, message });

    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: `gmango.dev <${from}>`,
      to: [to],
      replyTo: email, // replying in your inbox goes straight to the sender
      subject,
      html,
      text, // HTML-only mail scores worse with spam filters
    });

    if (error) {
      /* Surface the provider's reason. These are configuration complaints
         ("The gmango.dev domain is not verified"), not secrets, and hiding
         them behind a generic string makes the form impossible to debug. */
      console.error('contact: resend error', error);
      const reason = typeof error.message === 'string' ? error.message : '';
      return res.status(502).json({
        error: reason ? `Mail service rejected the message: ${reason}` : 'Could not send. Try email instead.',
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('contact: unexpected', err);
    const reason = err instanceof Error ? err.message : '';
    return res.status(500).json({
      error: reason ? `Could not send: ${reason}` : 'Could not send. Try email instead.',
    });
  }
}
