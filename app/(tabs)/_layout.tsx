import React from 'react';
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { AppIcon } from '@/components/AppIcon';
import { AdBanner } from '@/components/AdBanner';
import { useTranslation } from '@/hooks/useTranslation';
import { palette } from '@/constants/theme';

export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <View style={{ flex: 1, backgroundColor: palette.ink }}>
      <Tabs screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.white,
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: { backgroundColor: '#0B1020', borderTopColor: palette.line, height: 63, paddingTop: 7, paddingBottom: 7 },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' }
      }}>
        <Tabs.Screen name="index" options={{ title: t('tabs.home'), tabBarIcon: ({ color }) => <AppIcon name="home" size={21} color={color}/> }} />
        <Tabs.Screen name="library" options={{ title: t('tabs.library'), tabBarIcon: ({ color }) => <AppIcon name="library" size={21} color={color}/> }} />
        <Tabs.Screen name="favorites" options={{ title: t('tabs.favorites'), tabBarIcon: ({ color }) => <AppIcon name="heart" size={21} color={color}/> }} />
        <Tabs.Screen name="settings" options={{ title: t('tabs.settings'), tabBarIcon: ({ color }) => <AppIcon name="settings" size={21} color={color}/> }} />
      </Tabs>
      <AdBanner />
    </View>
  );
}
