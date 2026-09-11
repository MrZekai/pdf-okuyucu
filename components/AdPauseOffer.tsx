import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from '@/components/AppIcon';
import { useAdsStatus } from '@/context/AdsContext';
import { useAdPause } from '@/hooks/useAdPause';
import { useTranslation } from '@/hooks/useTranslation';
import { watchRewardedForAdPause } from '@/lib/adGate';
import { palette } from '@/constants/theme';

/**
 * The ad free window offer.
 *
 * Placement rules matter more than the styling here:
 *  - It appears as soon as ads are ready. The banner is already on screen from
 *    the first second, so an ad free window is meaningful immediately.
 *  - While the window is open it becomes a plain status line, so the reward is
 *    visibly real rather than a promise that disappears once taken.
 *  - It never uses the red accent reserved for the primary document actions.
 */
export function AdPauseOffer() {
  const adsStatus = useAdsStatus();
  const { paused, remainingMinutes } = useAdPause();
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  async function watch() {
    if (busy || paused) return;
    setBusy(true);
    try {
      const outcome = await watchRewardedForAdPause();
      if (outcome === 'earned') Alert.alert(t('settings.adPauseTitle'), t('settings.adPauseThanks'));
      else if (outcome === 'unavailable') Alert.alert(t('settings.adPauseTitle'), t('settings.adPauseUnavailable'));
    } finally {
      setBusy(false);
    }
  }

  if (paused) {
    return (
      <View style={[styles.strip, styles.stripQuiet]}>
        <View style={styles.plate}><AppIcon name="clock" size={19} color={palette.emerald} /></View>
        <View style={styles.copy}>
          <Text style={styles.title}>{t('settings.adPauseTitle')}</Text>
          <Text numberOfLines={1} style={styles.textActive}>{t('settings.adPauseActive', { minutes: remainingMinutes })}</Text>
        </View>
      </View>
    );
  }

  // Görünürlük yalnızca reklamların hazır olmasına bağlı. Daha önce "kullanıcı
  // bir tam ekran reklam görmeden teklif etme" kuralı vardı; yanlıştı, çünkü
  // banner zaten ilk saniyeden itibaren ekranda. Teklif o andan itibaren
  // anlamlıdır ve eski kural en yüksek eCPM'li birimi görünmez kılıyordu.
  if (adsStatus !== 'ready') return null;

  return (
    <Pressable
      onPress={watch}
      disabled={busy}
      accessibilityRole="button"
      accessibilityState={{ busy }}
      accessibilityLabel={t('settings.adPauseTitle')}
      accessibilityHint={t('settings.adPauseDesc')}
      style={({ pressed }) => [styles.strip, pressed && styles.pressed]}
    >
      <View style={styles.plate}>
        {busy ? <ActivityIndicator size="small" color={palette.amber} /> : <AppIcon name="clock" size={19} color={palette.amber} />}
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{t('settings.adPauseTitle')}</Text>
        <Text numberOfLines={2} style={styles.text}>{t('settings.adPauseDesc')}</Text>
      </View>
      {busy ? null : <AppIcon name="chevronRight" size={17} color={palette.amber} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 16,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.line
  },
  stripQuiet: { opacity: 0.88 },
  pressed: { opacity: 0.72 },
  plate: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(217,164,65,0.12)'
  },
  copy: { flex: 1, gap: 3 },
  title: { color: palette.white, fontSize: 12.5, fontWeight: '800' },
  text: { color: palette.muted, fontSize: 10.5, lineHeight: 15 },
  textActive: { color: palette.emerald, fontSize: 10.5, lineHeight: 15, fontWeight: '700' }
});
