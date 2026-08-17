import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { AppIcon } from '@/components/AppIcon';
import { PdfBrandMark } from '@/components/PdfBrandMark';
import { UrlModal } from '@/components/UrlModal';
import { useTranslation } from '@/hooks/useTranslation';
import { palette } from '@/constants/theme';
import { PdfToolId } from '@/lib/pdfTools';

type IconName = React.ComponentProps<typeof AppIcon>['name'];

type CompactToolProps = {
  id: PdfToolId;
  icon: IconName;
  title: string;
};

type ActionPanelProps = {
  title: string;
  icon: IconName;
  accent?: boolean;
  tall?: boolean;
  onPress: () => void;
};

export default function HomeScreen() {
  const { ready, openPicker, addFromUrl } = useApp();
  const { t } = useTranslation();
  const [urlOpen, setUrlOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const goReader = (id: string) => router.push({ pathname: '/reader/[id]', params: { id } });
  const goTool = (id: PdfToolId) => router.push({ pathname: '/tools', params: { tool: id, launch: String(Date.now()) } });

  async function choosePdf() {
    setBusy(true);
    try {
      const doc = await openPicker();
      if (doc) goReader(doc.id);
    } catch (error) {
      Alert.alert(t('files.openErrorTitle'), error instanceof Error ? error.message : t('files.openErrorMessage'));
    } finally {
      setBusy(false);
    }
  }

  async function fromUrl(url: string) {
    const doc = await addFromUrl(url);
    goReader(doc.id);
  }

  if (!ready) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={palette.pdfRed} /></View>;
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.brandBar}>
          <View style={styles.brandFlag}>
            <PdfBrandMark size={42} />
          </View>
          <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.72} style={styles.brandTitle}>{t('app.name')}</Text>
          <View style={styles.brandRule} />
        </View>

        <View style={styles.dashboard}>
          <View style={styles.leftColumn}>
            <Pressable onPress={choosePdf} disabled={busy} style={({ pressed }) => [styles.heroPressable, pressed && styles.pressed]}>
              <LinearGradient colors={['#6F090E', '#3A070A', '#170607']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroPanel}>
                <PanelCorners />
                <View style={styles.heroGraphicWrap}>
                  <PdfStackGraphic />
                </View>
                <View style={styles.heroActionRow}>
                  <View style={styles.heroCopy}>
                    <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.78} style={styles.heroTitle}>{t('home.openPdf')}</Text>
                    <Text style={styles.heroHint}>{t('home.heroText')}</Text>
                  </View>
                  <View style={styles.roundAction}>{busy ? <ActivityIndicator color="#fff" /> : <AppIcon name="chevronRight" size={23} color="#FF514D" />}</View>
                </View>
                <Pressable onPress={() => setUrlOpen(true)} hitSlop={8} style={styles.urlLink}>
                  <AppIcon name="link" size={15} color="#BFC3C9" />
                  <Text numberOfLines={1} style={styles.urlLinkText}>{t('home.openFromUrl')}</Text>
                </Pressable>
              </LinearGradient>
            </Pressable>

            <ActionPanel title={t('tools.imagesTitle')} icon="image" onPress={() => goTool('images')} />

            <View style={styles.doubleRow}>
              <ActionPanel title={t('tools.mergeTitle')} icon="pages" onPress={() => goTool('merge')} />
              <ActionPanel title={t('tools.splitTitle')} icon="split" accent onPress={() => goTool('split')} />
            </View>
          </View>

          <View style={styles.rightColumn}>
            <Pressable onPress={() => goTool('scan')} style={({ pressed }) => [styles.scanPressable, pressed && styles.pressed]}>
              <LinearGradient colors={['#30343A', '#1A1C20', '#0D0E10']} style={styles.scanPanel}>
                <PanelCorners />
                <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7} style={styles.scanTitle}>{t('tools.scanTitle')}</Text>
                <View style={styles.scannerShell}>
                  <View style={styles.scannerLid} />
                  <View style={styles.scannerGlass}>
                    <View style={styles.scanDocument}>
                      <View style={styles.scanLineA} />
                      <View style={styles.scanLineB} />
                      <View style={styles.scanImageBox} />
                    </View>
                    <View style={styles.redScanLine} />
                  </View>
                </View>
                <View style={styles.scanButton}><AppIcon name="camera" size={22} color="#FF4B47" /></View>
              </LinearGradient>
            </Pressable>

            <View style={styles.sideRail}>
              <CompactTool id="rotate" icon="rotate" title={t('tools.rotateTitle')} />
              <CompactTool id="reorder" icon="reorder" title={t('tools.reorderTitle')} />
              <CompactTool id="watermark" icon="watermark" title={t('tools.watermarkTitle')} />
              <CompactTool id="compress" icon="compress" title={t('tools.compressTitle')} />
            </View>
          </View>
        </View>

        <Pressable onPress={() => router.push('/tools')} style={({ pressed }) => [styles.allToolsStrip, pressed && styles.pressed]}>
          <View style={styles.allToolsIcon}><AppIcon name="tools" size={22} color="#FF4B47" /></View>
          <View style={styles.allToolsCopy}>
            <Text style={styles.allToolsTitle}>{t('tabs.tools')}</Text>
            <Text numberOfLines={2} style={styles.allToolsText}>{t('tools.subtitle')}</Text>
          </View>
          <AppIcon name="chevronRight" size={19} color="#FF4B47" />
        </Pressable>

        <View style={styles.privacyStrip}>
          <View style={styles.shieldPlate}><AppIcon name="shield" size={23} color="#D79A56" /></View>
          <View style={styles.privacyCopy}>
            <Text style={styles.privacyTitle}>{t('home.privacyTitle')}</Text>
            <Text numberOfLines={2} style={styles.privacyText}>{t('home.privacyText')}</Text>
          </View>
        </View>
      </ScrollView>
      <UrlModal visible={urlOpen} onClose={() => setUrlOpen(false)} onSubmit={fromUrl} />
    </SafeAreaView>
  );

  function CompactTool({ id, icon, title }: CompactToolProps) {
    return (
      <Pressable onPress={() => goTool(id)} style={({ pressed }) => [styles.railItem, pressed && styles.pressed]}>
        <View style={styles.railIcon}><AppIcon name={icon} size={24} color="#D4D7DB" /></View>
        <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.72} style={styles.railText}>{title}</Text>
        <AppIcon name="chevronRight" size={15} color="#8F949C" />
      </Pressable>
    );
  }
}

function ActionPanel({ title, icon, accent = false, onPress }: ActionPanelProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.actionPressable, pressed && styles.pressed]}>
      <LinearGradient colors={accent ? ['#351011', '#1B0B0C', '#0E0E10'] : ['#25282D', '#15171A', '#0B0C0E']} style={styles.actionPanel}>
        <PanelCorners />
        <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.72} style={styles.actionTitle}>{title}</Text>
        <View style={styles.actionBody}>
          <View style={styles.actionIconPlate}><AppIcon name={icon} size={31} color={accent ? '#FF4B47' : '#C7CBD0'} /></View>
          <View style={styles.smallRoundAction}><AppIcon name="chevronRight" size={17} color="#FF4B47" /></View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function PdfStackGraphic() {
  return (
    <View style={styles.stackGraphic}>
      <View style={[styles.paper, styles.paperBack]}><View style={styles.paperLine} /><View style={styles.paperLineShort} /></View>
      <View style={[styles.paper, styles.paperMiddle]}><View style={styles.paperLine} /><View style={styles.paperLineShort} /></View>
      <View style={[styles.paper, styles.paperFront]}><View style={styles.paperLine} /><View style={styles.paperLineShort} /></View>
      <View style={styles.redFolderBack} />
      <View style={styles.redFolderFront}><Text style={styles.pdfLetters}>PDF</Text></View>
    </View>
  );
}

function PanelCorners() {
  return (
    <>
      <View pointerEvents="none" style={[styles.bolt, styles.boltTl]} />
      <View pointerEvents="none" style={[styles.bolt, styles.boltTr]} />
      <View pointerEvents="none" style={[styles.bolt, styles.boltBl]} />
      <View pointerEvents="none" style={[styles.bolt, styles.boltBr]} />
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#090A0C' },
  loading: { flex: 1, backgroundColor: '#090A0C', alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 9, paddingTop: 6, paddingBottom: 24, gap: 10 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },

  brandBar: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 13, paddingVertical: 10, backgroundColor: '#15171A', borderWidth: 1, borderColor: '#34383E', overflow: 'hidden' },
  brandFlag: { width: 56, height: 60, alignItems: 'center', justifyContent: 'center', backgroundColor: '#421013', borderStartWidth: 6, borderStartColor: '#9D1419', borderWidth: 1, borderColor: '#2A2D31' },
  brandTitle: { flex: 1, color: '#E7E8EA', fontSize: 24, fontWeight: '900', letterSpacing: 0.2 },
  brandRule: { position: 'absolute', end: 0, top: 0, width: '34%', height: 3, backgroundColor: '#3A3D42' },

  dashboard: { flexDirection: 'row', gap: 8, alignItems: 'stretch' },
  leftColumn: { flex: 1.45, gap: 8 },
  rightColumn: { flex: 0.92, gap: 8 },

  heroPressable: { minHeight: 264 },
  heroPanel: { minHeight: 264, flex: 1, padding: 14, borderWidth: 1, borderColor: '#565B62', overflow: 'hidden', justifyContent: 'space-between' },
  heroGraphicWrap: { minHeight: 126, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  heroActionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 8 },
  heroCopy: { flex: 1 },
  heroTitle: { color: '#F0F0F0', fontSize: 22, fontWeight: '900', letterSpacing: 0.2 },
  heroHint: { color: '#A8ADB5', fontSize: 9.5, lineHeight: 13, marginTop: 4 },
  roundAction: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#18191C', borderWidth: 2, borderColor: '#555A60' },
  urlLink: { minHeight: 30, marginTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,.12)', flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 8 },
  urlLinkText: { color: '#C2C5C9', fontSize: 9.5, fontWeight: '700', flexShrink: 1 },

  stackGraphic: { width: 142, height: 128, alignItems: 'center', justifyContent: 'flex-end' },
  paper: { position: 'absolute', width: 84, height: 95, backgroundColor: '#D8D9DB', borderWidth: 1, borderColor: '#F0F1F2', padding: 13, shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 4, elevation: 4 },
  paperBack: { top: 4, start: 29, transform: [{ rotate: '-8deg' }] },
  paperMiddle: { top: 7, start: 38, transform: [{ rotate: '4deg' }] },
  paperFront: { top: 12, start: 31 },
  paperLine: { height: 4, width: '75%', backgroundColor: '#8B8D91', marginTop: 12 },
  paperLineShort: { height: 4, width: '52%', backgroundColor: '#A6A8AC', marginTop: 8 },
  redFolderBack: { position: 'absolute', bottom: 8, width: 116, height: 62, borderTopStartRadius: 8, borderTopEndRadius: 8, backgroundColor: '#8D0D12', borderWidth: 1, borderColor: '#D2292F', transform: [{ rotate: '-2deg' }] },
  redFolderFront: { width: 124, height: 67, borderRadius: 4, backgroundColor: '#A91016', borderWidth: 1, borderColor: '#E53B3F', alignItems: 'center', justifyContent: 'center', shadowColor: '#E5252A', shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  pdfLetters: { color: '#F2F2F2', fontWeight: '900', fontSize: 25, letterSpacing: 1 },

  actionPressable: { flex: 1, minHeight: 124 },
  actionPanel: { flex: 1, minHeight: 124, padding: 11, borderWidth: 1, borderColor: '#4A4F55', overflow: 'hidden' },
  actionTitle: { color: '#D9DBDE', fontSize: 14, fontWeight: '900', letterSpacing: 0.3 },
  actionBody: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6 },
  actionIconPlate: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#4A4E54', backgroundColor: '#15171A' },
  smallRoundAction: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#4B4F55', backgroundColor: '#0D0E10' },
  doubleRow: { flexDirection: 'row', gap: 8 },

  scanPressable: { minHeight: 344 },
  scanPanel: { flex: 1, minHeight: 344, padding: 11, borderWidth: 1, borderColor: '#575C63', alignItems: 'center', overflow: 'hidden' },
  scanTitle: { color: '#D8DADD', fontSize: 16, lineHeight: 19, fontWeight: '900', textAlign: 'center', marginTop: 11 },
  scannerShell: { width: '92%', height: 176, marginTop: 22, alignItems: 'center' },
  scannerLid: { width: '88%', height: 36, borderRadius: 10, backgroundColor: '#24272B', borderWidth: 1, borderColor: '#5B5F65', zIndex: 2 },
  scannerGlass: { width: '78%', height: 142, marginTop: -7, padding: 12, backgroundColor: '#100F11', borderWidth: 2, borderColor: '#6D2022', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  scanDocument: { width: '78%', height: '82%', backgroundColor: '#D4D4D5', padding: 10 },
  scanLineA: { height: 4, width: '76%', backgroundColor: '#989A9D', marginTop: 8 },
  scanLineB: { height: 4, width: '56%', backgroundColor: '#A6A7A9', marginTop: 8 },
  scanImageBox: { height: 34, marginTop: 13, backgroundColor: '#B1B2B4' },
  redScanLine: { position: 'absolute', start: 7, end: 7, top: 70, height: 2, backgroundColor: '#FF342E', shadowColor: '#FF342E', shadowOpacity: 0.85, shadowRadius: 8, elevation: 4 },
  scanButton: { marginTop: 11, width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: '#17181B', borderWidth: 2, borderColor: '#575C62' },

  sideRail: { borderWidth: 1, borderColor: '#494E54', backgroundColor: '#15171A' },
  railItem: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#3A3E44' },
  railIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1D2024', borderWidth: 1, borderColor: '#3F444B' },
  railText: { flex: 1, color: '#D3D5D8', fontSize: 11, fontWeight: '800', lineHeight: 14 },

  allToolsStrip: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 12, backgroundColor: '#16181B', borderWidth: 1, borderColor: '#4B5056' },
  allToolsIcon: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: '#210C0D', borderWidth: 1, borderColor: '#6F1A1D' },
  allToolsCopy: { flex: 1 },
  allToolsTitle: { color: '#E1E2E4', fontWeight: '900', fontSize: 14 },
  allToolsText: { color: '#8E949D', fontSize: 9.5, lineHeight: 13, marginTop: 2 },

  privacyStrip: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 12, backgroundColor: '#151719', borderWidth: 1, borderColor: '#4B5056' },
  shieldPlate: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1C1612', borderWidth: 1, borderColor: '#5F432C' },
  privacyCopy: { flex: 1 },
  privacyTitle: { color: '#D9DADC', fontSize: 13, fontWeight: '900' },
  privacyText: { color: '#92979F', fontSize: 9.5, lineHeight: 13, marginTop: 3 },

  bolt: { position: 'absolute', width: 7, height: 7, borderRadius: 4, backgroundColor: '#111214', borderWidth: 1, borderColor: '#73777C', zIndex: 4 },
  boltTl: { start: 5, top: 5 }, boltTr: { end: 5, top: 5 }, boltBl: { start: 5, bottom: 5 }, boltBr: { end: 5, bottom: 5 }
});
