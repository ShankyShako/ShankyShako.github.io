import { useCallback, useRef } from 'react';

const LONG_PRESS_MS = 500;

/**
 * Mobile counterpart to right-click: a 500ms press fires `onLongPress` and
 * swallows the tap that would otherwise follow. Movement cancels.
 */
export function useLongPress(onLongPress: () => void) {
  const timer = useRef<number | null>(null);
  const fired = useRef(false);

  const cancel = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const onTouchStart = useCallback(() => {
    fired.current = false;
    timer.current = window.setTimeout(() => {
      fired.current = true;
      onLongPress();
      navigator.vibrate?.(20); // subtle haptic confirmation
    }, LONG_PRESS_MS);
  }, [onLongPress]);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      cancel();
      if (fired.current) e.preventDefault();
    },
    [cancel],
  );

  return {
    onTouchStart,
    onTouchMove: cancel,
    onTouchEnd,
    onTouchCancel: cancel,
  };
}
