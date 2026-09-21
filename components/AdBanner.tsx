import React, { useEffect, useRef, useState } from 'react';
import Constants from 'expo-constants';
import { AppState, Platform, StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize, TestIds, useForeground } from 'react-native-google-mobile-ads';
import { useAdsStatus } from '@/context/AdsContext';
import { useAdPause } from '@/hooks/useAdPause';
import { chrome, layout, palette } from '@/constants/theme';
import { adRequestOptions } from '@/lib/adConsent';
import { noteBannerEvent } from '@/lib/adDiagnostics';

type AdBannerProps = { separateFromNavigation?: boolean };
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 45_000;
// After a run of failures the banner rests instead of disappearing for the
// whole session: a temporary no-fill should not cost every later impression.
const LONG_RETRY_DELAY_MS = 5 * 60_000;

export function AdBanner({ separateFromNavigation = false }: AdBannerProps) {
  const adsStatus = useAdsStatus();
  const { paused } = useAdPause();
  const [hidden, setHidden] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const attempts = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ref = useRef<BannerAd>(null);
  const productionId = Platform.select({
    android: Constants.expoConfig?.extra?.admob?.bannerAndroid as string | undefined,
    ios: Constants.expoConfig?.extra?.admob?.bannerIos as string | undefined
  });
  const unitId = __DEV__ || !productionId ? TestIds.ADAPTIVE_BANNER : productionId;

  useForeground(() => {
    if (Platform.OS === 'ios' && !hidden) ref.current?.load();
  });

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && hidden) {
        attempts.current = 0;
        setHidden(false);
        setRetryKey((key) => key + 1);
      }
    });
    return () => subscription.remove();
  }, [hidden]);

  useEffect(() => () => {
    if (retryTimer.current) clearTimeout(retryTimer.current);
  }, []);

  function handleFailure(error?: { code?: string; message?: string }) {
    noteBannerEvent(`HATA ${error?.code ?? '?'} ${error?.message ?? ''}`.trim());
    attempts.current += 1;
    const exhausted = attempts.current >= MAX_ATTEMPTS;
    if (exhausted) {
      attempts.current = 0;
      setHidden(true);
    }
    if (retryTimer.current) clearTimeout(retryTimer.current);
    retryTimer.current = setTimeout(() => {
      retryTimer.current = null;
      setHidden(false);
      setRetryKey((key) => key + 1);
    }, exhausted ? LONG_RETRY_DELAY_MS : RETRY_DELAY_MS);
  }

  // The rewarded ad free window covers every surface, banner included.
  if (paused) return null;
  if (hidden) return null;
  if (adsStatus !== 'ready') {
    if (adsStatus !== 'loading') return null;
    // Reserve the banner height while the SDK is initialising so the layout
    // does not shift once the ad becomes ready.
    return (
      <View style={styles.container}>
        {separateFromNavigation ? <View pointerEvents="none" style={styles.contentGap} /> : null}
        <View pointerEvents="none" style={styles.shell} />
        {separateFromNavigation ? <View pointerEvents="none" style={styles.navigationGap} /> : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {separateFromNavigation ? <View pointerEvents="none" style={styles.contentGap} /> : null}
      <View style={styles.shell}>
      <BannerAd
        key={retryKey}
        ref={ref}
        unitId={unitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={adRequestOptions()}
        onAdLoaded={() => { attempts.current = 0; noteBannerEvent('YUKLENDI'); }}
        onAdFailedToLoad={handleFailure}
      />
      </View>
      {separateFromNavigation ? <View pointerEvents="none" style={styles.navigationGap} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', backgroundColor: palette.ink },
  contentGap: { height: layout.adSeparation, backgroundColor: palette.ink, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.line },
  shell: {
    minHeight: 58,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.ink,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: chrome.adDivider
  },
  navigationGap: { height: layout.navigationSeparation, backgroundColor: palette.ink, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.line, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.line }
});
