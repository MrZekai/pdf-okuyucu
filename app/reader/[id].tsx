import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PdfView } from '@kishannareshpal/expo-pdf';
import * as Sharing from 'expo-sharing';
import { useApp } from '@/context/AppContext';
import { AppIcon } from '@/components/AppIcon';
import { AdBanner } from '@/components/AdBanner';
import { palette } from '@/constants/theme';

export default function ReaderScreen(){
 const {id}=useLocalSearchParams<{id:string}>();
 const {getDocument,touchDocument,updateProgress,toggleFavorite,settings}=useApp();
 const doc=getDocument(id);
 const [page,setPage]=useState(1); const [count,setCount]=useState(doc?.pageCount||0);
 const [horizontal,setHorizontal]=useState(settings.horizontal); const [paging,setPaging]=useState(settings.pagingEnabled); const [inverted,setInverted]=useState(settings.invertPdfPages);
 const [password,setPassword]=useState(''); const [passwordOpen,setPasswordOpen]=useState(false); const [error,setError]=useState('');
 useEffect(()=>{if(id)touchDocument(id)},[id,touchDocument]);
 if(!doc) return <SafeAreaView style={styles.center}><AppIcon name="file" size={42} color="#475569"/><Text style={styles.errorTitle}>Belge bulunamadı</Text><Pressable onPress={()=>router.back()} style={styles.backButton}><Text style={styles.backText}>Geri dön</Text></Pressable></SafeAreaView>;
 async function share(){try{if(await Sharing.isAvailableAsync())await Sharing.shareAsync(doc.uri,{mimeType:'application/pdf',dialogTitle:doc.name});}catch{}}
 return <View style={styles.root}>
   <SafeAreaView edges={['top']} style={styles.top}><Pressable onPress={()=>router.back()} style={styles.iconButton}><AppIcon name="back"/></Pressable><View style={{flex:1,minWidth:0}}><Text numberOfLines={1} style={styles.title}>{doc.name}</Text><Text style={styles.subtitle}>{count?`${page} / ${count} sayfa`:'PDF yükleniyor…'}</Text></View><Pressable onPress={()=>toggleFavorite(doc.id)} style={styles.iconButton}><AppIcon name="heart" color={doc.isFavorite?palette.rose:'#CBD5E1'}/></Pressable><Pressable onPress={share} style={styles.iconButton}><AppIcon name="share" color="#CBD5E1"/></Pressable></SafeAreaView>
   <View style={styles.viewer}>
    {error?<View style={styles.center}><AppIcon name="info" size={36} color={palette.danger}/><Text style={styles.errorTitle}>PDF açılamadı</Text><Text style={styles.errorText}>{error}</Text><Pressable onPress={()=>setError('')} style={styles.backButton}><Text style={styles.backText}>Tekrar dene</Text></Pressable></View>:
    <PdfView key={`${horizontal}-${paging}-${inverted}-${password}`} style={{flex:1}} uri={doc.uri} password={password||undefined} horizontal={horizontal} pagingEnabled={paging} doubleTapToZoom pageGap={10} contentPadding={{top:10,bottom:10,left:8,right:8}} fitMode="width" pageColorInverted={inverted} autoScale
      onLoadComplete={({pageCount})=>{setCount(pageCount);updateProgress(doc.id,page,pageCount)}}
      onPageChanged={({pageIndex,pageCount})=>{const p=pageIndex+1;setPage(p);setCount(pageCount);updateProgress(doc.id,p,pageCount)}}
      onError={({code,message})=>{if(code==='password_required'||code==='password_incorrect'){setPasswordOpen(true)}else setError(message||'Bu PDF görüntülenemedi.')}}/>}
   </View>
   <View style={styles.toolbar}><ReaderToggle icon="rotate" active={horizontal} label={horizontal?'Yatay':'Dikey'} onPress={()=>setHorizontal(v=>!v)}/><ReaderToggle icon="snap" active={paging} label={paging?'Tek sayfa':'Akış'} onPress={()=>setPaging(v=>!v)}/><View style={styles.pageChip}><Text style={styles.pageStrong}>{page}</Text><Text style={styles.pageMuted}> / {count||'—'}</Text></View><ReaderToggle icon="moon" active={inverted} label="Gece" onPress={()=>setInverted(v=>!v)}/></View>
   <AdBanner />
   <Modal visible={passwordOpen} transparent animationType="fade" onRequestClose={()=>setPasswordOpen(false)}><View style={styles.modalBg}><View style={styles.modalCard}><Text style={styles.modalTitle}>Şifreli PDF</Text><Text style={styles.modalText}>Bu belgeyi açmak için PDF şifresini girin.</Text><TextInput secureTextEntry value={password} onChangeText={setPassword} placeholder="PDF şifresi" placeholderTextColor="#64748B" style={styles.passwordInput}/><Pressable onPress={()=>setPasswordOpen(false)} style={styles.unlock}><Text style={styles.unlockText}>PDF’yi Aç</Text></Pressable></View></View></Modal>
 </View>;
}
function ReaderToggle({icon,active,label,onPress}:any){return <Pressable onPress={onPress} style={[styles.tool,active&&styles.toolActive]}><AppIcon name={icon} size={18} color={active?'#fff':'#8A97AE'}/><Text style={[styles.toolText,active&&{color:'#fff'}]}>{label}</Text></Pressable>}
const styles=StyleSheet.create({root:{flex:1,backgroundColor:'#060A14'},top:{minHeight:68,backgroundColor:'#0B1020',flexDirection:'row',alignItems:'center',paddingHorizontal:10,gap:6,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:palette.line},iconButton:{width:40,height:40,borderRadius:12,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255,255,255,.035)'},title:{color:palette.white,fontSize:13.5,fontWeight:'800'},subtitle:{color:'#69768D',fontSize:10.5,marginTop:3},viewer:{flex:1,backgroundColor:'#15191F'},toolbar:{height:61,backgroundColor:'#0B1020',borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:palette.line,flexDirection:'row',alignItems:'center',justifyContent:'space-around',paddingHorizontal:6},tool:{minWidth:57,height:45,borderRadius:12,alignItems:'center',justifyContent:'center',gap:3},toolActive:{backgroundColor:'rgba(91,103,241,.16)'},toolText:{color:'#77849A',fontSize:8.5,fontWeight:'700'},pageChip:{height:34,minWidth:67,borderRadius:12,backgroundColor:'#141D31',alignItems:'center',justifyContent:'center',flexDirection:'row',paddingHorizontal:10},pageStrong:{color:'#E2E8F0',fontSize:12,fontWeight:'900'},pageMuted:{color:'#65738A',fontSize:10},center:{flex:1,backgroundColor:'#0B1020',alignItems:'center',justifyContent:'center',padding:28},errorTitle:{color:'#E2E8F0',fontSize:17,fontWeight:'800',marginTop:14},errorText:{color:'#8491A8',fontSize:12,textAlign:'center',lineHeight:18,marginTop:7},backButton:{backgroundColor:'#5662E6',paddingHorizontal:18,paddingVertical:11,borderRadius:12,marginTop:16},backText:{color:'#fff',fontSize:12,fontWeight:'800'},modalBg:{flex:1,backgroundColor:'rgba(2,6,23,.8)',justifyContent:'center',padding:22},modalCard:{backgroundColor:'#11182B',borderRadius:22,borderWidth:1,borderColor:palette.line,padding:20},modalTitle:{color:palette.white,fontSize:19,fontWeight:'900'},modalText:{color:palette.muted,fontSize:12,marginTop:6},passwordInput:{height:49,borderRadius:13,backgroundColor:'#090F1E',borderWidth:1,borderColor:palette.line,color:'#fff',paddingHorizontal:13,marginTop:16},unlock:{height:48,borderRadius:13,backgroundColor:palette.royal,alignItems:'center',justifyContent:'center',marginTop:11},unlockText:{color:'#fff',fontWeight:'800',fontSize:13}});
