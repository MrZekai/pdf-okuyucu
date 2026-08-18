# Release Hardening — 18 Aug 2026

Applied before the next QA APK:

- App-open is cold-start/loading-gate only; warm-resume path removed.
- App-open starts on launch 3+, with a 4-hour cap and one launch-count initialization.
- Privacy copy says PDFs are not uploaded to the developer server; Share is disclosed separately.
- Nine store listings no longer promise automatic resume to the last page.
- compileSdkVersion and targetSdkVersion explicitly pinned to API 36.
- Device PDF import checks source size/free disk before the permanent library copy.
- URL filename decode has a malformed-encoding fallback.
- splitPdf rolls back part 1 if part 2 cannot be saved.
- Image-to-PDF save/disk errors are no longer mislabeled as unsupported-image errors.
- Reader flushes pending progress on inactive/background.
- QA APK CI checks both ZIP alignment and ELF LOAD segments for 16 KB compatibility.
- QA stress defaults to 10,000 Monkey events and records fresh-launch / warm-resume screenshots.
- Manual AAB workflow refuses to build while the three known old home screenshots remain unchanged.
- A guided adb script captures real QA APK screenshots; it never generates or fakes store screens.

AAB remains manual and must not be triggered until the new QA APK health check and real screenshots are reviewed.
