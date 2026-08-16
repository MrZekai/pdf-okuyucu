# Claude kaynak inceleme istemi

Bu depo Expo SDK 57 / React Native 0.86.2 tabanlı, yalnız cihazda çalışan bir PDF Reader uygulamasıdır. Bu turda APK/AAB üretmeden global dil ve PDF araçları eklendi.

Lütfen yalnız kaynak kodu incele; dosya değiştirme ve derleme başlatma. Özellikle şunları kanıtla veya somut dosya/satırla hata bildir:

1. 14 dilin anahtar ve yer tutucu eşitliği; desteklenmeyen dilde İngilizce fallback.
2. Arapça RTL yönü, chevron/back aynalama ve uzun Almanca/Rusça metin taşmaları.
3. `lib/pdfTools.ts` içindeki merge/extract/remove/reorder/rotate/clean işlemlerinin doğruluğu, bellek sınırı ve kaynak dosyayı silmeme garantisi.
4. Araç çıktılarının `saveGeneratedPdf` ve `addGeneratedDocument` yoluyla yalnız uygulama özel alanına kaydedilmesi; hiçbir PDF/veri yükleme veya analitik yolu bulunmaması.
5. Ana sayfa önerilerinin yalnız gerçek araçlara gitmesi; Word/Excel/PPT gibi uygulanmamış iddia bulunmaması.
6. AdMob test/canlı ayrımı, UMP, banner güvenli boşluğu ve app-open sıklık korumaları.
7. `app.config.js`, `scripts/check-i18n.mjs`, `scripts/validate-release.mjs` ve Android workflow locale kontrollerinin birbirleriyle tutarlılığı.
8. TR/en-US/es-ES mağaza PNG'lerinin 1080×1920 olması ve 14 listing dosyasının Play metin sınırlarını geçmemesi.
9. R8/ProGuard, Kotlin 2.1.20 ve Ads SDK 24.6.0 pininin korunması.

Beklenen komutlar:

```bash
npm ci --legacy-peer-deps
npm run check
npm run lint
npm run doctor
npm run release:check
```

Bulgu yoksa açıkça “kaynak kalite kapıları için engel bulamadım” de; çalıştırmadığın native Gradle/AAB sonucunu doğrulanmış gibi sunma.
