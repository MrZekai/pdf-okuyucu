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
During development, the project uses Google's official sample App IDs as a safe native fallback and `TestIds.ADAPTIVE_BANNER` for banner requests when a real banner unit ID is not configured.

Copy `.env.example` to `.env` and enter your own IDs:
```env
EXPO_PUBLIC_ADMOB_APP_ID_ANDROID=ca-app-pub-...~...
EXPO_PUBLIC_ADMOB_APP_ID_IOS=ca-app-pub-...~...
EXPO_PUBLIC_ADMOB_BANNER_ANDROID=ca-app-pub-.../...
EXPO_PUBLIC_ADMOB_BANNER_IOS=ca-app-pub-.../...
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

## APK derleme (ücretsiz, Emergent kredisi harcamaz)

GitHub Actions her push'ta derliyor: repo → **Actions → Expo Android Build** →
**Artifacts → pdfokuyucu-expo-apk**. Hat şu adımları yapar:
`npm install` → `i18n:check` + `tsc` → `expo prebuild` → `gradlew assembleDebug`.

Yerelde denemek için:

```bash
npm install
npx expo start --dev-client     # Expo Go değil, dev client gerekiyor
```

`react-native-google-mobile-ads` native modül içerdiği için Expo Go ile
çalışmaz; bir kez dev client derlemeniz gerekir.

## Bilinen derleme kısıtı

`play-services-ads` 25.x Kotlin 2.3 metadata ile derlenmiş, Expo SDK 57 ise
varsayılan olarak Kotlin 2.1.20 kullanıyor. Bu yüzden `app.config.js` içindeki
`expo-build-properties` bloğunda `kotlinVersion: '2.3.0'` ayarlı. **Kaldırmayın.**
