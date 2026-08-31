import { usePoseCount } from '../hooks/usePoseCount';

/**
 * How many poses this pet has struck for everyone who ever found him, printed
 * under his feet at the bottom of the window.
 *
 * Deliberately faint and behind him: it is a footnote to the easter egg, not a
 * feature of the site. It renders nothing at all until the number is known, so
 * an unconfigured or blocked endpoint leaves no gap and no placeholder.
 */
export function PetCounter() {
  const count = usePoseCount();
  if (count === null) return null;

  return (
    <div className="pet-counter" aria-hidden="true">
      <span className="pet-counter-n">{count.toLocaleString()}</span> poses
    </div>
  );
}
