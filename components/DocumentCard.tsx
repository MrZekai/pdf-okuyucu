import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from './AppIcon';
import { PdfDocument } from '@/types/document';
import { Translator } from '@/hooks/useTranslation';
import { t as translateActive } from '@/constants/i18n';
import { palette } from '@/constants/theme';

function relativeTime(timestamp: number, locale: string, t: Translator) {
  const minutes = Math.max(1, Math.floor((Date.now() - timestamp) / 60000));
  try {
    const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    if (minutes < 60) return formatter.format(-minutes, 'minute');
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return formatter.format(-hours, 'hour');
    const days = Math.floor(hours / 24);
    if (days < 30) return formatter.format(-days, 'day');
    if (days < 365) return formatter.format(-Math.floor(days / 30), 'month');
    return formatter.format(-Math.floor(days / 365), 'year');
  } catch {
    if (minutes < 60) return t('card.minutesAgo', { count: minutes });
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('card.hoursAgo', { count: hours });
  const days = Math.floor(hours / 24);
  if (days === 1) return t('card.yesterday');
  if (days < 30) return t('card.daysAgo', { count: days });
  const months = Math.floor(days / 30);
  if (days < 365) return months === 1 ? t('card.monthAgo') : t('card.monthsAgo', { count: months });
  const years = Math.floor(days / 365);
  return years === 1 ? t('card.yearAgo') : t('card.yearsAgo', { count: years });
}

function formatBytes(size: number | undefined, locale: string, t: Translator) {
  if (!size) return t('card.pdf');
  const formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  if (size < 1024 * 1024) return `${formatter.format(Math.max(1, Math.round(size / 1024)))} KB`;
  return `${formatter.format(size / (1024 * 1024))} MB`;
}

export function DocumentCard({ doc, onPress, onFavorite, onDelete, t, locale = 'en-US' }: {
  doc: PdfDocument;
  onPress: () => void;
  onFavorite: () => void;
  onDelete?: () => void;
  /** Optional: screens pass their translator; standalone usage falls back to the active language. */
  t?: Translator;
  locale?: string;
}) {
  const tr: Translator = t ?? translateActive;
  const progress = doc.pageCount ? Math.min(100, Math.round((doc.lastPage / doc.pageCount) * 100)) : 0;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={doc.name} style={({ pressed }) => [styles.card, pressed && { opacity: 0.82 }]}>
      <View style={styles.fileBox}><AppIcon name="file" size={24} color={palette.royal}/></View>
      <View style={styles.content}>
        <Text numberOfLines={1} style={styles.title}>{doc.name}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{formatBytes(doc.size, locale, tr)}</Text><Text style={styles.dot}>•</Text>
          <Text style={styles.meta}>{doc.pageCount ? (doc.pageCount===1?tr('card.pagesOne'):tr('card.pages',{count:new Intl.NumberFormat(locale).format(doc.pageCount)})) : tr('card.pagesUnknown')}</Text><Text style={styles.dot}>•</Text>
          <Text style={styles.meta}>{relativeTime(doc.lastOpenedAt, locale, tr)}</Text>
        </View>
        {doc.pageCount ? <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View> : null}
      </View>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" accessibilityLabel={doc.isFavorite ? tr('a11y.removeFromFavorites') : tr('a11y.addToFavorites')} hitSlop={10} onPress={(e) => { e.stopPropagation(); onFavorite(); }}>
          <AppIcon name="heart" size={20} color={doc.isFavorite ? palette.rose : palette.muted}/>
        </Pressable>
        {onDelete ? <Pressable accessibilityRole="button" accessibilityLabel={tr('a11y.delete')} hitSlop={10} onPress={(e) => { e.stopPropagation(); onDelete(); }}><AppIcon name="trash" size={18} color={palette.muted}/></Pressable> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 18, backgroundColor: '#121A2D', borderWidth: 1, borderColor: palette.line, gap: 12 },
  fileBox: { width: 48, height: 56, borderRadius: 13, backgroundColor: 'rgba(91,103,241,0.12)', alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, minWidth: 0 },
  title: { color: palette.white, fontSize: 14.5, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 7 },
  meta: { color: palette.muted, fontSize: 10.5 },
  dot: { color: '#475569', fontSize: 10, marginHorizontal: 5 },
  progressTrack: { height: 3, backgroundColor: '#263047', borderRadius: 2, overflow: 'hidden', marginTop: 10 },
  progressFill: { height: '100%', backgroundColor: palette.royal, borderRadius: 2 },
  actions: { alignItems: 'center', justifyContent: 'space-between', gap: 16, paddingVertical: 2 }
});
