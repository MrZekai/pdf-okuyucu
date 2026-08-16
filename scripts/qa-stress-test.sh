#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# PDF Okuyucu - cihaz uzerinde otomatik stres testi
#
# Kullanim (Git Bash):
#   bash scripts/qa-stress-test.sh              # varsayilan 3000 olay
#   bash scripts/qa-stress-test.sh 10000        # daha uzun test
#
# Gereksinim: telefon USB ile bagli, "USB hata ayiklama" acik, uygulama kurulu.
# ---------------------------------------------------------------------------
set -uo pipefail

PKG="com.aitolian.pdfokuyucu"
EVENTS="${1:-3000}"
THROTTLE=300                     # olaylar arasi ms - insan hizina yakin
STAMP="$(date +%Y%m%d-%H%M%S)"
OUTDIR="qa-raporlari/$STAMP"
export MSYS_NO_PATHCONV=1        # Git Bash'in /sdcard yolunu bozmasini engeller

mkdir -p "$OUTDIR"
LOG="$OUTDIR/logcat.txt"
REPORT="$OUTDIR/rapor.txt"

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
ok()  { printf '  \033[32mOK\033[0m   %s\n' "$*"; }
bad() { printf '  \033[31mHATA\033[0m %s\n' "$*"; }

# --- 1. On kontroller ------------------------------------------------------
say "1/6  On kontroller"

command -v adb >/dev/null 2>&1 || { bad "adb bulunamadi. Android Platform Tools kurulu mu?"; exit 1; }
ok "adb bulundu"

DEVICES="$(adb devices | awk 'NR>1 && $2=="device" {print $1}')"
if [ -z "$DEVICES" ]; then
  bad "Bagli cihaz yok. Telefonu USB ile bagla, 'USB hata ayiklama' acik olsun,"
  bad "telefondaki 'Bu bilgisayara izin ver' penceresini onayla."
  adb devices
  exit 1
fi
ok "cihaz: $DEVICES"

if ! adb shell pm list packages | grep -q "$PKG"; then
  bad "$PKG cihazda kurulu degil. Once APK'yi kur."
  exit 1
fi
ok "uygulama kurulu"

# --- 2. Cihaz ve surum bilgisi ---------------------------------------------
say "2/6  Ortam bilgisi"
{
  echo "=== PDF Okuyucu QA raporu - $STAMP ==="
  echo
  echo "Cihaz     : $(adb shell getprop ro.product.manufacturer | tr -d '\r') $(adb shell getprop ro.product.model | tr -d '\r')"
  echo "Android   : $(adb shell getprop ro.build.version.release | tr -d '\r') (API $(adb shell getprop ro.build.version.sdk | tr -d '\r'))"
  echo "Paket     : $PKG"
  echo "Surum     : $(adb shell dumpsys package "$PKG" | grep -m1 versionName | tr -d '\r ' )"
  echo "Olay sayisi: $EVENTS  (throttle ${THROTTLE}ms)"
  echo
} | tee "$REPORT"

# --- 3. Soguk acilis suresi ------------------------------------------------
say "3/6  Soguk acilis olcumu"
adb shell am force-stop "$PKG"
sleep 1
START_OUT="$(adb shell am start -W -S -n "$PKG/.MainActivity" 2>&1 | tr -d '\r')"
TTID="$(echo "$START_OUT" | grep -E '^TotalTime:' | awk '{print $2}')"
if [ -n "${TTID:-}" ]; then
  ok "acilis suresi: ${TTID} ms"
  echo "Soguk acilis: ${TTID} ms" >> "$REPORT"
  [ "$TTID" -gt 5000 ] && bad "5 saniyeden uzun - Play 'yavas acilis' uyarisi verebilir"
else
  bad "acilis suresi olculemedi (MainActivity adi farkli olabilir), teste devam"
  echo "Soguk acilis: olculemedi" >> "$REPORT"
fi
sleep 2

# --- 4. Bellek anlik goruntusu (once) --------------------------------------
MEM_BEFORE="$(adb shell dumpsys meminfo "$PKG" | grep -m1 'TOTAL PSS' | awk '{print $3}' | tr -d '\r')"
[ -z "${MEM_BEFORE:-}" ] && MEM_BEFORE="$(adb shell dumpsys meminfo "$PKG" | grep -m1 'TOTAL' | awk '{print $2}' | tr -d '\r')"

# --- 5. Monkey stres testi -------------------------------------------------
say "4/6  Monkey stres testi ($EVENTS olay) - telefona dokunma, ekran acik kalsin"
adb logcat -c
adb shell monkey -p "$PKG" \
  --throttle "$THROTTLE" \
  --pct-syskeys 0 \
  --ignore-security-exceptions \
  --monitor-native-crashes \
  -s 20260815 \
  -v -v "$EVENTS" > "$OUTDIR/monkey.txt" 2>&1
MONKEY_RC=$?

if grep -q "Monkey finished" "$OUTDIR/monkey.txt"; then
  ok "monkey tamamlandi"
  echo "Monkey: tamamlandi" >> "$REPORT"
else
  bad "monkey erken durdu - cokme olabilir"
  echo "Monkey: ERKEN DURDU (rc=$MONKEY_RC)" >> "$REPORT"
fi

# --- 6. Log toplama ve analiz ----------------------------------------------
say "5/6  Log analizi"
adb logcat -d > "$LOG" 2>&1

MEM_AFTER="$(adb shell dumpsys meminfo "$PKG" | grep -m1 'TOTAL PSS' | awk '{print $3}' | tr -d '\r')"
[ -z "${MEM_AFTER:-}" ] && MEM_AFTER="$(adb shell dumpsys meminfo "$PKG" | grep -m1 'TOTAL' | awk '{print $2}' | tr -d '\r')"

count() { grep -c "$1" "$LOG" 2>/dev/null || echo 0; }

FATAL=$(count "FATAL EXCEPTION")
ANR=$(count "ANR in $PKG")
NATIVE=$(count "signal 11")
OOM=$(count "OutOfMemoryError")
JSERR=$(grep -c "ReactNativeJS.*Error" "$LOG" 2>/dev/null || echo 0)

{
  echo
  echo "--- SONUCLAR ---"
  echo "FATAL EXCEPTION : $FATAL"
  echo "ANR             : $ANR"
  echo "Native crash    : $NATIVE"
  echo "OutOfMemory     : $OOM"
  echo "JS hata satiri  : $JSERR"
  echo "Bellek (once)   : ${MEM_BEFORE:-?} KB"
  echo "Bellek (sonra)  : ${MEM_AFTER:-?} KB"
} | tee -a "$REPORT"

if [ "$FATAL" -gt 0 ] || [ "$ANR" -gt 0 ] || [ "$NATIVE" -gt 0 ]; then
  {
    echo
    echo "--- HATA DETAYLARI ---"
    grep -A 25 "FATAL EXCEPTION" "$LOG" | head -80
    grep -A 15 "ANR in $PKG"    "$LOG" | head -40
  } | tee -a "$REPORT"
fi

# --- 7. Ekran goruntusu ----------------------------------------------------
say "6/6  Son ekran goruntusu"
adb shell screencap -p /sdcard/qa-son.png >/dev/null 2>&1 \
  && adb pull /sdcard/qa-son.png "$OUTDIR/son-ekran.png" >/dev/null 2>&1 \
  && adb shell rm /sdcard/qa-son.png >/dev/null 2>&1 \
  && ok "kaydedildi: $OUTDIR/son-ekran.png"

adb shell am force-stop "$PKG"

# --- Ozet ------------------------------------------------------------------
echo
if [ "$FATAL" -eq 0 ] && [ "$ANR" -eq 0 ] && [ "$NATIVE" -eq 0 ] && [ "$OOM" -eq 0 ]; then
  printf '\033[42m\033[30m  TEMIZ  \033[0m Cokme, ANR veya bellek hatasi bulunamadi.\n'
  EXIT=0
else
  printf '\033[41m\033[37m  SORUN  \033[0m Detaylar: %s\n' "$REPORT"
  EXIT=1
fi
echo "Rapor    : $REPORT"
echo "Tam log  : $LOG"
echo "Monkey   : $OUTDIR/monkey.txt"
exit $EXIT
