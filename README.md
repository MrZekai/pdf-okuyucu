# PDF Okuyucu — Emergent Ready

A premium, local-first PDF reader starter built for **Expo SDK 57 / React Native** and intentionally structured so an AI coding agent can extend it without rebuilding the project.

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
- Persistent settings
- Fixed bottom AdMob banner area on tabs **and reader**
- Policy-conscious app-open ad flow (test IDs in development, first eligible from the third launch, four-hour frequency cap)
- Google UMP consent bootstrap before ads
- Development/test ad fallback
- EAS development / APK preview / production profiles
- `AGENTS.md` + a 23-credit-safe Emergent first prompt

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
EXPO_PUBLIC_ADMOB_APP_ID_ANDROID=ca-app-pub-1380972808968213~2930057843
EXPO_PUBLIC_ADMOB_APP_ID_IOS=ca-app-pub-...~...
EXPO_PUBLIC_ADMOB_BANNER_ANDROID=ca-app-pub-1380972808968213/6623949751
EXPO_PUBLIC_ADMOB_BANNER_IOS=ca-app-pub-.../...
EXPO_PUBLIC_ADMOB_APP_OPEN_ANDROID=ca-app-pub-1380972808968213/3997786415
EXPO_PUBLIC_ADMOB_APP_OPEN_IOS=ca-app-pub-.../...
```
**Rebuild native binaries after changing App IDs.**

Also configure **Privacy & messaging** in AdMob for the consent messages you need. The app asks UMP for current consent state before Mobile Ads initialization.

## GitHub → Emergent
1. Upload this full folder to a new GitHub repository.
2. Import/Pull the repository in Emergent.
3. Paste the contents of `EMERGENT_FIRST_PROMPT.txt`.
4. Let Emergent analyze only.
5. Give one small implementation request at a time.

Avoid “make this the best PDF app” as an Emergent command: that invites broad refactors and burns credits. This repo already establishes the product and architecture; use Emergent for targeted increments.

## Important product note
The current renderer reports page changes and page count, so the app stores reading progress. Its documented API does not expose a programmatic `jumpToPage` method, so **the project does not falsely claim automatic resume-to-page yet**. A future agent can add this only if the renderer exposes a supported navigation API or if the renderer is deliberately changed after evaluation.

## Diller (tr / en / es)

Uygulama üç dilde çalışır. Tüm kullanıcıya görünen metinler tek dosyada:
`constants/i18n.ts`.

- Ekranlarda: `const { t } = useTranslation();` → `t('home.openPdf')`
- Değişkenli: `t('home.continuePage', { page, total })` — yer tutucular `{ad}` biçiminde
- React dışı modüllerde (`lib/pdfFiles.ts`): `import { t } from '@/constants/i18n'`
- Aktif dil `settings.language` içinde tutulur, **Ayarlar → DİL** bölümünden değiştirilir
- `en` ve `es` sözlükleri `Record<keyof typeof tr, string>` olarak tiplenmiştir, yani
  **bir anahtar eksik veya fazlaysa TypeScript derlemeyi durdurur**

Yeni metin eklerken: anahtarı üç sözlüğe de ekle, ekranda düz string yazma, sonra:

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

## APK ve imzalı AAB derleme (ücretsiz, Emergent kredisi harcamaz)

GitHub Actions her push'ta QA için debug APK derler. Manuel **Run workflow** çalıştırmasında,
upload-key secrets ayarlıysa Play Store için imzalı `bundleRelease` AAB de üretir. Ayrıntılı ve güvenli
kurulum için `PLAY_RELEASE_GUIDE.md` dosyasını izleyin. Hat şu kontrolleri yapar:
`npm ci` → i18n + TypeScript + Expo Doctor + release assets → `expo prebuild` →
`gradlew assembleDebug` ve isteğe bağlı `gradlew bundleRelease`.

## Play Store paketi

`play-store/` altında 512×512 ikon, 1024×500 feature graphic, dört adet 1080×1920 mağaza ekranı,
tr/en/es listeleme metinleri ve Data Safety yanıt taslağı bulunur. Gizlilik politikası `docs/` altındadır
ve GitHub Pages workflow'u ile yayınlanır. Uygulamadaki Ayarlar ekranı aynı politikaya bağlantı verir.

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

Expo SDK 57 / React Native 0.86 araç zinciri Kotlin 2.1.20 kullanır. Google Mobile
Ads SDK 25.4.0'in minimum Kotlin sürümü 2.1.0 olduğu için `app.config.js` içindeki
`expo-build-properties` bloğu `kotlinVersion: '2.1.20'` değerine sabitlenmiştir.
Kotlin 2.3.x kullanıldığında `react-native-gesture-handler:compileDebugKotlin`
aşamasında dahili K2 tip-denetleyici hatası oluşur. **Bu sürümü yükseltmeyin.**
