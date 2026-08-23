import { useEffect } from 'react';

/**
 * Site-wide deterrent against casual right-click/drag saving of artwork and
 * portraits. Deliberately not a security control — it stops the accidental
 * grab, nothing more.
 */
export function useImageGuard() {
  useEffect(() => {
    const block = (e: Event) => {
      if (e.target instanceof HTMLImageElement) e.preventDefault();
    };
    document.addEventListener('contextmenu', block);
    document.addEventListener('dragstart', block);
    return () => {
      document.removeEventListener('contextmenu', block);
      document.removeEventListener('dragstart', block);
    };
  }, []);
}
