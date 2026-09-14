import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

/**
 * The Play in-app review prompt.
 *
 * Why this exists: people who are happy with an app almost never open the store
 * to say so, while people who are annoyed do it unprompted. An app that never
 * asks therefore collects a rating average built mostly out of complaints. The
 * ask has to be there, and it has to land on a good moment.
 *
 * Play's own rules shape the rest. The API is quota limited and the dialog may
 * simply not appear, so nothing here may depend on it being shown: no reward,
 * no "rate us to continue", no retry loop, and no way to tell whether the
 * viewer actually rated. It is fire and forget by design.
 *
 * Nothing exported here throws. A review prompt must never interfere with the
 * document the person came here to work on.
 */

const LAST_ASKED_KEY = '@pdf-reader/review/last-asked-v1';
const SUCCESS_COUNT_KEY = '@pdf-reader/review/successful-runs-v1';

/** Ask only once the app has actually been useful several times. */
const MIN_SUCCESSFUL_RUNS = 3;
/** Play throttles the dialog anyway; this keeps us well inside its quota. */
const MIN_GAP_BETWEEN_ASKS_MS = 120 * 24 * 60 * 60 * 1000;

async function readNumber(key: string) {
  try {
    const raw = await AsyncStorage.getItem(key);
    const value = Number.parseInt(raw || '0', 10);
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

async function writeNumber(key: string, value: number) {
  try {
    await AsyncStorage.setItem(key, String(value));
  } catch {
    // Losing the counter only costs one missed opportunity to ask.
  }
}

/**
 * Called after a tool has produced a document. Returns the new count so the
 * caller does not have to read storage twice.
 */
export async function noteSuccessfulRun() {
  const next = (await readNumber(SUCCESS_COUNT_KEY)) + 1;
  await writeNumber(SUCCESS_COUNT_KEY, next);
  return next;
}

/**
 * Shows the rating prompt when the moment is right. The caller decides the
 * moment; this decides whether it has earned one.
 *
 * Deliberately never runs in the same turn as a full screen ad: an ad followed
 * by "how many stars?" is the fastest way to a one star answer.
 */
export async function maybeAskForReview() {
  try {
    const runs = await readNumber(SUCCESS_COUNT_KEY);
    if (runs < MIN_SUCCESSFUL_RUNS) return false;

    const now = Date.now();
    const lastAsked = await readNumber(LAST_ASKED_KEY);
    if (lastAsked && now - lastAsked < MIN_GAP_BETWEEN_ASKS_MS) return false;

    // On a device without the Play Store, or a build the API refuses, this is
    // simply false and nothing happens.
    if (!(await StoreReview.hasAction())) return false;
    if (!(await StoreReview.isAvailableAsync())) return false;

    // Recorded before the call: if the dialog was consumed from Play's quota
    // we must not come back tomorrow and spend another one.
    await writeNumber(LAST_ASKED_KEY, now);
    await StoreReview.requestReview();
    return true;
  } catch {
    return false;
  }
}
