# Claude Red Team 4. Tur — Doğrulama ve Çözüm Kaydı

Tarih: 12 Ağustos 2026

Bu belge `Yapıştırılan markdown(5).md` içindeki yeni bulgular ile raporun önceki turdan taşıdığı açıkların güncel kaynakta doğrulanıp çözülme durumunu kaydeder. Bu tur yalnız kaynak revizyonudur; APK, AAB, Gradle, Android prebuild veya GitHub Actions çalıştırılmamıştır.

## Sonuç tablosu

| Bulgu | Doğrulama | Uygulanan çözüm |
|---|---|---|
| App-open isteğinde `requestNonPersonalizedAdsOnly` geri gelmiş | Doğrulandı. Bayrağın `false` değeri tek başına UMP sinyalini iptal etmese de kod-belge tutarsızlığı ve gelecekte `true` yapılma riski vardı. | Bayrak tamamen kaldırıldı; UMP/Mobile Ads SDK kararını açıklayan yorum ve bayrağın her iki değerini de reddeden validator kapısı eklendi. |
| `AGENTS.md` yanlışlıkla `play-services-ads-base` pinlendiğini söylüyor | Doğrulandı; gerçek plugin yalnız `play-services-ads` ve `play-services-ads-lite` pinliyor. | Belge plugin ile eşitlendi; `-base` ve `-identifier` artefaktlarının bilinçli olarak pin dışında olduğu açıklandı. Plugin değiştirilmedi. |
| Health-check tablosu güncel HEAD için native doğrulama yapılmış izlenimi veriyor | Doğrulandı. | Kaynak kontrolleri ile native/CI kontrolleri ayrıldı; bu turda prebuild/Gradle/APK/AAB çalıştırılmadığı açıkça yazıldı. |
| PDF yüklenince kayıtlı son sayfa 1’e sıfırlanabiliyor | Doğrulandı. | `onLoadComplete` artık yalnız sayfa sayısı gerçekten değiştiğinde mevcut `doc.lastPage` değerini koruyarak metadata güncelliyor. Kullanıcı sayfa değişimi yine `onPageChanged` ile kaydediliyor. |
| `Quick` ve `Stat` bileşenlerinde `any` | Doğrulandı. | İkon adlarını `AppIcon` birleşimine bağlayan kesin prop tipleri eklendi. Silinen/geçersiz ikonlar artık TypeScript kapısında yakalanır. |
| Eski belgelerde göreli zaman yalnız gün olarak büyüyor | Doğrulandı, düşük riskli UX cilası. | Gün/ay/yıl eşikleri ve üç dilde tekil/çoğul ay-yıl metinleri eklendi. |
| AppState sırasında gecikmiş belge kaydı kaybolabilir | Doğrulandı. | Belge listesi ref ile güncel tutuluyor; uygulama `inactive`/`background` olduğunda bekleyen timer iptal edilip güncel kayıt hemen AsyncStorage’a gönderiliyor. Unmount sırasında da son kayıt deneniyor. |
| Picker URI’si değişirse aynı PDF tekrar kopyalanabilir | Doğrulandı. | Kalıcı kopyanın yerel MD5 içerik özeti metadata’ya ekleniyor. Picker, dış intent ve URL ekleme yolları içerik özetiyle aynı PDF’yi bulup yeni kopyayı siliyor. Bu özet yalnız tekilleştirme içindir; kriptografik güvenlik kararı olarak kullanılmaz. |
| İngilizce/İspanyolca listeleme için yerelleştirilmiş ekran görseli yok | Doğrulandı. | `play-store/screenshots/en-US/` ve `es-ES/` altına 4’er adet 1080×1920 görsel ve düzenlenebilir SVG kaynakları eklendi. Ayarlar görsellerinde doğru dil seçili gösterilir. Türkçe ana ekran görselindeki eski slogan da güncel uygulama metniyle değiştirildi. |
| Validator `expo-localization` sürümünü tek patch’e kilitliyor | Doğrulandı. | Kapı, Expo SDK 57 ile uyumlu `~57.x.y` aralığını kabul edecek şekilde gevşetildi; bağımlılığın yanlış majöre kayması yine reddedilir. |
| `pdfokuyucu` şeması için özel PDF işleyici yok | Bilgi notu; hata değil. | Expo Router/dev-client gereksinimi olduğu için şema korundu. Güvensiz yeni deep-link davranışı eklenmedi. |

## Ek koruma kapıları

- App-open kaynakta `requestNonPersonalizedAdsOnly` anahtar sözcüğü bulunursa release kontrolü durur.
- Okuma ilerlemesini yüklemede sıfırlamama, AppState anlık kayıt ve içerik özeti tekilleştirmesi kaynak kapılarıyla korunur.
- Validator Türkçe kök görsellerin yanında `en-US` ve `es-ES` altında da dört doğru boyutlu PNG ister.
- Kalıcı belge şeması isteğe bağlı `sourceUri` ve `fingerprint` alanlarını tip kontrolünden geçirir.

## Kaynak kontrol sonuçları

- `npm run check`: geçti — 124 anahtar × 3 dil, TypeScript hatası yok.
- Expo ESLint: geçti — hata yok.
- Expo Doctor (offline): geçti — 20/20.
- `npm run release:check`: geçti — AdMob/config/gizlilik/PDF/banner ve 12 mağaza görseli kapıları yeşil.
- Sekiz yeni yerelleştirilmiş PNG görsel olarak açılıp karşılaştırıldı; boyutları 1080×1920.

## Bilinçli olarak yapılmayanlar

- APK/AAB üretilmedi; Gradle ve Android prebuild çalıştırılmadı.
- GitHub Actions tetiklenmedi.
- Kotlin 2.1.20, Ads SDK 24.6.0 pin’i, AdMob kimlikleri, PDF motoru ve paket adı değiştirilmedi.
- Backend, hesap, analitik, bulut depolama veya kullanıcı PDF’sini dışarı gönderen bir yol eklenmedi.

## Claude için yeniden inceleme kapsamı

1. `AppOpenAdController.tsx` ve validator’daki UMP bayrak kapısını kontrol et.
2. `reader/[id].tsx` yükleme olayı ile `AppContext.tsx` AppState kayıt sırasını statik olarak izle.
3. `PdfDocument.fingerprint`, `createDocument` ve üç içe aktarma yolundaki tekilleştirmeyi kontrol et.
4. `play-store/source/{en-US,es-ES}` ile karşılık gelen PNG’lerin metin/dil eşleşmesini kontrol et.
5. Bu turda native derleme yapılmadığını ve yalnız kaynak kapılarının çalıştırıldığını dikkate al.
