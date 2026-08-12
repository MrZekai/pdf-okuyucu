import React, { createContext, useContext, useMemo } from 'react';
import { AdsStatus, useAdsBootstrap } from '@/hooks/useAdsBootstrap';

type AdsContextValue = { status: AdsStatus; refresh: () => Promise<boolean> };

const AdsContext = createContext<AdsContextValue>({ status: 'loading', refresh: async () => false });

export function AdsProvider({ children }: { children: React.ReactNode }) {
  const { status, refresh } = useAdsBootstrap();
  const value = useMemo(() => ({ status, refresh }), [status, refresh]);
  return <AdsContext.Provider value={value}>{children}</AdsContext.Provider>;
}

export function useAdsReady() {
  return useContext(AdsContext).status === 'ready';
}

export function useAdsStatus() {
  return useContext(AdsContext).status;
}

export function useAdsRefresh() {
  return useContext(AdsContext).refresh;
}
