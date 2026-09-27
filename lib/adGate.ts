import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { AppState, Platform } from 'react-native';
import { AdEventType, InterstitialAd, RewardedAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';
import { adRequestOptions, adsAllowed } from '@/lib/adConsent';

/**
 * Every full screen ad in the app goes through this module.
 *
 * AdMob can only cap each ad unit on its own, so it cannot stop an app open ad
 * and a tool interstitial from landing within the same minute. That pairing is
 * the fastest way to a one star review, so the real budget lives here: a single
 * shared "last full screen ad" timestamp plus per day and per session limits.
 *
 * Nothing exported here ever throws or rejects. An advertising failure must
 * never break a document operation, so every path degrades to "no ad".
 */

/**
 * Yalnızca GERÇEK bir app-open reklamı açıldığında yazılır ve bunu
 * AppOpenAdController yapar (OPENED olayında). Burada sadece OKUNUR, çünkü
 * ortak "iki tam ekran reklam üst üste gelmesin" kuralı app-open reklamını da
 * kapsamak zorunda.
 *
 * Bu modül bir zamanlar bu anahtarı geçiş ve ödüllü reklamdan sonra da
 * yazıyordu. AppOpenAdController aynı anahtarı app-open reklamının DÖRT SAATLİK
 * aralığı için okuduğu için, tek bir geçiş reklamı app-open reklamını dört saat
 * boyunca susturuyordu - hiç gösterilmemiş olsa bile. Ortak altmış saniye
 * kuralı ile app-open dört saat kuralı iki ayrı şeydir ve iki ayrı zaman
 * damgası ister.
 */
const APP_OPEN_LAST_SHOWN_KEY = '@pdf-reader/app-open-last-shown-v1';

const LAST_FULL_SCREEN_KEY = '@pdf-reader/ads/last-full-screen-v1';
const INTERSTITIAL_DAY_KEY = '@pdf-reader/ads/interstitial-day-v1';
const TOOL_RUN_KEY = '@pdf-reader/ads/tool-runs-v1';
const AD_PAUSE_UNTIL_KEY = '@pdf-reader/ads/paused-until-v1';

/**
 * Pacing lives in the AdMob console, not here.
 *
 * The previous release enforced a session cap, a daily cap, a free run quota
 * and a three minute gap in code. Six conditions had to hold at once and every
 * one of them failed silently, which made the interstitial impossible to
 * observe on a device and impossible to tune without shipping a new build.
 *
 * Now exactly one rule is enforced in code: two full screen ads may never land
 * back to back. Everything else - how many interstitials per hour, how many app
 * open ads per day - is configured on the ad units themselves, where it can be
 * changed without a release.
 */
export const MIN_FULL_SCREEN_GAP_MS = 60 * 1000;
/** Reward for watching one rewarded video: a completely ad free window. */
export const AD_PAUSE_DURATION_MS = 10 * 60 * 1000;

// A slow connection needs more than five seconds to fill. The user is looking
// at their finished document here, not waiting on a spinner, so a longer wait
// costs nothing and recovers the impressions the old timeout was discarding.
const INTERSTITIAL_LOAD_TIMEOUT_MS = 9_000;
// The viewer is watching a spinner here and asked for this ad, so waiting a
// little longer is better than telling them nothing was available.
const REWARDED_LOAD_TIMEOUT_MS = 12_000;
/** A prepared interstitial is discarded after this, as AdMob recommends. */
const PRIMED_AD_TTL_MS = 50 * 60 * 1000;
/** Guards against an ad that opens and never reports that it closed. */
const OPEN_AD_HANG_GUARD_MS = 5 * 60 * 1000;

let sessionInterstitials = 0;
let cachedPauseUntil = 0;
let pauseHydrated = false;

type PauseListener = (pausedUntil: number) => void;
const pauseListeners = new Set<PauseListener>();

function publishPause(pausedUntil: number) {
  cachedPauseUntil = pausedUntil;
  pauseListeners.forEach((listener) => {
    try {
      listener(pausedUntil);
    } catch {
      // A subscriber that throws must not stop the others.
    }
  });
}

export function subscribeAdPause(listener: PauseListener) {
  pauseListeners.add(listener);
  return () => {
    pauseListeners.delete(listener);
  };
}

export function getCachedAdPauseUntil() {
  return cachedPauseUntil;
}

async function readTimestamp(key: string) {
  try {
    const raw = await AsyncStorage.getItem(key);
    const value = Number.parseInt(raw || '0', 10);
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

async function writeTimestamp(key: string, value: number) {
  try {
    await AsyncStorage.setItem(key, String(value));
  } catch {
    // A missing counter only costs one extra ad opportunity.
  }
}

async function readDayCount(key: string) {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return { day: '', count: 0 };
    const [day, rawCount] = raw.split('|');
    const count = Number.parseInt(rawCount || '0', 10);
    return { day: day || '', count: Number.isFinite(count) && count > 0 ? count : 0 };
  } catch {
    return { day: '', count: 0 };
  }
}

async function writeDayCount(key: string, day: string, count: number) {
  try {
    await AsyncStorage.setItem(key, `${day}|${count}`);
  } catch {
    // See writeTimestamp.
  }
}

function dayStamp(now: number) {
  const date = new Date(now);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export async function loadAdPauseUntil() {
  const stored = await readTimestamp(AD_PAUSE_UNTIL_KEY);
  pauseHydrated = true;
  publishPause(stored);
  return stored;
}

export async function adsArePaused(now = Date.now()) {
  const until = pauseHydrated ? cachedPauseUntil : await loadAdPauseUntil();
  return until > now;
}

export async function pauseAdsFor(durationMs: number, now = Date.now()) {
  const until = now + Math.max(0, durationMs);
  await writeTimestamp(AD_PAUSE_UNTIL_KEY, until);
  pauseHydrated = true;
  publishPause(until);
  return until;
}

/**
 * Tüm formatlar için TEK tam ekran yuvası.
 *
 * Modülde bunu engelleyecek başka hiçbir şey yok. Sonuç diyaloğu Android'de aynı
 * pencere için hem düğme basışı hem kapatma bildirebiliyor; ana sayfadaki ve
 * Ayarlar'daki ödül düğmelerinin busy durumları birbirinden bağımsız; gecikmeli
 * geçiş reklamı yüklenirken kullanıcı ödüllü reklam isteyebiliyor. Bu akışların
 * hepsi uygunluk kontrolünü biri zaman damgasını yazmadan okuyor, hepsi geçiyor
 * ve kullanıcı üst üste iki tam ekran reklam görüyor - modülün var olma sebebi
 * tam olarak bunu engellemek.
 */
let fullScreenInFlight = false;

/**
 * LAST_FULL_SCREEN_KEY'in bellekteki kopyası. Gösterim anındaki kontrol LOADED
 * olayının içinde, eşzamanlı olarak yapılmak zorunda: orada depolamayı beklemek
 * yeni bir yarış açar.
 */
let lastFullScreenAtCache = 0;

/**
 * Yalnızca platform açıkça "önde değil" derse reklamı engeller. Android ilk
 * AppState olayından önce null, bazen 'unknown' bildirir; bunları arka plan
 * saymak soğuk açılışta reklamı tamamen kapatırdı.
 */
function appIsInForeground() {
  const state = AppState.currentState as string | null | undefined;
  return state !== 'background' && state !== 'inactive';
}

/**
 * Kendiliğinden gösterilen (kullanıcının istemediği) bir tam ekran reklamın
 * gösterim ANINDA sağlaması gereken koşullar.
 */
function adsMayBeShownNow(now = Date.now()) {
  if (!appIsInForeground()) return false;
  if (!adsAllowed()) return false;
  if (cachedPauseUntil > now) return false;
  if (lastFullScreenAtCache && now - lastFullScreenAtCache < MIN_FULL_SCREEN_GAP_MS) return false;
  return true;
}

/**
 * Kullanıcının kendi bastığı ödüllü reklam için. Ortak altmış saniye kuralı ve
 * reklamsız süre burada geçerli değil: reklamı kullanıcı istedi ve ödüllü reklam
 * reklamsız süreyi UZATAN şey. Yalnızca ekranda birinin olması şart.
 */
function userRequestedAdMayBeShownNow() {
  return appIsInForeground() && adsAllowed();
}

/**
 * Ortak altmış saniye kuralının zamanı: geçiş, ödüllü VE app-open reklamlarının
 * en yenisi. App-open anahtarı burada okunuyor ki app-open reklamından hemen
 * sonra geçiş reklamı çıkmasın.
 *
 * Bu okuma aynı zamanda güncelleme göçünü de karşılıyor: eski sürümde app-open
 * anahtarına geçiş reklamları da yazıyordu, o değer hâlâ duruyorsa ortak kural
 * onu dikkate alır, yani güncellemeden sonra peş peşe reklam çıkmaz.
 */
export async function getLastFullScreenAt() {
  const [shared, appOpen] = await Promise.all([
    readTimestamp(LAST_FULL_SCREEN_KEY),
    readTimestamp(APP_OPEN_LAST_SHOWN_KEY)
  ]);
  const newest = Math.max(shared, appOpen);
  if (newest > lastFullScreenAtCache) lastFullScreenAtCache = newest;
  return newest;
}

/**
 * Her tam ekran reklamdan sonra çağrılır: geçiş, ödüllü ve app-open.
 *
 * SADECE ortak zamanı yazar. App-open reklamının kendi zaman damgasını yalnızca
 * AppOpenAdController, gerçek OPENED olayında yazar - yoksa bir geçiş reklamı
 * app-open reklamının dört saatlik aralığını sıfırlar ve o reklam hiç
 * gösterilmediği hâlde dört saat susar.
 */
export async function noteFullScreenShown(now = Date.now()) {
  if (now > lastFullScreenAtCache) lastFullScreenAtCache = now;
  await writeTimestamp(LAST_FULL_SCREEN_KEY, now);
}

export async function noteToolRun() {
  const current = await readTimestamp(TOOL_RUN_KEY);
  const next = current + 1;
  await writeTimestamp(TOOL_RUN_KEY, next);
  return next;
}

function resolveUnitId(kind: 'interstitial' | 'rewarded') {
  const admob = Constants.expoConfig?.extra?.admob as Record<string, string | undefined> | undefined;
  const configured = Platform.select({
    android: kind === 'interstitial' ? admob?.interstitialAndroid : admob?.rewardedAndroid,
    ios: kind === 'interstitial' ? admob?.interstitialIos : admob?.rewardedIos
  });
  if (__DEV__) return kind === 'interstitial' ? TestIds.INTERSTITIAL : TestIds.REWARDED;
  return configured || null;
}

type FullScreenResult = 'shown' | 'earned' | 'unavailable';

/**
 * InterstitialAd and RewardedAd expose the same surface but their generic
 * addAdEventsListener signatures do not unify, so the two instances are handled
 * through the structural shape both of them satisfy.
 */
type FullScreenAd = {
  addAdEventsListener: (listener: (event: { type: string }) => void) => () => void;
  removeAllListeners: () => void;
  load: () => void;
  show: () => Promise<void> | void;
};

function presentFullScreenAd(
  kind: 'interstitial' | 'rewarded',
  loadTimeoutMs: number,
  canShow: () => boolean = adsMayBeShownNow
): Promise<FullScreenResult> {
  return new Promise<FullScreenResult>((resolve) => {
    const unitId = resolveUnitId(kind);
    // Onay kapısı: izin yoksa hiçbir tam ekran reklam istenmez.
    if (!unitId || !adsAllowed()) {
      resolve('unavailable');
      return;
    }

    let settled = false;
    let earned = false;
    let opened = false;
    let ad: FullScreenAd | null = null;
    let unsubscribe: (() => void) | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const clearTimer = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };

    const settle = (result: FullScreenResult) => {
      if (settled) return;
      settled = true;
      clearTimer();
      try {
        unsubscribe?.();
      } catch {
        // The listener is dropped with the ad instance below anyway.
      }
      unsubscribe = null;
      try {
        ad?.removeAllListeners();
      } catch {
        // Same.
      }
      ad = null;
      resolve(result);
    };

    try {
      const created = kind === 'interstitial' ? InterstitialAd.createForAdRequest(unitId, adRequestOptions()) : RewardedAd.createForAdRequest(unitId, adRequestOptions());
      ad = created as unknown as FullScreenAd;
      unsubscribe = ad.addAdEventsListener(({ type }) => {
        if (type === AdEventType.LOADED || type === RewardedAdEventType.LOADED) {
          clearTimer();
          // Yükleme dokuz saniye sürebilir. O sürede kullanıcı uygulamayı arka
          // plana atmış, ödüllü reklamla reklamsız süre kazanmış, onayı geri
          // çekmiş ya da başka bir tam ekran reklam görmüş olabilir. İsteği
          // yapmadan önceki kontrol artık geçerli değil; yeniden bakıyoruz.
          if (!canShow()) {
            settle('unavailable');
            return;
          }
          // Some ad creatives never emit CLOSED. The guard keeps the caller,
          // which may be showing a spinner, from waiting forever.
          timer = setTimeout(() => settle(opened ? (earned ? 'earned' : 'shown') : 'unavailable'), OPEN_AD_HANG_GUARD_MS);
          try {
            const shown = ad?.show();
            if (shown && typeof (shown as Promise<void>).catch === 'function') {
              (shown as Promise<void>).catch(() => settle('unavailable'));
            }
          } catch {
            settle('unavailable');
          }
          return;
        }
        // Gerçek gösterimin tek kanıtı budur. Beş dakikalık guard OPENED
        // görmediyse "gosterildi" saymaz, yoksa hiç açılmamış bir reklam ortak
        // zaman damgasını yazar ve sıradaki gerçek reklamı engeller.
        if (type === AdEventType.OPENED) {
          opened = true;
          return;
        }
        if (type === RewardedAdEventType.EARNED_REWARD) {
          earned = true;
          return;
        }
        // CLOSED reklamın bir yaşam döngüsü tamamladığının kanıtıdır, OPENED
        // gelmemiş olsa bile. Bunu "gösterilmedi" saymak ortak zaman damgasını
        // yazmamak demek olurdu ve arkasından ikinci bir reklam gelebilirdi.
        if (type === AdEventType.CLOSED) {
          settle(earned ? 'earned' : 'shown');
          return;
        }
        if (type === AdEventType.ERROR) {
          settle('unavailable');
        }
      });
      timer = setTimeout(() => settle('unavailable'), loadTimeoutMs);
      ad.load();
    } catch {
      settle('unavailable');
    }
  });
}

type PreparedAd = { ad: FullScreenAd; loadedAt: number };
let preparedInterstitial: PreparedAd | null = null;
let preparingInterstitial = false;

function discardPreparedInterstitial() {
  const prepared = preparedInterstitial;
  preparedInterstitial = null;
  if (!prepared) return;
  try {
    prepared.ad.removeAllListeners();
  } catch {
    // The instance is dropped either way.
  }
}

/** Requests an interstitial in the background so it is ready when needed. */
export function primeInterstitial() {
  if (preparedInterstitial || preparingInterstitial) return;
  const unitId = resolveUnitId('interstitial');
  if (!unitId || !adsAllowed()) return;
  preparingInterstitial = true;
  let ad: FullScreenAd | null = null;
  let unsubscribe: (() => void) | null = null;
  const detach = () => {
    try {
      unsubscribe?.();
    } catch {
      // Nothing else to do.
    }
    unsubscribe = null;
  };
  try {
    ad = InterstitialAd.createForAdRequest(unitId, adRequestOptions()) as unknown as FullScreenAd;
    unsubscribe = ad.addAdEventsListener(({ type }) => {
      if (type === AdEventType.LOADED) {
        preparingInterstitial = false;
        // The presenter attaches its own listener, so this one is released now.
        detach();
        if (ad) preparedInterstitial = { ad, loadedAt: Date.now() };
      } else if (type === AdEventType.ERROR) {
        preparingInterstitial = false;
        detach();
        try {
          ad?.removeAllListeners();
        } catch {
          // Nothing else to do.
        }
        ad = null;
      }
    });
    ad.load();
  } catch {
    preparingInterstitial = false;
    detach();
  }
}

/**
 * Called when the tools screen opens. The ad is requested while the viewer is
 * still choosing a tool, so by the time the document is finished the creative
 * is already in memory and the interstitial appears instantly. Requesting it at
 * the moment it is needed is what made the previous build look broken on a slow
 * connection.
 */
export async function prepareToolAd() {
  try {
    if (await adsArePaused()) return;
    primeInterstitial();
  } catch {
    // Preparing an ad is best effort by definition.
  }
}

/** Shows an already loaded ad. Never throws and always settles exactly once. */
function presentPreparedAd(ad: FullScreenAd, canShow: () => boolean = adsMayBeShownNow): Promise<FullScreenResult> {
  return new Promise<FullScreenResult>((resolve) => {
    // Hazır reklam dakikalar önce yüklenmiş olabilir; gösterim anındaki koşullar
    // yükleme anındakiyle aynı değil.
    if (!canShow()) {
      try {
        ad.removeAllListeners();
      } catch {
        // Örnek her hâlükârda bırakılıyor.
      }
      resolve('unavailable');
      return;
    }
    let settled = false;
    let earned = false;
    let unsubscribe: (() => void) | null = null;
    let guard: ReturnType<typeof setTimeout> | null = null;

    const settle = (result: FullScreenResult) => {
      if (settled) return;
      settled = true;
      if (guard) clearTimeout(guard);
      try {
        unsubscribe?.();
      } catch {
        // Nothing else to do.
      }
      try {
        ad.removeAllListeners();
      } catch {
        // Nothing else to do.
      }
      resolve(result);
    };

    try {
      unsubscribe = ad.addAdEventsListener(({ type }) => {
        if (type === RewardedAdEventType.EARNED_REWARD) {
          earned = true;
          return;
        }
        if (type === AdEventType.CLOSED) {
          settle(earned ? 'earned' : 'shown');
          return;
        }
        if (type === AdEventType.ERROR) settle('unavailable');
      });
      guard = setTimeout(() => settle(earned ? 'earned' : 'shown'), OPEN_AD_HANG_GUARD_MS);
      const shown = ad.show();
      if (shown && typeof (shown as Promise<void>).catch === 'function') {
        (shown as Promise<void>).catch(() => settle('unavailable'));
      }
    } catch {
      settle('unavailable');
    }
  });
}

/**
 * Called after a tool has produced a document and the user has dismissed the
 * result dialog. Returns quietly when any limit is hit.
 */
/**
 * Set when a tool finished and the viewer chose to open the document instead of
 * closing the dialog. Interrupting someone on their way into their own file is
 * the wrong trade, so the ad waits for the next natural break: the moment they
 * come back out of the reader.
 *
 * The previous release simply cancelled the ad on that path. Since opening the
 * finished document is what most people do, the interstitial almost never had a
 * chance to appear at all.
 */
let interstitialPending = false;

// Okuyucudan her dönüşte değil, her 3 PDF'de bir geçiş reklamı. Yeni
// kullanıcının "her dosyada reklam" hissiyle uygulamayı silmesini önler.
const READER_EXITS_PER_INTERSTITIAL = 3;
const READER_EXIT_COUNT_KEY = '@pdf-reader/ads/reader-exit-count-v1';

export function markInterstitialPending() {
  interstitialPending = true;
}

/** Returns whether a full screen ad was actually presented. */
export async function maybeShowPendingInterstitial() {
  if (!interstitialPending) return false;
  // Yuva meşgulse bekleyen işaret HARCANMAZ ve sayaç da ilerletilmez: aksi
  // hâlde başka bir reklam ekrandayken gelen bu çağrı, kullanıcının üç PDF'de
  // bir hakkını sessizce yakardı.
  if (fullScreenInFlight) return false;
  interstitialPending = false;
  let exits = 1;
  try {
    exits = (Number.parseInt((await AsyncStorage.getItem(READER_EXIT_COUNT_KEY)) || '0', 10) || 0) + 1;
    await AsyncStorage.setItem(READER_EXIT_COUNT_KEY, String(exits));
  } catch {
    // Sayaç okunamazsa reklam göstermemeyi tercih et.
    return false;
  }
  if (exits % READER_EXITS_PER_INTERSTITIAL !== 0) return false;
  return maybeShowToolInterstitial();
}

/** Returns whether a full screen ad was actually presented. */
export async function maybeShowToolInterstitial() {
  // Sıfırıncı kural: aynı anda tek tam ekran reklam. Hiçbir await'ten ÖNCE
  // bakılıyor, yoksa aynı tick'teki iki çağrı da içeri girer.
  if (fullScreenInFlight) return false;
  fullScreenInFlight = true;
  try {
    // Rule one: the ad free window the viewer earned is honoured. This is a
    // promise, not pacing, so it stays in code.
    if (await adsArePaused()) return false;
    if (!adsAllowed()) return false;

    // Rule two, and the only pacing rule left: never stack two full screen ads.
    const now = Date.now();
    const lastFullScreenAt = await getLastFullScreenAt();
    if (now - lastFullScreenAt < MIN_FULL_SCREEN_GAP_MS) return false;

    // Üçüncü kural: ekranda biri olmalı. Arka plandaki uygulamaya gösterilen
    // reklam hem kimsenin görmediği bir gösterim hem de geçersiz trafik sinyali.
    if (!appIsInForeground()) return false;

    if (preparedInterstitial && now - preparedInterstitial.loadedAt >= PRIMED_AD_TTL_MS) discardPreparedInterstitial();
    const prepared = preparedInterstitial;
    preparedInterstitial = null;

    const result = prepared
      ? await presentPreparedAd(prepared.ad, adsMayBeShownNow)
      : await presentFullScreenAd('interstitial', INTERSTITIAL_LOAD_TIMEOUT_MS, adsMayBeShownNow);
    if (result === 'unavailable') return false;

    sessionInterstitials += 1;
    const today = dayStamp(now);
    const stored = await readDayCount(INTERSTITIAL_DAY_KEY);
    const shownToday = stored.day === today ? stored.count : 0;
    // The counters are kept for the diagnostics screen. AdMob enforces the
    // real hourly cap on the unit itself.
    await Promise.all([noteFullScreenShown(Date.now()), writeDayCount(INTERSTITIAL_DAY_KEY, today, shownToday + 1)]);
    primeInterstitial();
    return true;
  } catch {
    // A tool result must never fail because of advertising.
    return false;
  } finally {
    // Hata, zaman aşımı ve kapanış dâhil BÜTÜN yollarda bırakılır; yoksa kilit
    // takılır ve oturumun kalanında hiç reklam çıkmaz.
    fullScreenInFlight = false;
  }
}

/**
 * Developer-facing snapshot of every gate. Surfaced behind a hidden tap in
 * Settings so ad pacing can be verified on a real device without a debugger.
 */
export async function getAdDiagnostics() {
  const now = Date.now();
  const [runs, lastFullScreenAt, lastAppOpenAt, pausedUntil, day, exits] = await Promise.all([
    readTimestamp(TOOL_RUN_KEY),
    getLastFullScreenAt(),
    readTimestamp(APP_OPEN_LAST_SHOWN_KEY),
    readTimestamp(AD_PAUSE_UNTIL_KEY),
    readDayCount(INTERSTITIAL_DAY_KEY),
    readTimestamp(READER_EXIT_COUNT_KEY)
  ]);
  const secondsSince = lastFullScreenAt ? Math.round((now - lastFullScreenAt) / 1000) : null;
  const gapOk = secondsSince === null || secondsSince >= MIN_FULL_SCREEN_GAP_MS / 1000;
  const pauseOn = pausedUntil > now;
  return [
    `Arac kullanimi: ${runs}`,
    `Bu oturumda gecis reklami: ${sessionInterstitials}`,
    `Bugun gecis reklami: ${day.day === dayStamp(now) ? day.count : 0}`,
    `Son tam ekran reklam: ${secondsSince === null ? 'hic' : `${secondsSince} sn once`}`,
    `60 sn kurali: ${gapOk ? 'UYGUN' : 'BEKLIYOR'}`,
    `Reklamsiz sure: ${pauseOn ? `${Math.ceil((pausedUntil - now) / 60_000)} dk kaldi` : 'kapali'}`,
    `Reklam hazir mi: ${preparedInterstitial ? 'EVET' : preparingInterstitial ? 'yukleniyor' : 'hayir'}`,
    `Bekleyen reklam: ${interstitialPending ? 'var (okuyucudan cikinca)' : 'yok'}`,
    `Okuyucudan cikis: ${exits} (her ${READER_EXITS_PER_INTERSTITIAL}. cikista reklam)`,
    `Son app-open reklami: ${lastAppOpenAt ? `${Math.round((now - lastAppOpenAt) / 60_000)} dk once` : 'hic'}`,
    `Reklam izni (UMP): ${adsAllowed() ? 'VAR' : 'yok'}`,
    `Uygulama on planda: ${appIsInForeground() ? 'EVET' : `hayir (${AppState.currentState})`}`,
    `Tam ekran yuvasi: ${fullScreenInFlight ? 'MESGUL' : 'bos'}`,
    '',
    `SONUC: ${
      !adsAllowed() ? 'Reklam izni yok, hicbir format istenmez'
      : pauseOn ? 'Reklamsiz sure acik, gecis reklami cikmaz'
      : !appIsInForeground() ? 'Uygulama on planda degil, reklam cikmaz'
      : gapOk ? 'Gecis reklami cikabilir'
      : '60 sn dolmadi, biraz bekleyin'
    }`
  ].join('\n');
}

export type RewardedOutcome = 'earned' | 'dismissed' | 'unavailable';

/**
 * The only rewarded placement in the app. Nothing is locked behind it: the
 * viewer trades attention for a completely ad free window, which is the closest
 * thing to a "remove ads" option an app without in app purchases can offer.
 */
export async function watchRewardedForAdPause(): Promise<RewardedOutcome> {
  // Geçiş reklamıyla aynı yuvayı paylaşır. Ana sayfadaki ve Ayarlar'daki ödül
  // düğmelerinin busy durumları birbirinden bağımsız olduğu için iki kez
  // basılabiliyor; gecikmeli bir geçiş reklamı da tam bu sırada yüklenmiş
  // olabilir. İkinci sunum kullanıcının ödülünü de götürür.
  if (fullScreenInFlight) return 'unavailable';
  fullScreenInFlight = true;
  try {
    const result = await presentFullScreenAd('rewarded', REWARDED_LOAD_TIMEOUT_MS, userRequestedAdMayBeShownNow);
    if (result === 'unavailable') return 'unavailable';
    await noteFullScreenShown(Date.now());
    if (result === 'earned') {
      await pauseAdsFor(AD_PAUSE_DURATION_MS);
      return 'earned';
    }
    return 'dismissed';
  } catch {
    return 'unavailable';
  } finally {
    fullScreenInFlight = false;
  }
}
