DROP YOUR MUSIC HERE
====================
Save four looping MP3s with these EXACT names:

  light1.mp3  \
  light2.mp3  /  normal (red/gold) site playlist
  elmo1.mp3   \
  elmo2.mp3   /  Elmo mode playlist (right-click the profile photo)

How it works:
- Each theme plays its 2 songs, alternating and looping forever.
- Which song starts is chosen at random each time the theme begins.
- ~0.7s crossfade between songs AND when switching themes.
- Volume slider (bottom-right) controls everything; note button mutes.
- Music starts on your first click/keypress anywhere on the page.
- Missing files fail silently - nothing breaks.

Desktop pet (public/audio/pet/)
-------------------------------
  effect_1..8.mp3   the chopped Jet Set Radio hits, played as a rising combo.
                    Poking him climbs 1 -> 8 and then holds on 6 for as long as
                    you keep going: 1,2,3,4,5,6,7,8,6,6,6,6... Leave him alone
                    for three seconds and the next pose starts again at 1.

                    Nothing retriggers until the clip playing has finished, and
                    the gate is each file's own length (see SFX_MS in
                    src/hooks/usePetEngine.ts). That is what keeps 7 and 8 - the
                    long ones, 0.9s and 1.2s - from being cut off mid-hit when
                    the poses get spammed. Re-measure SFX_MS if you swap a file:
                      afinfo public/audio/pet/effect_1.mp3
  pose_effect.mp3   the full, uncut file. CURRENTLY UNUSED - the drop is silent
                    by design, so nothing references this. Kept in case it wants
                    a home later; delete it if not.

Poses he strikes on his own are silent - only ones you caused make noise. Flip
SFX_ON_IDLE_POSES in src/hooks/usePetEngine.ts to change that.

The mute button silences these and the volume slider scales them; they are one
shots and never touch the music decks. A missing file is a silent pet.
