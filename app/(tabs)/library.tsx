import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { DocumentCard } from '@/components/DocumentCard';
import { AppIcon } from '@/components/AppIcon';
import { useTranslation } from '@/hooks/useTranslation';
import { palette } from '@/constants/theme';

export default function LibraryScreen() {
  const { documents, toggleFavorite, removeDocument, openPicker } = useApp();
  const { t, locale } = useTranslation();
  const [query, setQuery] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const docs = useMemo(() => [...documents].sort((a,b)=>b.lastOpenedAt-a.lastOpenedAt).filter(d=>(!favoritesOnly||d.isFavorite)&&d.name.toLocaleLowerCase(locale).includes(query.toLocaleLowerCase(locale))), [documents, favoritesOnly, query, locale]);
  const open = (id:string) => router.push({pathname:'/reader/[id]',params:{id}});
  async function add(){ try{const doc=await openPicker();if(doc)open(doc.id);}catch(error){Alert.alert(t('files.openErrorTitle'),error instanceof Error?error.message:t('files.openErrorMessage'));} }
  function askDelete(id:string,name:string){ Alert.alert(t('library.deleteTitle'), t('library.deleteMessage',{name}), [{text:t('common.cancel'),style:'cancel'},{text:t('common.delete'),style:'destructive',onPress:()=>removeDocument(id)}]); }
  return <SafeAreaView style={styles.safe} edges={['top']}><View style={styles.header}><View><Text style={styles.kicker}>{t('library.kicker')}</Text><Text style={styles.title}>{t('library.title')}</Text></View><Pressable onPress={add} accessibilityRole="button" accessibilityLabel={t('a11y.addPdf')} style={styles.add}><AppIcon name="plus"/></Pressable></View>
    <View style={styles.search}><AppIcon name="search" size={18} color="#64748B"/><TextInput value={query} onChangeText={setQuery} placeholder={t('library.searchPlaceholder')} placeholderTextColor="#5D6B84" style={styles.input}/>{query?<Pressable onPress={()=>setQuery('')} accessibilityRole="button" accessibilityLabel={t('a11y.clearSearch')}><AppIcon name="close" size={17} color="#64748B"/></Pressable>:null}</View>
    <View style={styles.filters}><Pressable onPress={()=>setFavoritesOnly(false)} style={[styles.filter,!favoritesOnly&&styles.filterActive]}><Text style={[styles.filterText,!favoritesOnly&&styles.filterTextActive]}>{t('library.filterAll')}</Text></Pressable><Pressable onPress={()=>setFavoritesOnly(true)} style={[styles.filter,favoritesOnly&&styles.filterActive]}><AppIcon name="heart" size={15} color={favoritesOnly?'#fff':'#738098'}/><Text style={[styles.filterText,favoritesOnly&&styles.filterTextActive]}>{t('library.filterFavorites')}</Text></Pressable></View>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>{docs.length?<View style={{gap:10}}>{docs.map(doc=><DocumentCard key={doc.id} doc={doc} t={t} locale={locale} onPress={()=>open(doc.id)} onFavorite={()=>toggleFavorite(doc.id)} onDelete={()=>askDelete(doc.id,doc.name)}/>)}</View>:<View style={styles.empty}><AppIcon name="library" size={38} color="#475569"/><Text style={styles.emptyTitle}>{query?t('library.noMatchTitle'):t('library.emptyTitle')}</Text><Text style={styles.emptyText}>{query?t('library.noMatchText'):t('library.emptyText')}</Text></View>}</ScrollView>
  </SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:palette.ink},header:{padding:18,paddingBottom:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},kicker:{color:'#6E7BEE',fontSize:9,fontWeight:'900',letterSpacing:1.8},title:{color:palette.white,fontSize:25,fontWeight:'900',marginTop:4},add:{width:43,height:43,borderRadius:14,backgroundColor:palette.royal,alignItems:'center',justifyContent:'center'},search:{height:48,marginHorizontal:18,borderRadius:15,backgroundColor:'#11192B',borderWidth:1,borderColor:palette.line,flexDirection:'row',alignItems:'center',paddingHorizontal:13,gap:9},input:{flex:1,color:palette.white,fontSize:13.5},filters:{flexDirection:'row',gap:8,paddingHorizontal:18,paddingTop:10},filter:{minHeight:36,borderRadius:12,paddingHorizontal:14,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,backgroundColor:'#11192B',borderWidth:1,borderColor:palette.line},filterActive:{backgroundColor:'#5662E6',borderColor:'#6C78EE'},filterText:{color:'#738098',fontSize:11,fontWeight:'800'},filterTextActive:{color:'#fff'},content:{padding:18,paddingTop:14,paddingBottom:30},empty:{alignItems:'center',justifyContent:'center',paddingVertical:80},emptyTitle:{color:'#CBD5E1',fontSize:16,fontWeight:'800',marginTop:16},emptyText:{color:'#64748B',fontSize:12,marginTop:6,textAlign:'center'}});
