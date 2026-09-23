/**
 * Client for the bot's /tailor endpoint. Sends the query and bullet ids (the
 * bot looks the text up itself) and yields rewrites as they stream in.
 */
export async function* tailorStream(
  botUrl: string,
  query: string,
  ids: string[],
  signal: AbortSignal,
): AsyncGenerator<{ id: string; text: string }> {
  const res = await fetch(`${botUrl}/tailor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: query.slice(0, 6000), ids }),
    signal,
  });
  if (!res.ok || !res.body) {
    const why = await res.json().catch(() => null);
    throw new Error(why?.error ?? `HTTP ${res.status}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.trim()) continue;
      const evt = JSON.parse(line);
      if (evt.r) yield evt.r;
      if (evt.error) throw new Error(evt.error);
    }
  }
}
