# Claude Son İnceleme — Doğrulama ve Çözüm Kaydı

Tarih: 12 Ağustos 2026

Bu belge, `Yapıştırılan markdown(3).md` raporundaki önerilerin mevcut kaynak ve gerçek Android bağımlılıklarıyla karşılaştırılmış sonucudur. Öneriler körlemesine uygulanmamış; yalnız doğrulanan sorunlar düzeltilmiştir.

## Sonuç tablosu

| Madde | Karar | Uygulama |
|---|---|---|
| 1 — R8/PDF | Rapor kısmen yanlıştı | R8 zaten açık. `pdfiumandroid-1.0.32.aar` kendi `proguard.txt` tüketici kurallarını taşıyor; Expo Modules Core da module/view kurallarını taşıyor. Yanlış namespace’li geniş keep kuralları eklenmedi. AAR arm64/x86_64 ELF LOAD hizalaması `0x4000` olarak doğrulandı; CI’a QA APK ve AAB için 16 KB kapıları eklendi. |
| 2 — Gizlilik politikası bağlantısı | Zaten çözülmüştü | Ayarlar ekranında canlı politika bağlantısı ve hata bildirimi mevcut; eksik URL durumu da uyarı gösterecek şekilde sağlamlaştırıldı. |
| 3 — UMP tercih formu | Zaten çözülmüştü | `showPrivacyOptionsForm()` mevcut. UMP mesajının AdMob panelinde yayımlanması hâlâ zorunlu dış adımdır. |
| 4 — UMP sonrası restart ve initialize yarışı | Düzeltildi | Ads context’e `refresh()` eklendi; izin akışı sonrası bekleniyor. Tek eşzamanlı başlatma görevi ve tek SDK initialization promise’i kullanılıyor. |
| 5 — Banner tek hatada kayboluyor | Düzeltildi | 45 saniye arayla en fazla üç deneme, başarılı yüklemede sayaç sıfırlama ve yeniden foreground olduğunda yeni oturum denemesi eklendi. |
| 6 — Okuyucu ayarları kalıcı değil | Düzeltildi | Yön, sayfalama ve PDF sayfa gece modu doğrudan `settings`/`patchSettings` kullanıyor. |
| 7 — Aynı PDF kopyaları | Güvenli kısmi çözüm | `sourceUri` yerel kayda eklendi. Aynı picker, URL veya dış URI yeniden açılırsa yeni kopya silinip mevcut kayıt kullanılıyor. Değişken Gmail `content://` URI’ları için içerik hash’i ayrı bir geliştirmedir. |
| 8 — Kayıt şeması doğrulanmıyor | Düzeltildi | AsyncStorage dizisi parse edilirken zorunlu alanlar ve sonlu sayılar doğrulanıyor; bozuk öğeler atlanıyor. |
| 9 — HEAD zaman aşımı | Düzeltildi | HEAD isteğine `AbortController` ve 10 saniye zaman aşımı eklendi. İndirme boyut/disk korumaları aynen korunuyor. |
| 10 — Geçersiz URL ham hatası | Düzeltildi | URL parse hatası tr/en/es yerel mesajla gösteriliyor. |
| 11 — İngilizce/İspanyolca tekil | Düzeltildi | Favori belge sayısı, PDF sayfa sayısı ve kütüphane silme uyarısı için tekil anahtarlar eklendi. |
| 12 — expo-router derin import | Bilinçli ertelendi | Proje `BottomTabBar`ın expo-router tarafından vendored edilen sürümünü kullanıyor; bağımsız `@react-navigation/bottom-tabs` kurulu değil. Sırf import yolu için yeni ve potansiyel uyumsuz navigation bağımlılığı eklenmedi. Expo Router yükseltmesinde birlikte ele alınmalı. |
| 13 — “Okunan sayfa” metriği | Düzeltildi | Etiket “Sayfa ilerlemesi / Page progress / Progreso de páginas” olarak gerçeğe uygun hale getirildi. |
| 14 — Yanlış build dokümanı | Düzeltildi | `AGENTS.md`, `README.md`, audit ve release belgeleri gerçek Kotlin/Ads kök nedeni, release QA APK ve imza ayrımıyla güncellendi. |
| 15 — Yasal site eşitleme | Sağlamlaştırıldı | Otomatik cross-repo push için geniş yetkili PAT eklenmedi. `docs/README.md` ve workflow uyarısı canlı public repo eşitlemesini açık ve zorunlu kılıyor; manuel AAB akışı canlı URL’leri doğruluyor. |
| 16 — Ölü kod | Düzeltildi | Kullanılmayan `sun`, `grid`, `compact`, `bigProgress` ve `bigProgressFill` kaldırıldı. `eas.json` alternatif derleme yolu olarak korundu. |
| 17 — İmza scripti metin enjeksiyonu | Ertelendi | Script sessiz bozulmuyor, şablon değişirse açık hata veriyor ve mevcut CI’da çalışıyor. Expo SDK yükseltmesinde config plugin’e taşınmalı. |

## Ek UX ve güvenlik kararları

- Ana sayfadaki slogan tamamen kaldırıldı; yalnız yerelleştirilmiş ürün adı kaldı.
- Banner içerikten 16 dp, alt gezinmeden 28 dp ayrıdır; sistem gezinme alanı ayrıca React Native safe-area tarafından korunur.
- Production kaynaklarında gerçek AdMob birimleri bulunur; push ile üretilen QA APK yalnız Google demo birimlerini kullanır.
- PDF dosyaları uygulamanın cihaz içi document klasörüne kopyalanır. Backend, hesap, analitik, bulut yükleme veya PDF içeriğini geliştiriciye gönderen bir kod yoktur.
- `allowBackup: false` korunur; riskli eski storage ve overlay izinleri engellenir.

## Otomatik doğrulama kapıları

- i18n: 120 anahtar × 3 dil, tüm anahtarlar kullanılıyor.
- TypeScript, ESLint, Expo Doctor ve release validator.
- Android clean prebuild, manifest intent/izin/AdMob/Kotlin/Ads pin kontrolleri.
- QA APK: release-minified, Google demo reklam birimleri, production unit reddi, `zipalign -P 16`.
- AAB: upload sertifikası, debug sertifikası reddi, 64-bit ELF LOAD segmentlerinde 16 KB hizalama.

## Cihazda zorunlu son testler

1. Release-minified QA APK’da normal, büyük, bozuk ve parola korumalı PDF açma.
2. Dosya yöneticisi ve e-posta ekinde “Bununla aç”; aynı eki iki kez açınca tek kayıt.
3. HTTPS URL indirme; bozuk adres; yanıt vermeyen adres; 250 MB üstü dosya.
4. Gece modu/yön/sayfalama değiştir, okuyucudan çıkıp yeniden gir ve ayarların kaldığını doğrula.
5. UMP test coğrafyasında reddet → Ayarlar’dan değiştir; uygulamayı kapatmadan demo banner gelmeli.
6. Uçak modunu aç/kapat; banner yeniden denemesi saldırgan istek üretmeden geri gelmeli.
7. Türkçe, İngilizce ve İspanyolca temiz kurulum; tekil/çoğul metinleri ve uygulama adını kontrol et.

Bu kontroller geçmeden production rollout yapılmamalıdır.
