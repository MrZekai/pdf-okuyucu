# PDF Okuyucu — Red Team Health Check

Tarih: 10 Ağustos 2026

## Sonuç

- Başlangıç durumu: **38/100 — Play release hazır değil**
- Kod ve paket düzeltmelerinden sonra: **89/100 — internal testing’e hazır**
- Dış panel adımları tamamlandıktan sonra beklenen: **96/100**

Bu puan “Play kesin onay verir” anlamına gelmez. Nihai sonuç Google Play incelemesi, Play Console beyanları, AdMob uygulama eşleşmesi ve gerçek cihaz testine bağlıdır.

## Düzeltilen kritik/yüksek riskler

| Risk | Önce | Uygulanan çözüm |
|---|---|---|
| Uygulama ve adaptive ikon | Yok | 1024 launcher, adaptive foreground, monochrome ve splash asset’leri eklendi |
| Play mağaza görselleri | Yok | 512×512 ikon, 1024×500 feature graphic ve güncel gereksinime göre 4 adet 1080×1920 ekran eklendi |
| `versionCode` | Yok | `ANDROID_VERSION_CODE` desteği; CI’da `github.run_number` ile otomatik artış |
| Play AAB | Yalnız `assembleDebug` | Güvenli upload-key secrets akışı + `bundleRelease` + AAB artifact |
| AdMob production IDs | Test fallback | Verilen App ID, banner ve app-open unit ID’leri release yapılandırmasına bağlandı |
| App-open yaşam döngüsü | Yok | Cold-start yükleme kapısı, ilk uygun gösterim 3. açılış, warm resume, 4 saat geçerlilik/frequency cap, dev TestId |
| Gereksiz izinler | Overlay + eski storage izinleri native manifest’e geliyordu | `SYSTEM_ALERT_WINDOW`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` engellendi |
| Gizlilik politikası | Yok | Uygulama içi bağlantı, tr/en/es web politikası ve Pages deployment eklendi |
| Data Safety | Yanlış “veri yok” riski | AdMob SDK veri türlerini içeren Console yanıt taslağı eklendi |
| UMP tercihlerini yeniden açma | `gatherConsent()` ile sınırlı | Gerekli olduğunda `showPrivacyOptionsForm()` kullanılıyor |
| UMP sonrası reklam başlatma | Uygulama yeniden başlatılana kadar kapalı kalabiliyordu | AdsProvider yenileniyor; eşzamanlı initialize yarışı engelleniyor |
| Banner geçici hata | İlk no-fill/ağ hatasında oturum boyunca kayboluyordu | 45 saniye arayla en fazla üç kontrollü yeniden deneme |
| PDF URL güvenliği | Her içerik PDF adıyla saklanabiliyordu; yarım indirme kalabiliyordu | `%PDF-` doğrulaması, 250 MB sınırı ve hata temizliği eklendi |
| PDF kayıt bütünlüğü | Bozuk AsyncStorage dizisi ekranları çökertebiliyordu | Kayıtlar yüklenirken şema doğrulaması ve filtreleme eklendi |
| 16 KB native uyumu | CI kapısı yoktu | QA APK zipalign ve AAB 64-bit ELF LOAD hizalaması CI’da doğrulanıyor |
| Parolalı PDF | Her tuşta renderer yeniden kuruluyordu | Taslak parola ile uygulanan parola ayrıldı |
| Expo Doctor | Script kırık | `expo-doctor` kilitli bağımlılık olarak eklendi; 20/20 kontrol geçti |
| Tekrarlanabilir kurulum | Lockfile yoktu | `package-lock.json` eklendi; CI `npm ci` kullanıyor |

## Doğrulama sonuçları

> **Kaynak notu (12 Ağustos 2026):** Aşağıdaki i18n, TypeScript, ESLint,
> Expo Doctor ve release-validator satırları en son kaynak-only denetimde yeniden
> çalıştırılmıştır. Android prebuild, Gradle, APK/AAB ve GitHub Actions bu kaynak
> revizyonlarından sonra henüz yeniden çalıştırılmamıştır. Önceki bir native
> doğrulamanın sonucu, mevcut kaynak HEAD'i otomatik olarak doğrulamaz.

| Kontrol | Sonuç |
|---|---|
| i18n anahtar/placeholder ve hardcoded metin taraması | **Geçti** — 124 anahtar × 3 dil |
| TypeScript `tsc --noEmit` | **Geçti** |
| Expo ESLint | **Geçti** — hata ve uyarı yok |
| Expo Doctor | **Geçti** — 20/20 |
| Release yapılandırma/asset doğrulaması | **Geçti** |
| Expo Android prebuild | **Bu kaynak-only turda çalıştırılmadı** |
| Native `versionCode` | **Bu kaynak-only turda yeniden doğrulanmadı** |
| Native AdMob App ID | **Bu kaynak-only turda yeniden doğrulanmadı** |
| Riskli izinlerin native kaldırma kuralları | **Bu kaynak-only turda yeniden doğrulanmadı** |
| İmza enjeksiyon scripti | **Kaynakta mevcut; native turda yeniden doğrulanmadı** |
| Yerel Gradle APK/AAB derlemesi | **Bu ortamda Android SDK/Gradle dağıtımı olmadığı için çalıştırılamadı**; GitHub workflow derleme noktasıdır |

## Açık dış bağımlılıklar — kodla çözülemez

1. **Upload key:** İmzalı AAB için dört GitHub secret kullanıcı tarafından eklenmelidir. Keystore’u repoya koymak güvenlik hatası olacağı için otomatik eklenmedi.
2. **AdMob paket eşleşmesi:** `ca-app-pub-1380972808968213~3816043340` kaydı AdMob’da `com.aitolian.pdfokuyucu` paketine bağlı olmalıdır. “Hedef Zikirmatik” başka bir mağaza kaydına bağlıysa yeni PDF Okuyucu App ID/unit’leri gerekir.
3. **UMP mesajı:** AdMob → Privacy & messaging içinde Avrupa düzenlemeleri mesajı oluşturulup yayımlanmalıdır.
4. **Play Console formları:** Ads, Data Safety, target audience, content rating ve app access beyanları manuel gönderilmelidir.
5. **Gizlilik URL’si:** GitHub Pages workflow’unun ilk deployment’ı tamamlanmalı ve URL herkese açık test edilmelidir.
6. **app-ads.txt:** Dosya, Play geliştirici web sitesi alan adının kökünde yayınlanmalıdır; GitHub proje alt yolu tek başına yeterli olmayabilir.
7. **Gerçek cihaz/internal test:** PDF seçme, büyük/bozuk PDF reddi, URL indirme, parolalı PDF, paylaşım, UMP, test banner ve test app-open akışı denenmelidir.

## Bağımlılık taraması notu

`npm audit --omit=dev` Expo/Metro derleme zincirindeki `image-size` için yüksek, `uuid` için orta seviye kayıtlar raporladı. Önerilen otomatik “fix”, Expo 57’den Expo 53’e kırıcı bir geriye dönüş yapıyor. Bu nedenle uygulanmadı. Bulgular uygulamanın PDF içeriğini çalıştıran runtime kodundan çok Metro/Expo yapı araçlarına bağlıdır; upstream Expo güncellemesi geldiğinde yeniden değerlendirilmelidir.

## Nihai Red Team kararı

Kod tabanı artık Play internal testing aşamasına taşınabilecek düzeydedir. Ancak **“doğrudan production’a yükle ve unut”** aşamasında değildir: upload key, AdMob paket eşleşmesi, UMP mesajı, Pages URL’si ve gerçek cihaz smoke testi tamamlanmadan production rollout yapılmamalıdır.
