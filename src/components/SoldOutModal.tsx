import { useEffect, useRef } from 'react';

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

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Sold out"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-box">
        <button ref={closeRef} type="button" className="modal-close" onClick={onClose} aria-label="Close">
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
