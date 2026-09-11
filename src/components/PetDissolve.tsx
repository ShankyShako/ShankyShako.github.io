import { useEffect, useRef } from 'react';

/** Canvases the sprite's pixels get dealt across. More reads finer, and costs. */
const LAYERS = 28;
/** How long one layer takes to drift out once it starts. */
const FLIGHT_MS = 900;
/** Spread between the first layer leaving and the last. */
const STAGGER_MS = 500;

export const DISSOLVE_MS = FLIGHT_MS + STAGGER_MS;

export type DissolveShot = {
  /** Sprite that was showing when it started. */
  src: string;
  /**
   * The pet wrapper's computed transform, replayed verbatim. The wrapper is a
   * 0x0 marker pinned at the viewport origin that carries position, rotation
   * and the scaleX that turns him around, so copying the matrix reproduces all
   * three at once — no bounding-box arithmetic, and nothing to get wrong while
   * he is mid-spin.
   */
  transform: string;
  /** The sprite's own box inside that frame, off the <img>'s inline geometry. */
  left: number;
  top: number;
  width: number;
  height: number;
  /** Some frames are drawn upside down. Baked into the pixels, not the CSS. */
  flipY: boolean;
};

type Props = DissolveShot & { onDone: () => void };

/**
 * He does not get to walk onto the research or experience pages, so he goes the
 * other way: every pixel dealt at random across a stack of canvases, each one
 * drifting off on its own schedule. The figure thins out from nowhere in
 * particular rather than fading as a whole, which is the difference between
 * disintegrating and turning down the opacity.
 *
 * Deliberately not the dust that gets pulled into the wall hole. That one
 * converges on a point because something is taking him; this one spreads,
 * because nothing is.
 *
 * Cheap because the pet is one same-origin PNG that usePetAssets has already
 * loaded and decoded: no library, no network, no tainted canvas. The pixel pass
 * runs once over at most 224x260 and then it is all compositor work.
 */
export function PetDissolve({
  src, transform, left, top, width, height, flipY, onDone,
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  /* onDone's identity changes on every parent render; the effect must not
     re-run and restart the animation because of it. */
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const node = host.current;
    if (!node) return;

    let cancelled = false;
    let timer = 0;

    const img = new Image();
    img.src = src;

    const build = () => {
      if (cancelled || !node) return;

      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (!w || !h) return void done.current();

      const cut = document.createElement('canvas');
      cut.width = w;
      cut.height = h;
      const cctx = cut.getContext('2d', { willReadFrequently: true });
      if (!cctx) return void done.current();

      /* Flip while drawing rather than in CSS, so the animation below owns the
         canvases' `transform` outright and has nothing to compose with. */
      if (flipY) {
        cctx.translate(0, h);
        cctx.scale(1, -1);
      }
      cctx.drawImage(img, 0, 0);

      let pixels: ImageData;
      try {
        pixels = cctx.getImageData(0, 0, w, h);
      } catch {
        /* Should not happen on same-origin art, but a tainted canvas throws and
           a missing effect is better than a crashed page. */
        return void done.current();
      }

      const bytes = pixels.data;
      const words = new Uint32Array(bytes.buffer);

      /* One ImageData per layer, every opaque pixel dealt to exactly one of
         them. Copying 32 bits at a time; the alpha test reads the byte view so
         it does not depend on the platform's endianness. */
      const sheets: ImageData[] = [];
      const views: Uint32Array[] = [];
      for (let i = 0; i < LAYERS; i++) {
        const sheet = cctx.createImageData(w, h);
        sheets.push(sheet);
        views.push(new Uint32Array(sheet.data.buffer));
      }
      for (let i = 0; i < words.length; i++) {
        if (bytes[i * 4 + 3] === 0) continue;
        views[(Math.random() * LAYERS) | 0][i] = words[i];
      }

      const frag = document.createDocumentFragment();
      for (let i = 0; i < LAYERS; i++) {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        c.className = 'pet-ash';
        c.getContext('2d')?.putImageData(sheets[i], 0, 0);

        /* Later layers travel further and lean harder, so the tail of the
           effect reads as drifting rather than as a second puff. */
        const t = i / (LAYERS - 1);
        c.style.cssText = [
          `left:${left}px`,
          `top:${top}px`,
          `width:${width}px`,
          `height:${height}px`,
          `--dx:${(18 + t * 46 + Math.random() * 16).toFixed(1)}px`,
          `--dy:${(-26 - t * 62 - Math.random() * 22).toFixed(1)}px`,
          `--rot:${((Math.random() - 0.5) * 26).toFixed(1)}deg`,
          `--blur:${(0.4 + t * 1.8).toFixed(2)}px`,
          `animation-delay:${Math.round(t * STAGGER_MS)}ms`,
          `animation-duration:${FLIGHT_MS}ms`,
        ].join(';');
        frag.appendChild(c);
      }

      node.style.transform = transform;
      node.appendChild(frag);

      timer = window.setTimeout(() => done.current(), DISSOLVE_MS);
    };

    if (img.complete) build();
    else {
      img.onload = build;
      /* A sprite that will not load has nothing to disintegrate. */
      img.onerror = () => done.current();
    }

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      /* The canvases were appended by hand, so React will not take them back.
         Without this a re-run stacks a second set on top of the first, which
         StrictMode does on every mount in development. */
      node.replaceChildren();
    };
  }, [src, transform, left, top, width, height, flipY]);

  return <div ref={host} className="pet-dissolve" aria-hidden="true" />;
}
