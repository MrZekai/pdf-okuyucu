import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { AdEventType, InterstitialAd, RewardedAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';

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

// Written by the previous release. Read once so an existing install does not
// suddenly become eligible for an app open ad right after the update.
const LEGACY_APP_OPEN_LAST_SHOWN_KEY = '@pdf-reader/app-open-last-shown-v1';

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

/** The newest timestamp wins so an upgrade cannot reset the shared gap. */
export async function getLastFullScreenAt() {
  const [current, legacy] = await Promise.all([
    readTimestamp(LAST_FULL_SCREEN_KEY),
    readTimestamp(LEGACY_APP_OPEN_LAST_SHOWN_KEY)
  ]);
  return Math.max(current, legacy);
}

export async function noteFullScreenShown(now = Date.now()) {
  // The legacy key is kept in sync so a rollback to the previous build still
  // sees a recent app open ad and does not show a second one immediately.
  await Promise.all([
    writeTimestamp(LAST_FULL_SCREEN_KEY, now),
    writeTimestamp(LEGACY_APP_OPEN_LAST_SHOWN_KEY, now)
  ]);
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

function presentFullScreenAd(kind: 'interstitial' | 'rewarded', loadTimeoutMs: number): Promise<FullScreenResult> {
  return new Promise<FullScreenResult>((resolve) => {
    const unitId = resolveUnitId(kind);
    if (!unitId) {
      resolve('unavailable');
      return;
    }

    let settled = false;
    let earned = false;
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
      const created = kind === 'interstitial' ? InterstitialAd.createForAdRequest(unitId) : RewardedAd.createForAdRequest(unitId);
      ad = created as unknown as FullScreenAd;
      unsubscribe = ad.addAdEventsListener(({ type }) => {
        if (type === AdEventType.LOADED || type === RewardedAdEventType.LOADED) {
          clearTimer();
          // Some ad creatives never emit CLOSED. The guard keeps the caller,
          // which may be showing a spinner, from waiting forever.
          timer = setTimeout(() => settle(earned ? 'earned' : 'shown'), OPEN_AD_HANG_GUARD_MS);
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
        if (type === RewardedAdEventType.EARNED_REWARD) {
          earned = true;
          return;
        }
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
  if (!unitId) return;
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
    ad = InterstitialAd.createForAdRequest(unitId) as unknown as FullScreenAd;
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
function presentPreparedAd(ad: FullScreenAd): Promise<FullScreenResult> {
  return new Promise<FullScreenResult>((resolve) => {
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

export function markInterstitialPending() {
  interstitialPending = true;
}

/** Returns whether a full screen ad was actually presented. */
export async function maybeShowPendingInterstitial() {
  if (!interstitialPending) return false;
  interstitialPending = false;
  return maybeShowToolInterstitial();
}

/** Returns whether a full screen ad was actually presented. */
export async function maybeShowToolInterstitial() {
  try {
    // Rule one: the ad free window the viewer earned is honoured. This is a
    // promise, not pacing, so it stays in code.
    if (await adsArePaused()) return false;

    // Rule two, and the only pacing rule left: never stack two full screen ads.
    const now = Date.now();
    const lastFullScreenAt = await getLastFullScreenAt();
    if (now - lastFullScreenAt < MIN_FULL_SCREEN_GAP_MS) return false;

    if (preparedInterstitial && now - preparedInterstitial.loadedAt >= PRIMED_AD_TTL_MS) discardPreparedInterstitial();
    const prepared = preparedInterstitial;
    preparedInterstitial = null;

    const result = prepared
      ? await presentPreparedAd(prepared.ad)
      : await presentFullScreenAd('interstitial', INTERSTITIAL_LOAD_TIMEOUT_MS);
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
  }
}

/**
 * Developer-facing snapshot of every gate. Surfaced behind a hidden tap in
 * Settings so ad pacing can be verified on a real device without a debugger.
 */
export async function getAdDiagnostics() {
  const now = Date.now();
  const [runs, lastFullScreenAt, pausedUntil, day] = await Promise.all([
    readTimestamp(TOOL_RUN_KEY),
    getLastFullScreenAt(),
    readTimestamp(AD_PAUSE_UNTIL_KEY),
    readDayCount(INTERSTITIAL_DAY_KEY)
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
    '',
    `SONUC: ${pauseOn ? 'Reklamsiz sure acik, gecis reklami cikmaz' : gapOk ? 'Gecis reklami cikabilir' : '60 sn dolmadi, biraz bekleyin'}`
  ].join('\n');
}

export type RewardedOutcome = 'earned' | 'dismissed' | 'unavailable';

/**
 * The only rewarded placement in the app. Nothing is locked behind it: the
 * viewer trades attention for a completely ad free window, which is the closest
 * thing to a "remove ads" option an app without in app purchases can offer.
 */
export async function watchRewardedForAdPause(): Promise<RewardedOutcome> {
  try {
    const result = await presentFullScreenAd('rewarded', REWARDED_LOAD_TIMEOUT_MS);
    if (result === 'unavailable') return 'unavailable';
    await noteFullScreenShown(Date.now());
    if (result === 'earned') {
      await pauseAdsFor(AD_PAUSE_DURATION_MS);
      return 'earned';
    }
    return 'dismissed';
  } catch {
    return 'unavailable';
  }
}
