import React, { useRef, useState } from 'react';
import Constants from 'expo-constants';
import { Platform, StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize, TestIds, useForeground } from 'react-native-google-mobile-ads';
import { useAdsReady } from '@/context/AdsContext';

type AdBannerProps = { separateFromNavigation?: boolean };

export function AdBanner({ separateFromNavigation = false }: AdBannerProps) {
  const adsReady = useAdsReady();
  const [failed, setFailed] = useState(false);
  const ref = useRef<BannerAd>(null);
  const productionId = Platform.select({
    android: Constants.expoConfig?.extra?.admob?.bannerAndroid as string | undefined,
    ios: Constants.expoConfig?.extra?.admob?.bannerIos as string | undefined
  });
  const unitId = __DEV__ || !productionId ? TestIds.ADAPTIVE_BANNER : productionId;

  useForeground(() => {
    if (Platform.OS === 'ios') ref.current?.load();
  });

  if (!adsReady || failed) return null;

  return (
    <View style={styles.container}>
      <View style={styles.shell}>
      <BannerAd
        ref={ref}
        unitId={unitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdFailedToLoad={() => setFailed(true)}
      />
      </View>
      {separateFromNavigation ? <View pointerEvents="none" style={styles.navigationGap} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', backgroundColor: '#080C18' },
  shell: {
    minHeight: 58,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#080C18',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(148,163,184,0.16)'
  },
  navigationGap: { height: 12, backgroundColor: '#0B1020' }
});
