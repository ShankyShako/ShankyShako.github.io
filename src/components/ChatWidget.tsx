import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useBotStatus } from '../hooks/useBotStatus';
import { useAudio } from '../context/AudioContext';
import { ENTITY_BY_ALIAS, ENTITY_PATTERN } from '../data/entities';

/**
 * Actions the gateway is willing to hand the browser. Every field has already
 * been validated server-side against a fixed menu — in particular `href` is
 * resolved from a key the model chose, never a URL the model wrote — so this
 * component can act on them without re-checking.
 */
type Action =
  | { type: 'link'; href: string; label: string; kind: 'route' | 'file' | 'external' }
  | { type: 'suggest'; items: string[] }
  | { type: 'music'; state: 'on' | 'off' };

type Turn = { role: 'user' | 'assistant'; content: string; actions?: Action[] };

const GREETING =
  "I'm a small language model running on Genova's laptop — ask me about his " +
  'work, or leave a message and I\'ll pass it along.';

const OPENERS = [
  'What is he working on?',
  'Walk me through the AFRL work',
  'Is he open to roles?',
];

/* The server allows a longer message in JD mode; matching the cap here means
   the paste is refused by the textarea rather than silently truncated. */
const MAX_CHARS = { chat: 1000, jd: 6000 };

/**
 * Strips markdown the model emits despite being told not to.
 *
 * The prompt asks for plain text and an 8B model mostly complies — but "mostly"
 * means a `[label](url)` lands in the bubble as punctuation soup every dozen
 * replies. Formatting is cheap to enforce deterministically and expensive to
 * keep arguing about in the prompt, so it is enforced here.
 *
 * Runs at render on the accumulated text, so a span still arriving mid-stream
 * simply resolves on the next token rather than needing its own buffer.
 */
function plain(text: string) {
  return text
    .replace(/\[([^\]\n]+)\]\([^)\n]*\)/g, '$1') // [label](url) → label
    /* Bare URLs. The prompt forbids them and the model writes them anyway —
       and it is always a duplicate of the button sitting right underneath.
       Swallow the connector in front ("at", "see", ":") so the sentence still
       reads, and stop short of the sentence's own full stop so removing a
       trailing URL does not take the period with it. */
    .replace(
      /\s*(?:\b(?:at|on|see|via|from|here)\b[:\s]*|:\s*)?\(?https?:\/\/[^\s)]*[^\s).,;:!?]\)?/gi,
      '',
    )
    .replace(/\s+([.,;!?])/g, '$1') // tidy the gap a removal left behind
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/^[ \t]+/gm, '') // a stripped URL can leave the line indented
    .replace(/(\*\*|__)(.+?)\1/g, '$2') // bold
    .replace(/`([^`\n]+)`/g, '$1') // inline code
    .replace(/^#{1,6}\s+/gm, '') // headers
    .replace(/^\s*[-*+]\s+/gm, '• ')
    /* A model that drafted its answer before speaking wraps the whole thing in
       quotes. A reply that is nothing but one quoted block is that, not a
       quotation. */
    .replace(/^\s*["“]([\s\S]+)["”]\s*$/, '$1'); // list markers
}

/* ---------------------------------------------------------------------------
 * Icons.
 *
 * SVG rather than emoji: 💬 and 📋 render as a different picture on every
 * platform, ignore `color` so they never follow the theme, and cannot carry a
 * badge. These inherit `currentColor`, so Elmo mode recolours them for free.
 * ------------------------------------------------------------------------ */
const svg = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

function ChatIcon() {
  return (
    <svg {...svg} aria-hidden="true">
      <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg {...svg} aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

/* A posting, not a clipboard — the ruled lines are what make it read as a
   document you paste rather than a list you tick. */
function PostingIcon() {
  return (
    <svg {...svg} width={18} height={18} aria-hidden="true">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M8.5 12h7M8.5 16h4.5" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg {...svg} width={18} height={18} aria-hidden="true">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

/**
 * Turns names the model mentioned into links to the card they came from.
 *
 * The prompt already requires every claim to name its source — that rule is
 * there to make fabrication harder, since inventing a capability also means
 * inventing a role it came from. This piggybacks on it: having been named,
 * "AFRL" may as well be clickable, and matching a fixed alias table in code is
 * work the model does not have to spend attention on.
 *
 * First mention of each entity only. A reply that says "ransomware research"
 * three times should not turn into three identical links.
 */
function linkify(text: string, go: (href: string) => void) {
  const nodes: ReactNode[] = [];
  const linked = new Set<string>();
  let cursor = 0;

  for (const match of text.matchAll(ENTITY_PATTERN)) {
    const entity = ENTITY_BY_ALIAS.get(match[0].toLowerCase());
    if (!entity || linked.has(entity.href)) continue;

    const at = match.index;
    if (at > cursor) nodes.push(text.slice(cursor, at));
    nodes.push(
      <button
        key={at}
        type="button"
        className="chat-inline-link"
        onClick={() => go(entity.href)}
        title={`Go to ${entity.label}`}
      >
        {match[0]}
      </button>,
    );

    linked.add(entity.href);
    cursor = at + match[0].length;
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return { nodes, linked };
}

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
  const navigate = useNavigate();
  const { started, muted, toggleMute } = useAudio();

  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Job-description mode is a per-message thing, not a conversation state: it
     buys one long paste and a longer answer, then reverts. */
  const [jdMode, setJdMode] = useState(false);

  /* Badge state. Starts as an invitation ("+") and becomes a count once the
     bot has answered something the visitor has not looked at. */
  const [unread, setUnread] = useState(0);

  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  /* A [[MUSIC]] action can land several seconds into a stream, by which point
     the closure that started it has stale audio state. */
  const audioRef = useRef({ started, muted });
  audioRef.current = { started, muted };

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
    if (open) {
      inputRef.current?.focus();
      setUnread(0);
    }
  }, [open]);

  /* A reply can land seconds after the panel was closed, by which point the
     closure that started the request has a stale `open`. */
  const openRef = useRef(open);
  openRef.current = open;

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

      const mode = jdMode ? 'jd' : 'chat';

      setDraft('');
      setJdMode(false);
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
          body: JSON.stringify({
            /* Strip actions back out — the model wrote the words, not the
               buttons, and re-feeding them wastes context. */
            messages: history.map(({ role, content }) => ({ role, content })),
            page: pathname,
            music: !started ? 'silent' : muted ? 'muted' : 'playing',
            mode,
          }),
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
            let event: { t?: string; a?: Action; reset?: boolean; done?: boolean; error?: string };
            try {
              event = JSON.parse(line);
            } catch {
              continue;
            }

            if (event.error) throw new Error(event.error);

            /* The model narrated its reasoning before answering, and the
               gateway spotted the handoff. Everything shown so far was
               working, not speech — clear the bubble and take the answer. */
            if (event.reset) {
              setTurns((prev) => {
                const next = [...prev];
                next[next.length - 1] = { ...next[next.length - 1], content: '' };
                return next;
              });
              continue;
            }

            if (event.t) {
              received = true;
              setTurns((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                next[next.length - 1] = { ...last, content: last.content + event.t };
                return next;
              });
            }

            if (event.a) {
              const action = event.a;
              received = true;

              /* Music applies itself; the rest wait for a click. */
              if (action.type === 'music') {
                const { started: on, muted: isMuted } = audioRef.current;
                if (on && (action.state === 'off') !== isMuted) toggleMute();
              } else {
                setTurns((prev) => {
                  const next = [...prev];
                  const last = next[next.length - 1];
                  next[next.length - 1] = { ...last, actions: [...(last.actions ?? []), action] };
                  return next;
                });
              }
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
        if (!openRef.current) setUnread((n) => n + 1);
      }
    },
    [botUrl, busy, jdMode, markOffline, muted, pathname, started, toggleMute, turns],
  );

  if (status !== 'online') return null;

  const renderActions = (turn: Turn, isLast: boolean, alreadyLinked: Set<string>) =>
    turn.actions?.map((action, k) => {
      if (action.type === 'link') {
        /* The text already links this one inline; a button under it would be
           the same destination twice. */
        if (alreadyLinked.has(action.href)) return null;

        if (action.kind === 'route') {
          return (
            <button
              key={k}
              type="button"
              className="chat-chip solid"
              onClick={() => {
                navigate(action.href);
                setOpen(false); // they asked to see the page; get out of the way
              }}
            >
              {action.label} →
            </button>
          );
        }
        return (
          <a
            key={k}
            className="chat-chip solid"
            href={action.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {action.label} ↗
          </a>
        );
      }

      /* Follow-ups go stale the moment the conversation moves on. */
      if (action.type === 'suggest' && isLast && !busy) {
        return (
          <Fragment key={k}>
            {action.items.map((item) => (
              <button key={item} type="button" className="chat-chip" onClick={() => send(item)}>
                {item}
              </button>
            ))}
          </Fragment>
        );
      }
      return null;
    });

  return (
    <>
      <button
        type="button"
        className={`chat-fab${open ? ' is-open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="chat-panel"
        aria-label={
          open
            ? 'Close chat'
            : unread > 0
              ? `Chat with the site bot, ${unread} unread`
              : 'Chat with the site bot'
        }
      >
        {open ? (
          <CloseIcon />
        ) : (
          <>
            <ChatIcon />
            {/* The label lives on the button, so the badge is decoration. */}
            <span className={`chat-badge${unread > 0 ? ' is-count' : ''}`} aria-hidden="true">
              {unread > 0 ? unread : '+'}
            </span>
          </>
        )}
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
              <CloseIcon />
            </button>
          </header>

          <div className="chat-log" ref={logRef} role="log" aria-live="polite">
            <p className="chat-msg bot">{GREETING}</p>

            {turns.map((turn, i) => {
              const isLast = i === turns.length - 1;
              const body = plain(turn.content).trimEnd();

              /* Only the bot's own words get linked. Echoing a visitor's
                 message back to them with links in it would be strange. */
              const { nodes, linked } =
                turn.role === 'assistant'
                  ? linkify(body, (href) => {
                      navigate(href);
                      setOpen(false);
                    })
                  : { nodes: [body] as ReactNode[], linked: new Set<string>() };

              return (
                <div key={i} className={`chat-row ${turn.role === 'user' ? 'me' : 'bot'}`}>
                  {/* No empty bubble when a reply is nothing but a button —
                      an empty rounded rectangle reads as a bug. */}
                  {(body || (busy && isLast)) && (
                    <p className={`chat-msg ${turn.role === 'user' ? 'me' : 'bot'}`}>
                      {body ? nodes : (
                        <span className="chat-typing" aria-label="Thinking">
                          <i /><i /><i />
                        </span>
                      )}
                    </p>
                  )}
                  {turn.actions && (
                    <div className="chat-chips">{renderActions(turn, isLast, linked)}</div>
                  )}
                </div>
              );
            })}

            {turns.length === 0 && (
              <div className="chat-chips">
                {OPENERS.map((q) => (
                  <button key={q} type="button" className="chat-chip" onClick={() => send(q)}>
                    {q}
                  </button>
                ))}
                <button
                  type="button"
                  className="chat-chip solid"
                  onClick={() => {
                    setJdMode(true);
                    inputRef.current?.focus();
                  }}
                >
                  Match a job description
                </button>
              </div>
            )}

            {error && <p className="chat-error">{error}</p>}
          </div>

          {jdMode && (
            <p className="chat-jd-note">
              Paste the posting — I&rsquo;ll map it against his experience, gaps included.
              <button type="button" onClick={() => setJdMode(false)} aria-label="Cancel">
                <CloseIcon />
              </button>
            </p>
          )}

          <form
            className="chat-input"
            onSubmit={(e) => {
              e.preventDefault();
              send(draft);
            }}
          >
            <button
              type="button"
              className={`chat-mode${jdMode ? ' active' : ''}`}
              onClick={() => setJdMode((v) => !v)}
              aria-pressed={jdMode}
              title="Match a job description"
              aria-label="Match a job description"
            >
              <PostingIcon />
            </button>
            <textarea
              ref={inputRef}
              rows={jdMode ? 5 : 1}
              value={draft}
              maxLength={jdMode ? MAX_CHARS.jd : MAX_CHARS.chat}
              placeholder={jdMode ? 'Paste the job description…' : 'Ask something…'}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                /* Enter sends, Shift+Enter breaks the line — chat convention,
                   and the box is one row tall by default. Not in JD mode:
                   postings are full of blank lines, and firing off half a
                   paste is not a mistake worth allowing. */
                if (e.key === 'Enter' && !e.shiftKey && !jdMode) {
                  e.preventDefault();
                  send(draft);
                }
              }}
            />
            <button type="submit" disabled={busy || !draft.trim()} aria-label="Send">
              <SendIcon />
            </button>
          </form>
        </section>
      )}
    </>
  );
}
