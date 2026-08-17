import React from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
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
    <View style={styles.root}>
      <Tabs
        tabBar={(props) => <View style={styles.adAndTabs}><AdBanner separateFromNavigation/><BottomTabBar {...props}/></View>}
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#FF423E',
          tabBarInactiveTintColor: '#9A9EA5',
          tabBarActiveBackgroundColor: '#2B0B0D',
          tabBarInactiveBackgroundColor: '#121416',
          tabBarStyle: {
            backgroundColor: '#121416',
            borderTopColor: '#484C52',
            borderTopWidth: 1,
            height: 66 + insets.bottom,
            paddingTop: 6,
            paddingBottom: 7 + insets.bottom
          },
          tabBarItemStyle: {
            borderEndWidth: StyleSheet.hairlineWidth,
            borderEndColor: '#34383E'
          },
          tabBarLabelStyle: { fontSize: 10, fontWeight: '800' }
        }}
      >
        <Tabs.Screen name="index" options={{ title: t('tabs.home'), tabBarIcon: ({ color }) => <AppIcon name="home" size={22} color={color}/> }} />
        <Tabs.Screen name="library" options={{ title: t('tabs.library'), tabBarIcon: ({ color }) => <AppIcon name="library" size={22} color={color}/> }} />
        <Tabs.Screen name="tools" options={{ title: t('tabs.tools'), tabBarIcon: ({ color }) => <AppIcon name="tools" size={22} color={color}/> }} />
        <Tabs.Screen name="settings" options={{ title: t('tabs.settings'), tabBarIcon: ({ color }) => <AppIcon name="settings" size={22} color={color}/> }} />
        <Tabs.Screen name="favorites" options={{ href: null }} />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.ink },
  adAndTabs: { backgroundColor: palette.ink }
});
