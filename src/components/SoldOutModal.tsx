import { useCallback, useEffect, useRef, useState } from 'react';

/** How long the exit may take before we stop waiting for animationend. */
const EXIT_FALLBACK_MS = 250;

/** "Too late." — the shop's punchline. Escape, backdrop, and × all close it. */
export function SoldOutModal({
  item,
  gif,
  onClose,
}: {
  item: string;
  gif: string;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const [closing, setClosing] = useState(false);
  const closed = useRef(false);

  /* Unmounting is the parent's job, so every route out waits for the exit to
     play first. Called from the box's animationend, with a timer behind it in
     case the event never comes (a background tab, an animation overridden by a
     stylesheet). Whichever is first wins; the other is a no-op. */
  const finish = useCallback(() => {
    if (closed.current) return;
    closed.current = true;
    onClose();
  }, [onClose]);

  const close = useCallback(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return finish();
    setClosing(true);
  }, [finish]);

  useEffect(() => {
    if (!closing) return;
    const t = window.setTimeout(finish, EXIT_FALLBACK_MS);
    return () => window.clearTimeout(t);
  }, [closing, finish]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [close]);

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Sold out"
      data-closing={closing || undefined}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="modal-box"
        onAnimationEnd={(e) => {
          /* The stamp's own animationend bubbles up through here too. */
          if (closing && e.target === e.currentTarget) finish();
        }}
      >
        <button ref={closeRef} type="button" className="modal-close" onClick={close} aria-label="Close">
          ×
        </button>
        <h2 className="modal-eyebrow">Too late.</h2>
        <img
          className="modal-gif"
          src={gif}
          alt=""
          onError={(e) => e.currentTarget.classList.add('img-missing')}
        />
        <p className="modal-msg">
          Sold out. {item && <span>&ldquo;{item}&rdquo; is gone.</span>}
        </p>
        <p className="modal-sub">Should&rsquo;ve been faster.</p>
      </div>
    </div>
  );
}
