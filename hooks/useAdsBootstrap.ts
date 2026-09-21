import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { getLocales } from 'expo-localization';
import mobileAds, { AdsConsent, AdsConsentStatus, MaxAdContentRating } from 'react-native-google-mobile-ads';
import { setAdsAllowed } from '@/lib/adConsent';
import { noteConsentEvent } from '@/lib/adDiagnostics';

export type AdsStatus = 'loading' | 'ready' | 'unavailable';

// GDPR / UK GDPR / İsviçre FADP: onay mesajının gerçekten gerektiği bölgeler.
const CONSENT_REGIONS = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU',
  'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'GB', 'CH'
]);
// İlk deneme uygulama açılır açılmaz yapılır; Android Activity henüz hazır
// değilse UMP "null-activity" ile reddeder. Kısa gecikmeli iki deneme daha.
const RETRY_DELAYS_MS = [0, 2_000, 6_000];
const FOREGROUND_RETRY_GAP_MS = 60_000;

function errorText(error: unknown) {
  if (error && typeof error === 'object') {
    const { code, message } = error as { code?: string; message?: string };
    return `${code ?? ''} ${message ?? ''}`.trim() || 'bilinmeyen hata';
  }
  return String(error);
}

function deviceInConsentRegion() {
  try {
    return getLocales().some((locale) => CONSENT_REGIONS.has((locale.regionCode || '').toUpperCase()));
  } catch {
    // Bölge okunamıyorsa temkinli davran.
    return true;
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Decision = { allowed: boolean; npaOnly: boolean };

/**
 * Google'ın UMP akışı: onay bilgisini güncelle, gerekiyorsa formu göster,
 * sonra canRequestAds'e bak. UMP hiç cevap veremezse (ağ, Activity, geçici
 * hata) bölge onay gerektirmiyorsa yalnızca kişiselleştirilmemiş reklamla
 * devam edilir; onay gereken bölgede reklam istenmez.
 */
async function decide(): Promise<Decision> {
  let lastError: unknown = null;
  for (const delay of RETRY_DELAYS_MS) {
    if (delay) await wait(delay);
    try {
      const info = await AdsConsent.gatherConsent();
      noteConsentEvent(`UMP OK status=${info.status} canRequestAds=${info.canRequestAds}`);
      return { allowed: info.canRequestAds, npaOnly: false };
    } catch (error) {
      lastError = error;
    }
  }

  let cached: Awaited<ReturnType<typeof AdsConsent.getConsentInfo>> | null = null;
  try {
    cached = await AdsConsent.getConsentInfo();
  } catch {
    cached = null;
  }
  if (cached?.canRequestAds) {
    noteConsentEvent(`UMP HATA (${errorText(lastError)}) -> onbellekteki onay kullanildi`);
    return { allowed: true, npaOnly: false };
  }
  if (cached && cached.status === AdsConsentStatus.REQUIRED) {
    noteConsentEvent(`UMP HATA (${errorText(lastError)}) -> onay gerekli, reklam yok`);
    return { allowed: false, npaOnly: false };
  }
  const inRegion = deviceInConsentRegion();
  noteConsentEvent(`UMP HATA (${errorText(lastError)}) -> ${inRegion ? 'onay bolgesi, reklam yok' : 'onay bolgesi degil, kisisellestirilmemis reklam'}`);
  return { allowed: !inRegion, npaOnly: true };
}

export function useAdsBootstrap() {
  const initialization = useRef<Promise<void> | null>(null);
  const startInFlight = useRef<Promise<boolean> | null>(null);
  const mounted = useRef(false);
  const [status, setStatus] = useState<AdsStatus>('loading');

  const start = useCallback(() => {
    if (startInFlight.current) return startInFlight.current;
    const task = (async () => {
      try {
        const decision = await decide();
        if (!decision.allowed) {
          setAdsAllowed(false, false);
          if (mounted.current) setStatus('unavailable');
          return false;
        }
        // Genel kitle aracı: içerik derecesi initialize'dan ÖNCE uygulanmalı.
        initialization.current ??= mobileAds()
          .setRequestConfiguration({ maxAdContentRating: MaxAdContentRating.PG })
          .catch(() => undefined)
          .then(() => mobileAds().initialize())
          .then(() => undefined);
        await initialization.current;
        setAdsAllowed(true, decision.npaOnly);
        if (mounted.current) setStatus('ready');
        return true;
      } catch (error) {
        initialization.current = null;
        setAdsAllowed(false, false);
        noteConsentEvent(`SDK initialize HATA: ${errorText(error)}`);
        if (mounted.current) setStatus('unavailable');
        return false;
      } finally {
        startInFlight.current = null;
      }
    })();
    startInFlight.current = task;
    return task;
  }, []);

  const refresh = useCallback(() => start(), [start]);

  useEffect(() => {
    mounted.current = true;
    void start();

    // Reklamlar hâlâ kapalıysa uygulama öne geldiğinde (en fazla dakikada bir)
    // yeniden dene. Böylece açılıştaki geçici bir hata oturumu yakmaz.
    let lastRetry = Date.now();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || initialization.current) return;
      if (Date.now() - lastRetry < FOREGROUND_RETRY_GAP_MS) return;
      lastRetry = Date.now();
      void start();
    });

    return () => {
      mounted.current = false;
      subscription.remove();
    };
  }, [start]);

  return { status, refresh };
}
