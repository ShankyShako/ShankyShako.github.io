/**
 * Sprite table for the desktop pet.
 *
 * The masters in assets-src/pet/ are phone photos — 1024px canvases holding a
 * person who fills a quarter of the frame, shot from a different distance every
 * time. `scripts/prep-pet.py` crops each to its content, scales it so the body's
 * long side is 260px, and emits the numbers below. Without that normalisation he
 * doubles in size between frames.
 *
 * Coordinates are in the shipped PNG's own pixels:
 *   w,h     the file's dimensions
 *   bw,bh   the person's bounding box inside it (a prop like the bag is excluded,
 *           which is why `land` is 352 wide but only 260 of that is him)
 *   ax,ay   his ground-contact point — horizontal centre, lowest pixel. The
 *           engine puts this point on the floor, so a frame can carry as much
 *           empty space or scenery as it likes without drifting.
 *   flipY   draw the picture upside down. Applied to the <img> about its own
 *           centre, so the footprint the engine reasons about is unchanged.
 *   k       how tall this pose really is next to standing. `max(bw,bh)` says a
 *           kneeling body is 260 too, so kneeling would render at full standing
 *           height and look inflated. Measured by eye against `idle`.
 */
export type FrameMeta = {
  w: number; h: number;
  bw: number; bh: number;
  ax: number; ay: number;
  k: number;
  flipY?: boolean;
};

export type FrameKey =
  | 'idle' | 'walk_l' | 'walk_r'
  | 'fall' | 'land' | 'drag' | 'fly'
  | 'pose_1' | 'pose_2' | 'pose_3' | 'pose_4' | 'pose_5' | 'pose_6'
  | 'bag';

export const FRAMES: Record<FrameKey, FrameMeta> = {
  idle:   { w:  80, h: 260, bw:  80, bh: 260, ax:  40.2, ay: 260.0, k: 1.00 },
  walk_l: { w: 171, h: 260, bw: 171, bh: 260, ax:  85.6, ay: 260.0, k: 1.00 },
  walk_r: { w: 146, h: 260, bw: 146, bh: 260, ax:  73.1, ay: 260.0, k: 1.00 },

  /* Lying flat: body length reads as standing height, so k stays 1. */
  fall:   { w: 260, h: 103, bw: 260, bh: 103, ax: 130.0, ay: 103.4, k: 1.00 },
  land:   { w: 352, h:  80, bw: 260, bh:  80, ax: 222.4, ay:  80.4, k: 1.00 },
  drag:   { w: 260, h: 113, bw: 260, bh: 113, ax: 130.0, ay: 112.6, k: 1.00 },
  /* Arms thrown out past his head, so the silhouette is longer than he is tall.
     Shot lying on his back, so it is flipped to put his stomach toward the
     floor — falling face-down reads as falling, face-up reads as posing. */
  fly:    { w: 260, h:  66, bw: 260, bh:  66, ax: 130.0, ay:  66.5, k: 1.14,
            flipY: true },

  pose_1: { w: 327, h:  84, bw: 260, bh:  84, ax: 196.6, ay:  83.8, k: 1.00 },
  /* Kneeling and leaning back — roughly two-thirds of his standing height. */
  pose_2: { w: 284, h: 260, bw: 212, bh: 260, ax: 178.4, ay: 260.0, k: 0.68 },
  pose_3: { w: 224, h: 260, bw: 224, bh: 260, ax: 112.0, ay: 260.0, k: 0.74 },
  pose_4: { w:  86, h: 260, bw:  86, bh: 260, ax:  43.0, ay: 260.0, k: 1.00 },
  pose_5: { w: 135, h: 260, bw: 135, bh: 260, ax:  67.7, ay: 260.0, k: 1.00 },
  pose_6: { w: 133, h: 260, bw: 133, bh: 260, ax:  66.5, ay: 260.0, k: 1.00 },

  /* The corner peek. Only his bag, and only a sliver of it — the invitation is
     meant to be noticed on a second look, not to announce itself. */
  bag:    { w: 170, h:  47, bw: 170, bh:  47, ax:  85.0, ay:  47.0, k: 0.60 },
};

export const FRAME_SRC = (k: FrameKey | EffectKey) => `/image/pet/${k}.png`;

export type EffectKey =
  | 'effect_1' | 'effect_2' | 'effect_3' | 'effect_4'
  | 'effect_5' | 'effect_6' | 'effect_7';

/**
 * Manga onomatopoeia, drawn behind him while a pose holds.
 *
 * Shapes vary a lot — effect_6 is a wide banner, effect_5 a tall column — so
 * the renderer normalises each by its longest side and hangs it off the top of
 * whatever body box is currently showing, rather than at a fixed height. That
 * is what lets one set sit correctly over a lying pose and a standing one.
 */
export const EFFECTS: Record<EffectKey, { w: number; h: number }> = {
  effect_1: { w: 300, h: 282 },
  effect_2: { w: 300, h: 216 },
  effect_3: { w: 300, h: 124 },
  effect_4: { w: 300, h: 252 },
  effect_5: { w: 164, h: 300 },
  effect_6: { w: 300, h: 144 },
  effect_7: { w: 210, h: 300 },
};

export const EFFECT_KEYS = Object.keys(EFFECTS) as EffectKey[];

/** Poses the scheduler and the hover reaction draw from. */
export const POSE_FRAMES: FrameKey[] = [
  'pose_1', 'pose_2', 'pose_3', 'pose_4', 'pose_5', 'pose_6',
];

/** The one that points, used to aim at the chat button. Points right natively. */
export const POINT_FRAME: FrameKey = 'pose_2';

/** What hangs off the corner before anyone has touched him. */
export const PEEK_FRAME: FrameKey = 'bag';

/** Every file that must load before the pet is allowed to exist. */
export const PET_IMAGES: readonly string[] = Object.freeze([
  ...(Object.keys(FRAMES) as FrameKey[]).map(FRAME_SRC),
  ...EFFECT_KEYS.map(FRAME_SRC),
]);
