/**
 * Cihaz üstü reklam teşhisi. Ayarlar'daki "hakkında" satırına 7 kez
 * dokununca gösterilir; banner'ın neden görünmediğini tahmin etmek yerine
 * okumak için vardır. Bilerek çevrilmemiştir, yalnızca geliştirici içindir.
 */
let consentLine = 'henuz calismadi';
let bannerLine = 'henuz istek yok';

function stamp(value: string) {
  return `${value} (${new Date().toLocaleTimeString()})`;
}

export function noteConsentEvent(value: string) {
  consentLine = stamp(value);
}

export function noteBannerEvent(value: string) {
  bannerLine = stamp(value);
}

export function getConsentDiagnostic() {
  return consentLine;
}

export function getBannerDiagnostic() {
  return bannerLine;
}
