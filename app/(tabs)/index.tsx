import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { AppIcon } from '@/components/AppIcon';
import { PdfBrandMark } from '@/components/PdfBrandMark';
import { UrlModal } from '@/components/UrlModal';
import { useTranslation } from '@/hooks/useTranslation';
import { chrome, gradients, layout, palette } from '@/constants/theme';
import { PdfToolId } from '@/lib/pdfTools';
import { getSuggestedTools } from '@/lib/toolUsage';

type ToolCardData = { icon: React.ComponentProps<typeof AppIcon>['name']; title: string; desc: string; color: string };

export default function HomeScreen() {
  const { ready, documents, openPicker, addFromUrl } = useApp();
  const { t } = useTranslation();
  const [urlOpen, setUrlOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [suggestedTools, setSuggestedTools] = useState<PdfToolId[]>(['scan', 'images', 'merge', 'compress']);
  const recent = useMemo(() => [...documents].sort((a, b) => b.lastOpenedAt - a.lastOpenedAt), [documents]);
  const latestDocument = recent[0];

  useFocusEffect(useCallback(() => {
    let active = true;
    getSuggestedTools().then((tools) => { if (active) setSuggestedTools(tools); }).catch(() => undefined);
    return () => { active = false; };
  }, []));

  const toolCards = useMemo<Record<PdfToolId, ToolCardData>>(() => ({
    scan: { icon: 'camera', title: t('tools.scanTitle'), desc: t('tools.scanDesc'), color: palette.pdfRedSoft },
    images: { icon: 'image', title: t('tools.imagesTitle'), desc: t('tools.imagesDesc'), color: palette.amber },
    create: { icon: 'edit', title: t('tools.createTitle'), desc: t('tools.createDesc'), color: palette.steel },
    merge: { icon: 'pages', title: t('tools.mergeTitle'), desc: t('tools.mergeDesc'), color: palette.pdfRed },
    split: { icon: 'split', title: t('tools.splitTitle'), desc: t('tools.splitDesc'), color: palette.cyan },
    extract: { icon: 'download', title: t('tools.extractTitle'), desc: t('tools.extractDesc'), color: palette.emerald },
    remove: { icon: 'trash', title: t('tools.removeTitle'), desc: t('tools.removeDesc'), color: palette.rose },
    reorder: { icon: 'reorder', title: t('tools.reorderTitle'), desc: t('tools.reorderDesc'), color: palette.steel },
    rotate: { icon: 'rotate', title: t('tools.rotateTitle'), desc: t('tools.rotateDesc'), color: palette.amber },
    watermark: { icon: 'watermark', title: t('tools.watermarkTitle'), desc: t('tools.watermarkDesc'), color: palette.pdfRedSoft },
    compress: { icon: 'compress', title: t('tools.compressTitle'), desc: t('tools.compressDesc'), color: palette.emerald },
    clean: { icon: 'shield', title: t('tools.cleanTitle'), desc: t('tools.cleanDesc'), color: palette.cyan },
    print: { icon: 'print', title: t('tools.printTitle'), desc: t('tools.printDesc'), color: palette.steel }
  }), [t]);

  const goReader = (id: string) => router.push({ pathname: '/reader/[id]', params: { id } });
  async function choosePdf() {
    setBusy(true);
    try { const doc = await openPicker(); if (doc) goReader(doc.id); }
    catch (error) { Alert.alert(t('files.openErrorTitle'), error instanceof Error ? error.message : t('files.openErrorMessage')); }
    finally { setBusy(false); }
  }
  async function fromUrl(url: string) { const doc = await addFromUrl(url); goReader(doc.id); }

  if (!ready) return <View style={styles.loading}><ActivityIndicator size="large" color={palette.pdfRed}/></View>;

  return <SafeAreaView edges={['top']} style={styles.safe}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.brandRow}><View style={styles.brandBadge}><PdfBrandMark size={37}/></View><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.78} style={styles.brandName}>{t('app.name')}</Text><Pressable accessibilityRole="button" accessibilityLabel={t('tabs.tools')} onPress={() => router.push('/tools')} style={styles.allToolsButton}><AppIcon name="tools" size={20} color={palette.pdfRedSoft}/></Pressable></View>

      <LinearGradient colors={gradients.redPanel} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.hero}>
        <View pointerEvents="none" style={styles.heroTopRail}/><View pointerEvents="none" style={styles.heroSideRail}/><View pointerEvents="none" style={[styles.rivet,{top:13,start:13}]}/><View pointerEvents="none" style={[styles.rivet,{top:13,end:13}]}/>
        <View style={styles.heroTop}><View style={styles.pill}><View style={styles.liveDot}/><Text numberOfLines={2} style={styles.pillText}>{t('home.heroPill')}</Text></View><View style={styles.heroMark}><PdfBrandMark size={72}/></View></View>
        <Text style={styles.heroTitle}>{t('home.heroTitle')}</Text><Text style={styles.heroText}>{t('home.heroText')}</Text>
        <Pressable onPress={choosePdf} disabled={busy} accessibilityRole="button" style={({pressed}) => [styles.openButton, pressed && styles.pressed]}>{busy ? <ActivityIndicator color={palette.pdfRed}/> : <><View style={styles.openIcon}><AppIcon name="plus" size={22} color={palette.white}/></View><Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={.8} style={styles.openText}>{t('home.openPdf')}</Text><View style={{flex:1}}/><View style={styles.openArrow}><AppIcon name="chevronRight" size={20} color={palette.ink}/></View></>}</Pressable>
        <Pressable onPress={() => setUrlOpen(true)} accessibilityRole="button" style={styles.urlButton}><AppIcon name="link" size={17} color={palette.redTint}/><Text numberOfLines={2} style={styles.urlText}>{t('home.openFromUrl')}</Text></Pressable>
      </LinearGradient>

      <View style={styles.section}><View style={styles.sectionHead}><View style={{flex:1}}><Text style={styles.sectionEyebrow}>{t('home.quickEyebrow')}</Text><Text style={styles.sectionTitle}>{t('home.quickTitle')}</Text></View><Pressable accessibilityRole="button" onPress={() => router.push('/tools')} style={styles.seeAllButton}><Text style={styles.seeAll}>{t('home.seeAll')}</Text><AppIcon name="chevronRight" size={14} color={palette.pdfRedSoft}/></Pressable></View><View style={styles.quickGrid}>{suggestedTools.map((id) => <Quick key={id} {...toolCards[id]} onPress={() => router.push({ pathname:'/tools', params:{tool:id,launch:String(Date.now())} })}/>)}</View></View>

      {latestDocument ? <View style={styles.section}><View style={styles.sectionHead}><View><Text style={styles.sectionEyebrow}>{t('home.continueEyebrow')}</Text><Text style={styles.sectionTitle}>{t('home.continueTitle')}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={t('home.seeAll')} onPress={() => router.push('/library')} style={styles.roundIcon}><AppIcon name="library" size={18} color={palette.pdfRedSoft}/></Pressable></View><Pressable onPress={() => goReader(latestDocument.id)} accessibilityRole="button" accessibilityLabel={latestDocument.name} style={({pressed})=>[styles.continueCard,pressed&&styles.pressed]}><View style={styles.bigFile}><AppIcon name="file" size={31} color={palette.pdfRedSoft}/></View><View style={{flex:1}}><Text numberOfLines={1} style={styles.continueTitle}>{latestDocument.name}</Text><Text style={styles.continueMeta}>{t('home.continueTap')}</Text></View><View style={styles.playButton}><AppIcon name="chevronRight" size={18}/></View></Pressable></View> : <View style={styles.empty}><View style={styles.emptyIcon}><AppIcon name="file" size={30} color={palette.steel}/></View><Text style={styles.emptyTitle}>{t('home.emptyTitle')}</Text><Text style={styles.emptyText}>{t('home.emptyText')}</Text></View>}

      <View style={styles.privacy}><View style={styles.privacyIcon}><AppIcon name="shield" size={23} color={palette.emerald}/></View><View style={{flex:1}}><Text style={styles.privacyTitle}>{t('home.privacyTitle')}</Text><Text style={styles.privacyText}>{t('home.privacyText')}</Text></View></View>
    </ScrollView>
    <UrlModal visible={urlOpen} onClose={() => setUrlOpen(false)} onSubmit={fromUrl}/>
  </SafeAreaView>;
}

type QuickProps = ToolCardData & { onPress: () => void };
function Quick({icon,title,desc,color,onPress}:QuickProps){return <Pressable onPress={onPress} accessibilityRole="button" style={({pressed})=>[styles.quickPressable,pressed&&styles.pressed]}><LinearGradient colors={gradients.toolPanel} style={styles.quick}><View pointerEvents="none" style={styles.quickRedRail}/><View style={[styles.quickIcon,{backgroundColor:`${color}18`,borderColor:`${color}42`}]}><AppIcon name={icon} color={color}/></View><Text numberOfLines={2} style={styles.quickTitle}>{title}</Text><Text numberOfLines={3} style={styles.quickDesc}>{desc}</Text><View style={styles.quickArrow}><AppIcon name="chevronRight" size={14} color={palette.steel}/></View></LinearGradient></Pressable>}

const styles=StyleSheet.create({
  safe:{flex:1,backgroundColor:palette.ink},loading:{flex:1,backgroundColor:palette.ink,alignItems:'center',justifyContent:'center'},content:{padding:layout.pagePadding,gap:layout.sectionGap,paddingBottom:28},pressed:{opacity:.8,transform:[{scale:.988}]},
  brandRow:{paddingTop:2,flexDirection:'row',alignItems:'center',gap:11},brandBadge:{width:48,height:48,borderRadius:8,backgroundColor:palette.card,borderWidth:1,borderColor:chrome.edge,alignItems:'center',justifyContent:'center'},brandName:{flex:1,color:palette.white,fontSize:23,fontWeight:'900',letterSpacing:.4},allToolsButton:{width:layout.minTouchTarget,height:layout.minTouchTarget,borderRadius:9,backgroundColor:palette.card,borderWidth:1,borderColor:chrome.edge,alignItems:'center',justifyContent:'center'},
  hero:{borderRadius:12,padding:20,minHeight:374,overflow:'hidden',borderWidth:1,borderColor:chrome.redEdge,shadowColor:chrome.shadow,shadowOpacity:.4,shadowRadius:14,shadowOffset:{width:0,height:8},elevation:8},heroTopRail:{position:'absolute',top:7,start:12,end:12,height:2,backgroundColor:chrome.edge},heroSideRail:{position:'absolute',top:16,bottom:16,start:7,width:3,backgroundColor:chrome.redEdge},rivet:{position:'absolute',width:6,height:6,borderRadius:3,backgroundColor:chrome.rivet,borderWidth:1,borderColor:chrome.edge},heroTop:{flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between',gap:12},pill:{maxWidth:'70%',flexDirection:'row',alignItems:'center',gap:7,backgroundColor:chrome.innerEdge,paddingHorizontal:10,paddingVertical:8,borderRadius:7,borderWidth:1,borderColor:palette.line},liveDot:{width:7,height:7,borderRadius:4,backgroundColor:palette.emerald},pillText:{flexShrink:1,color:palette.redTintStrong,fontSize:9,fontWeight:'900',lineHeight:12,letterSpacing:.55},heroMark:{width:78,height:78,borderRadius:10,backgroundColor:chrome.innerEdge,borderWidth:1,borderColor:palette.line,alignItems:'center',justifyContent:'center'},heroTitle:{color:palette.whitePure,fontSize:38,lineHeight:41,fontWeight:'900',letterSpacing:-1.2,marginTop:19},heroText:{color:palette.redCopy,fontSize:13,lineHeight:19,maxWidth:320,marginTop:9},openButton:{minHeight:62,borderRadius:9,backgroundColor:palette.white,flexDirection:'row',alignItems:'center',paddingHorizontal:12,gap:11,marginTop:21,borderWidth:1,borderColor:palette.whitePure},openIcon:{width:38,height:38,borderRadius:8,backgroundColor:palette.pdfRed,alignItems:'center',justifyContent:'center'},openText:{color:palette.ink,fontSize:17,fontWeight:'900'},openArrow:{width:34,height:34,borderRadius:17,backgroundColor:palette.paperSoft,alignItems:'center',justifyContent:'center'},urlButton:{minHeight:layout.minTouchTarget,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,marginTop:5},urlText:{flexShrink:1,color:palette.redTint,fontSize:12,fontWeight:'800'},
  section:{gap:12},sectionHead:{flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between',gap:10},sectionEyebrow:{color:palette.pdfRedSoft,fontSize:9,fontWeight:'900',letterSpacing:1.8},sectionTitle:{color:palette.white,fontSize:20,fontWeight:'900',marginTop:4},roundIcon:{width:40,height:40,borderRadius:8,backgroundColor:palette.redGlow,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'rgba(229,37,42,.28)'},seeAllButton:{minHeight:layout.minTouchTarget,flexDirection:'row',alignItems:'center',gap:3,paddingStart:10},seeAll:{color:palette.pdfRedSoft,fontSize:11,fontWeight:'900'},
  continueCard:{minHeight:105,borderRadius:11,borderWidth:1,borderColor:chrome.edge,backgroundColor:palette.card,padding:14,flexDirection:'row',alignItems:'center',gap:13,overflow:'hidden'},bigFile:{width:57,height:67,borderRadius:9,backgroundColor:palette.redGlow,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'rgba(229,37,42,.26)'},continueTitle:{color:palette.white,fontSize:15,fontWeight:'800'},continueMeta:{color:palette.muted,fontSize:11.5,marginTop:6},playButton:{width:38,height:38,borderRadius:9,backgroundColor:palette.pdfRedDeep,alignItems:'center',justifyContent:'center'},
  quickGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},quickPressable:{width:'48.5%'},quick:{flex:1,minHeight:158,borderRadius:10,borderWidth:1,borderColor:chrome.edge,padding:14,overflow:'hidden'},quickRedRail:{position:'absolute',start:0,top:0,bottom:0,width:3,backgroundColor:palette.pdfRedDeep},quickIcon:{width:43,height:43,borderRadius:8,borderWidth:1,alignItems:'center',justifyContent:'center'},quickTitle:{color:palette.white,fontSize:14,fontWeight:'900',lineHeight:18,marginTop:13,paddingEnd:18},quickDesc:{color:palette.muted,fontSize:10.5,lineHeight:15,marginTop:5},quickArrow:{position:'absolute',end:10,top:14,width:24,height:24,borderRadius:7,backgroundColor:'rgba(255,255,255,.055)',alignItems:'center',justifyContent:'center'},
  empty:{borderRadius:11,borderWidth:1,borderStyle:'dashed',borderColor:palette.metalSoft,alignItems:'center',justifyContent:'center',paddingVertical:28,paddingHorizontal:20},emptyIcon:{width:58,height:58,borderRadius:10,backgroundColor:palette.card,alignItems:'center',justifyContent:'center'},emptyTitle:{color:palette.emptyTitle,fontWeight:'800',fontSize:14,marginTop:12},emptyText:{color:palette.muted,fontSize:11.5,textAlign:'center',marginTop:5},
  privacy:{flexDirection:'row',gap:12,alignItems:'center',backgroundColor:'rgba(79,211,155,.055)',borderColor:'rgba(79,211,155,.22)',borderWidth:1,borderRadius:10,padding:15},privacyIcon:{width:44,height:44,borderRadius:9,backgroundColor:'rgba(79,211,155,.1)',alignItems:'center',justifyContent:'center'},privacyTitle:{color:palette.mintText,fontWeight:'900',fontSize:13},privacyText:{color:palette.mintMuted,fontSize:10.5,lineHeight:15,marginTop:3}
});
