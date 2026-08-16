import React, { createContext, useContext } from 'react';
import { View } from 'react-native';
import { useApp } from '@/context/AppContext';
import { isRtlLanguage } from '@/constants/i18n';

const DirectionContext = createContext(false);

export function DirectionProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useApp();
  const rtl = isRtlLanguage(settings.language);
  return <DirectionContext.Provider value={rtl}><View style={{ flex: 1, direction: rtl ? 'rtl' : 'ltr' }}>{children}</View></DirectionContext.Provider>;
}

export function useRtl() {
  return useContext(DirectionContext);
}
