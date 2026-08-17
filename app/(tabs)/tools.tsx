import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { AppIcon } from '@/components/AppIcon';
import { useTranslation } from '@/hooks/useTranslation';
import { addWatermark, cleanMetadata, compressPdf, createPdf, extractPages, imagesToPdf, mergePdfs, PdfToolId, printPdf, removePages, reorderPages, rotatePages, scanToPdf, splitPdf } from '@/lib/pdfTools';
import { recordToolUse } from '@/lib/toolUsage';
import { palette } from '@/constants/theme';

const TOOL_IDS: PdfToolId[] = ['scan', 'images', 'create', 'merge', 'split', 'extract', 'remove', 'reorder', 'rotate', 'watermark', 'compress', 'clean', 'print'];
type PromptTool = 'split' | 'extract' | 'remove' | 'reorder' | 'watermark' | 'create';
type ToolCardData = { id: PdfToolId; icon: React.ComponentProps<typeof AppIcon>['name']; color: string; title: string; desc: string };

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

  const sections = useMemo<{ title: string; cards: ToolCardData[] }[]>(() => [
    { title: t('tools.createSection'), cards: [
      { id: 'scan', icon: 'camera', color: palette.pdfRedSoft, title: t('tools.scanTitle'), desc: t('tools.scanDesc') },
      { id: 'images', icon: 'image', color: palette.amber, title: t('tools.imagesTitle'), desc: t('tools.imagesDesc') },
      { id: 'create', icon: 'edit', color: palette.steel, title: t('tools.createTitle'), desc: t('tools.createDesc') }
    ] },
    { title: t('tools.organizeSection'), cards: [
      { id: 'merge', icon: 'pages', color: palette.pdfRed, title: t('tools.mergeTitle'), desc: t('tools.mergeDesc') },
      { id: 'split', icon: 'split', color: palette.cyan, title: t('tools.splitTitle'), desc: t('tools.splitDesc') },
      { id: 'extract', icon: 'download', color: palette.emerald, title: t('tools.extractTitle'), desc: t('tools.extractDesc') },
      { id: 'remove', icon: 'trash', color: palette.rose, title: t('tools.removeTitle'), desc: t('tools.removeDesc') },
      { id: 'reorder', icon: 'reorder', color: palette.steel, title: t('tools.reorderTitle'), desc: t('tools.reorderDesc') },
      { id: 'rotate', icon: 'rotate', color: palette.amber, title: t('tools.rotateTitle'), desc: t('tools.rotateDesc') }
    ] },
    { title: t('tools.finishSection'), cards: [
      { id: 'watermark', icon: 'watermark', color: palette.pdfRedSoft, title: t('tools.watermarkTitle'), desc: t('tools.watermarkDesc') },
      { id: 'compress', icon: 'compress', color: palette.emerald, title: t('tools.compressTitle'), desc: t('tools.compressDesc') },
      { id: 'clean', icon: 'shield', color: palette.cyan, title: t('tools.cleanTitle'), desc: t('tools.cleanDesc') },
      { id: 'print', icon: 'print', color: palette.steel, title: t('tools.printTitle'), desc: t('tools.printDesc') }
    ] }
  ], [t]);

  const promptTitle = promptTool === 'create' ? t('tools.createTitle') : promptTool === 'watermark' ? t('tools.watermarkTitle') : promptTool === 'split' ? t('tools.splitTitle') : promptTool === 'reorder' ? t('tools.reorderTitle') : t('tools.rangeTitle');
  const promptMessage = promptTool === 'create' ? t('tools.createNamePrompt') : promptTool === 'watermark' ? t('tools.watermarkPrompt') : promptTool === 'split' ? t('tools.splitPrompt') : promptTool === 'reorder' ? t('tools.orderMessage') : t('tools.rangeMessage');
  const promptPlaceholder = promptTool === 'create' ? t('tools.createNamePlaceholder') : promptTool === 'watermark' ? t('tools.watermarkPlaceholder') : promptTool === 'split' ? t('tools.splitPlaceholder') : promptTool === 'reorder' ? t('tools.orderPlaceholder') : t('tools.rangePlaceholder');

  return <SafeAreaView style={styles.safe} edges={['top']}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={['#24272D', '#121417', '#090A0C']} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.header}>
        <View style={styles.headerGlow}/><Text style={styles.kicker}>{t('tools.kicker')}</Text><Text style={styles.title}>{t('tools.title')}</Text><Text style={styles.subtitle}>{t('tools.subtitle')}</Text>
        <View style={styles.localPill}><AppIcon name="shield" size={15} color={palette.emerald}/><Text style={styles.localText}>{t('tools.localOnly')}</Text></View>
      </LinearGradient>
      {sections.map((section) => <View key={section.title} style={styles.section}><Text style={styles.sectionTitle}>{section.title}</Text><View style={styles.grid}>{section.cards.map((card) => <Pressable key={card.id} disabled={busy} onPress={() => start(card.id)} accessibilityRole="button" style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}><View style={styles.cardTop}><View style={[styles.cardIcon, { backgroundColor: `${card.color}18`, borderColor: `${card.color}35` }]}><AppIcon name={card.icon} color={card.color}/></View><AppIcon name="chevronRight" size={16} color="#666D77"/></View><Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.82} style={styles.cardTitle}>{card.title}</Text><Text numberOfLines={3} style={styles.cardDesc}>{card.desc}</Text></Pressable>)}</View></View>)}
    </ScrollView>
    {busy ? <View style={styles.busy}><View style={styles.busyCard}><ActivityIndicator color={palette.pdfRed}/><Text style={styles.busyText}>{t('tools.processing')}</Text></View></View> : null}
    <Modal visible={promptTool !== null} transparent animationType="fade" onRequestClose={() => setPromptTool(null)}><View style={styles.modalBg}><View style={styles.modalCard}><Text style={styles.modalTitle}>{promptTitle}</Text><Text style={styles.modalText}>{promptMessage}</Text><TextInput autoFocus keyboardType={promptTool === 'split' || promptTool === 'extract' || promptTool === 'remove' || promptTool === 'reorder' ? 'numbers-and-punctuation' : 'default'} value={primaryInput} onChangeText={setPrimaryInput} placeholder={promptPlaceholder} placeholderTextColor="#666D77" style={styles.input}/>{promptTool === 'create' ? <><Text style={styles.secondaryLabel}>{t('tools.createBodyPrompt')}</Text><TextInput multiline value={secondaryInput} onChangeText={setSecondaryInput} placeholder={t('tools.createBodyPlaceholder')} placeholderTextColor="#666D77" textAlignVertical="top" style={styles.bodyInput}/></> : null}<Pressable onPress={() => { const selected = promptTool; setPromptTool(null); if (selected) execute(selected, primaryInput, secondaryInput); }} style={styles.primary}><Text style={styles.primaryText}>{t('tools.run')}</Text></Pressable><Pressable onPress={() => setPromptTool(null)} style={styles.cancel}><Text style={styles.cancelText}>{t('common.cancel')}</Text></Pressable></View></View></Modal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:palette.ink},content:{padding:16,paddingBottom:36,gap:24},header:{borderRadius:26,padding:20,overflow:'hidden',borderWidth:1,borderColor:'rgba(255,255,255,.11)'},headerGlow:{position:'absolute',end:-75,top:-85,width:230,height:230,borderRadius:130,backgroundColor:palette.redGlow},kicker:{color:palette.pdfRedSoft,fontSize:9,fontWeight:'900',letterSpacing:2},title:{color:palette.white,fontSize:29,fontWeight:'900',letterSpacing:-.6,marginTop:6},subtitle:{color:palette.muted,fontSize:12,lineHeight:18,marginTop:8,maxWidth:390},localPill:{alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:7,borderRadius:20,paddingHorizontal:11,paddingVertical:8,backgroundColor:'rgba(79,211,155,.08)',borderWidth:1,borderColor:'rgba(79,211,155,.22)',marginTop:18},localText:{color:'#A9F0D0',fontSize:9,fontWeight:'900',letterSpacing:.8},section:{gap:11},sectionTitle:{color:palette.steel,fontSize:10,fontWeight:'900',letterSpacing:1.5,marginStart:3},grid:{flexDirection:'row',flexWrap:'wrap',gap:10},card:{width:'48.5%',minHeight:156,borderRadius:19,backgroundColor:palette.card,borderWidth:1,borderColor:palette.line,padding:14},cardPressed:{opacity:.76,transform:[{scale:.985}]},cardTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},cardIcon:{width:42,height:42,borderRadius:13,borderWidth:1,alignItems:'center',justifyContent:'center'},cardTitle:{color:palette.white,fontSize:14,fontWeight:'800',lineHeight:18,marginTop:13},cardDesc:{color:palette.muted,fontSize:10.5,lineHeight:15,marginTop:5},busy:{...StyleSheet.absoluteFill,backgroundColor:'rgba(5,6,8,.82)',alignItems:'center',justifyContent:'center'},busyCard:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:palette.metal,borderRadius:18,borderWidth:1,borderColor:palette.line,paddingHorizontal:20,paddingVertical:16},busyText:{color:palette.white,fontSize:12.5,fontWeight:'800'},modalBg:{flex:1,backgroundColor:'rgba(5,6,8,.88)',justifyContent:'center',padding:22},modalCard:{backgroundColor:palette.metal,borderRadius:22,borderWidth:1,borderColor:palette.line,padding:20},modalTitle:{color:palette.white,fontSize:19,fontWeight:'900'},modalText:{color:palette.muted,fontSize:12,lineHeight:17,marginTop:6},input:{height:50,borderRadius:13,backgroundColor:palette.ink,borderWidth:1,borderColor:palette.line,color:palette.white,paddingHorizontal:13,marginTop:16,textAlign:'left',writingDirection:'ltr'},secondaryLabel:{color:palette.steel,fontSize:10,fontWeight:'800',marginTop:14},bodyInput:{minHeight:120,maxHeight:190,borderRadius:13,backgroundColor:palette.ink,borderWidth:1,borderColor:palette.line,color:palette.white,padding:13,marginTop:7},primary:{height:48,borderRadius:13,backgroundColor:palette.pdfRed,alignItems:'center',justifyContent:'center',marginTop:13},primaryText:{color:'#fff',fontWeight:'900',fontSize:13},cancel:{height:42,alignItems:'center',justifyContent:'center',marginTop:4},cancelText:{color:palette.muted,fontWeight:'800',fontSize:12}
});
