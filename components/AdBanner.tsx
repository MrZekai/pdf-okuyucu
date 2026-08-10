import React, { useRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { BannerAd, BannerAdSize, TestIds, useForeground } from 'react-native-google-mobile-ads';
import { useAdsReady } from '@/context/AdsContext';

export function AdBanner() {
  const adsReady = useAdsReady();
  const ref = useRef<BannerAd>(null);
  const productionId = Platform.select({
    android: process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID,
    ios: process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS
  });
  const unitId = __DEV__ || !productionId ? TestIds.ADAPTIVE_BANNER : productionId;

  useForeground(() => {
    if (Platform.OS === 'ios') ref.current?.load();
  });

  return (
    <View style={styles.shell}>
      {adsReady ? (
        <BannerAd
          ref={ref}
          unitId={unitId}
          size={BannerAdSize.LARGE_ANCHORED_ADAPTIVE_BANNER}
          onAdFailedToLoad={() => undefined}
        />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.label}>REKLAM ALANI</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    minHeight: 58,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#080C18',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(148,163,184,0.16)'
  },
  placeholder: {
    width: '92%', height: 50, borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(148,163,184,0.15)',
    alignItems: 'center', justifyContent: 'center'
  },
  label: { color: '#475569', fontSize: 9, fontWeight: '700', letterSpacing: 1.5 }
});
