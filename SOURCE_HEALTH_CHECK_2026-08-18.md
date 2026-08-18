# PDF: Reader - Tools — Release Hardening Source Health Check

Date: 18 Aug 2026
Baseline archive commit: `b65ffa7f89c3dc41ef2263494ed86a31d76b51c5`

## Applied hardening

- App-open limited to cold-start loading gate only.
- Warm-resume app-open path removed to avoid banner overlap.
- First app-open remains launch 3+, with a 4-hour cap.
- Cold launch count initialization is guarded against duplicate initialization.
- App-open wait timeout is cancelled while an ad is actually open.
- UI privacy copy in all 14 languages now says PDFs are not uploaded to the developer server instead of making an absolute “never leave device” claim.
- Privacy policy updated to the new app names and discloses Camera-to-PDF local processing plus explicit user-initiated Share behavior.
- Data Safety draft updated for user-initiated sharing.
- False automatic “resume from last page” claims removed from 9 store listings; they now describe remembering/saving the last viewed page.
- `compileSdkVersion: 36` and `targetSdkVersion: 36` explicitly pinned in Expo build properties.
- GitHub Actions verifies generated Android API 36 properties.
- Device PDF import checks file size and free disk before the permanent library copy.
- Malformed URL filename percent-encoding now has a safe fallback.
- `splitPdf()` rolls back part 1 if part 2 cannot be written.
- Image-to-PDF save/disk errors are no longer mislabeled as unsupported-image errors.
- Reader flushes pending page progress on inactive/background.
- QA APK 16 KB validation now checks both ZIP alignment and 64-bit ELF LOAD segment alignment.
- QA stress test defaults to 10,000 Monkey events and records 3 cold-launch + warm-resume evidence screenshots.
- Manual AAB workflow refuses to build while the three known old home screenshots remain unchanged.
- Added guided `adb` real-device screenshot capture helper.

## Checks completed in this environment

PASS:
- `node scripts/validate-release.mjs`
- `npm run i18n:check` — 198 keys × 14 languages
- `git diff --check`
- Node syntax for `app.config.js` and validator
- Bash syntax for QA/capture scripts
- YAML parse for both GitHub Actions workflows
- Bash syntax parse for every workflow `run:` block
- TS/TSX transpile diagnostics on every modified TypeScript source
- Negative scans: no warm-resume app-open path, no old absolute privacy text, no false 9-language auto-resume claims
- API 36, PDF storage guards, split rollback, reader flush and QA ELF checks found in source

Not run locally:
- `npm ci`, full `tsc --noEmit`, Expo lint and Expo Doctor because this execution environment could not access the npm registry.

These full gates are intentionally kept in the apply script and GitHub Actions. The hardening commit must not be pushed if any of them fail locally; GitHub Actions repeats them before the QA APK build.

## Release state

- Source hardening: READY FOR QA BUILD
- New QA APK: required
- 10k Monkey / targeted device health check: required
- Real new store screenshots: required
- Final Red Team: required
- AAB: intentionally blocked until the above are complete
