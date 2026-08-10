import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { DocumentCard } from '@/components/DocumentCard';
import { AppIcon } from '@/components/AppIcon';
import { palette } from '@/constants/theme';

export default function LibraryScreen() {
  const { documents, toggleFavorite, removeDocument, openPicker } = useApp();
  const [query, setQuery] = useState('');
  const docs = useMemo(() => [...documents].sort((a,b)=>b.lastOpenedAt-a.lastOpenedAt).filter(d=>d.name.toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr'))), [documents, query]);
  const open = (id:string) => router.push({pathname:'/reader/[id]',params:{id}});
  async function add(){ const doc=await openPicker(); if(doc) open(doc.id); }
  function askDelete(id:string,name:string){ Alert.alert('Belgeyi sil', `“${name}” cihazdaki uygulama kütüphanesinden silinsin mi?`, [{text:'Vazgeç',style:'cancel'},{text:'Sil',style:'destructive',onPress:()=>removeDocument(id)}]); }
  return <SafeAreaView style={styles.safe} edges={['top']}><View style={styles.header}><View><Text style={styles.kicker}>KÜTÜPHANE</Text><Text style={styles.title}>Tüm PDF’lerin</Text></View><Pressable onPress={add} style={styles.add}><AppIcon name="plus"/></Pressable></View>
    <View style={styles.search}><AppIcon name="search" size={18} color="#64748B"/><TextInput value={query} onChangeText={setQuery} placeholder="Dosya adına göre ara" placeholderTextColor="#5D6B84" style={styles.input}/>{query?<Pressable onPress={()=>setQuery('')}><AppIcon name="close" size={17} color="#64748B"/></Pressable>:null}</View>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>{docs.length?<View style={{gap:10}}>{docs.map(doc=><DocumentCard key={doc.id} doc={doc} onPress={()=>open(doc.id)} onFavorite={()=>toggleFavorite(doc.id)} onDelete={()=>askDelete(doc.id,doc.name)}/>)}</View>:<View style={styles.empty}><AppIcon name="library" size={38} color="#475569"/><Text style={styles.emptyTitle}>{query?'Eşleşen belge bulunamadı':'Kütüphane boş'}</Text><Text style={styles.emptyText}>{query?'Başka bir dosya adı deneyin.':'PDF Aç düğmesiyle ilk belgenizi ekleyin.'}</Text></View>}</ScrollView>
  </SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:palette.ink},header:{padding:18,paddingBottom:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},kicker:{color:'#6E7BEE',fontSize:9,fontWeight:'900',letterSpacing:1.8},title:{color:palette.white,fontSize:25,fontWeight:'900',marginTop:4},add:{width:43,height:43,borderRadius:14,backgroundColor:palette.royal,alignItems:'center',justifyContent:'center'},search:{height:48,marginHorizontal:18,borderRadius:15,backgroundColor:'#11192B',borderWidth:1,borderColor:palette.line,flexDirection:'row',alignItems:'center',paddingHorizontal:13,gap:9},input:{flex:1,color:palette.white,fontSize:13.5},content:{padding:18,paddingTop:14,paddingBottom:30},empty:{alignItems:'center',justifyContent:'center',paddingVertical:80},emptyTitle:{color:'#CBD5E1',fontSize:16,fontWeight:'800',marginTop:16},emptyText:{color:'#64748B',fontSize:12,marginTop:6,textAlign:'center'}});
