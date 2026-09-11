import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { getCachedAdPauseUntil, loadAdPauseUntil, subscribeAdPause } from '@/lib/adGate';

const COUNTDOWN_TICK_MS = 30_000;

/**
 * Reactive view of the rewarded "ad free window". Components read this to hide
 * every ad surface, the banner included, while the window is open.
 *
 * The remaining time is kept in state and refreshed from effects, never
 * computed during render, so the value stays stable across re-renders.
 */
export function useAdPause() {
  const [pausedUntil, setPausedUntil] = useState(getCachedAdPauseUntil);
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    let mounted = true;

    const hydrate = () => {
      loadAdPauseUntil()
        .then((value) => {
          if (mounted) setPausedUntil(value);
        })
        .catch(() => undefined);
    };

    hydrate();
    const unsubscribe = subscribeAdPause((value) => {
      if (mounted) setPausedUntil(value);
    });
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') hydrate();
    });

    return () => {
      mounted = false;
      unsubscribe();
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;
    let expiry: ReturnType<typeof setTimeout> | null = null;

    const sync = () => {
      const remaining = Math.max(0, pausedUntil - Date.now());
      if (!cancelled) setRemainingMs(remaining);
      return remaining;
    };

    const initial = sync();
    if (initial > 0) {
      // A coarse tick keeps the countdown label fresh, and one exact timer
      // brings the ad surfaces back the moment the window closes.
      interval = setInterval(sync, COUNTDOWN_TICK_MS);
      expiry = setTimeout(sync, initial + 250);
    }

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      if (expiry) clearTimeout(expiry);
    };
  }, [pausedUntil]);

  return { paused: remainingMs > 0, remainingMs, remainingMinutes: Math.ceil(remainingMs / 60_000) };
}
