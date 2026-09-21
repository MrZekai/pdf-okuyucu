/**
 * Reklam isteğine izin olup olmadığının TEK kaynağı.
 *
 * Banner, ödüllü şerit ve app-open bu durumu React context'ten okuyordu; geçiş
 * reklamı ise hiç okumuyordu. Sonuç: onay adımı başarısız olduğunda banner ve
 * "Reklamsız süre" şeridi tamamen kayboluyor, geçiş reklamı ise onay durumu
 * bilinmeden istenmeye devam ediyordu. Artık hepsi aynı kapıdan geçer.
 */
let allowed = false;
let nonPersonalizedOnly = false;

export function setAdsAllowed(value: boolean, npaOnly: boolean) {
  allowed = value;
  nonPersonalizedOnly = value && npaOnly;
}

export function adsAllowed() {
  return allowed;
}

/** Her reklam isteğine verilecek ortak seçenekler. */
export function adRequestOptions() {
  return nonPersonalizedOnly ? { requestNonPersonalizedAdsOnly: true } : {};
}
