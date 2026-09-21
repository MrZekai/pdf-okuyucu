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
// UMP artık arka planda çalışır; bu gecikmeler reklamın görünmesini BEKLETMEZ.
const RETRY_DELAYS_MS = [0, 1_000, 3_000];
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

type ConsentInfo = Awaited<ReturnType<typeof AdsConsent.getConsentInfo>>;

async function gatherWithRetry(): Promise<{ info: ConsentInfo | null; error: unknown }> {
  let lastError: unknown = null;
  for (const delay of RETRY_DELAYS_MS) {
    if (delay) await wait(delay);
    try {
      return { info: await AdsConsent.gatherConsent(), error: null };
    } catch (error) {
      lastError = error;
    }
  }
  return { info: null, error: lastError };
}

/**
 * Hızlı başlangıç (Google UMP örneğindeki paralel başlatma):
 *  1. Önbellekteki onay reklama izin veriyorsa reklamlar HEMEN açılır.
 *  2. İlk açılışta önbellek boşsa ve cihaz onay bölgesinde değilse
 *     kişiselleştirilmemiş reklamla HEMEN açılır.
 *  3. UMP onay güncellemesi her açılışta arka planda yine yapılır; sonucu
 *     kararı düzeltir (kişiselleştirilmiş reklama geçer ya da reklamı kapatır).
 * Önceki sürümde reklamlar UMP'nin ağ turunu ve yeniden denemeleri bekliyordu;
 * banner ve "Reklamsız süre" şeridi bu yüzden 5-10 sn geç geliyordu.
 */
export function useAdsBootstrap() {
  const initialization = useRef<Promise<void> | null>(null);
  const startInFlight = useRef<Promise<boolean> | null>(null);
  const mounted = useRef(false);
  const [status, setStatus] = useState<AdsStatus>('loading');

  const enable = useCallback(async (npaOnly: boolean) => {
    if (!initialization.current) {
      // İçerik derecesi ilk istekten ÖNCE uygulanmalı (yerel, anlık bir çağrı).
      await mobileAds()
        .setRequestConfiguration({ maxAdContentRating: MaxAdContentRating.PG })
        .catch(() => undefined);
      // initialize() beklenmez: SDK, başlatma sürerken gelen istekleri sıraya
      // alır. Beklemek banner'ı saniyelerce geciktirir.
      initialization.current = mobileAds().initialize().then(() => undefined);
      initialization.current.catch((error) => {
        initialization.current = null;
        noteConsentEvent(`SDK initialize HATA: ${errorText(error)}`);
      });
    }
    setAdsAllowed(true, npaOnly);
    if (mounted.current) setStatus('ready');
  }, []);

  const disable = useCallback(() => {
    setAdsAllowed(false, false);
    if (mounted.current) setStatus('unavailable');
  }, []);

  const start = useCallback(() => {
    if (startInFlight.current) return startInFlight.current;
    const task = (async () => {
      let fastStarted = false;
      try {
        let cached: ConsentInfo | null = null;
        try {
          cached = await AdsConsent.getConsentInfo();
        } catch {
          cached = null;
        }
        if (cached?.canRequestAds) {
          await enable(false);
          fastStarted = true;
          noteConsentEvent('hizli baslangic: onbellekteki onay');
        } else if (cached?.status !== AdsConsentStatus.REQUIRED && !deviceInConsentRegion()) {
          await enable(true);
          fastStarted = true;
          noteConsentEvent('hizli baslangic: onay bolgesi degil (NPA)');
        }

        const { info, error } = await gatherWithRetry();
        if (info) {
          noteConsentEvent(`UMP OK status=${info.status} canRequestAds=${info.canRequestAds}${fastStarted ? ' (hizli baslangic sonrasi)' : ''}`);
          if (info.canRequestAds) {
            await enable(false);
            return true;
          }
          disable();
          return false;
        }

        if (fastStarted) {
          noteConsentEvent(`UMP HATA (${errorText(error)}) -> hizli baslangic karari korundu`);
          return true;
        }
        const inRegion = deviceInConsentRegion();
        noteConsentEvent(`UMP HATA (${errorText(error)}) -> ${inRegion ? 'onay bolgesi, reklam yok' : 'onay bolgesi degil, NPA'}`);
        if (inRegion) {
          disable();
          return false;
        }
        await enable(true);
        return true;
      } catch (error) {
        noteConsentEvent(`reklam baslatma HATA: ${errorText(error)}`);
        if (!fastStarted) disable();
        return fastStarted;
      } finally {
        startInFlight.current = null;
      }
    })();
    startInFlight.current = task;
    return task;
  }, [enable, disable]);

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
