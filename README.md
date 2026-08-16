# PDF Reader — global, local-first PDF workspace

A local-first PDF reader and on-device PDF tools app built with **Expo SDK 57 / React Native**. PDFs are processed inside the app's private device storage; the project has no account, backend, document upload, analytics or cloud storage.

## Included
- Rich dashboard home screen
- System document picker
- URL PDF download
- Local app-library copy of PDFs
- Searchable recent library
- Favorites
- Reading progress metadata
- Native PDF rendering
- Pinch + double-tap zoom
- Horizontal / vertical reading
- Page snap mode
- PDF page inversion for night reading
- Password-protected PDF prompt
- Share PDF
- Merge PDFs
- Extract, remove and reorder pages
- Rotate every page by 90 degrees
- Remove common PDF metadata fields
- Usage-aware on-device tool suggestions (stored only on the device)
- Persistent settings
- Fixed bottom AdMob banner area on tabs **and reader**
- Policy-conscious app-open ad flow (test IDs in development, first eligible from the third launch, four-hour frequency cap)
- Google UMP consent bootstrap before ads
- Development/test ad fallback
- 14 complete interface languages with English fallback
- Searchable language selector and Arabic RTL-aware layout
- EAS development / APK preview / production profiles

## Native libraries = Development Build required
This app uses a native PDF renderer and Google Mobile Ads. It is **not an Expo Go-only project**.
Use a development build or EAS build.

## Setup
```bash
npm install
npx expo-doctor
npx expo prebuild --clean
npx expo run:android
```
Or with EAS:
```bash
npm i -g eas-cli
eas login
eas build --profile preview --platform android
```

## AdMob before production
Android native config uses the configured production App ID, while development ad requests are always sent with Google's official `TestIds` for both banner and app-open formats. iOS keeps the official sample App ID until real iOS units are configured.

Copy `.env.example` to `.env` and enter your own IDs:
```env
EXPO_PUBLIC_ADMOB_APP_ID_ANDROID=ca-app-pub-1380972808968213~3816043340
EXPO_PUBLIC_ADMOB_APP_ID_IOS=ca-app-pub-...~...
EXPO_PUBLIC_ADMOB_BANNER_ANDROID=ca-app-pub-1380972808968213/7265047779
EXPO_PUBLIC_ADMOB_BANNER_IOS=ca-app-pub-.../...
EXPO_PUBLIC_ADMOB_APP_OPEN_ANDROID=ca-app-pub-1380972808968213/1189880008
EXPO_PUBLIC_ADMOB_APP_OPEN_IOS=ca-app-pub-.../...
```
**Rebuild native binaries after changing App IDs.**

Also configure **Privacy & messaging** in AdMob for the consent messages you need. The app asks UMP for current consent state before Mobile Ads initialization.

## Important product note
The current renderer reports page changes and page count, so the app stores reading progress. Its documented API does not expose a programmatic `jumpToPage` method, so **the project does not falsely claim automatic resume-to-page yet**. A future agent can add this only if the renderer exposes a supported navigation API or if the renderer is deliberately changed after evaluation.

## Languages and fallback

The app supports English, Turkish, Spanish, Portuguese, German, French, Italian, Russian, Hindi, Indonesian, Arabic, Japanese, Korean and Simplified Chinese. Unsupported device languages always fall back to English, including the launcher name.

The language contract lives in `constants/i18n.ts`; the additional dictionaries live in `constants/translations/`.

- Ekranlarda: `const { t } = useTranslation();` → `t('home.openPdf')`
- Değişkenli: `t('home.quickFavDesc', { count })` — yer tutucular `{ad}` biçiminde
- React dışı modüllerde (`lib/pdfFiles.ts`): `import { t } from '@/constants/i18n'`
- Aktif dil `settings.language` içinde tutulur, **Ayarlar → DİL** bölümünden değiştirilir
- İlk açılış dili `expo-localization` ile cihazın/uygulamanın yerel dilinden güvenilir biçimde algılanır
- Android 13+ uygulama-bazlı dil menüsü 14 dili sunar ve launcher adı her dil için `locales/` altında yerelleştirilir
- Her sözlük `Record<keyof typeof tr, string>` olarak tiplenmiştir; eksik veya fazla anahtar TypeScript derlemesini durdurur
- `scripts/check-i18n.mjs`, dil listesini otomatik okur; yeni bir dil sessizce doğrulama dışında kalamaz
- Arapça uygulama içinde RTL yönü kullanır; yönlü ikonlar yansıtılır ve kayıtlı dil ayarı korunur

Yeni metin eklerken anahtarı 14 sözlüğe de ekleyin, ekranda düz string yazmayın, sonra:

```bash
npm run i18n:check   # anahtar + yer tutucu eşitliği, kalan sabit metin taraması
npm run typecheck    # tsc --noEmit
npm run check        # ikisi birlikte
```

## VS Code

`.vscode/` klasörü hazır. **Format-on-save bilinçli olarak kapalı** — bu projede
yoğun tek satırlık JSX ve dosya sonunda tek `StyleSheet.create` bloğu kullanılıyor;
bir biçimlendirici bunu dağıtır. `extensions.json` içinde Prettier
`unwantedRecommendations` olarak işaretlidir.

Önerilen eklentiler: Expo Tools, ESLint, Path Intellisense.
Hazır görevler: `typecheck`, `i18n:check`, `expo doctor`, `prebuild android`
(Terminal → Run Task). Hazır çalıştırma yapılandırmaları: Expo Android / Expo start.

## Android builds

GitHub Actions her push'ta R8 ile küçültülmüş release QA APK’sı derler. Bu QA APK Google demo
reklam birimlerini kullanır ve Android debug anahtarıyla imzalanır; **Play Store’a yüklenmez**. Manuel **Run workflow** çalıştırmasında,
upload-key secrets ayarlıysa Play Store için imzalı `bundleRelease` AAB de üretir. Ayrıntılı ve güvenli
kurulum için `PLAY_RELEASE_GUIDE.md` dosyasını izleyin. Hat şu kontrolleri yapar:
`npm ci` → i18n + TypeScript + Expo Doctor + release assets → `expo prebuild` →
`gradlew assembleRelease` + 16 KB hizalama kontrolü ve isteğe bağlı `gradlew bundleRelease`.

## Play Store paketi

`play-store/` altında 512×512 ikon, 1024×500 feature graphic, Türkçe/İngilizce/İspanyolca için ayrı ayrı dört adet 1080×1920 mağaza ekranı,
14 dil için listeleme metinleri ve Data Safety yanıt taslağı bulunur. Yeni 11 mağaza çevirisi yayınlanmadan önce ana dili konuşan biri tarafından incelenmelidir; durum `play-store/LISTING_REVIEW_STATUS.md` içinde izlenir. Gizlilik politikası `docs/` altındaki
kaynak dosyadan ayrı public `MrZekai.github.io` deposuna eşitlenir; bu depodaki Pages workflow’u yalnızca
kaynak doğrulaması yapar. Uygulamadaki Ayarlar ekranı canlı politikaya bağlantı verir.

Yayından önce:

```bash
npm run release:check
```

Yerelde denemek için:

```bash
npm install
npx expo start --dev-client     # Expo Go değil, dev client gerekiyor
```

`react-native-google-mobile-ads` native modül içerdiği için Expo Go ile
çalışmaz; bir kez dev client derlemeniz gerekir.

## Bilinen derleme kısıtı

Expo SDK 57 / React Native 0.86 araç zinciri Kotlin 2.1.20, eşleşen KSP ve Compose
derleyicisini kullanır. Ads SDK 25.x Kotlin 2.3 metadata ile yayınlandığı için
`plugins/withAdsSdkPin.js` yalnız Ads çekirdek artefaktlarını 24.6.0’a sabitler.
Kotlin 2.3.21 denemesinde çöken modül `expo-modules-core`; Kotlin 2.1.20 üzerinde Ads
25.x kullanıldığında çöken modül `react-native-google-mobile-ads` olmuştur.
**Kotlin 2.1.20 ve Ads 24.6.0 pin’i birlikte korunmalıdır.**
