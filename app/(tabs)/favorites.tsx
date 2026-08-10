import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { DocumentCard } from '@/components/DocumentCard';
import { AppIcon } from '@/components/AppIcon';
import { palette } from '@/constants/theme';

export default function FavoritesScreen(){
 const {documents,toggleFavorite}=useApp(); const docs=documents.filter(d=>d.isFavorite).sort((a,b)=>b.lastOpenedAt-a.lastOpenedAt);
 const open=(id:string)=>router.push({pathname:'/reader/[id]',params:{id}});
 return <SafeAreaView style={styles.safe} edges={['top']}><View style={styles.header}><Text style={styles.kicker}>FAVORİLER</Text><Text style={styles.title}>Önemli belgeler</Text><Text style={styles.sub}>Sık döndüğün PDF’leri tek yerde tut.</Text></View><ScrollView contentContainerStyle={styles.content}>{docs.length?<View style={{gap:10}}>{docs.map(doc=><DocumentCard key={doc.id} doc={doc} onPress={()=>open(doc.id)} onFavorite={()=>toggleFavorite(doc.id)}/>)}</View>:<View style={styles.empty}><View style={styles.heart}><AppIcon name="heart" size={35} color="#FB7185"/></View><Text style={styles.emptyTitle}>Henüz favori yok</Text><Text style={styles.emptyText}>Bir belgenin kalp simgesine dokunduğunda burada görünecek.</Text></View>}</ScrollView></SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:palette.ink},header:{padding:18,paddingBottom:8},kicker:{color:'#FB7185',fontSize:9,fontWeight:'900',letterSpacing:1.8},title:{color:palette.white,fontSize:25,fontWeight:'900',marginTop:4},sub:{color:palette.muted,fontSize:12,marginTop:6},content:{padding:18,paddingTop:14},empty:{alignItems:'center',justifyContent:'center',paddingVertical:80,paddingHorizontal:30},heart:{width:74,height:74,borderRadius:24,backgroundColor:'rgba(251,113,133,.09)',alignItems:'center',justifyContent:'center'},emptyTitle:{color:'#E2E8F0',fontSize:16,fontWeight:'800',marginTop:16},emptyText:{color:'#64748B',fontSize:12,lineHeight:18,textAlign:'center',marginTop:6}});
