import { useCallback, useEffect, useRef, useState } from 'react';
import mobileAds, { AdsConsent } from 'react-native-google-mobile-ads';

export type AdsStatus = 'loading' | 'ready' | 'unavailable';

export function useAdsBootstrap() {
  const initialization = useRef<Promise<void> | null>(null);
  const startInFlight = useRef<Promise<boolean> | null>(null);
  const mounted = useRef(false);
  const [status, setStatus] = useState<AdsStatus>('loading');

  const startIfAllowed = useCallback(() => {
    if (startInFlight.current) return startInFlight.current;
    const task = (async () => {
      try {
        const { canRequestAds } = await AdsConsent.getConsentInfo();
        if (!canRequestAds) {
          if (mounted.current) setStatus('unavailable');
          return false;
        }
        initialization.current ??= mobileAds().initialize().then(() => undefined);
        await initialization.current;
        if (mounted.current) setStatus('ready');
        return true;
      } catch {
        initialization.current = null;
        if (mounted.current) setStatus('unavailable');
        return false;
      } finally {
        startInFlight.current = null;
      }
    })();
    startInFlight.current = task;
    return task;
  }, []);

  const refresh = useCallback(() => startIfAllowed(), [startIfAllowed]);

  useEffect(() => {
    mounted.current = true;
    // Use any valid consent from the previous session immediately, then refresh UMP state.
    void startIfAllowed();
    AdsConsent.gatherConsent()
      .catch(() => undefined)
      .then(startIfAllowed)
      .catch(() => { if (mounted.current) setStatus('unavailable'); });

    return () => { mounted.current = false; };
  }, [startIfAllowed]);

  return { status, refresh };
}
