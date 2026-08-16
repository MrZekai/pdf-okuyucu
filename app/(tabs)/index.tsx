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

export default function HomeScreen() {
  const { ready, documents, openPicker, addFromUrl, toggleFavorite } = useApp();
  const { t, locale } = useTranslation();
  const [urlOpen, setUrlOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [suggestedTools, setSuggestedTools] = useState<PdfToolId[]>(['merge', 'extract', 'rotate']);
  const recent = useMemo(() => [...documents].sort((a,b) => b.lastOpenedAt - a.lastOpenedAt), [documents]);
  const continueDoc = recent[0];
  const favoriteCount = documents.filter((d) => d.isFavorite).length;
  const pagesRead = documents.reduce((sum, d) => sum + Math.max(0, d.lastPage - 1), 0);
  const number = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  useFocusEffect(useCallback(() => {
    let active = true;
    getSuggestedTools().then((tools) => { if (active) setSuggestedTools(tools); }).catch(() => undefined);
    return () => { active = false; };
  }, []));

  const toolCards = useMemo(() => ({
    merge: { icon: 'pages' as const, title: t('tools.mergeTitle'), desc: t('tools.mergeDesc'), color: '#8B97FF' },
    extract: { icon: 'download' as const, title: t('tools.extractTitle'), desc: t('tools.extractDesc'), color: palette.cyan },
    remove: { icon: 'trash' as const, title: t('tools.removeTitle'), desc: t('tools.removeDesc'), color: palette.rose },
    reorder: { icon: 'reorder' as const, title: t('tools.reorderTitle'), desc: t('tools.reorderDesc'), color: '#A78BFA' },
    rotate: { icon: 'rotate' as const, title: t('tools.rotateTitle'), desc: t('tools.rotateDesc'), color: palette.amber },
    clean: { icon: 'shield' as const, title: t('tools.cleanTitle'), desc: t('tools.cleanDesc'), color: palette.emerald }
  }), [t]);

  const goReader = (id: string) => router.push({ pathname: '/reader/[id]', params: { id } });

  async function choosePdf() {
    setBusy(true);
    try {
      const doc = await openPicker();
      if (doc) goReader(doc.id);
    } catch (error) {
      Alert.alert(t('files.openErrorTitle'), error instanceof Error ? error.message : t('files.openErrorMessage'));
    } finally { setBusy(false); }
  }

  async function fromUrl(url: string) {
    const doc = await addFromUrl(url);
    goReader(doc.id);
  }

  if (!ready) return <View style={styles.loading}><ActivityIndicator size="large" color={palette.royal}/></View>;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.brandRow}><PdfBrandMark size={34}/><View style={{flex:1}}><Text style={styles.brandName}>{t('app.name')}</Text><Text style={styles.eyebrow}>{t('home.eyebrow')}</Text></View></View>

        <LinearGradient colors={['#5B67F1', '#7048DB', '#19213F']} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.hero}>
          <View style={styles.heroGlow}/>
          <View style={styles.heroTop}><View style={styles.pill}><View style={styles.liveDot}/><Text style={styles.pillText}>{t('home.heroPill')}</Text></View><AppIcon name="shield" color="rgba(255,255,255,0.85)"/></View>
          <Text style={styles.heroTitle}>{t('home.heroTitle')}</Text>
          <Text style={styles.heroText}>{t('home.heroText')}</Text>
          <Pressable onPress={choosePdf} disabled={busy} style={({pressed}) => [styles.openButton, pressed && { transform: [{scale:0.985}] }]}>
            {busy ? <ActivityIndicator color={palette.ink}/> : <><View style={styles.openIcon}><AppIcon name="plus" size={20} color={palette.pdfRedDeep}/></View><Text style={styles.openText}>{t('home.openPdf')}</Text><View style={{flex:1}}/><AppIcon name="chevronRight" size={19} color={palette.ink}/></>}
          </Pressable>
          <Pressable onPress={() => setUrlOpen(true)} style={styles.urlButton}><AppIcon name="link" size={17} color="#D8DEFF"/><Text style={styles.urlText}>{t('home.openFromUrl')}</Text></Pressable>
        </LinearGradient>

        {continueDoc ? (
          <View style={styles.section}>
            <View style={styles.sectionHead}><View><Text style={styles.sectionEyebrow}>{t('home.continueEyebrow')}</Text><Text style={styles.sectionTitle}>{t('home.continueTitle')}</Text></View><View style={styles.roundIcon}><AppIcon name="clock" size={18} color={palette.cyan}/></View></View>
            <Pressable onPress={() => goReader(continueDoc.id)} accessibilityRole="button" accessibilityLabel={continueDoc.name} style={styles.continueCard}>
              <LinearGradient colors={['rgba(56,189,248,0.11)','rgba(91,103,241,0.08)']} style={StyleSheet.absoluteFill}/>
              <View style={styles.bigFile}><AppIcon name="file" size={31} color="#818CF8"/></View>
              <View style={{flex:1}}><Text numberOfLines={1} style={styles.continueTitle}>{continueDoc.name}</Text><Text style={styles.continueMeta}>{continueDoc.lastPage>1?t('home.continueResume',{page:continueDoc.lastPage}):t('home.continueTap')}</Text></View><View style={styles.playButton}><AppIcon name="chevronRight" size={18}/></View>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>{t('home.quickEyebrow')}</Text><Text style={styles.sectionTitle}>{t('home.quickTitle')}</Text>
          <View style={styles.quickGrid}>
            <Quick icon="file" title={t('home.quickOpenTitle')} desc={t('home.quickOpenDesc')} color={palette.pdfRed} onPress={choosePdf}/>
            {suggestedTools.map((id) => { const card=toolCards[id]; return <Quick key={id} icon={card.icon} title={card.title} desc={card.desc} color={card.color} onPress={() => router.push({pathname:'/tools',params:{tool:id,launch:String(Date.now())}})}/>; })}
          </View>
        </View>

        <View style={styles.statsRow}>
          <Stat value={number.format(documents.length)} label={t('home.statDocuments')} icon="library"/>
          <Stat value={number.format(pagesRead)} label={t('home.statPages')} icon="pages"/>
          <Stat value={number.format(favoriteCount)} label={t('home.statFavorites')} icon="heart"/>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}><View><Text style={styles.sectionEyebrow}>{t('home.recentEyebrow')}</Text><Text style={styles.sectionTitle}>{t('home.recentTitle')}</Text></View>{documents.length > 0 ? <Pressable onPress={() => router.push('/library')}><Text style={styles.seeAll}>{t('home.seeAll')}</Text></Pressable> : null}</View>
          {recent.length ? <View style={{gap:10}}>{recent.slice(0,4).map((doc) => <DocumentCard key={doc.id} doc={doc} t={t} locale={locale} onPress={() => goReader(doc.id)} onFavorite={() => toggleFavorite(doc.id)}/>)}</View> : <View style={styles.empty}><View style={styles.emptyIcon}><AppIcon name="file" size={30} color="#64748B"/></View><Text style={styles.emptyTitle}>{t('home.emptyTitle')}</Text><Text style={styles.emptyText}>{t('home.emptyText')}</Text></View>}
        </View>

        <View style={styles.privacy}><View style={styles.privacyIcon}><AppIcon name="shield" size={22} color={palette.emerald}/></View><View style={{flex:1}}><Text style={styles.privacyTitle}>{t('home.privacyTitle')}</Text><Text style={styles.privacyText}>{t('home.privacyText')}</Text></View></View>
        <View style={{height:10}}/>
      </ScrollView>
      <UrlModal visible={urlOpen} onClose={() => setUrlOpen(false)} onSubmit={fromUrl}/>
    </SafeAreaView>
  );
}

type QuickProps = { icon: React.ComponentProps<typeof AppIcon>['name']; title: string; desc: string; color: string; onPress: () => void };
function Quick({ icon, title, desc, color, onPress }: QuickProps) {
  return <Pressable onPress={onPress} style={({pressed}) => [styles.quick, pressed && {opacity:.8}]}><View style={[styles.quickIcon,{backgroundColor:`${color}1C`}]}><AppIcon name={icon} color={color}/></View><Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.82} style={styles.quickTitle}>{title}</Text><Text numberOfLines={3} style={styles.quickDesc}>{desc}</Text></Pressable>;
}
type StatProps = { value: string; label: string; icon: React.ComponentProps<typeof AppIcon>['name'] };
function Stat({ value, label, icon }: StatProps) { return <View style={styles.stat}><AppIcon name={icon} size={17} color="#7C89FF"/><Text style={styles.statValue}>{value}</Text><Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8} style={styles.statLabel}>{label}</Text></View>; }

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:palette.ink}, loading:{flex:1,backgroundColor:palette.ink,alignItems:'center',justifyContent:'center'}, content:{padding:18,gap:24},
  brandRow:{paddingTop:2,flexDirection:'row',alignItems:'center',gap:11}, brandName:{color:palette.white,fontSize:17,fontWeight:'900',letterSpacing:-0.3}, eyebrow:{color:palette.pdfRedSoft,fontSize:10,fontWeight:'900',letterSpacing:2.3,marginTop:2},
  hero:{borderRadius:28,padding:22,minHeight:355,overflow:'hidden',borderWidth:1,borderColor:'rgba(255,255,255,.08)'}, heroGlow:{position:'absolute',end:-70,top:-60,width:210,height:210,borderRadius:120,backgroundColor:'rgba(255,86,76,.22)'}, heroTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}, pill:{flexDirection:'row',alignItems:'center',gap:7,backgroundColor:'rgba(4,8,24,.23)',paddingHorizontal:10,paddingVertical:7,borderRadius:20}, liveDot:{width:6,height:6,borderRadius:3,backgroundColor:'#86EFAC'}, pillText:{color:'#E8ECFF',fontSize:9,fontWeight:'800',letterSpacing:.7}, heroTitle:{color:'#fff',fontSize:42,lineHeight:45,fontWeight:'900',letterSpacing:-1.3,marginTop:26}, heroText:{color:'rgba(239,242,255,.76)',fontSize:13.5,lineHeight:20,maxWidth:310,marginTop:12}, openButton:{height:58,borderRadius:17,backgroundColor:'#F8FAFC',flexDirection:'row',alignItems:'center',paddingHorizontal:13,gap:11,marginTop:25},openIcon:{width:34,height:34,borderRadius:10,backgroundColor:'#FFE1DE',alignItems:'center',justifyContent:'center'},openText:{color:palette.ink,fontSize:16,fontWeight:'900'},urlButton:{height:39,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,marginTop:8},urlText:{color:'#D8DEFF',fontSize:12,fontWeight:'700'},
  section:{gap:12},sectionHead:{flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between'},sectionEyebrow:{color:'#6776ED',fontSize:9,fontWeight:'900',letterSpacing:1.8},sectionTitle:{color:palette.white,fontSize:20,fontWeight:'800',marginTop:4},roundIcon:{width:36,height:36,borderRadius:12,backgroundColor:'rgba(56,189,248,.1)',alignItems:'center',justifyContent:'center'},seeAll:{color:'#8B97FF',fontSize:11,fontWeight:'800'},
  continueCard:{minHeight:105,borderRadius:20,borderWidth:1,borderColor:'rgba(91,103,241,.18)',backgroundColor:'#11192C',padding:15,flexDirection:'row',alignItems:'center',gap:13,overflow:'hidden'},bigFile:{width:57,height:67,borderRadius:15,backgroundColor:'rgba(99,102,241,.12)',alignItems:'center',justifyContent:'center'},continueTitle:{color:palette.white,fontSize:15,fontWeight:'800'},continueMeta:{color:palette.muted,fontSize:11.5,marginTop:6},playButton:{width:35,height:35,borderRadius:12,backgroundColor:'rgba(91,103,241,.22)',alignItems:'center',justifyContent:'center'},
  quickGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},quick:{width:'48.5%',backgroundColor:'#11192B',borderRadius:18,borderWidth:1,borderColor:palette.line,padding:14,minHeight:146},quickIcon:{width:42,height:42,borderRadius:13,alignItems:'center',justifyContent:'center'},quickTitle:{color:palette.white,fontSize:14,fontWeight:'800',lineHeight:18,marginTop:14},quickDesc:{color:palette.muted,fontSize:11,lineHeight:15,marginTop:4},
  statsRow:{flexDirection:'row',gap:8},stat:{flex:1,alignItems:'center',justifyContent:'center',minHeight:105,backgroundColor:'#10182A',borderWidth:1,borderColor:palette.line,borderRadius:17,gap:5},statValue:{color:palette.white,fontSize:19,fontWeight:'900'},statLabel:{color:palette.muted,fontSize:9.5,fontWeight:'600',textAlign:'center'},
  empty:{borderRadius:20,borderWidth:1,borderStyle:'dashed',borderColor:'#26324A',alignItems:'center',justifyContent:'center',paddingVertical:30,paddingHorizontal:20},emptyIcon:{width:58,height:58,borderRadius:18,backgroundColor:'#111A2D',alignItems:'center',justifyContent:'center'},emptyTitle:{color:'#CBD5E1',fontWeight:'800',fontSize:14,marginTop:12},emptyText:{color:'#64748B',fontSize:11.5,textAlign:'center',marginTop:5},
  privacy:{flexDirection:'row',gap:12,alignItems:'center',backgroundColor:'rgba(34,197,94,.06)',borderColor:'rgba(34,197,94,.14)',borderWidth:1,borderRadius:18,padding:15},privacyIcon:{width:42,height:42,borderRadius:13,backgroundColor:'rgba(34,197,94,.1)',alignItems:'center',justifyContent:'center'},privacyTitle:{color:'#DCFCE7',fontWeight:'800',fontSize:13},privacyText:{color:'#85A996',fontSize:10.5,lineHeight:15,marginTop:3}
});
