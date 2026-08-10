# EMERGENT / AI AGENT RULES — CREDIT-SAFE MODE

This repository is an EXISTING, intentionally structured Expo / React Native PDF reader.
The owner has a very limited Emergent credit budget.

## Non-negotiable rules
1. DO NOT rebuild this project from scratch.
2. DO NOT migrate away from Expo SDK 57 / React Native unless explicitly asked.
3. DO NOT replace the PDF engine unless a concrete reproducible blocker requires it.
4. DO NOT redesign unrelated screens when implementing one feature.
5. DO NOT add a backend, database, login, cloud storage, analytics, subscriptions or extra ad formats unless explicitly requested.
6. DO NOT upgrade packages merely because newer versions exist.
7. Keep every requested change local, minimal and reversible.
8. Before editing, identify the exact files required. Prefer 1-3 touched files per small task.
9. Run only the tests/build commands needed for the requested change. Avoid repeated blind retries.
10. Preserve the fixed bottom AdMob banner area on Home, Library, Favorites, Settings and Reader.
11. Never use production AdMob IDs during development. TestIds are intentionally used in dev/fallback mode.
12. Protect user files: a PDF-reading failure must never delete the source file or crash the app.

## Architecture
- `app/(tabs)/index.tsx` — premium home/dashboard
- `app/(tabs)/library.tsx` — searchable local library
- `app/(tabs)/favorites.tsx` — favorite documents
- `app/(tabs)/settings.tsx` — reader / privacy settings
- `app/reader/[id].tsx` — native PDF reader
- `context/AppContext.tsx` — app state and persistence
- `lib/pdfFiles.ts` — picking/downloading/local copies
- `components/AdBanner.tsx` — fixed AdMob banner
- `hooks/useAdsBootstrap.ts` — UMP consent + Mobile Ads init

## First Emergent task
ANALYZE ONLY. Report build blockers, if any. Do not modify code until the user selects one specific task.
