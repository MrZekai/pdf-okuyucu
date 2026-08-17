import 'react-native-gesture-handler';
import React from 'react';
import { I18nManager } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from '@/context/AppContext';
import { AdsProvider } from '@/context/AdsContext';
import { AppOpenAdController } from '@/components/AppOpenAdController';
import { IncomingPdfHandler } from '@/components/IncomingPdfHandler';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { DirectionProvider } from '@/context/DirectionContext';
import { palette } from '@/constants/theme';

I18nManager.allowRTL(true);

export default function RootLayout() {
  return (
    <ErrorBoundary>
    <SafeAreaProvider>
      <AppProvider>
        <DirectionProvider>
        <AdsProvider>
          <AppOpenAdController>
            <IncomingPdfHandler />
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.ink } }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="reader/[id]" options={{ animation: 'fade' }} />
            </Stack>
          </AppOpenAdController>
        </AdsProvider>
        </DirectionProvider>
      </AppProvider>
    </SafeAreaProvider>
    </ErrorBoundary>
  );
}
