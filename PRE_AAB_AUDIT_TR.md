# PDF Okuyucu — AAB Öncesi Kaynak Denetimi

Bu belge, v15 red-team raporundaki maddelerin kaynak kod üzerinde yeniden doğrulanmış sonucudur.

## Düzeltilen gerçek sorunlar

- QA release APK artık Google’ın resmi test banner ve app-open reklam birimlerini kullanır. CI, production unit ID görürse APK yükleme adımından önce durur.
- Gizlilik politikası ve app-ads.txt kök public site adreslerine taşındı. Manuel AAB, iki canlı URL 200 dönmeden başlamaz.
- Android `application/pdf` VIEW intent-filter ve gelen `content://` / `file://` URI’ını hemen uygulama kütüphanesine kopyalayan handler eklendi. Dosya yöneticisi, Gmail ve benzeri uygulamaların “Bununla aç” akışı desteklenir.
- URL indirme yalnızca HTTPS kabul eder. HEAD ile bilinen boyut önceden denetlenir; akış sırasında 250 MB ve boş disk sınırı aşılırsa indirme iptal edilir.
- DocumentPicker geçici cache kopyası kalıcı kopyadan sonra silinir; eski DocumentPicker cache klasörü uygulama açılışında temizlenir.
- Dosya adları hem karakter hem UTF-8 byte sınırıyla kısaltılır; `.pdf` uzantısı korunur.
- PDF motorunda programatik sayfaya gitme API’si olmadığı için ana sayfadaki “kaldığın yerden devam” iddiası kaldırıldı. Son açılan belge gösterilir; sahte resume vaat edilmez.
- AAB için JAR imzası ve `CN=Android Debug` kontrolü CI’a eklendi.

## Bilinçli olarak uygulanmayan rapor önerileri

- **R8/ProGuard:** Play reddi sebebi değildir. PDFium/Expo JNI ve reflection kullandığı için v1 öncesinde körlemesine açılmadı. Ayrı bir release regresyon turunda değerlendirilmeli.
- **AAB v3 imza kontrolü:** AAB dosyası APK v2/v3 şemalarıyla değil JAR imzasıyla doğrulanır. Play, son cihaz APK’larını kendi App Signing anahtarıyla imzalar.
- **Sentry/Crashlytics:** Zorunlu değildir; yeni veri toplama ve Data Safety yükümlülüğü getirir. Kullanıcı kararı olmadan eklenmedi.
- **x86/x86_64 kaldırma:** AAB ABI split uygular. ChromeOS / Play Games uyumluluğunu bozmamak için korunmuştur.
- **FOREGROUND_SERVICE / WAKE_LOCK kaldırma:** Manifest birleşiminde bağımlılıklardan gelir. Kullanımı kanıtlanmadan kaldırılması çalışma zamanı hatası doğurabilir.
- **Predictive back:** React Native/Expo üretim ayarı kaynaklı olabilir; native regresyon testi olmadan zorla değiştirilmedi.
- **SEND paylaşım hedefi:** ACTION_VIEW ile sistemden PDF açma tamamlandı. ACTION_SEND, Android `EXTRA_STREAM` için ek native kod gerektirir ve ayrı cihaz testiyle ele alınmalıdır.

## AAB kapıları

1. Public `MrZekai/MrZekai.github.io` reposunun kökünde `docs/` içindeki üç dosyayı yayınla.
2. Gizli sekmede `https://mrzekai.github.io/privacy-policy.html` ve `https://mrzekai.github.io/app-ads.txt` adreslerini aç.
3. Yeni QA APK’yı cihazda PDF seçme, HTTPS indirme, dosya yöneticisinden “Bununla aç”, bozuk/şifreli PDF, tema/yön ve test reklam etiketiyle doğrula.
4. Sonra Actions → Expo Android Build → Run workflow → `build_release: true` çalıştır.
