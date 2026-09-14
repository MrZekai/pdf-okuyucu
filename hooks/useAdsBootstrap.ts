import { useCallback, useEffect, useRef, useState } from 'react';
import mobileAds, { AdsConsent, MaxAdContentRating } from 'react-native-google-mobile-ads';

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
        // A PDF reader is a general audience tool, so the ads it shows must be
        // too. Without this the network serves up to its own default rating,
        // which allows content a document reader has no business displaying -
        // a user complaint and a Play policy exposure at the same time. The
        // request configuration has to be applied BEFORE initialize(), because
        // the first ad requests go out as soon as initialisation completes.
        initialization.current ??= mobileAds()
          .setRequestConfiguration({ maxAdContentRating: MaxAdContentRating.PG })
          .catch(() => undefined)
          .then(() => mobileAds().initialize())
          .then(() => undefined);
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
