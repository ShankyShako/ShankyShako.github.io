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
 * Required env vars (set in the Vercel dashboard):
 *   RESEND_API_KEY  — from resend.com
 *   CONTACT_TO      — where mail lands (e.g. genova@gmango.dev)
 *   CONTACT_FROM    — verified sender on your domain (e.g. site@gmango.dev)
 */

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

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
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
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: `gmango.dev <${from}>`,
      to: [to],
      replyTo: email, // replying in your inbox goes straight to the sender
      subject: `gmango.dev — ${name}`,
      html: `
        <h2>New message from gmango.dev</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <hr />
        <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
      `,
    });

    if (error) {
      console.error('contact: resend error', error);
      return res.status(502).json({ error: 'Could not send. Try email instead.' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('contact: unexpected', err);
    return res.status(500).json({ error: 'Could not send. Try email instead.' });
  }
}
