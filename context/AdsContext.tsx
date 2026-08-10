import React, { createContext, useContext } from 'react';
import { useAdsBootstrap } from '@/hooks/useAdsBootstrap';

const AdsContext = createContext(false);

export function AdsProvider({ children }: { children: React.ReactNode }) {
  const ready = useAdsBootstrap();
  return <AdsContext.Provider value={ready}>{children}</AdsContext.Provider>;
}

export function useAdsReady() {
  return useContext(AdsContext);
}
