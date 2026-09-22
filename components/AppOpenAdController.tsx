import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Linking, Platform, StyleSheet, View } from 'react-native';
import { AdEventType, AppOpenAd, TestIds } from 'react-native-google-mobile-ads';
import { useAdsReady } from '@/context/AdsContext';
import { useTranslation } from '@/hooks/useTranslation';
import { adsArePaused, getLastFullScreenAt, MIN_FULL_SCREEN_GAP_MS, noteFullScreenShown } from '@/lib/adGate';
import { normalizeIncomingPdfUri } from '@/lib/incomingPdfUri';
import { adRequestOptions } from '@/lib/adConsent';
import { palette } from '@/constants/theme';

const LAUNCH_COUNT_KEY = '@pdf-reader/app-open-launch-count-v1';
const FIRST_SEEN_KEY = '@pdf-reader/app-open-first-seen-v1';
const LAST_APP_OPEN_KEY = '@pdf-reader/app-open-last-shown-v1';
/** The very first launch of a new install stays clean. */
const FIRST_AD_LAUNCH = 2;
/** Yeni kullanıcı ilk 2 gün app-open reklamı görmez; önce uygulamayı tanısın. */
const FIRST_AD_AFTER_MS = 2 * 24 * 60 * 60 * 1000;
/** İki app-open reklamı arasında en az 4 saat. */
const APP_OPEN_MIN_GAP_MS = 4 * 60 * 60 * 1000;
// Reklam gelmeyen açılışlar uygulama donmuş gibi hissettirmesin.
const COLD_START_WAIT_MS = 800;
const AD_VALIDITY_MS = 4 * 60 * 60 * 1000;

function getUnitId() {
  const configured = Platform.select({
    android: Constants.expoConfig?.extra?.admob?.appOpenAndroid as string | undefined,
    ios: Constants.expoConfig?.extra?.admob?.appOpenIos as string | undefined
  });
  if (__DEV__) return TestIds.APP_OPEN;
  return configured || null;
}

export function AppOpenAdController({ children }: { children: React.ReactNode }) {
  const adsReady = useAdsReady();
  const { t } = useTranslation();
  const [gateVisible, setGateVisible] = useState(true);
  const [coldEligible, setColdEligible] = useState(false);
  const gateVisibleRef = useRef(true);
  const coldEligibleRef = useRef(false);
  const launchInitializedRef = useRef(false);
  const adRef = useRef<AppOpenAd | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const loadingRef = useRef(false);
  const showingRef = useRef(false);
  const loadedAtRef = useRef(0);
  const gateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showRef = useRef<() => void>(() => undefined);

  const cancelGateTimeout = useCallback(() => {
    if (gateTimeoutRef.current) clearTimeout(gateTimeoutRef.current);
    gateTimeoutRef.current = null;
  }, []);

  const finishColdGate = useCallback(() => {
    cancelGateTimeout();
    coldEligibleRef.current = false;
    setColdEligible(false);
    gateVisibleRef.current = false;
    setGateVisible(false);
  }, [cancelGateTimeout]);

  const clearAd = useCallback(() => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    adRef.current?.removeAllListeners();
    adRef.current = null;
    loadingRef.current = false;
    showingRef.current = false;
    loadedAtRef.current = 0;
  }, []);

  const loadAd = useCallback(() => {
    const unitId = getUnitId();
    if (!adsReady || !unitId || !coldEligibleRef.current || !gateVisibleRef.current || loadingRef.current || adRef.current) return;
    loadingRef.current = true;
    const ad = AppOpenAd.createForAdRequest(unitId, adRequestOptions());
    adRef.current = ad;
    unsubscribeRef.current = ad.addAdEventsListener(({ type }) => {
      if (type === AdEventType.LOADED) {
        loadingRef.current = false;
        loadedAtRef.current = Date.now();
        if (coldEligibleRef.current && gateVisibleRef.current) showRef.current();
      } else if (type === AdEventType.OPENED) {
        cancelGateTimeout();
        showingRef.current = true;
        // Shared with the tool interstitial so the two can never stack.
        noteFullScreenShown(Date.now()).catch(() => undefined);
        AsyncStorage.setItem(LAST_APP_OPEN_KEY, String(Date.now())).catch(() => undefined);
      } else if (type === AdEventType.CLOSED || type === AdEventType.ERROR) {
        clearAd();
        finishColdGate();
      }
    });
    ad.load();
  }, [adsReady, cancelGateTimeout, clearAd, finishColdGate]);

  const showAd = useCallback(() => {
    const ad = adRef.current;
    if (!ad?.loaded || showingRef.current || !coldEligibleRef.current || !gateVisibleRef.current) return;
    if (Date.now() - loadedAtRef.current >= AD_VALIDITY_MS) {
      clearAd();
      finishColdGate();
      return;
    }
    showingRef.current = true;
    cancelGateTimeout();
    ad.show().catch(() => {
      clearAd();
      finishColdGate();
    });
  }, [cancelGateTimeout, clearAd, finishColdGate]);

  useEffect(() => { showRef.current = showAd; }, [showAd]);

  useEffect(() => {
    if (launchInitializedRef.current) return;
    launchInitializedRef.current = true;
    let mounted = true;
    gateTimeoutRef.current = setTimeout(() => { clearAd(); finishColdGate(); }, COLD_START_WAIT_MS);

    (async () => {
      // A launch that came from another app's PDF is not an app launch: the
      // user tapped a document and is waiting for it. Showing a full screen ad
      // in front of their file is the single fastest way to a one star review,
      // so this path never becomes eligible.
      let openedWithDocument = false;
      try {
        openedWithDocument = Boolean(normalizeIncomingPdfUri(await Linking.getInitialURL()));
      } catch {
        openedWithDocument = false;
      }
      if (!mounted) return;
      if (openedWithDocument) {
        finishColdGate();
        return;
      }

      if (await adsArePaused()) {
        if (mounted) finishColdGate();
        return;
      }
      if (!mounted) return;

      const launchRaw = await AsyncStorage.getItem(LAUNCH_COUNT_KEY).catch(() => null);
      const launches = Math.max(0, Number.parseInt(launchRaw || '0', 10) || 0) + 1;
      AsyncStorage.setItem(LAUNCH_COUNT_KEY, String(launches)).catch(() => undefined);
      const lastShownAt = await getLastFullScreenAt();
      const now = Date.now();
      let firstSeen = Number.parseInt((await AsyncStorage.getItem(FIRST_SEEN_KEY).catch(() => null)) || '0', 10) || 0;
      if (!firstSeen) {
        // Bu anahtar yeni; mevcut kullanıcılar (açılış sayısı > 1) için
        // yeniden 2 gün bekletme, yeni kurulumlar için bugünden başlat.
        firstSeen = launches > 1 ? now - FIRST_AD_AFTER_MS : now;
        AsyncStorage.setItem(FIRST_SEEN_KEY, String(firstSeen)).catch(() => undefined);
      }
      const lastAppOpenAt = Number.parseInt((await AsyncStorage.getItem(LAST_APP_OPEN_KEY).catch(() => null)) || '0', 10) || 0;
      if (!mounted) return;

      // The gate may already have timed out while storage was being read.
      if (!gateVisibleRef.current) return;

      // Only the shared "do not stack two full screen ads" rule applies here.
      // How many app open ads a viewer may see per day is capped on the ad unit
      // in the AdMob console, not in this build. The previous release compared
      // against AD_VALIDITY_MS, which is a creative freshness window, and so
      // silently suppressed the app open ad for four hours after any other ad.
      if (
        launches >= FIRST_AD_LAUNCH
        && now - firstSeen >= FIRST_AD_AFTER_MS
        && now - lastAppOpenAt >= APP_OPEN_MIN_GAP_MS
        && Date.now() - lastShownAt >= MIN_FULL_SCREEN_GAP_MS
      ) {
        coldEligibleRef.current = true;
        setColdEligible(true);
      } else {
        finishColdGate();
      }
    })().catch(() => {
      if (mounted) finishColdGate();
    });
    return () => {
      mounted = false;
      cancelGateTimeout();
    };
  }, [cancelGateTimeout, clearAd, finishColdGate]);

  useEffect(() => {
    if (adsReady && coldEligible && gateVisible && coldEligibleRef.current && gateVisibleRef.current) loadAd();
  }, [adsReady, coldEligible, gateVisible, loadAd]);

  useEffect(() => () => clearAd(), [clearAd]);

  return <View style={styles.root}>{gateVisible ? <View style={styles.gate} accessibilityLabel={t('app.name')}><Image source={require('../assets/splash-icon.png')} style={styles.logo}/><ActivityIndicator color={palette.pdfRed} size="small"/></View> : children}</View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.ink },
  gate: { flex: 1, backgroundColor: palette.ink, alignItems: 'center', justifyContent: 'center', gap: 26 },
  logo: { width: 180, height: 180, resizeMode: 'contain' }
});
