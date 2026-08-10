import 'react-native-gesture-handler';
import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from '@/context/AppContext';
import { AdsProvider } from '@/context/AdsContext';
import { AppOpenAdController } from '@/components/AppOpenAdController';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <AdsProvider>
          <AppOpenAdController>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0B1020' } }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="reader/[id]" options={{ animation: 'fade' }} />
            </Stack>
          </AppOpenAdController>
        </AdsProvider>
      </AppProvider>
    </SafeAreaProvider>
  );
}
