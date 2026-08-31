import { useEffect, useLayoutEffect, useMemo, useState } from 'react';

import { PetCounter } from './PetCounter';
import { usePetAssets } from '../hooks/usePetAssets';
import { frameScale, usePetEngine } from '../hooks/usePetEngine';
import { EFFECTS, FRAMES, FRAME_SRC, PET_IMAGES } from './petFrames';

/** How many motes get pulled into the hole. */
const DUST = 12;
/** Longest a mote can be in flight — how long the hole lingers after closing. */
const DUST_MAX_MS = 2400;

/**
 * The second easter egg. A bag hangs off the top-right corner until someone
 * pokes it, then Genova falls in, gets up, and pootles along the bottom of the
 * window striking JoJo poses. Throwing him through the hole in the left wall
 * ends it and puts the bag back.
 *
 * Three stacked elements rather than one, because three different things want
 * to write `transform` and they must not collide: the wrapper carries the rAF
 * loop's position and `scaleX(±1)` facing, the effect's own wrapper carries the
 * shake, and each <img> carries its own entrance. The manga overlay also has to
 * live outside the mirrored wrapper or the katakana renders backwards whenever
 * he turns around.
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

  /* The hole outlives its own dismissal. Unmounting the moment he stops being
     held would cut every mote off mid-flight, which reads as a rendering
     glitch rather than an ending — so it stays mounted and fades while the
     motes finish the trip they were already on. */
  const [holeMounted, setHoleMounted] = useState(false);

  /* The counter would give the easter egg away if it sat there on a fresh load,
     so it waits for someone to poke the bag. Latched rather than tied to
     `peeking`: he goes back in the corner when he escapes through the wall, and
     the number blinking out on the way would read as a bug. */
  const [found, setFound] = useState(false);
  useEffect(() => { if (!peeking) setFound(true); }, [peeking]);

  useEffect(() => {
    if (holeShown) {
      setHoleMounted(true);
      return;
    }
    const t = window.setTimeout(() => setHoleMounted(false), DUST_MAX_MS);
    return () => window.clearTimeout(t);
  }, [holeShown]);

  /* Fixed per mount: re-rolling these every render would make the dust jump. */
  const dust = useMemo(
    () =>
      Array.from({ length: DUST }, (_, i) => ({
        px: 55 + Math.random() * 150,
        py: (Math.random() - 0.5) * 150,
        size: 2 + Math.random() * 3,
        dur: 1.1 + Math.random() * 1.1,
        delay: (i / DUST) * 1.6 + Math.random() * 0.2,
      })),
    [],
  );

  /* All or nothing: a half-loaded set is a broken-image glyph in the corner. */
  if (assets !== 'ready') return null;

  const stand = window.innerWidth <= 620 ? 92 : 132;
  const f = FRAMES[frame];
  const s = frameScale(frame, stand);

  /* The peek shows a sliver of bag, but it is still the only way into the whole
     easter egg — so the target stays the size the pet used to be rather than
     the size of what is drawn. Deliberately larger than its own artwork. */
  const PEEK_HIT_W = stand * 0.72;
  const PEEK_HIT_H = stand * 0.85;

  /* The walk swaps frames four times a second; morphing between them turns a
     gait into pudding. Every other transition gets the stretch. */
  const isWalk = frame === 'walk_l' || frame === 'walk_r';

  const fx = effect ? EFFECTS[effect] : null;
  /* Normalised by the longest side so a wide banner and a tall column carry the
     same visual weight. */
  const fxScale = fx ? (stand * 1.2) / Math.max(fx.w, fx.h) : 1;
  const fxW = fx ? fx.w * fxScale : 0;
  const fxH = fx ? fx.h * fxScale : 0;

  return (
    <>
      {holeMounted && (
        <div
          className={`pet-hole${holeShown ? '' : ' is-closing'}`}
          style={holeStyle}
          aria-hidden="true"
        >
          {dust.map((d, i) => (
            <span
              key={i}
              className="pet-dust"
              style={
                {
                  '--px': `${d.px}px`,
                  '--py': `${d.py}px`,
                  '--s': `${d.size}px`,
                  '--dur': `${d.dur}s`,
                  '--delay': `${d.delay}s`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      )}

      {effect && fx && (
        <div className="pet-fx" ref={fxRef} aria-hidden="true">
          <span className="pet-fx-shake">
            <img
              src={FRAME_SRC(effect)}
              alt=""
              style={{
                width: fxW,
                height: fxH,
                /* Hung off the top of whichever body box is showing, not at a
                   fixed height — that is what makes one set of effects sit
                   correctly over a lying pose and a standing one. The overlap
                   is deliberate: manga sound effects crowd the figure. */
                left: -fxW / 2,
                top: -f.bh * s - fxH * 0.65,
              }}
            />
          </span>
        </div>
      )}

      {found && <PetCounter />}

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
          style={{
            /* Geometry in CSS rather than width/height attributes so it can be
               transitioned — see the morph note in components.css. */
            width: f.w * s,
            height: f.h * s,
            left: -f.ax * s,
            top: -f.ay * s,
            transitionDuration: isWalk ? '0ms' : undefined,
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
