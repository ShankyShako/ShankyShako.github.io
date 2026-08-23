import { useAudio } from '../context/AudioContext';

/**
 * Hidden until the profile-photo easter egg starts the music, then it stays
 * for the session. The decks themselves render here too, in the app shell, so
 * route changes never interrupt playback.
 */
export function AudioBar() {
  const { started, muted, volume, setVolume, toggleMute, deckRefs } = useAudio();
  const [deckA, deckB] = deckRefs;

  return (
    <>
      <audio ref={deckA} preload="auto" />
      <audio ref={deckB} preload="auto" />

      {started && (
        <div className="audio-bar" title="Music">
          <button
            type="button"
            className={muted ? 'muted' : undefined}
            onClick={toggleMute}
            aria-label={muted ? 'Unmute music' : 'Mute music'}
          >
            {muted ? '♪' : '♫'}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            aria-label="Volume"
          />
        </div>
      )}
    </>
  );
}
