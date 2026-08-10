import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Image, Platform, StyleSheet, View } from 'react-native';
import { AdEventType, AppOpenAd, TestIds } from 'react-native-google-mobile-ads';
import { useAdsReady } from '@/context/AdsContext';

const LAUNCH_COUNT_KEY = '@pdf-reader/app-open-launch-count-v1';
const LAST_SHOWN_KEY = '@pdf-reader/app-open-last-shown-v1';
const FIRST_AD_LAUNCH = 3;
const COLD_START_WAIT_MS = 3000;
const MIN_BACKGROUND_MS = 10000;
const AD_VALIDITY_MS = 4 * 60 * 60 * 1000;

type Opportunity = 'cold' | 'warm' | null;

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
  const [gateVisible, setGateVisible] = useState(true);
  const gateVisibleRef = useRef(true);
  const coldEligibleRef = useRef(false);
  const opportunityRef = useRef<Opportunity>(null);
  const adRef = useRef<AppOpenAd | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const loadingRef = useRef(false);
  const showingRef = useRef(false);
  const loadedAtRef = useRef(0);
  const lastShownAtRef = useRef(0);
  const appStateRef = useRef(AppState.currentState);
  const backgroundedAtRef = useRef(0);
  const showRef = useRef<() => void>(() => undefined);

  const finishColdGate = useCallback(() => {
    coldEligibleRef.current = false;
    gateVisibleRef.current = false;
    if (opportunityRef.current === 'cold') opportunityRef.current = null;
    setGateVisible(false);
  }, []);

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
    if (!adsReady || !unitId || loadingRef.current || adRef.current) return;
    loadingRef.current = true;
    const ad = AppOpenAd.createForAdRequest(unitId, { requestNonPersonalizedAdsOnly: false });
    adRef.current = ad;
    unsubscribeRef.current = ad.addAdEventsListener(({ type }) => {
      if (type === AdEventType.LOADED) {
        loadingRef.current = false;
        loadedAtRef.current = Date.now();
        if (coldEligibleRef.current && gateVisibleRef.current) showRef.current();
      } else if (type === AdEventType.OPENED) {
        showingRef.current = true;
        const now = Date.now();
        lastShownAtRef.current = now;
        AsyncStorage.setItem(LAST_SHOWN_KEY, String(now)).catch(() => undefined);
      } else if (type === AdEventType.CLOSED) {
        const wasCold = opportunityRef.current === 'cold';
        opportunityRef.current = null;
        clearAd();
        if (wasCold) finishColdGate();
      } else if (type === AdEventType.ERROR) {
        const wasCold = opportunityRef.current === 'cold';
        opportunityRef.current = null;
        clearAd();
        if (wasCold) finishColdGate();
      }
    });
    ad.load();
  }, [adsReady, clearAd, finishColdGate]);

  const showAd = useCallback(() => {
    const ad = adRef.current;
    if (!ad?.loaded || showingRef.current) return;
    if (Date.now() - loadedAtRef.current >= AD_VALIDITY_MS) {
      clearAd();
      if (opportunityRef.current === 'cold') finishColdGate();
      opportunityRef.current = null;
      return;
    }
    showingRef.current = true;
    ad.show().catch(() => {
      const wasCold = opportunityRef.current === 'cold';
      opportunityRef.current = null;
      clearAd();
      if (wasCold) finishColdGate();
    });
  }, [clearAd, finishColdGate]);

  useEffect(() => { showRef.current = showAd; }, [showAd]);

  useEffect(() => {
    let mounted = true;
    const timeout = setTimeout(finishColdGate, COLD_START_WAIT_MS);
    Promise.all([AsyncStorage.getItem(LAUNCH_COUNT_KEY), AsyncStorage.getItem(LAST_SHOWN_KEY)])
      .then(([launchRaw, lastShownRaw]) => {
        if (!mounted) return;
        const launches = Math.max(0, Number.parseInt(launchRaw || '0', 10) || 0) + 1;
        lastShownAtRef.current = Math.max(0, Number.parseInt(lastShownRaw || '0', 10) || 0);
        AsyncStorage.setItem(LAUNCH_COUNT_KEY, String(launches)).catch(() => undefined);
        if (launches >= FIRST_AD_LAUNCH && Date.now() - lastShownAtRef.current >= AD_VALIDITY_MS) {
          coldEligibleRef.current = true;
          opportunityRef.current = 'cold';
          loadAd();
        } else {
          finishColdGate();
        }
      })
      .catch(finishColdGate);
    return () => { mounted = false; clearTimeout(timeout); };
  }, [finishColdGate, loadAd]);

  useEffect(() => {
    if (!adsReady) return;
    if (coldEligibleRef.current && gateVisibleRef.current) loadAd();
    else loadAd();
  }, [adsReady, loadAd]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const previous = appStateRef.current;
      appStateRef.current = nextState;
      if (nextState === 'background') backgroundedAtRef.current = Date.now();
      if (nextState === 'active' && previous !== 'active') {
        const waited = Date.now() - backgroundedAtRef.current;
        const frequencyCapPassed = Date.now() - lastShownAtRef.current >= AD_VALIDITY_MS;
        if (waited >= MIN_BACKGROUND_MS && frequencyCapPassed && !showingRef.current) {
          opportunityRef.current = 'warm';
          if (adRef.current?.loaded && Date.now() - loadedAtRef.current < AD_VALIDITY_MS) showAd();
          else {
            if (adRef.current && Date.now() - loadedAtRef.current >= AD_VALIDITY_MS) clearAd();
            loadAd();
          }
        }
      }
    });
    return () => subscription.remove();
  }, [clearAd, loadAd, showAd]);

  useEffect(() => () => clearAd(), [clearAd]);

  return <View style={styles.root}>{gateVisible ? <View style={styles.gate} accessibilityLabel="PDF Okuyucu"><Image source={require('../assets/splash-icon.png')} style={styles.logo}/><ActivityIndicator color="#8B97FF" size="small"/></View> : children}</View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B1020' },
  gate: { flex: 1, backgroundColor: '#0B1020', alignItems: 'center', justifyContent: 'center', gap: 26 },
  logo: { width: 180, height: 180, resizeMode: 'contain' }
});
