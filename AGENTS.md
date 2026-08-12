# EMERGENT / AI AGENT RULES — CREDIT-SAFE MODE

This repository is an EXISTING, intentionally structured **Expo SDK 57 / React Native** PDF reader.
The owner has a very limited Emergent credit budget. Read this file fully before touching anything.

## Non-negotiable rules
1. DO NOT rebuild this project from scratch.
2. DO NOT migrate away from Expo SDK 57 / React Native. Do not convert it to native Kotlin/Swift, Flutter or a web app.
3. DO NOT replace the PDF engine (`@kishannareshpal/expo-pdf`) unless a concrete reproducible blocker requires it.
4. DO NOT redesign unrelated screens when implementing one feature.
5. DO NOT add a backend, database, login, cloud storage, analytics, subscriptions or extra ad formats unless explicitly requested.
6. DO NOT upgrade packages merely because newer versions exist.
7. **DO NOT reformat the code.** The dense one-line JSX + single `StyleSheet.create` block at the bottom of each file is a deliberate style. Prettier/ESLint auto-fix must not reflow it. `.vscode/settings.json` disables format-on-save on purpose.
8. Keep every requested change local, minimal and reversible.
9. Before editing, identify the exact files required. Prefer 1-3 touched files per small task.
10. Run only the checks needed. `npm run check` (i18n + tsc) is cheap and offline — prefer it over repeated builds.
11. Preserve the fixed bottom AdMob banner area on Home, Library, Favorites, Settings and Reader.
12. Never use production AdMob IDs during development. TestIds are intentionally used in dev/fallback mode.
13. Protect user files: a PDF-reading failure must never delete the source file or crash the app.
14. Preserve the app-open ad safeguards: development TestIds, cold-start loading gate, first eligibility on launch 3, and four-hour cap.
15. Do not reintroduce `SYSTEM_ALERT_WINDOW`, `READ_EXTERNAL_STORAGE` or `WRITE_EXTERNAL_STORAGE`; the SAF document picker does not need them.

## Localisation — 3 languages, hard requirement
The app ships in **Turkish (tr), English (en), Spanish (es)**.

- **Single source of truth:** `constants/i18n.ts`. Three dictionaries: `tr`, `en`, `es`.
- `en` and `es` are typed as `Record<keyof typeof tr, string>`, so **TypeScript fails the build if a key is missing or extra**. Key parity is compiler-enforced, not a convention.
- In components: `const { t } = useTranslation();` then `t('home.openPdf')`.
- With variables: `t('home.quickFavDesc', { count })` — placeholders are `{name}` style.
- In non-React modules (e.g. `lib/pdfFiles.ts`): import `{ t }` from `@/constants/i18n` (module-level active language).
- The active language lives in `settings.language` (persisted via `lib/storage.ts`) and is switchable from the Settings screen.
- `AppContext` mirrors it into the module-level language with `setActiveLanguage`.
- `expo-localization`, `app.config.js > locales`, the `supportedLocales` config plugin and `locales/{tr,en,es}.json` are one native localisation unit. Do not remove one without intentionally removing all native app-language and localised app-name support.

**Rules when adding any user-visible text:**
1. Add the key to all three dictionaries in `constants/i18n.ts`.
2. Never inline a literal string in a screen or component.
3. Run `npm run i18n:check` — it fails on key drift, placeholder drift, and any leftover hardcoded Turkish literal.

## Architecture
- `app/_layout.tsx` — providers + stack
- `app/(tabs)/_layout.tsx` — tab bar (titles translated)
- `app/(tabs)/index.tsx` — premium home/dashboard
- `app/(tabs)/library.tsx` — searchable local library (locale-aware search)
- `app/(tabs)/favorites.tsx` — favorite documents
- `app/(tabs)/settings.tsx` — language selector + reader / privacy settings
- `app/reader/[id].tsx` — native PDF reader
- `constants/i18n.ts` — **all user-facing strings, 3 languages**
- `constants/theme.ts` — colour palette
- `context/AppContext.tsx` — app state, persistence, language sync
- `context/AdsContext.tsx` — ads readiness
- `hooks/useTranslation.ts` — screen-level translator
- `hooks/useAdsBootstrap.ts` — UMP consent + Mobile Ads init
- `lib/pdfFiles.ts` — picking/downloading/local copies
- `lib/storage.ts` — AsyncStorage persistence + defaults
- `components/AdBanner.tsx` — fixed AdMob banner
- `components/AppOpenAdController.tsx` — policy-conscious cold/warm app-open ad lifecycle
- `play-store/` — validated Play graphics, listing copy and Data Safety guidance
- `docs/` — public privacy policy and app-ads.txt source
- `components/DocumentCard.tsx` — document row (accepts an optional `t`)
- `scripts/check-i18n.mjs` — dependency-free i18n guard

## Known build constraint (already fixed — do not revert)
Expo SDK 57 / React Native 0.86 uses Kotlin **2.1.20** together with its matching KSP and
Compose compiler. Google Mobile Ads SDK 25.x was published with Kotlin **2.3 metadata**, which
the Kotlin 2.1 toolchain cannot read. `plugins/withAdsSdkPin.js` therefore pins only the exact
`play-services-ads` and `play-services-ads-lite` artifacts to **24.6.0**. Both
`play-services-ads-base` and the independent `play-services-ads-identifier` artifact are
intentionally outside that pin; the main artifact POM resolves their compatible versions.

Raising only `kotlinVersion` to 2.3.21 breaks the synchronized Expo toolchain and caused
`:expo-modules-core:compileDebugKotlin` to fail in `AutoSizingComposable.kt`. Keeping Kotlin
2.1.20 without the Ads 24.6.0 pin causes `:react-native-google-mobile-ads:compileDebugKotlin`
to reject the 2.3 metadata. **Both constraints are required.** Do not change either one without
rebuilding and testing the full Android dependency matrix.

## Verification commands (cheap, offline, no credits)
```
npm run i18n:check     # key parity + placeholder parity + no hardcoded strings
npm run typecheck      # tsc --noEmit (also enforces dictionary parity)
npm run check          # both
npm run doctor         # expo-doctor
```
CI (`.github/workflows/expo-android.yml`) runs the same checks plus release validation and `expo prebuild`.
Push builds run `gradlew assembleRelease` with Google demo ad units and upload a release-minified QA APK
signed with the Android debug key; that QA APK must never be uploaded to Play. A manual workflow run creates
an upload-key-signed `bundleRelease` AAB when the four documented GitHub secrets exist. CI also validates
16 KB native-page alignment. **Builds run for free on GitHub Actions — do not spend Emergent credits on
builds or deployments.**

## First Emergent task
ANALYZE ONLY. Report build blockers and concrete improvement opportunities.
Do not modify code until the user selects one specific task.
