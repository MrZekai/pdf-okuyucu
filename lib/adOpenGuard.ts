/**
 * Belge açma koruması: bir PDF açma isteği sürerken ertelenmiş geçiş reklamı
 * çıkmaz.
 *
 * Bu modül bilerek bağımlılıksızdır (React Native, AsyncStorage, reklam SDK'sı
 * yok) - böylece mantığı cihaz olmadan, düz Node ile test edilebilir.
 * `scripts/test-ad-open-guard.mjs` bunu doğrular.
 *
 * Neden var: ertelenmiş reklam ana ekranın ODAK olayında sunuluyor. Sistem
 * dosya seçici ayrı bir etkinlik olduğu için kullanıcı "PDF Aç"a bastığında ana
 * ekran önce odağı kaybediyor, seçici kapanınca geri kazanıyor. O odak olayı,
 * kullanıcı dosyasını seçmiş olsa da iptal etmiş olsa da reklamı tetikliyordu.
 *
 * Görünen iki kusur şuydu:
 *   1. Seçimi iptal eden kullanıcıya reklam çıkıyordu.
 *   2. Dosya seçen kullanıcıda reklam, okuyucuya yönlendirmeyle yarışıyordu -
 *      kullanıcı bunu "PDF açarken önüme reklam çıktı" olarak görüyordu, oysa o
 *      reklam önceki bir okumanın ertelenmiş reklamıydı.
 */

/** Yönlendirme birkaç kare sürer; sayaç sıfırlandıktan sonraki ilk odak olayı hâlâ bu isteğe aittir. */
export const DOCUMENT_OPEN_SETTLE_MS = 1_500;
/** Dosya seçmek uzun sürebilir; bu yalnızca sayacın kalıcı takılmasına karşı bir emniyet. */
export const DOCUMENT_OPEN_MAX_MS = 120_000;

let depth = 0;
let startedAt = 0;
let guardUntil = 0;

/**
 * Bir belge açma isteğinin başladığını bildirir ve bitişini bildiren bir işlev
 * döndürür. Çağıran taraf onu `finally` içinde çağırmalıdır. Döndürülen işlevin
 * iki kez çağrılması güvenlidir ve sayacı bir kereden fazla düşürmez.
 */
export function beginDocumentOpen(now: number = Date.now()) {
  if (depth === 0) startedAt = now;
  depth += 1;
  let ended = false;
  return (endedAt: number = Date.now()) => {
    if (ended) return;
    ended = true;
    depth = Math.max(0, depth - 1);
    guardUntil = endedAt + DOCUMENT_OPEN_SETTLE_MS;
  };
}

/** Şu anda bir belge açılıyor mu (ya da az önce açıldı/iptal edildi)? */
export function documentOpenInFlight(now: number = Date.now()) {
  if (depth > 0) {
    if (now - startedAt < DOCUMENT_OPEN_MAX_MS) return true;
    // Bitiş bildirimi bir şekilde kaybolduysa sayacı serbest bırak; yoksa
    // oturumun kalanında hiç reklam çıkmaz.
    depth = 0;
  }
  return now < guardUntil;
}

/** Yalnızca testler için: modül durumunu sıfırlar. */
export function resetDocumentOpenGuardForTests() {
  depth = 0;
  startedAt = 0;
  guardUntil = 0;
}
