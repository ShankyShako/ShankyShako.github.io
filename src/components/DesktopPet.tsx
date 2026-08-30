import { useLayoutEffect } from 'react';

import { usePetAssets } from '../hooks/usePetAssets';
import { frameScale, usePetEngine } from '../hooks/usePetEngine';
import { EFFECTS, FRAMES, FRAME_SRC, PET_IMAGES } from './petFrames';

/**
 * The second easter egg. A cutout of Genova hangs off the top-right corner
 * until someone pokes it, then falls in, gets up, and pootles along the bottom
 * of the window striking poses.
 *
 * Two elements rather than one. The sprite's wrapper carries `scaleX(±1)` so
 * he can face either way; the manga overlay has to sit outside that or the
 * katakana renders mirrored every time he turns around. Both are placed by the
 * same rAF pass in usePetEngine, which owns every transform on this page —
 * React only ever hears about which frame is showing.
 */
export function DesktopPet() {
  const assets = usePetAssets(PET_IMAGES);
  const {
    wrapRef, fxRef, frame, effect, peeking, place, holeShown, holeStyle, handlers,
  } = usePetEngine();

  /* Position anything that just mounted before the browser paints it. Without
     this the overlay flashes once at the window's top-left corner, because the
     rAF loop does not get to write its transform until the following frame. */
  useLayoutEffect(place, [place, effect, assets]);

  /* All or nothing: a half-loaded set is a broken-image glyph in the corner. */
  if (assets !== 'ready') return null;

  const stand = window.innerWidth <= 620 ? 92 : 132;
  /* The peek shows a sliver of bag, but it is still the only way into the whole
     easter egg — so the target stays the size the pet used to be rather than
     the size of what is drawn. Deliberately larger than its own artwork. */
  const PEEK_HIT_W = stand * 0.72;
  const PEEK_HIT_H = stand * 0.85;
  const f = FRAMES[frame];
  const s = frameScale(frame, stand);
  const fx = effect ? EFFECTS[effect] : null;
  const fxScale = fx ? (stand * 0.85) / Math.max(fx.w, fx.h) : 1;

  return (
    <>
      {/* The way out. Only drawn while he is held or airborne — the rest of the
          time the page has no business carrying a smudge in its margin. */}
      {holeShown && <div className="pet-hole" style={holeStyle} aria-hidden="true" />}

      {effect && fx && (
        <div className="pet-fx" ref={fxRef} aria-hidden="true">
          <img
            src={FRAME_SRC(effect)}
            alt=""
            width={fx.w * fxScale}
            height={fx.h * fxScale}
            style={{
              /* Up and behind his head, in his own coordinate space — the
                 wrapper's origin is his feet. */
              left: -(fx.w * fxScale) / 2,
              top: -stand * 1.15,
            }}
          />
        </div>
      )}

      <div
        ref={wrapRef}
        className={`pet${peeking ? ' is-peek' : ''}`}
        aria-hidden="true"
        {...handlers}
      >
        <img
          className="pet-frame"
          src={FRAME_SRC(frame)}
          alt=""
          draggable={false}
          width={f.w * s}
          height={f.h * s}
          /* Offset so his ground-contact point lands on the wrapper's origin.
             Every frame is a different crop, so this is per-frame data, not a
             constant. */
          style={{
            left: -f.ax * s,
            top: -f.ay * s,
            /* About the image's own centre, so the box the engine positions is
               untouched — this turns the picture over, not the sprite's
               footprint. */
            transform: f.flipY ? 'scaleY(-1)' : undefined,
          }}
        />
        {/* The wrapper is a 0x0 origin marker and the sprite is
            pointer-events:none, so without this nothing is clickable. Sized to
            his body rather than the PNG: the file also contains the bag and a
            margin of transparency, and an invisible rectangle that wide would
            swallow clicks meant for the page behind him. */}
        <span
          className="pet-hit"
          style={
            peeking
              ? {
                  left: -PEEK_HIT_W * 0.55,
                  top: -PEEK_HIT_H * 0.2,
                  width: PEEK_HIT_W,
                  height: PEEK_HIT_H,
                }
              : {
                  left: -(f.bw * s) / 2,
                  top: -f.bh * s,
                  width: f.bw * s,
                  height: f.bh * s,
                }
          }
        />
      </div>
    </>
  );
}
