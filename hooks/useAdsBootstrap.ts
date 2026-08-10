import { useEffect, useRef, useState } from 'react';
import mobileAds, { AdsConsent } from 'react-native-google-mobile-ads';

export function useAdsBootstrap() {
  const started = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function startIfAllowed() {
      try {
        const { canRequestAds } = await AdsConsent.getConsentInfo();
        if (!canRequestAds || started.current) return;
        started.current = true;
        await mobileAds().initialize();
        if (mounted) setReady(true);
      } catch {
        // Ad errors must never block the PDF reader.
      }
    }

    // Use any valid consent from the previous session immediately, then refresh UMP state.
    startIfAllowed();
    AdsConsent.gatherConsent()
      .then(startIfAllowed)
      .catch(startIfAllowed);

    return () => { mounted = false; };
  }, []);

  return ready;
}
