import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { AppIcon } from '@/components/AppIcon';
import { useTranslation } from '@/hooks/useTranslation';
import { cleanMetadata, extractPages, mergePdfs, PdfToolId, removePages, reorderPages, rotatePages } from '@/lib/pdfTools';
import { recordToolUse } from '@/lib/toolUsage';
import { palette } from '@/constants/theme';

const TOOL_IDS: PdfToolId[] = ['merge', 'extract', 'remove', 'reorder', 'rotate', 'clean'];

export default function ToolsScreen() {
  const { tool, launch } = useLocalSearchParams<{ tool?: string; launch?: string }>();
  const { addGeneratedDocument } = useApp();
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [rangeTool, setRangeTool] = useState<'extract' | 'remove' | 'reorder' | null>(null);
  const [range, setRange] = useState('');
  const handledParam = useRef<string | undefined>(undefined);

  const execute = useCallback(async (id: PdfToolId, pageRange?: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const document = id === 'merge' ? await mergePdfs()
        : id === 'extract' ? await extractPages(pageRange || '')
        : id === 'remove' ? await removePages(pageRange || '')
        : id === 'reorder' ? await reorderPages(pageRange || '')
        : id === 'rotate' ? await rotatePages()
        : await cleanMetadata();
      if (!document) return;
      await recordToolUse(id).catch(() => undefined);
      addGeneratedDocument(document);
      Alert.alert(t('tools.successTitle'), t('tools.successMessage', { name: document.name }), [
        { text: t('common.done') },
        { text: t('common.open'), onPress: () => router.push({ pathname: '/reader/[id]', params: { id: document.id } }) }
      ]);
    } catch (error) {
      Alert.alert(t('tools.errorTitle'), error instanceof Error ? error.message : t('tools.genericError'));
    } finally {
      setBusy(false);
    }
  }, [addGeneratedDocument, busy, t]);

  const start = useCallback((id: PdfToolId) => {
    if (id === 'extract' || id === 'remove' || id === 'reorder') {
      setRange('');
      setRangeTool(id);
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

  const cards: { id: PdfToolId; icon: React.ComponentProps<typeof AppIcon>['name']; color: string; title: string; desc: string }[] = [
    { id: 'merge', icon: 'pages', color: '#8B97FF', title: t('tools.mergeTitle'), desc: t('tools.mergeDesc') },
    { id: 'extract', icon: 'download', color: palette.cyan, title: t('tools.extractTitle'), desc: t('tools.extractDesc') },
    { id: 'remove', icon: 'trash', color: palette.rose, title: t('tools.removeTitle'), desc: t('tools.removeDesc') },
    { id: 'reorder', icon: 'reorder', color: '#A78BFA', title: t('tools.reorderTitle'), desc: t('tools.reorderDesc') },
    { id: 'rotate', icon: 'rotate', color: palette.amber, title: t('tools.rotateTitle'), desc: t('tools.rotateDesc') },
    { id: 'clean', icon: 'shield', color: palette.emerald, title: t('tools.cleanTitle'), desc: t('tools.cleanDesc') }
  ];

  return <SafeAreaView style={styles.safe} edges={['top']}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View><Text style={styles.kicker}>{t('tools.kicker')}</Text><Text style={styles.title}>{t('tools.title')}</Text><Text style={styles.subtitle}>{t('tools.subtitle')}</Text></View>
      <View style={styles.localPill}><AppIcon name="shield" size={15} color={palette.emerald}/><Text style={styles.localText}>{t('tools.localOnly')}</Text></View>
      <View style={styles.grid}>{cards.map((card) => <Pressable key={card.id} disabled={busy} onPress={() => start(card.id)} accessibilityRole="button" style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}><View style={[styles.cardIcon, { backgroundColor: `${card.color}19` }]}><AppIcon name={card.icon} color={card.color}/></View><Text numberOfLines={2} style={styles.cardTitle}>{card.title}</Text><Text numberOfLines={3} style={styles.cardDesc}>{card.desc}</Text><View style={styles.cardArrow}><AppIcon name="chevronRight" size={17} color="#78859C"/></View></Pressable>)}</View>
    </ScrollView>
    {busy ? <View style={styles.busy}><View style={styles.busyCard}><ActivityIndicator color={palette.royal}/><Text style={styles.busyText}>{t('tools.processing')}</Text></View></View> : null}
    <Modal visible={rangeTool !== null} transparent animationType="fade" onRequestClose={() => setRangeTool(null)}><View style={styles.modalBg}><View style={styles.modalCard}><Text style={styles.modalTitle}>{rangeTool === 'reorder' ? t('tools.reorderTitle') : t('tools.rangeTitle')}</Text><Text style={styles.modalText}>{rangeTool === 'reorder' ? t('tools.orderMessage') : t('tools.rangeMessage')}</Text><TextInput autoFocus keyboardType="numbers-and-punctuation" value={range} onChangeText={setRange} placeholder={rangeTool === 'reorder' ? t('tools.orderPlaceholder') : t('tools.rangePlaceholder')} placeholderTextColor="#64748B" style={styles.input}/><Pressable onPress={() => { const selected = rangeTool; setRangeTool(null); if (selected) execute(selected, range); }} style={styles.primary}><Text style={styles.primaryText}>{t('tools.run')}</Text></Pressable><Pressable onPress={() => setRangeTool(null)} style={styles.cancel}><Text style={styles.cancelText}>{t('common.cancel')}</Text></Pressable></View></View></Modal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:palette.ink},content:{padding:18,paddingBottom:34,gap:18},kicker:{color:'#6E7BEE',fontSize:9,fontWeight:'900',letterSpacing:1.8},title:{color:palette.white,fontSize:27,fontWeight:'900',marginTop:4},subtitle:{color:palette.muted,fontSize:12,lineHeight:18,marginTop:7,maxWidth:430},localPill:{alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:7,borderRadius:20,paddingHorizontal:11,paddingVertical:8,backgroundColor:'rgba(34,197,94,.07)',borderWidth:1,borderColor:'rgba(34,197,94,.18)'},localText:{color:'#A7F3D0',fontSize:9,fontWeight:'900',letterSpacing:.8},grid:{flexDirection:'row',flexWrap:'wrap',gap:10},card:{width:'48.5%',minHeight:172,borderRadius:20,backgroundColor:'#11192B',borderWidth:1,borderColor:palette.line,padding:15},cardPressed:{opacity:.78,transform:[{scale:.985}]},cardIcon:{width:44,height:44,borderRadius:14,alignItems:'center',justifyContent:'center'},cardTitle:{color:palette.white,fontSize:14,fontWeight:'800',lineHeight:18,marginTop:15,paddingEnd:18},cardDesc:{color:palette.muted,fontSize:10.5,lineHeight:15,marginTop:5},cardArrow:{position:'absolute',end:12,top:17},busy:{...StyleSheet.absoluteFill,backgroundColor:'rgba(2,6,23,.72)',alignItems:'center',justifyContent:'center'},busyCard:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:'#11192B',borderRadius:18,borderWidth:1,borderColor:palette.line,paddingHorizontal:20,paddingVertical:16},busyText:{color:palette.white,fontSize:12.5,fontWeight:'800'},modalBg:{flex:1,backgroundColor:'rgba(2,6,23,.82)',justifyContent:'center',padding:22},modalCard:{backgroundColor:'#11192B',borderRadius:22,borderWidth:1,borderColor:palette.line,padding:20},modalTitle:{color:palette.white,fontSize:19,fontWeight:'900'},modalText:{color:palette.muted,fontSize:12,marginTop:6},input:{height:50,borderRadius:13,backgroundColor:'#090F1E',borderWidth:1,borderColor:palette.line,color:'#fff',paddingHorizontal:13,marginTop:16,textAlign:'left',writingDirection:'ltr'},primary:{height:48,borderRadius:13,backgroundColor:palette.royal,alignItems:'center',justifyContent:'center',marginTop:11},primaryText:{color:'#fff',fontWeight:'800',fontSize:13},cancel:{height:42,alignItems:'center',justifyContent:'center',marginTop:4},cancelText:{color:palette.muted,fontWeight:'800',fontSize:12}
});
