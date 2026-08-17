import React from 'react';
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { BottomTabBar } from 'expo-router/build/react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '@/components/AppIcon';
import { AdBanner } from '@/components/AdBanner';
import { useTranslation } from '@/hooks/useTranslation';
import { palette } from '@/constants/theme';

export default function TabsLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: palette.ink }}>
      <Tabs tabBar={(props) => <View style={{backgroundColor:palette.ink}}><AdBanner separateFromNavigation/><BottomTabBar {...props}/></View>} screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.pdfRedSoft,
        tabBarInactiveTintColor: palette.tabInactive,
        tabBarStyle: { backgroundColor: palette.ink, borderTopColor: palette.line, height: 63 + insets.bottom, paddingTop: 7, paddingBottom: 7 + insets.bottom },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' }
      }}>
        <Tabs.Screen name="index" options={{ title: t('tabs.home'), tabBarIcon: ({ color }) => <AppIcon name="home" size={21} color={color}/> }} />
        <Tabs.Screen name="library" options={{ title: t('tabs.library'), tabBarIcon: ({ color }) => <AppIcon name="library" size={21} color={color}/> }} />
        <Tabs.Screen name="tools" options={{ title: t('tabs.tools'), tabBarIcon: ({ color }) => <AppIcon name="tools" size={21} color={color}/> }} />
        <Tabs.Screen name="settings" options={{ title: t('tabs.settings'), tabBarIcon: ({ color }) => <AppIcon name="settings" size={21} color={color}/> }} />
        <Tabs.Screen name="favorites" options={{ href: null }} />
      </Tabs>
    </View>
  );
}
