import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import mobileAds, { AdsConsent, MaxAdContentRating } from 'react-native-google-mobile-ads';
import { setAdsAllowed } from '@/lib/adConsent';
import { noteConsentEvent } from '@/lib/adDiagnostics';

export type AdsStatus = 'loading' | 'ready' | 'unavailable';

/**
 * Reklam izni SADECE UMP SDK'sının canRequestAds sonucundan gelir.
 *
 * Önceki sürüm, önbellekte onay yokken cihazın locale BÖLGE KODUNA bakıp
 * "onay bölgesi değil" diye karar veriyor ve kişiselleştirilmemiş reklamı
 * hemen açıyordu. Locale kullanıcının nerede olduğunu kanıtlamaz: Almanya'daki
 * bir telefon tr-TR ayarlı olabilir, ya da tam tersi. Bu, GDPR/UK GDPR/FADP
 * kapsamındaki bir kullanıcıya onay alınmadan reklam göstermek demekti ve
 * kişiselleştirilmemiş reklam bunun karşılığı değildir - NPA bir onay türü
 * değil, onay VERİLDİKTEN sonraki bir reklam seçeneğidir.
 */
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
 *  1. SDK'nın önbelleğindeki onay reklama izin veriyorsa reklamlar HEMEN açılır.
 *     Bu karar SDK'dan gelir, tahminden değil, ve ikinci açılıştan sonra her
 *     oturumda geçerlidir - yani banner gecikmesi sorunu çözülmüş kalır.
 *  2. Önbellek boşsa (yalnızca ilk açılış) UMP'nin ilk turu beklenir. Onay
 *     durumu bilinmeden hiçbir format istenmez.
 *  3. UMP onay güncellemesi her açılışta arka planda yine yapılır; sonucu
 *     kararı düzeltir (kişiselleştirilmiş reklama geçer ya da reklamı kapatır).
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
          noteConsentEvent('hizli baslangic: SDK onbellegindeki onay');
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
          noteConsentEvent(`UMP HATA (${errorText(error)}) -> SDK onbellek karari korundu`);
          return true;
        }
        // UMP turu başarısız oldu ve elimizde hızlı başlangıç kararı da yok.
        // Son bir kez SDK'ya soruyoruz: önceki bir oturumda onay alınmışsa bu
        // çağrı ağ olmadan da cevap verir. Vermezse reklam istenmez. Bölgeyi
        // tahmin etmek yerine reklamdan vazgeçiyoruz; bir oturumun reklamını
        // kaybetmek, onay alınmadan reklam göstermekten iyidir.
        let fallback: ConsentInfo | null = null;
        try {
          fallback = await AdsConsent.getConsentInfo();
        } catch {
          fallback = null;
        }
        if (fallback?.canRequestAds) {
          noteConsentEvent(`UMP HATA (${errorText(error)}) -> SDK yine de izin veriyor`);
          await enable(false);
          return true;
        }
        noteConsentEvent(`UMP HATA (${errorText(error)}) -> onay bilinmiyor, reklam yok`);
        disable();
        return false;
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
