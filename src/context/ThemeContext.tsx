import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { bump } from '../lib/stats';

export type Mode = 'light' | 'elmo';

type ThemeValue = {
  mode: Mode;
  elmo: boolean;
  toggleElmo: () => void;
};

const ThemeContext = createContext<ThemeValue | null>(null);

/**
 * Elmo mode is the site's signature easter egg: it flips the palette to
 * black-and-red, swaps the profile portrait for the decoy, and switches the
 * background playlist. Lifting it into context means every route reacts to it
 * instead of the old body-class-and-inline-style approach.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [elmo, setElmo] = useState(false);

  /* Drive CSS off a data attribute so styles stay declarative. */
  useEffect(() => {
    document.documentElement.dataset.theme = elmo ? 'elmo' : 'light';
  }, [elmo]);

  const toggleElmo = useCallback(() => setElmo((v) => {
    /* Counted, never shown. How often anyone finds this is the owner's
       curiosity, not the visitor's. */
    bump(v ? 'elmo_off' : 'elmo_on');
    return !v;
  }), []);

  const value = useMemo(
    () => ({ mode: (elmo ? 'elmo' : 'light') as Mode, elmo, toggleElmo }),
    [elmo, toggleElmo],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
