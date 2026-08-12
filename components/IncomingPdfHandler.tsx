import { useCallback, useEffect, useRef } from 'react';
import { Alert, Linking } from 'react-native';
import { router, useRootNavigationState } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { useTranslation } from '@/hooks/useTranslation';

function isExternalPdfUri(url: string) {
  return /^(content|file):/i.test(url);
}

export function IncomingPdfHandler() {
  const { ready, addFromExternalUri } = useApp();
  const { t } = useTranslation();
  const navigationState = useRootNavigationState();
  const handled = useRef(new Set<string>());
  const checkedInitialUrl = useRef(false);

  const openExternalPdf = useCallback(async (url: string) => {
    if (!isExternalPdfUri(url) || handled.current.has(url)) return;
    if (handled.current.size >= 20) handled.current.delete(handled.current.values().next().value as string);
    handled.current.add(url);
    try {
      const doc = await addFromExternalUri(url);
      router.push({ pathname: '/reader/[id]', params: { id: doc.id } });
    } catch (error) {
      handled.current.delete(url);
      Alert.alert(t('files.openErrorTitle'), error instanceof Error ? error.message : t('files.openErrorMessage'));
    }
  }, [addFromExternalUri, t]);

  useEffect(() => {
    if (!ready || !navigationState?.key) return;
    if (!checkedInitialUrl.current) {
      checkedInitialUrl.current = true;
      Linking.getInitialURL().then((url) => { if (url) openExternalPdf(url); }).catch(() => undefined);
    }
    const subscription = Linking.addEventListener('url', ({ url }) => { openExternalPdf(url); });
    return () => subscription.remove();
  }, [navigationState?.key, openExternalPdf, ready]);

  return null;
}
