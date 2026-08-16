# pdf-okuyucu — İyileştirme Notları

Expo SDK 57 / React Native 0.86 tabanlı, cihazda çalışan PDF okuyucu. AdMob (banner + app-open),
UMP izin akışı, 3 dilli (tr/en/es) i18n, expo-router. Backend/DB yok.

## Bu iterasyonda uygulananlar (analiz sonrası onaylı düzeltmeler)

Gerekli düzeltmeler:
- **Okuma konumu — arayüz beklentisi hizalandı.** `@kishannareshpal/expo-pdf@0.3.2` başlangıç sayfası/goToPage
  desteklemediği için otomatik geri yükleme mümkün değil. Bunun yerine reader'da "en son N. sayfadaydın"
  ipucu (5 sn / ilk sayfa değişiminde kapanır) + ana ekran "Son belgen" kartında son sayfa bilgisi gösterildi.
  (`app/reader/[id].tsx`, `app/(tabs)/index.tsx`, i18n: reader.lastPageHint, home.continueResume)
- **Şifreli PDF çıkmazı giderildi.** password_required/incorrect'te ayrı "kilitli" ekranı + "Şifreyi gir"
  butonu; iptal artık boş ekranda bırakmıyor; yanlış şifrede modalda hata mesajı. (`app/reader/[id].tsx`)
- **Kök Error Boundary eklendi.** `components/ErrorBoundary.tsx`, `app/_layout.tsx`'te en dışta sarmalıyor;
  render hatasında "Yeniden dene" ile kurtarma.

İsteğe bağlı geliştirmeler:
- MD5 fingerprint eşiği 64MB → 24MB (potansiyel ANR azaltma). (`lib/pdfFiles.ts`)
- App-open cold gate 3000ms → 2500ms; AdBanner yükleme sırasında yükseklik rezerve edip layout shift'i azaltıyor.
- URL indirmede loopback/özel/link-local host engeli (`isBlockedHost`, i18n: files.blockedHost). (`lib/pdfFiles.ts`)
- Erişilebilirlik: reader header, DocumentCard, library, UrlModal ikon butonlarına accessibilityRole/Label
  (i18n: a11y.*).

## Korunanlar
- Yoğun tek-satır JSX stili (AGENTS.md kuralı) korundu.
- Reklam retry/frequency-cap mantığı, banner güvenli boşlukları, test/prod reklam ID ayrımı değiştirilmedi.
- Kotlin 2.1.20 + play-services-ads 24.6.0 pin dokunulmadı.

## Doğrulama
- `node scripts/check-i18n.mjs` → OK (142 anahtar x 3 dil, hardcoded string yok).
- `node scripts/validate-release.mjs` → OK.
- Tam `tsc`/`eslint`/prebuild/gradle bu ortamda node_modules kurulu olmadığı için çalıştırılmadı;
  bunlar ücretsiz GitHub Actions CI'da (`.github/workflows/expo-android.yml`) koşar.

## Sonraki adımlar / backlog
- CI'da tsc + lint + expo-doctor + prebuild geçtiğini doğrula.
- (İleride) Kütüphane goToPage/initialPage desteği eklerse gerçek "kaldığın yerden devam" bağlanabilir.
