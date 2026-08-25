import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { useBotStatus } from '../hooks/useBotStatus';

type Turn = { role: 'user' | 'assistant'; content: string };

const GREETING =
  "I'm a small language model running on Genova's laptop — ask me about his " +
  'work, or leave a message and I\'ll pass it along.';

const OPENERS = [
  'What is he working on?',
  'Walk me through the AFRL work',
  'Is he open to roles?',
];

/**
 * Chat bubble for the local Ollama gateway (bot/server.mjs).
 *
 * The whole widget is conditional on the gateway answering /health, because it
 * lives on a laptop that is usually asleep. Nothing renders while it is down —
 * no greyed-out button, no "currently offline" tooltip. A visitor who arrives
 * at the wrong moment sees the site exactly as it was before this existed.
 */
export function ChatWidget() {
  const { status, botUrl, markOffline } = useBotStatus();
  const { pathname } = useLocation();

  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  /* Follow the stream, but only when the reader is already at the bottom —
     yanking the view down while someone scrolls back is worse than a missed
     token. */
  useEffect(() => {
    const el = logRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [turns, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  /* Never leave a generation running against the laptop after the tab closes
     or the widget unmounts. */
  useEffect(() => () => abortRef.current?.abort(), []);

  const send = useCallback(
    async (text: string) => {
      const message = text.trim();
      if (!message || busy) return;

      setDraft('');
      setError(null);
      setBusy(true);

      const history: Turn[] = [...turns, { role: 'user', content: message }];
      setTurns([...history, { role: 'assistant', content: '' }]);

      const ctrl = new AbortController();
      abortRef.current = ctrl;

      try {
        const res = await fetch(`${botUrl}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history, page: pathname }),
          signal: ctrl.signal,
        });

        if (!res.ok || !res.body) {
          const detail = await res.text().catch(() => '');
          let reason = '';
          try {
            reason = (JSON.parse(detail) as { error?: string }).error ?? '';
          } catch {
            /* Non-JSON body means something in front of the gateway answered
               — a tunnel error page, usually. */
          }
          throw new Error(reason || `The bot returned ${res.status}.`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let received = false;

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.trim()) continue;
            let event: { t?: string; done?: boolean; error?: string };
            try {
              event = JSON.parse(line);
            } catch {
              continue;
            }
            if (event.error) throw new Error(event.error);
            if (event.t) {
              received = true;
              setTurns((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                next[next.length - 1] = { ...last, content: last.content + event.t };
                return next;
              });
            }
          }
        }

        /* A generation that produced only a lead sentinel, or nothing at all,
           would otherwise leave an empty bubble sitting there. */
        if (!received) {
          setTurns((prev) => {
            const next = [...prev];
            next[next.length - 1] = {
              role: 'assistant',
              content: "Sorry — I didn't manage an answer to that. Try rephrasing?",
            };
            return next;
          });
        }
      } catch (err) {
        if (ctrl.signal.aborted) return;

        /* A TypeError from fetch is the network itself failing — the lid
           closed mid-answer. Drop the widget rather than pretending. */
        if (err instanceof TypeError) markOffline();

        setError(err instanceof Error ? err.message : 'Something went wrong.');
        setTurns((prev) => {
          const last = prev[prev.length - 1];
          return last?.role === 'assistant' && !last.content ? prev.slice(0, -1) : prev;
        });
      } finally {
        setBusy(false);
        abortRef.current = null;
      }
    },
    [botUrl, busy, markOffline, pathname, turns],
  );

  if (status !== 'online') return null;

  return (
    <>
      <button
        type="button"
        className={`chat-fab${open ? ' is-open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="chat-panel"
        aria-label={open ? 'Close chat' : 'Chat with the site bot'}
      >
        {open ? '×' : '💬'}
      </button>

      {open && (
        <section id="chat-panel" className="chat-panel" role="dialog" aria-label="Site chat">
          <header className="chat-head">
            <span className="chat-dot" aria-hidden="true" />
            <div>
              <strong>Ask about Genova</strong>
              <small>Running locally. Answers may be imperfect.</small>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close chat">
              ×
            </button>
          </header>

          <div className="chat-log" ref={logRef} role="log" aria-live="polite">
            <p className="chat-msg bot">{GREETING}</p>

            {turns.map((turn, i) => (
              <p key={i} className={`chat-msg ${turn.role === 'user' ? 'me' : 'bot'}`}>
                {turn.content ||
                  (busy && i === turns.length - 1 ? (
                    <span className="chat-typing" aria-label="Thinking">
                      <i /><i /><i />
                    </span>
                  ) : null)}
              </p>
            ))}

            {turns.length === 0 && (
              <div className="chat-openers">
                {OPENERS.map((q) => (
                  <button key={q} type="button" onClick={() => send(q)}>
                    {q}
                  </button>
                ))}
              </div>
            )}

            {error && <p className="chat-error">{error}</p>}
          </div>

          <form
            className="chat-input"
            onSubmit={(e) => {
              e.preventDefault();
              send(draft);
            }}
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={draft}
              maxLength={1000}
              placeholder="Ask something…"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                /* Enter sends, Shift+Enter breaks the line — chat convention,
                   and the box is one row tall by default. */
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send(draft);
                }
              }}
            />
            <button type="submit" disabled={busy || !draft.trim()} aria-label="Send">
              ↑
            </button>
          </form>
        </section>
      )}
    </>
  );
}
