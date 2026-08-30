import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { AppIcon } from '@/components/AppIcon';
import { PdfBrandMark } from '@/components/PdfBrandMark';
import { useTranslation } from '@/hooks/useTranslation';
import { addWatermark, CAMERA_PERMISSION_BLOCKED, cleanMetadata, compressPdf, createPdf, extractPages, imagesToPdf, mergePdfs, PdfToolId, printPdf, removePages, reorderPages, rotatePages, scanToPdf, splitPdf } from '@/lib/pdfTools';
import { recordToolUse } from '@/lib/toolUsage';
import { palette } from '@/constants/theme';

const TOOL_IDS: PdfToolId[] = ['scan', 'images', 'create', 'merge', 'split', 'extract', 'remove', 'reorder', 'rotate', 'watermark', 'compress', 'clean', 'print'];
type PromptTool = 'split' | 'extract' | 'remove' | 'reorder' | 'watermark' | 'create';
type ToolCardData = { id: PdfToolId; icon: React.ComponentProps<typeof AppIcon>['name']; title: string; desc: string };

export default function ToolsScreen() {
  const { tool, launch } = useLocalSearchParams<{ tool?: string; launch?: string }>();
  const { addGeneratedDocument } = useApp();
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [promptTool, setPromptTool] = useState<PromptTool | null>(null);
  const [primaryInput, setPrimaryInput] = useState('');
  const [secondaryInput, setSecondaryInput] = useState('');
  const handledParam = useRef<string | undefined>(undefined);

  const execute = useCallback(async (id: PdfToolId, primary = '', secondary = '') => {
    if (busy) return;
    setBusy(true);
    try {
      const result = id === 'scan' ? await scanToPdf()
        : id === 'images' ? await imagesToPdf()
        : id === 'create' ? await createPdf(primary, secondary)
        : id === 'merge' ? await mergePdfs()
        : id === 'split' ? await splitPdf(primary)
        : id === 'extract' ? await extractPages(primary)
        : id === 'remove' ? await removePages(primary)
        : id === 'reorder' ? await reorderPages(primary)
        : id === 'rotate' ? await rotatePages()
        : id === 'watermark' ? await addWatermark(primary)
        : id === 'compress' ? await compressPdf()
        : id === 'print' ? await printPdf()
        : await cleanMetadata();
      await recordToolUse(id).catch(() => undefined);
      if (!result) return;
      addGeneratedDocument(result);
      const documents = Array.isArray(result) ? result : [result];
      Alert.alert(t('tools.successTitle'), documents.length > 1 ? t('tools.successManyMessage', { count: documents.length }) : t('tools.successMessage', { name: documents[0].name }), [
        { text: t('common.done') },
        { text: t('common.open'), onPress: () => router.push({ pathname: '/reader/[id]', params: { id: documents[0].id } }) }
      ]);
    } catch (error) {
      const blocked = typeof error === 'object' && error !== null && (error as { code?: string }).code === CAMERA_PERMISSION_BLOCKED;
      if (blocked) {
        // Android will not show the permission prompt again, so the only way
        // forward is the app settings page.
        Alert.alert(t('tools.errorTitle'), t('tools.cameraBlockedMessage'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('common.openSettings'), onPress: () => { Linking.openSettings().catch(() => undefined); } }
        ]);
        return;
      }
      Alert.alert(t('tools.errorTitle'), error instanceof Error ? error.message : t('tools.genericError'));
    } finally {
      setBusy(false);
    }
  }, [addGeneratedDocument, busy, t]);

  const start = useCallback((id: PdfToolId) => {
    if (['split', 'extract', 'remove', 'reorder', 'watermark', 'create'].includes(id)) {
      setPrimaryInput('');
      setSecondaryInput('');
      setPromptTool(id as PromptTool);
      return;
    }
    execute(id);
  }, [execute]);

  useEffect(() => {
    const requestKey = tool ? `${tool}:${launch || 'direct'}` : undefined;
    if (!tool || handledParam.current === requestKey || !TOOL_IDS.includes(tool as PdfToolId)) return;
    handledParam.current = requestKey;
    start(tool as PdfToolId);
  }, [launch, start, tool]);

  const featured = useMemo<ToolCardData[]>(() => [
    { id: 'scan', icon: 'camera', title: t('tools.scanTitle'), desc: t('tools.scanDesc') },
    { id: 'images', icon: 'image', title: t('tools.imagesTitle'), desc: t('tools.imagesDesc') },
    { id: 'create', icon: 'edit', title: t('tools.createTitle'), desc: t('tools.createDesc') }
  ], [t]);

  const organize = useMemo<ToolCardData[]>(() => [
    { id: 'merge', icon: 'pages', title: t('tools.mergeTitle'), desc: t('tools.mergeDesc') },
    { id: 'split', icon: 'split', title: t('tools.splitTitle'), desc: t('tools.splitDesc') },
    { id: 'extract', icon: 'download', title: t('tools.extractTitle'), desc: t('tools.extractDesc') },
    { id: 'remove', icon: 'trash', title: t('tools.removeTitle'), desc: t('tools.removeDesc') },
    { id: 'reorder', icon: 'reorder', title: t('tools.reorderTitle'), desc: t('tools.reorderDesc') },
    { id: 'rotate', icon: 'rotate', title: t('tools.rotateTitle'), desc: t('tools.rotateDesc') }
  ], [t]);

  const finish = useMemo<ToolCardData[]>(() => [
    { id: 'watermark', icon: 'watermark', title: t('tools.watermarkTitle'), desc: t('tools.watermarkDesc') },
    { id: 'compress', icon: 'compress', title: t('tools.compressTitle'), desc: t('tools.compressDesc') },
    { id: 'clean', icon: 'shield', title: t('tools.cleanTitle'), desc: t('tools.cleanDesc') },
    { id: 'print', icon: 'print', title: t('tools.printTitle'), desc: t('tools.printDesc') }
  ], [t]);

  const promptTitle = promptTool === 'create' ? t('tools.createTitle') : promptTool === 'watermark' ? t('tools.watermarkTitle') : promptTool === 'split' ? t('tools.splitTitle') : promptTool === 'reorder' ? t('tools.reorderTitle') : t('tools.rangeTitle');
  const promptMessage = promptTool === 'create' ? t('tools.createNamePrompt') : promptTool === 'watermark' ? t('tools.watermarkPrompt') : promptTool === 'split' ? t('tools.splitPrompt') : promptTool === 'reorder' ? t('tools.orderMessage') : t('tools.rangeMessage');
  const promptPlaceholder = promptTool === 'create' ? t('tools.createNamePlaceholder') : promptTool === 'watermark' ? t('tools.watermarkPlaceholder') : promptTool === 'split' ? t('tools.splitPlaceholder') : promptTool === 'reorder' ? t('tools.orderPlaceholder') : t('tools.rangePlaceholder');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.brandBar}>
          <PdfBrandMark size={40} />
          <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.72} style={styles.brandTitle}>{t('app.name')}</Text>
        </View>

        <LinearGradient colors={['#292C31', '#17191C', '#0B0C0E']} style={styles.toolsHeader}>
          <View style={styles.headerRedLine} />
          <Text style={styles.kicker}>{t('tools.kicker')}</Text>
          <Text style={styles.title}>{t('tools.title')}</Text>
          <Text style={styles.subtitle}>{t('tools.subtitle')}</Text>
          <View style={styles.localPill}><AppIcon name="shield" size={16} color="#D4A15D" /><Text style={styles.localText}>{t('home.privacyTitle')}</Text></View>
        </LinearGradient>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('tools.createSection')}</Text>
          <View style={styles.featuredGrid}>{featured.map((card) => <FeaturedTool key={card.id} card={card} onPress={() => start(card.id)} disabled={busy} />)}</View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('tools.organizeSection')}</Text>
          <View style={styles.grid}>{organize.map((card) => <MetalTool key={card.id} card={card} onPress={() => start(card.id)} disabled={busy} />)}</View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('tools.finishSection')}</Text>
          <View style={styles.grid}>{finish.map((card) => <MetalTool key={card.id} card={card} onPress={() => start(card.id)} disabled={busy} />)}</View>
        </View>

        <View style={styles.privacyStrip}>
          <View style={styles.shieldPlate}><AppIcon name="shield" size={25} color="#D49B59" /></View>
          <View style={{ flex: 1 }}><Text style={styles.privacyTitle}>{t('home.privacyTitle')}</Text><Text style={styles.privacyText}>{t('home.privacyText')}</Text></View>
        </View>
      </ScrollView>

      {busy ? <View style={styles.busy}><View style={styles.busyCard}><ActivityIndicator color={palette.pdfRed} /><Text style={styles.busyText}>{t('tools.processing')}</Text></View></View> : null}

      <Modal visible={promptTool !== null} transparent animationType="fade" onRequestClose={() => setPromptTool(null)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalRedRule} />
            <Text style={styles.modalTitle}>{promptTitle}</Text>
            <Text style={styles.modalText}>{promptMessage}</Text>
            <TextInput autoFocus keyboardType={promptTool === 'split' || promptTool === 'extract' || promptTool === 'remove' || promptTool === 'reorder' ? 'numbers-and-punctuation' : 'default'} value={primaryInput} onChangeText={setPrimaryInput} placeholder={promptPlaceholder} placeholderTextColor="#666D77" style={styles.input} />
            {promptTool === 'create' ? <><Text style={styles.secondaryLabel}>{t('tools.createBodyPrompt')}</Text><TextInput multiline value={secondaryInput} onChangeText={setSecondaryInput} placeholder={t('tools.createBodyPlaceholder')} placeholderTextColor="#666D77" textAlignVertical="top" style={styles.bodyInput} /></> : null}
            <Pressable onPress={() => { const selected = promptTool; setPromptTool(null); if (selected) execute(selected, primaryInput, secondaryInput); }} style={styles.primary}><Text style={styles.primaryText}>{t('tools.run')}</Text></Pressable>
            <Pressable onPress={() => setPromptTool(null)} style={styles.cancel}><Text style={styles.cancelText}>{t('common.cancel')}</Text></Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function FeaturedTool({ card, onPress, disabled }: { card: ToolCardData; onPress: () => void; disabled: boolean }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.featuredPressable, pressed && styles.cardPressed]}>
      <LinearGradient colors={card.id === 'scan' ? ['#421113', '#211012', '#0D0E10'] : ['#292C30', '#17191C', '#0C0D0F']} style={styles.featuredCard}>
        <View style={styles.cardTopLine} />
        <View style={styles.featuredIcon}><AppIcon name={card.icon} size={31} color={card.id === 'scan' ? '#FF4844' : '#D8DADD'} /></View>
        <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.66} textBreakStrategy="simple" style={styles.featuredTitle}>{card.title}</Text>
        <Text numberOfLines={3} style={styles.featuredDesc}>{card.desc}</Text>
        <View style={styles.roundGo}><AppIcon name="chevronRight" size={17} color="#FF4844" /></View>
      </LinearGradient>
    </Pressable>
  );
}

function MetalTool({ card, onPress, disabled }: { card: ToolCardData; onPress: () => void; disabled: boolean }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.cardBoltA} /><View style={styles.cardBoltB} />
      <View style={styles.cardIcon}><AppIcon name={card.icon} size={26} color="#D5D7DA" /></View>
      <View style={styles.cardCopy}><Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.62} textBreakStrategy="simple" style={styles.cardTitle}>{card.title}</Text><Text numberOfLines={3} style={styles.cardDesc}>{card.desc}</Text></View>
      <View style={styles.cardChevron}><AppIcon name="chevronRight" size={15} color="#FF4844" /></View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#090A0C' },
  content: { paddingHorizontal: 10, paddingTop: 6, paddingBottom: 34, gap: 13 },
  brandBar: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 12, backgroundColor: '#15171A', borderWidth: 1, borderColor: '#34383E' },
  brandTitle: { flex: 1, color: '#E5E6E8', fontSize: 22, fontWeight: '900' },
  toolsHeader: { minHeight: 184, padding: 18, borderWidth: 1, borderColor: '#4B5057', overflow: 'hidden' },
  headerRedLine: { position: 'absolute', start: 0, end: 0, top: 0, height: 4, backgroundColor: '#A51217' },
  kicker: { color: '#FF4B47', fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  title: { color: '#E9EAEC', fontSize: 28, fontWeight: '900', letterSpacing: -0.5, marginTop: 7 },
  subtitle: { color: '#9A9FA7', fontSize: 11.5, lineHeight: 17, marginTop: 7, maxWidth: 360 },
  localPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: '#5F4932', backgroundColor: '#1E1812', paddingHorizontal: 10, paddingVertical: 7, marginTop: 13 },
  localText: { color: '#D8C1A2', fontSize: 9.5, fontWeight: '800' },
  section: { gap: 8 },
  sectionTitle: { color: '#D3D5D8', fontSize: 12, fontWeight: '900', letterSpacing: 1.2, paddingHorizontal: 4 },
  featuredGrid: { flexDirection: 'row', gap: 7 },
  featuredPressable: { flex: 1, minWidth: 0 },
  featuredCard: { minHeight: 206, padding: 11, borderWidth: 1, borderColor: '#50555B', alignItems: 'center', overflow: 'hidden' },
  cardTopLine: { position: 'absolute', start: 0, end: 0, top: 0, height: 2, backgroundColor: '#672024' },
  featuredIcon: { width: 60, height: 60, marginTop: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#141619', borderWidth: 1, borderColor: '#4B5055' },
  featuredTitle: { color: '#E3E4E6', fontSize: 13, lineHeight: 16, fontWeight: '900', textAlign: 'center', marginTop: 12 },
  featuredDesc: { color: '#92979F', fontSize: 9.5, lineHeight: 13, textAlign: 'center', marginTop: 6 },
  roundGo: { width: 34, height: 34, borderRadius: 17, marginTop: 'auto', alignItems: 'center', justifyContent: 'center', backgroundColor: '#101113', borderWidth: 1, borderColor: '#4A4F55' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: { width: '48.7%', minHeight: 122, flexDirection: 'row', alignItems: 'center', gap: 7, padding: 9, backgroundColor: '#17191C', borderWidth: 1, borderColor: '#4B5056', overflow: 'hidden' },
  cardPressed: { opacity: 0.76, transform: [{ scale: 0.985 }] },
  cardBoltA: { position: 'absolute', start: 5, top: 5, width: 6, height: 6, borderRadius: 3, backgroundColor: '#111214', borderWidth: 1, borderColor: '#6C7075' },
  cardBoltB: { position: 'absolute', end: 5, bottom: 5, width: 6, height: 6, borderRadius: 3, backgroundColor: '#111214', borderWidth: 1, borderColor: '#6C7075' },
  cardIcon: { width: 42, height: 54, alignItems: 'center', justifyContent: 'center', backgroundColor: '#202328', borderWidth: 1, borderColor: '#565B62' },
  cardCopy: { flex: 1, minWidth: 0 },
  cardTitle: { color: '#DDE0E2', fontSize: 12, lineHeight: 15, fontWeight: '900' },
  cardDesc: { color: '#8F949B', fontSize: 8.8, lineHeight: 12, marginTop: 4 },
  cardChevron: { width: 25, height: 25, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0E0F11', borderWidth: 1, borderColor: '#3F444A' },
  privacyStrip: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: '#151719', borderWidth: 1, borderColor: '#4B5056' },
  shieldPlate: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1E1813', borderWidth: 1, borderColor: '#5C432E' },
  privacyTitle: { color: '#D7D9DB', fontSize: 13, fontWeight: '900' },
  privacyText: { color: '#90959D', fontSize: 9.5, lineHeight: 13, marginTop: 3 },
  busy: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(5,6,8,.84)', alignItems: 'center', justifyContent: 'center' },
  busyCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#202329', borderWidth: 1, borderColor: '#555A60', paddingHorizontal: 20, paddingVertical: 16 },
  busyText: { color: '#F0F1F2', fontSize: 12.5, fontWeight: '800' },
  modalBg: { flex: 1, backgroundColor: 'rgba(5,6,8,.90)', justifyContent: 'center', padding: 22 },
  modalCard: { backgroundColor: '#202329', borderWidth: 1, borderColor: '#5A5F66', padding: 20, overflow: 'hidden' },
  modalRedRule: { position: 'absolute', start: 0, end: 0, top: 0, height: 3, backgroundColor: '#A91218' },
  modalTitle: { color: '#F0F1F2', fontSize: 19, fontWeight: '900' },
  modalText: { color: '#A0A5AD', fontSize: 12, lineHeight: 17, marginTop: 6 },
  input: { height: 50, backgroundColor: '#0C0D0F', borderWidth: 1, borderColor: '#484D54', color: '#F0F1F2', paddingHorizontal: 13, marginTop: 16, textAlign: 'left', writingDirection: 'ltr' },
  secondaryLabel: { color: '#B9BDC3', fontSize: 10, fontWeight: '800', marginTop: 14 },
  bodyInput: { minHeight: 120, maxHeight: 190, backgroundColor: '#0C0D0F', borderWidth: 1, borderColor: '#484D54', color: '#F0F1F2', padding: 13, marginTop: 7 },
  primary: { height: 48, backgroundColor: '#A61218', borderWidth: 1, borderColor: '#E73D42', alignItems: 'center', justifyContent: 'center', marginTop: 13 },
  primaryText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  cancel: { height: 42, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  cancelText: { color: '#9A9FA7', fontWeight: '800', fontSize: 12 }
});
