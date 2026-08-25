import { useCallback, useEffect, useRef, useState } from 'react';

export type BotStatus = 'checking' | 'online' | 'offline';

/* Trailing slash would produce `//health`, which some proxies 404. */
const BOT_URL = (import.meta.env.VITE_BOT_URL ?? '').trim().replace(/\/$/, '');

const PROBE_TIMEOUT_MS = 2500;
const POLL_MS = 90_000;

/**
 * Liveness probe for the chat gateway, which runs on a laptop and is therefore
 * offline most of the time — closed lid, no wifi, tunnel not started. The
 * widget renders nothing until this says `online`, so the site degrades to
 * exactly what it was before rather than showing a button that fails.
 *
 * With `VITE_BOT_URL` unset this short-circuits to `offline` and never touches
 * the network, which is what preview deploys and `npm run dev` get by default.
 */
export function useBotStatus() {
  const [status, setStatus] = useState<BotStatus>(BOT_URL ? 'checking' : 'offline');
  const alive = useRef(true);

  const probe = useCallback(async () => {
    if (!BOT_URL) return;
    try {
      const res = await fetch(`${BOT_URL}/health`, {
        signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
        cache: 'no-store',
      });
      /* The gateway answers 503 when Ollama is down or the model is not
         pulled — up enough to reply, not up enough to be useful. */
      if (alive.current) setStatus(res.ok ? 'online' : 'offline');
    } catch {
      if (alive.current) setStatus('offline');
    }
  }, []);

  useEffect(() => {
    if (!BOT_URL) return;
    alive.current = true;
    probe();

    const timer = setInterval(probe, POLL_MS);

    /* A laptop that went to sleep takes the bot with it, and a laptop that
       woke up brings it back. Re-check on focus rather than making people
       wait out the interval. */
    const onVisible = () => {
      if (document.visibilityState === 'visible') probe();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      alive.current = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [probe]);

  /* Lets the widget hide itself the moment a send fails, instead of leaving a
     dead button up until the next poll. */
  const markOffline = useCallback(() => setStatus('offline'), []);

  return { status, botUrl: BOT_URL, recheck: probe, markOffline };
}
