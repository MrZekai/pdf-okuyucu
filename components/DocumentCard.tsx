import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from './AppIcon';
import { PdfDocument } from '@/types/document';
import { Translator } from '@/hooks/useTranslation';
import { t as translateActive } from '@/constants/i18n';
import { palette } from '@/constants/theme';

function relativeTime(timestamp: number, t: Translator) {
  const minutes = Math.max(1, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 60) return t('card.minutesAgo', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('card.hoursAgo', { count: hours });
  const days = Math.floor(hours / 24);
  return days === 1 ? t('card.yesterday') : t('card.daysAgo', { count: days });
}

function formatBytes(size: number | undefined, t: Translator) {
  if (!size) return t('card.pdf');
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentCard({ doc, onPress, onFavorite, onDelete, compact = false, t }: {
  doc: PdfDocument;
  onPress: () => void;
  onFavorite: () => void;
  onDelete?: () => void;
  compact?: boolean;
  /** Optional: screens pass their translator; standalone usage falls back to the active language. */
  t?: Translator;
}) {
  const tr: Translator = t ?? translateActive;
  const progress = doc.pageCount ? Math.min(100, Math.round((doc.lastPage / doc.pageCount) * 100)) : 0;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, compact && styles.compact, pressed && { opacity: 0.82 }]}>
      <View style={styles.fileBox}><AppIcon name="file" size={24} color={palette.royal}/></View>
      <View style={styles.content}>
        <Text numberOfLines={1} style={styles.title}>{doc.name}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{formatBytes(doc.size, tr)}</Text><Text style={styles.dot}>•</Text>
          <Text style={styles.meta}>{doc.pageCount ? tr('card.pages', { count: doc.pageCount }) : tr('card.pagesUnknown')}</Text><Text style={styles.dot}>•</Text>
          <Text style={styles.meta}>{relativeTime(doc.lastOpenedAt, tr)}</Text>
        </View>
        {doc.pageCount ? <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View> : null}
      </View>
      <View style={styles.actions}>
        <Pressable hitSlop={10} onPress={(e) => { e.stopPropagation(); onFavorite(); }}>
          <AppIcon name="heart" size={20} color={doc.isFavorite ? palette.rose : palette.muted}/>
        </Pressable>
        {onDelete ? <Pressable hitSlop={10} onPress={(e) => { e.stopPropagation(); onDelete(); }}><AppIcon name="trash" size={18} color={palette.muted}/></Pressable> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 18, backgroundColor: '#121A2D', borderWidth: 1, borderColor: palette.line, gap: 12 },
  compact: { minWidth: 315, maxWidth: 340 },
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
