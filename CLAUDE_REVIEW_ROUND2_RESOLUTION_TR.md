# Claude Red Team 2. Tur — Doğrulama ve Çözüm Kaydı

Tarih: 12 Ağustos 2026

Bu belge `Yapıştırılan markdown(4).md` raporundaki her teknik iddianın teslim edilen kaynakla karşılaştırılmış sonucudur. Bu tur kaynak revizyonudur; APK, AAB, Gradle veya GitHub Actions derlemesi çalıştırılmamıştır.

## Sonuç tablosu

| Bulgu | Doğrulama | Uygulanan çözüm |
|---|---|---|
| Yerelleştirme yapılandırması kaldırılmış | İşlevsel regresyon doğrulandı. Teslim alınan validator raporda sözü edilen dokuz kontrolü içermediği için “kesin 9 hata” bu kaynakta yeniden üretilemedi; ancak native dil algılama, Android uygulama-bazlı dil ve yerelleştirilmiş simge adı gerçekten kayıptı. | `expo-localization ~57.0.1`, lock kaydı, `getLocales()`, `supportedLocales`, `app.config.js > locales` ve `locales/tr,en,es.json` birlikte geri getirildi. Validator ve CI kaynak kapıları eklendi. |
| Banner görsel ayırıcıları kaybolmuş | Doğrulandı; 16/28 dp fiziksel boşluk vardı fakat arka planla aynı renkti. | Koyu dokunulamaz tampon zemini ve hairline sınırlar geri getirildi; mevcut mesafeler değiştirilmedi. |
| `useForeground` Android kurtarma belirsizliği | Düşük fakat gereksiz risk olarak kabul edildi. | Android/iOS ortak `AppState` active dinleyicisi eklendi. Üç hatadan sonra gizlenen banner yeni foreground oturumunda kontrollü olarak yeniden denenir. `useForeground` yalnız iOS reload davranışı için korunur. |
| iOS dosya paylaşımı politika çelişkisi | Gelecekteki iOS yayını için doğrulandı. Android’e faydası yoktu. | `supportsOpeningDocumentsInPlace` ve `enableFileSharing` kaldırıldı; `expo-file-system` varsayılan özel uygulama alanıyla bırakıldı. Validator yeniden eklenmelerini reddeder. |
| compile/target SDK elle sabitlenmiş | Expo SDK 57 zaten uygun Android varsayılanını yönetiyor; elle pin gereksizdi. Config introspection varsayılan compile/target değerlerinin yine 36 olduğunu doğruladı. | `compileSdkVersion` ve `targetSdkVersion` elle pinleri kaldırıldı. Kotlin 2.1.20, Ads 24.6.0, R8 ve resource shrink sabitleri aynen korundu. |
| R8 consumer kuralları | Önceki çözüm doğru | Yeni geniş veya yanlış namespace ProGuard kuralı eklenmedi. PDF ve Expo AAR consumer kuralları korunur. |
| expo-router derin import | Önceki erteleme doğru | Yeni navigation bağımlılığı eklenmedi. |
| Yasal site otomasyonu | Önceki güvenlik kararı doğru | Geniş yetkili cross-repo PAT eklenmedi. |

## Yeni koruma kapıları

- `scripts/validate-release.mjs`, `expo-localization` sürümünü, tr/en/es platform listesini ve üç locale dosyasındaki Android/iOS uygulama adlarını doğrular.
- Validator, iOS belge paylaşımı bayraklarının tekrar eklenmesini reddeder.
- Validator, banner ayırıcı sınırlarını ve Android `AppState` foreground kurtarma yolunu doğrular.
- GitHub workflow, prebuild sonrasında `locales_config.xml`, `PDF Reader` ve `Lector PDF` Android kaynaklarını kontrol eder.
- `AGENTS.md`, native yerelleştirme parçalarının tek bir bütün olduğunu açıkça belirtir.

## Bilinçli olarak yapılmayanlar

- APK/AAB üretilmedi ve Gradle çalıştırılmadı.
- GitHub Actions tetiklenmedi.
- PDF motoru, Kotlin, Ads pin’i, AdMob kimlikleri, UI tasarımı veya veri mimarisi değiştirilmedi.
- Yeni backend, analitik, bulut depolama ya da kullanıcı PDF’sini dışarı gönderen bir yol eklenmedi.

## Claude için yeniden inceleme kapsamı

1. `package.json` ve `package-lock.json` içindeki `expo-localization` eşleşmesini kontrol et.
2. `app.config.js`, `locales/*.json` ve `constants/i18n.ts` native yerelleştirme zincirini kontrol et.
3. `components/AdBanner.tsx` timer temizliği, AppState aboneliği ve 16/28 dp ayırıcılarını kontrol et.
4. `scripts/validate-release.mjs` ile workflow kapılarının yanlış pozitif üretmediğini statik olarak kontrol et.
5. Bu turda derleme yapılmadığını ve yalnız kaynak kontrollerinin sonuçlarının sunulduğunu dikkate al.
