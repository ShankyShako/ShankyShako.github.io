import { useEffect, useState } from 'react';

import { fetchTotal, minePoses, subscribeMine } from '../lib/stats';

/**
 * The number under the pet: the global total as it stood when the page loaded,
 * plus whatever this visitor has added since.
 *
 * Split that way on purpose. The batch that carries their poses to the server
 * is up to ten seconds behind them, and re-reading the total would either lag
 * their own clicks or double-count them once the batch lands. Adding locally
 * makes the number answer the click that caused it, immediately.
 *
 * `null` means the endpoint said nothing — unconfigured, blocked, or offline —
 * and the caller renders nothing at all.
 */
export function usePoseCount(): number | null {
  const [base, setBase] = useState<number | null>(null);
  const [mine, setMine] = useState(minePoses);

  useEffect(() => {
    const ctrl = new AbortController();
    void fetchTotal(ctrl.signal).then(setBase);
    return () => ctrl.abort();
  }, []);

  useEffect(() => subscribeMine(setMine), []);

  return base === null ? null : base + mine;
}
