import { useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { products, soldOutGifs } from '../data/shop';
import { SoldOutModal } from '../components/SoldOutModal';
import { Reveal } from '../components/Reveal';

/** How long the stamp gets on the card before the modal covers it. */
const STAMP_BEAT_MS = 560;
/** When the stamp hits the card, as a share of its 340ms slam (see .stamp). */
const STAMP_IMPACT_MS = 190;
/** Older stamps fall off once a card has this many. */
const MAX_STAMPS = 3;

type Stamp = { id: number; rot: number; x: number; y: number };

const between = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

export function Shop() {
  const [modal, setModal] = useState<{ item: string; gif: string } | null>(null);
  const [stamps, setStamps] = useState<Record<string, Stamp[]>>({});
  const nextId = useRef(0);
  const modalTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(modalTimer.current), []);

  const open = (short: string, e: MouseEvent<HTMLButtonElement>) => {
    /* The first stamp lands near the middle where the badge was; repeat
       clicks pile up crooked around it. */
    const first = !stamps[short]?.length;
    const stamp: Stamp = {
      id: nextId.current++,
      rot: first ? between(-12, -6) : between(-18, 14),
      x: first ? 0 : between(-14, 14),
      y: first ? 0 : between(-18, 18),
    };
    setStamps((s) => ({ ...s, [short]: [...(s[short] ?? []), stamp].slice(-MAX_STAMPS) }));

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!still) {
      /* The card takes the hit: a short dip timed to the stamp's impact. */
      e.currentTarget.querySelector('.product-frame')?.animate(
        [{ transform: 'none' }, { transform: 'translateY(3px) scale(0.975)' }, { transform: 'none' }],
        { duration: 240, delay: STAMP_IMPACT_MS, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      );
    }

    /* One modal per burst of clicks; extra clicks only add stamps. */
    if (modalTimer.current !== undefined) return;
    modalTimer.current = window.setTimeout(() => {
      modalTimer.current = undefined;
      setModal({
        item: short,
        /* 50/50 coin flip on which gif you get. */
        gif: soldOutGifs[Math.random() < 0.5 ? 0 : 1],
      });
    }, STAMP_BEAT_MS);
  };

  return (
    <>
      <h1>Shop</h1>
      <p className="page-intro">
        Hand-made originals. Limited runs. One of one.
        <span className="shop-tagline">Every piece is sold out. Restocking soon.</span>
      </p>

      <div className="shop-grid">
        {products.map((p, i) => (
          <Reveal key={p.title} delay={i * 40}>
            <button type="button" className="product" onClick={(e) => open(p.short, e)}>
              <div className="product-frame" data-stamped={stamps[p.short]?.length ? true : undefined}>
                <img
                  src={p.image}
                  alt={p.alt}
                  onError={(e) => e.currentTarget.classList.add('img-missing')}
                />
                <span className="sold-badge">SOLD OUT</span>
                {stamps[p.short]?.map((s) => (
                  <span
                    key={s.id}
                    className="stamp"
                    aria-hidden="true"
                    style={
                      {
                        '--rot': `${s.rot}deg`,
                        '--x': `${s.x}px`,
                        '--y': `${s.y}px`,
                      } as React.CSSProperties
                    }
                  >
                    Too late
                  </span>
                ))}
              </div>
              <div className="product-info">
                <h3>{p.title}</h3>
                <p className="price">
                  <s>{p.price}</s>
                </p>
              </div>
            </button>
          </Reveal>
        ))}
      </div>

      {modal && <SoldOutModal item={modal.item} gif={modal.gif} onClose={() => setModal(null)} />}
    </>
  );
}
