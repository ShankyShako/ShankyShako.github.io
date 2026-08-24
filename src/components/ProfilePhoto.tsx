import { useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAudio } from '../context/AudioContext';
import { useLongPress } from '../hooks/useLongPress';

/**
 * The easter egg. Right-click (desktop) or a 500ms long-press (mobile) flips
 * Elmo mode: palette inverts to black-and-red, the portrait crossfades to the
 * decoy, and the soundtrack switches playlists. The first interaction is also
 * what starts the music — before that the site is deliberately silent.
 */
export function ProfilePhoto() {
  const { elmo, toggleElmo } = useTheme();
  const { activate, setMode } = useAudio();

  const trigger = useCallback(() => {
    activate();
    const next = !elmo;
    toggleElmo();
    setMode(next ? 'elmo' : 'light');
  }, [activate, elmo, toggleElmo, setMode]);

  const longPress = useLongPress(trigger);

  return (
    <>
      <div
        className="profile-container"
        onContextMenu={(e) => {
          e.preventDefault();
          trigger();
        }}
        {...longPress}
      >
        <img
          className="profile-image"
          src="/image/ProfessionalPicture1.jpeg"
          alt="Genova Mongalo"
          style={{ opacity: elmo ? 0 : 1 }}
          draggable={false}
        />
        <img
          className="decoy-image"
          src="/image/ProfPic.jpg"
          alt=""
          aria-hidden={!elmo}
          style={{ opacity: elmo ? 1 : 0, pointerEvents: elmo ? 'auto' : 'none' }}
          draggable={false}
        />
      </div>
      <span className="profile-hint">Genova Mongalo.</span>
    </>
  );
}
