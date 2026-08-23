import { useState } from 'react';
import { products, soldOutGifs } from '../data/shop';
import { SoldOutModal } from '../components/SoldOutModal';
import { Reveal } from '../components/Reveal';

export function Shop() {
  const [modal, setModal] = useState<{ item: string; gif: string } | null>(null);

  const open = (short: string) =>
    setModal({
      item: short,
      /* 50/50 coin flip on which gif you get. */
      gif: soldOutGifs[Math.random() < 0.5 ? 0 : 1],
    });

  return (
    <>
      <h1>Shop</h1>
      <div className="content-card">
        <p className="intro-text" style={{ textAlign: 'center', marginBottom: 0 }}>
          Hand-made originals. Limited runs. One of one.
          <span className="shop-tagline">
            Every piece is currently <strong>sold out</strong>. Restocking soon...
          </span>
        </p>
      </div>

      <div className="shop-grid">
        {products.map((p, i) => (
          <Reveal key={p.title} delay={i * 50}>
            <button type="button" className="product" onClick={() => open(p.short)}>
              <div className="product-frame">
                <img
                  src={p.image}
                  alt={p.alt}
                  onError={(e) => e.currentTarget.classList.add('img-missing')}
                />
                <span className="sold-badge">SOLD OUT</span>
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
