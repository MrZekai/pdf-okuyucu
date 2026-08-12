import React, { useEffect, useRef, useState } from 'react';
import Constants from 'expo-constants';
import { Platform, StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize, TestIds, useForeground } from 'react-native-google-mobile-ads';
import { useAdsStatus } from '@/context/AdsContext';

type AdBannerProps = { separateFromNavigation?: boolean };
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 45_000;

export function AdBanner({ separateFromNavigation = false }: AdBannerProps) {
  const adsStatus = useAdsStatus();
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
    if (hidden) {
      attempts.current = 0;
      setHidden(false);
      setRetryKey((key) => key + 1);
    } else if (Platform.OS === 'ios') ref.current?.load();
  });

  useEffect(() => () => {
    if (retryTimer.current) clearTimeout(retryTimer.current);
  }, []);

  function handleFailure() {
    attempts.current += 1;
    if (attempts.current >= MAX_ATTEMPTS) {
      setHidden(true);
      return;
    }
    if (retryTimer.current) clearTimeout(retryTimer.current);
    retryTimer.current = setTimeout(() => setRetryKey((key) => key + 1), RETRY_DELAY_MS);
  }

  if (adsStatus !== 'ready' || hidden) return null;

  return (
    <View style={styles.container}>
      {separateFromNavigation ? <View pointerEvents="none" style={styles.contentGap} /> : null}
      <View style={styles.shell}>
      <BannerAd
        key={retryKey}
        ref={ref}
        unitId={unitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdLoaded={() => { attempts.current = 0; }}
        onAdFailedToLoad={handleFailure}
      />
      </View>
      {separateFromNavigation ? <View pointerEvents="none" style={styles.navigationGap} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', backgroundColor: '#080C18' },
  contentGap: { height: 16, backgroundColor: '#0B1020' },
  shell: {
    minHeight: 58,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#080C18',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(148,163,184,0.16)'
  },
  navigationGap: { height: 28, backgroundColor: '#0B1020' }
});
