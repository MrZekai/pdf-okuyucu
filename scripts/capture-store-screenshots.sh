#!/usr/bin/env bash
set -euo pipefail
PKG="com.aitolian.pdfokuyucu"
LOCALE="${1:-tr-TR}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUTDIR="qa-raporlari/store-screenshots-${LOCALE}-${STAMP}"
export MSYS_NO_PATHCONV=1
mkdir -p "$OUTDIR"
command -v adb >/dev/null 2>&1 || { echo 'HATA: adb bulunamadi.' >&2; exit 1; }
adb get-state >/dev/null
capture() {
  local name="$1"
  read -r -p "$2 Hazirsa ENTER: " _
  adb shell screencap -p "/sdcard/${name}.png" >/dev/null
  adb pull "/sdcard/${name}.png" "$OUTDIR/${name}.png" >/dev/null
  adb shell rm "/sdcard/${name}.png" >/dev/null
  echo "OK: $OUTDIR/${name}.png"
}
echo "GERCEK QA APK STORE SCREENSHOT KANITI — $LOCALE"
echo "Telefon dilini $LOCALE yap, QA APK'yi ac. Bu script ekranlari oldugu gibi yakalar; mockup veya yeniden cizim yapmaz."
capture screenshot-01-home "Ana Sayfaya gel. App-open kapali olsun; normal banner gorunebilir."
capture screenshot-02-library "Kutuphane sekmesine gel."
capture screenshot-03-reader "Ornek bir PDF ac ve okuyucu ekranina gel."
capture screenshot-04-settings "Ayarlar sekmesine gel."
echo
echo "Cekimler: $OUTDIR"
echo "NOT: Play klasorune kopyalamadan once cozumun 1080x1920 olup olmadigini ve ozel belge adlari/kisisel veri icermedigini kontrol et."
