/**
 * Contact-notification email template.
 *
 * Filename starts with `_` so Vercel treats it as a helper module rather than
 * a route in /api.
 *
 * Email clients are not browsers. Constraints this template respects:
 *  - table-based layout, because Outlook's Word renderer ignores flex/grid
 *  - every style inlined; <style> blocks in <head> are stripped by Gmail
 *  - width="100%" with max-width:600px, never a fixed width="600" attribute:
 *    the attribute wins over max-width and overflows on phones
 *  - no external images, which are blocked by default and hurt spam scoring
 *  - a text/plain alternative is always sent alongside; HTML-only mail scores
 *    worse with spam filters
 */

export type ContactMessage = {
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

export function buildContactEmail({ name, email, message, sentAt = new Date() }: ContactMessage) {
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
