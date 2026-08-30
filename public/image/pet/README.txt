DESKTOP PET FRAMES
==================
These are GENERATED. Do not edit them by hand.

The originals live in assets-src/pet/ (outside public/, so they are never
shipped). scripts/prep-pet.py crops each one to its content, scales it so the
person's long side is 260px, and prints the numbers that go in
src/components/petFrames.ts.

To change the art:

  1. Replace or add a photo in assets-src/pet/
  2. python3 scripts/prep-pet.py
  3. Paste the printed table into src/components/petFrames.ts

Why the script exists: these are phone photos on 1024px canvases, each shot
from a different distance. Used raw they are 1.8MB and he doubles in size
between frames. Cropped and normalised they are ~660KB and he stays one
person.

Frames, and where each is used:

  idle      standing            resting, and between walk steps
  walk_l    left leg forward    the 4fps walk cycle, alternating
  walk_r    right leg forward
  bag       the satchel alone   the corner peek - all you see until it is poked
  fall      starfish            the whole drop after the bag is clicked
  land      flat on his back    the moment he hits the floor
  drag      held                while you are dragging him
  fly       arms out front      after you throw him, rotated to the throw and
                                flipped vertically (flipY) so his stomach faces
                                the floor - shot on his back, falls face-down
  pose_1    reclining           random pose / hover reaction
  pose_2    kneeling, pointing  also aimed at the chat button when he passes it
  pose_3    kneeling, hands up  random pose / hover reaction
  pose_4    standing, one leg   random pose / hover reaction
  pose_5    arched arm overhead random pose / hover reaction
  pose_6    arm up, hip out     random pose / hover reaction
  effect_1  purple katakana     manga overlay, drawn behind a pose
  effect_2  outlined katakana
  effect_3  solid katakana
  effect_4  outlined arc
  effect_5  purple GO GO GO
  effect_6  solid banner
  effect_7  outlined burst

Neither a pose nor an effect can follow itself - 1-2-1 is fine, 1-1 never
happens. The pool is filtered rather than re-rolled, so it is a guarantee and
not a probability.

Effects are picked at random and hung off the TOP of whichever body box is
showing, normalised by their longest side - so one set works over a lying pose
and a standing one without per-pair tuning. Add a new one by dropping it in
assets-src/pet/, extending the range in scripts/prep-pet.py, and pasting its
size into EFFECTS in src/components/petFrames.ts.

Rules the code depends on:

  - Every frame faces RIGHT. Facing left is a CSS mirror, nothing more.
  - pose_2 must point the SAME way the body faces. Aiming him at the chat
    button is just sign(distance) - there is no second pointing frame.
  - The bag is kept in land, pose_1 and pose_2 (it reads as a prop lying on
    the floor) and erased from fly, where it would float alongside him. It is
    also cut out of land.png on its own as bag.png, for the corner peek.

Getting rid of him
------------------
There is a hole in the LEFT wall, drawn only while he is held or in the air.
Throw him into it - a real fling, leftward, aimed at that band - and he goes
through and leaves. The bag then reappears in the top-right corner and the whole
sequence starts over from scratch: combo forgotten, cooldowns cleared.

It is deliberately not easy. Nothing else dismisses him, so the escape has to be
something you chose to do rather than something you did by accident. The knobs
are HOLE_Y_FRAC, HOLE_H and ESCAPE_VX in src/hooks/usePetEngine.ts.

If any file here is missing the pet never renders at all - no broken image,
no half-working pet. You will still see a 404 in the Network panel, same as
the music does. That is expected.
