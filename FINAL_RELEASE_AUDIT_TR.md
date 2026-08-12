# PDF Okuyucu — son release denetimi

Tarih: 12 Ağustos 2026

## Sonuç

Kod ve varlıklar Play Internal testing’e gönderilebilecek duruma getirildi. Bu sonuç mağaza onayını garanti etmez; AdMob ve Play Console’da aşağıdaki kullanıcı işlemleri tamamlanmalıdır.

## Kodda doğrulananlar

- Banner, uygulama içeriği ile alt gezinme arasında sabit alandadır. Üstte 16 dp, alt gezinme tarafında 28 dp dokunulamaz tampon ve görsel sınırlar bulunur. Google sabit bir asgari dp değeri yayımlamaz; temel ölçüt reklamın içerik ve gezinme kontrollerinden açıkça ayrılmasıdır.
- Uygulama-açılış reklamında kişiselleştirmeyi zorlayan seçenek kaldırıldı. Reklam isteğinin izin kapsamı Google UMP / Mobile Ads SDK tarafından belirlenir.
- Geliştirme ve GitHub push QA APK’ları Google demo reklam birimlerini; manuel imzalı AAB production reklam birimlerini kullanır.
- Türkçe, İngilizce ve İspanyolca sözlükler eksiksizdir. İlk temiz kurulumda resmi cihaz/uygulama dili okunur; Android uygulama-bazlı dil listesi ve yerelleştirilmiş uygulama adları üretilir.
- tr-TR, en-US ve es-ES için mağaza metinleri ve her dilde dört ekran görüntüsü hazırdır.
- Android `application/pdf` açma filtresi vardır. E-posta/dosya yöneticisinden açılan PDF uygulamanın özel cihaz klasörüne kopyalanır.
- Uygulama kodunda geliştiriciye PDF yükleyen backend, hesap, analytics, Firebase, Sentry veya özel veri toplama uç noktası bulunmaz.
- PDF içe aktarma; HTTPS zorlaması, 250 MB sınırı, disk alanı kontrolü, dosya adı temizliği, `%PDF-` başlık kontrolü ve başarısız kopya temizliği uygular.
- Eski depolama ve ekran üstü gösterim izinleri engellenmiştir; `allowBackup` kapalıdır.
- R8/minify ve resource shrinking release için açıktır.

## Geçen kontroller

- i18n: 116 anahtar × 3 dil, kullanılan 116 anahtar
- TypeScript typecheck
- Expo lint
- Expo Doctor: 20/20
- Release doğrulaması: 12 yerelleştirilmiş ekran görüntüsü
- Android Metro/Hermes export
- Expo Android prebuild: tr/en/es locale config, yerelleştirilmiş adlar, PDF intent ve AdMob App ID üretildi

## Açık ama release engelleyici olmayan paket uyarısı

`npm audit --omit=dev` üç temel geçişli araç zinciri duyurusunu büyüterek çok sayıda paket üzerinde gösterir: Metro üzerinden `image-size` için iki DoS duyurusu ve iOS/Xcode araçları üzerinden `uuid` için bir sınır kontrolü duyurusu. Kritik açık yoktur ve uygulama çalışma zamanında kullanıcı PDF’lerini bu paketlerle ayrıştırmaz. `npm audit fix --force` Expo/RN sürüm zincirini geriye ve uyumsuz sürümlere çektiği için uygulanmamalıdır. Expo SDK’nın uyumlu düzeltmesi yayınlandığında kontrollü yükseltme yapılmalıdır.

## Console’da tamamlanacaklar

1. AdMob uygulama kaydı paketinin `com.aitolian.pdfokuyucu` olduğunu doğrulayın.
2. AdMob → Privacy & messaging bölümünde European regulations mesajını oluşturup yayımlayın.
3. Play Console’da Türkçe, English (United States) ve Español (España) listelemelerini ayrı ayrı ekleyin ve ilgili ekran görüntülerini yükleyin.
4. Reach and devices → Countries/regions bölümünden hedef ülkeleri seçin.
5. Data Safety ve “uygulama reklam içerir” beyanlarını tamamlayın.
6. İmzalı AAB’yi önce Internal testing’e yükleyip farklı ekran boyutlarında banner, UMP, e-posta eki, URL indirme, gece modu ve parola korumalı PDF akışlarını gerçek cihazda test edin.

## Resmî referanslar

- AdMob önerilen banner uygulamaları: https://support.google.com/admob/answer/6275335
- AdMob önerilmeyen banner uygulamaları: https://support.google.com/admob/answer/6275345
- Google UMP Android: https://developers.google.com/admob/android/privacy
- Mobile Ads SDK Data Safety açıklaması: https://developers.google.com/admob/android/privacy/play-data-disclosure
- Expo yerelleştirme: https://docs.expo.dev/guides/localization/
- Play mağaza çevirileri: https://support.google.com/googleplay/android-developer/answer/9844778
- Play ülke dağıtımı: https://support.google.com/googleplay/android-developer/answer/7550024
