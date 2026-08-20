import { useCallback, useEffect, useRef } from 'react';
import { Alert, Linking } from 'react-native';
import { router, useGlobalSearchParams, useRootNavigationState } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { useTranslation } from '@/hooks/useTranslation';
import { normalizeIncomingPdfUri } from '@/lib/incomingPdfUri';

const DEDUPE_WINDOW_MS = 2_000;

export function IncomingPdfHandler() {
  const { ready, addFromExternalUri } = useApp();
  const { t } = useTranslation();
  const navigationState = useRootNavigationState();
  const params = useGlobalSearchParams<{ incomingPdf?: string | string[] }>();
  const checkedInitialUrl = useRef(false);
  const recentlyHandled = useRef(new Map<string, number>());

  const openExternalPdf = useCallback(async (value: string, notifyInvalid = false) => {
    const uri = normalizeIncomingPdfUri(value);
    if (!uri) {
      if (notifyInvalid && /^(?:content|file|pdfokuyucu):/i.test(value.trim())) {
        router.replace('/');
        Alert.alert(t('files.openErrorTitle'), t('files.openErrorMessage'));
      }
      return;
    }

    const now = Date.now();
    const lastHandledAt = recentlyHandled.current.get(uri) || 0;
    if (now - lastHandledAt < DEDUPE_WINDOW_MS) return;

    recentlyHandled.current.set(uri, now);
    if (recentlyHandled.current.size > 20) {
      for (const [key, handledAt] of recentlyHandled.current) {
        if (now - handledAt >= DEDUPE_WINDOW_MS) recentlyHandled.current.delete(key);
      }
    }

    try {
      const doc = await addFromExternalUri(uri);
      router.push({ pathname: '/reader/[id]', params: { id: doc.id } });
    } catch (error) {
      recentlyHandled.current.delete(uri);
      router.replace('/');
      Alert.alert(t('files.openErrorTitle'), error instanceof Error ? error.message : t('files.openErrorMessage'));
    }
  }, [addFromExternalUri, t]);

  const incomingPdf = Array.isArray(params.incomingPdf) ? params.incomingPdf[0] : params.incomingPdf;

  useEffect(() => {
    if (!ready || !navigationState?.key || !incomingPdf) return;
    openExternalPdf(incomingPdf).catch(() => undefined);
  }, [incomingPdf, navigationState?.key, openExternalPdf, ready]);

  useEffect(() => {
    if (!ready || !navigationState?.key) return;

    if (!checkedInitialUrl.current) {
      checkedInitialUrl.current = true;
      Linking.getInitialURL()
        .then((url) => { if (url) return openExternalPdf(url, true); })
        .catch(() => undefined);
    }

    const subscription = Linking.addEventListener('url', ({ url }) => {
      openExternalPdf(url, true).catch(() => undefined);
    });
    return () => subscription.remove();
  }, [navigationState?.key, openExternalPdf, ready]);

  return null;
}
