import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { AppIcon } from '@/components/AppIcon';
import { PdfBrandMark } from '@/components/PdfBrandMark';
import { DocumentCard } from '@/components/DocumentCard';
import { UrlModal } from '@/components/UrlModal';
import { useTranslation } from '@/hooks/useTranslation';
import { palette } from '@/constants/theme';
import { PdfToolId } from '@/lib/pdfTools';
import { getSuggestedTools } from '@/lib/toolUsage';

type ToolCardData = { icon: React.ComponentProps<typeof AppIcon>['name']; title: string; desc: string; color: string };

export default function HomeScreen() {
  const { ready, documents, openPicker, addFromUrl, toggleFavorite } = useApp();
  const { t, locale } = useTranslation();
  const [urlOpen, setUrlOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [suggestedTools, setSuggestedTools] = useState<PdfToolId[]>(['scan', 'images', 'merge', 'compress']);
  const recent = useMemo(() => [...documents].sort((a, b) => b.lastOpenedAt - a.lastOpenedAt), [documents]);
  const continueDoc = recent[0];

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
      <View style={styles.brandRow}><PdfBrandMark size={36}/><View style={{flex:1}}><Text style={styles.brandName}>{t('app.name')}</Text><Text style={styles.eyebrow}>{t('home.eyebrow')}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={t('tabs.tools')} onPress={() => router.push('/tools')} style={styles.allToolsButton}><AppIcon name="tools" size={19} color={palette.pdfRedSoft}/></Pressable></View>

      <LinearGradient colors={['#2B2E34', '#15171A', '#08090B']} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.hero}>
        <View style={styles.heroRedEdge}/><View style={styles.heroSheen}/>
        <View style={styles.heroTop}><View style={styles.pill}><View style={styles.liveDot}/><Text style={styles.pillText}>{t('home.heroPill')}</Text></View><AppIcon name="shield" color={palette.steel}/></View>
        <Text style={styles.heroTitle}>{t('home.heroTitle')}</Text><Text style={styles.heroText}>{t('home.heroText')}</Text>
        <Pressable onPress={choosePdf} disabled={busy} style={({pressed}) => [styles.openButton, pressed && styles.pressed]}>{busy ? <ActivityIndicator color="#fff"/> : <><View style={styles.openIcon}><AppIcon name="plus" size={20} color="#fff"/></View><Text style={styles.openText}>{t('home.openPdf')}</Text><View style={{flex:1}}/><AppIcon name="chevronRight" size={19} color="#fff"/></>}</Pressable>
        <Pressable onPress={() => setUrlOpen(true)} style={styles.urlButton}><AppIcon name="link" size={17} color={palette.steel}/><Text style={styles.urlText}>{t('home.openFromUrl')}</Text></Pressable>
      </LinearGradient>

      <View style={styles.section}><View style={styles.sectionHead}><View><Text style={styles.sectionEyebrow}>{t('home.quickEyebrow')}</Text><Text style={styles.sectionTitle}>{t('home.quickTitle')}</Text></View><Pressable onPress={() => router.push('/tools')}><Text style={styles.seeAll}>{t('home.seeAll')}</Text></Pressable></View><View style={styles.quickGrid}>{suggestedTools.map((id) => <Quick key={id} {...toolCards[id]} onPress={() => router.push({ pathname:'/tools', params:{tool:id,launch:String(Date.now())} })}/>)}</View></View>

      {continueDoc ? <View style={styles.section}><View style={styles.sectionHead}><View><Text style={styles.sectionEyebrow}>{t('home.continueEyebrow')}</Text><Text style={styles.sectionTitle}>{t('home.continueTitle')}</Text></View><View style={styles.roundIcon}><AppIcon name="clock" size={18} color={palette.pdfRedSoft}/></View></View><Pressable onPress={() => goReader(continueDoc.id)} accessibilityRole="button" accessibilityLabel={continueDoc.name} style={styles.continueCard}><View style={styles.bigFile}><AppIcon name="file" size={31} color={palette.pdfRedSoft}/></View><View style={{flex:1}}><Text numberOfLines={1} style={styles.continueTitle}>{continueDoc.name}</Text><Text style={styles.continueMeta}>{continueDoc.lastPage>1?t('home.continueResume',{page:continueDoc.lastPage}):t('home.continueTap')}</Text></View><View style={styles.playButton}><AppIcon name="chevronRight" size={18}/></View></Pressable></View> : null}

      <View style={styles.section}><View style={styles.sectionHead}><View><Text style={styles.sectionEyebrow}>{t('home.recentEyebrow')}</Text><Text style={styles.sectionTitle}>{t('home.recentTitle')}</Text></View>{documents.length > 0 ? <Pressable onPress={() => router.push('/library')}><Text style={styles.seeAll}>{t('home.seeAll')}</Text></Pressable> : null}</View>{recent.length ? <View style={{gap:10}}>{recent.slice(0,4).map((doc) => <DocumentCard key={doc.id} doc={doc} t={t} locale={locale} onPress={() => goReader(doc.id)} onFavorite={() => toggleFavorite(doc.id)}/>)}</View> : <View style={styles.empty}><View style={styles.emptyIcon}><AppIcon name="file" size={30} color={palette.steel}/></View><Text style={styles.emptyTitle}>{t('home.emptyTitle')}</Text><Text style={styles.emptyText}>{t('home.emptyText')}</Text></View>}</View>

      <View style={styles.privacy}><View style={styles.privacyIcon}><AppIcon name="shield" size={22} color={palette.emerald}/></View><View style={{flex:1}}><Text style={styles.privacyTitle}>{t('home.privacyTitle')}</Text><Text style={styles.privacyText}>{t('home.privacyText')}</Text></View></View>
    </ScrollView>
    <UrlModal visible={urlOpen} onClose={() => setUrlOpen(false)} onSubmit={fromUrl}/>
  </SafeAreaView>;
}

type QuickProps = ToolCardData & { onPress: () => void };
function Quick({icon,title,desc,color,onPress}:QuickProps){return <Pressable onPress={onPress} style={({pressed})=>[styles.quick,pressed&&styles.pressed]}><View style={[styles.quickIcon,{backgroundColor:`${color}18`,borderColor:`${color}38`}]}><AppIcon name={icon} color={color}/></View><Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={.78} style={styles.quickTitle}>{title}</Text><Text numberOfLines={3} style={styles.quickDesc}>{desc}</Text></Pressable>}

const styles=StyleSheet.create({
  safe:{flex:1,backgroundColor:palette.ink},loading:{flex:1,backgroundColor:palette.ink,alignItems:'center',justifyContent:'center'},content:{padding:18,gap:25,paddingBottom:28},pressed:{opacity:.82,transform:[{scale:.988}]},
  brandRow:{paddingTop:2,flexDirection:'row',alignItems:'center',gap:11},brandName:{color:palette.white,fontSize:17,fontWeight:'900',letterSpacing:-.3},eyebrow:{color:palette.pdfRedSoft,fontSize:9,fontWeight:'900',letterSpacing:2.1,marginTop:2},allToolsButton:{width:42,height:42,borderRadius:14,backgroundColor:palette.card,borderWidth:1,borderColor:palette.line,alignItems:'center',justifyContent:'center'},
  hero:{borderRadius:28,padding:22,minHeight:355,overflow:'hidden',borderWidth:1,borderColor:'rgba(255,255,255,.14)'},heroRedEdge:{position:'absolute',start:0,top:0,bottom:0,width:5,backgroundColor:palette.pdfRed},heroSheen:{position:'absolute',end:-65,top:-80,width:230,height:230,borderRadius:130,backgroundColor:'rgba(255,255,255,.055)'},heroTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},pill:{flexDirection:'row',alignItems:'center',gap:7,backgroundColor:'rgba(0,0,0,.28)',paddingHorizontal:10,paddingVertical:7,borderRadius:20,borderWidth:1,borderColor:'rgba(255,255,255,.09)'},liveDot:{width:6,height:6,borderRadius:3,backgroundColor:palette.emerald},pillText:{color:'#D6D9DE',fontSize:9,fontWeight:'800',letterSpacing:.7},heroTitle:{color:'#fff',fontSize:41,lineHeight:44,fontWeight:'900',letterSpacing:-1.2,marginTop:26},heroText:{color:'#B3B8C1',fontSize:13.5,lineHeight:20,maxWidth:310,marginTop:12},openButton:{height:58,borderRadius:17,backgroundColor:palette.pdfRed,flexDirection:'row',alignItems:'center',paddingHorizontal:13,gap:11,marginTop:25,borderWidth:1,borderColor:'rgba(255,255,255,.16)'},openIcon:{width:34,height:34,borderRadius:10,backgroundColor:'rgba(0,0,0,.20)',alignItems:'center',justifyContent:'center'},openText:{color:'#fff',fontSize:16,fontWeight:'900'},urlButton:{height:39,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,marginTop:8},urlText:{color:palette.steel,fontSize:12,fontWeight:'700'},
  section:{gap:12},sectionHead:{flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between'},sectionEyebrow:{color:palette.pdfRedSoft,fontSize:9,fontWeight:'900',letterSpacing:1.8},sectionTitle:{color:palette.white,fontSize:20,fontWeight:'800',marginTop:4},roundIcon:{width:36,height:36,borderRadius:12,backgroundColor:palette.redGlow,alignItems:'center',justifyContent:'center'},seeAll:{color:palette.pdfRedSoft,fontSize:11,fontWeight:'800'},
  continueCard:{minHeight:105,borderRadius:20,borderWidth:1,borderColor:palette.line,backgroundColor:palette.card,padding:15,flexDirection:'row',alignItems:'center',gap:13,overflow:'hidden'},bigFile:{width:57,height:67,borderRadius:15,backgroundColor:palette.redGlow,alignItems:'center',justifyContent:'center'},continueTitle:{color:palette.white,fontSize:15,fontWeight:'800'},continueMeta:{color:palette.muted,fontSize:11.5,marginTop:6},playButton:{width:35,height:35,borderRadius:12,backgroundColor:palette.pdfRedDeep,alignItems:'center',justifyContent:'center'},
  quickGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},quick:{width:'48.5%',backgroundColor:palette.card,borderRadius:18,borderWidth:1,borderColor:palette.line,padding:14,minHeight:150},quickIcon:{width:42,height:42,borderRadius:13,borderWidth:1,alignItems:'center',justifyContent:'center'},quickTitle:{color:palette.white,fontSize:14,fontWeight:'800',lineHeight:18,marginTop:14},quickDesc:{color:palette.muted,fontSize:10.5,lineHeight:15,marginTop:4},
  empty:{borderRadius:20,borderWidth:1,borderStyle:'dashed',borderColor:palette.metalSoft,alignItems:'center',justifyContent:'center',paddingVertical:30,paddingHorizontal:20},emptyIcon:{width:58,height:58,borderRadius:18,backgroundColor:palette.card,alignItems:'center',justifyContent:'center'},emptyTitle:{color:'#D0D3D8',fontWeight:'800',fontSize:14,marginTop:12},emptyText:{color:palette.muted,fontSize:11.5,textAlign:'center',marginTop:5},
  privacy:{flexDirection:'row',gap:12,alignItems:'center',backgroundColor:'rgba(79,211,155,.055)',borderColor:'rgba(79,211,155,.16)',borderWidth:1,borderRadius:18,padding:15},privacyIcon:{width:42,height:42,borderRadius:13,backgroundColor:'rgba(79,211,155,.1)',alignItems:'center',justifyContent:'center'},privacyTitle:{color:'#C9F6E2',fontWeight:'800',fontSize:13},privacyText:{color:'#86A99A',fontSize:10.5,lineHeight:15,marginTop:3}
});
