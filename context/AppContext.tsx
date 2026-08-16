import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Haptics from 'expo-haptics';
import { PdfDocument, ReaderSettings } from '@/types/document';
import { defaultSettings, loadDocuments, loadSettings, saveDocuments, saveSettings } from '@/lib/storage';
import { cleanupPdfImportCache, deletePdfFile, downloadPdfFromUrl, importPdfFromUri, pickPdfFromDevice } from '@/lib/pdfFiles';
import { clearToolUsage } from '@/lib/toolUsage';
import { setActiveLanguage } from '@/constants/i18n';

type AppContextValue = {
  ready: boolean;
  documents: PdfDocument[];
  settings: ReaderSettings;
  openPicker: () => Promise<PdfDocument | null>;
  addFromUrl: (url: string) => Promise<PdfDocument>;
  addFromExternalUri: (uri: string) => Promise<PdfDocument>;
  addGeneratedDocument: (document: PdfDocument) => void;
  getDocument: (id: string) => PdfDocument | undefined;
  touchDocument: (id: string) => void;
  updateProgress: (id: string, page: number, pageCount?: number) => void;
  toggleFavorite: (id: string) => void;
  removeDocument: (id: string) => void;
  clearHistory: () => void;
  patchSettings: (patch: Partial<ReaderSettings>) => void;
};

const AppContext = createContext<AppContextValue | null>(null);

function isSameImportedPdf(existing: PdfDocument, candidate: PdfDocument) {
  if (existing.fingerprint && candidate.fingerprint) return existing.fingerprint === candidate.fingerprint;
  return Boolean(existing.sourceUri && candidate.sourceUri && existing.sourceUri === candidate.sourceUri);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [documents, setDocuments] = useState<PdfDocument[]>([]);
  const [settings, setSettings] = useState<ReaderSettings>(defaultSettings);
  const documentsRef = useRef<PdfDocument[]>([]);
  const readyRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateDocumentsState = useCallback((updater: (current: PdfDocument[]) => PdfDocument[]) => {
    setDocuments((current) => {
      const next = updater(current);
      documentsRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    Promise.all([loadDocuments(), loadSettings()]).then(([docs, savedSettings]) => {
      documentsRef.current = docs;
      setDocuments(docs);
      setSettings(savedSettings);
      setActiveLanguage(savedSettings.language);
      cleanupPdfImportCache();
      readyRef.current = true;
      setReady(true);
    });
  }, []);

  // Keep the module-level language in sync so non-React modules can translate too.
  useEffect(() => {
    setActiveLanguage(settings.language);
  }, [settings.language]);

  useEffect(() => {
    if (!ready) return;
    documentsRef.current = documents;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      saveDocuments(documentsRef.current).catch(() => undefined);
    }, 750);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    };
  }, [documents, ready]);

  useEffect(() => {
    const persistDocumentsNow = () => {
      if (!readyRef.current) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
      saveDocuments(documentsRef.current).catch(() => undefined);
    };
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'inactive' || state === 'background') persistDocumentsNow();
    });
    return () => {
      subscription.remove();
      persistDocumentsNow();
    };
  }, []);

  useEffect(() => {
    if (ready) saveSettings(settings).catch(() => undefined);
  }, [settings, ready]);


  const openPicker = useCallback(async () => {
    const doc = await pickPdfFromDevice();
    if (!doc) return null;
    const existing = documentsRef.current.find((document) => isSameImportedPdf(document, doc));
    if (existing) {
      deletePdfFile(doc.uri);
      updateDocumentsState((old) => old.map((document) => document.id === existing.id ? { ...document, lastOpenedAt: Date.now() } : document));
      return existing;
    }
    updateDocumentsState((old) => [doc, ...old]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    return doc;
  }, [updateDocumentsState]);

  const addFromUrl = useCallback(async (url: string) => {
    const doc = await downloadPdfFromUrl(url);
    const existing = documentsRef.current.find((document) => document.source === 'url' && isSameImportedPdf(document, doc));
    if (existing) {
      deletePdfFile(doc.uri);
      updateDocumentsState((old) => old.map((document) => document.id === existing.id ? { ...document, lastOpenedAt: Date.now() } : document));
      return existing;
    }
    updateDocumentsState((old) => [doc, ...old]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    return doc;
  }, [updateDocumentsState]);

  const addFromExternalUri = useCallback(async (uri: string) => {
    const existing = documentsRef.current.find((document) => document.sourceUri === uri);
    if (existing) {
      updateDocumentsState((old) => old.map((document) => document.id === existing.id ? { ...document, lastOpenedAt: Date.now() } : document));
      return existing;
    }
    const doc = await importPdfFromUri(uri);
    const sameContent = documentsRef.current.find((document) => isSameImportedPdf(document, doc));
    if (sameContent) {
      deletePdfFile(doc.uri);
      updateDocumentsState((old) => old.map((document) => document.id === sameContent.id ? { ...document, lastOpenedAt: Date.now() } : document));
      return sameContent;
    }
    updateDocumentsState((old) => [doc, ...old]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    return doc;
  }, [updateDocumentsState]);

  const addGeneratedDocument = useCallback((document: PdfDocument) => {
    updateDocumentsState((current) => [document, ...current]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  }, [updateDocumentsState]);

  const getDocument = useCallback((id: string) => documents.find((doc) => doc.id === id), [documents]);

  const touchDocument = useCallback((id: string) => {
    updateDocumentsState((old) => old.map((doc) => doc.id === id ? { ...doc, lastOpenedAt: Date.now() } : doc));
  }, [updateDocumentsState]);

  const updateProgress = useCallback((id: string, page: number, pageCount?: number) => {
    updateDocumentsState((old) => old.map((doc) => {
      if (doc.id !== id) return doc;
      const nextPage = Math.max(1, page);
      const nextPageCount = pageCount || doc.pageCount;
      if (doc.lastPage === nextPage && doc.pageCount === nextPageCount) return doc;
      return { ...doc, lastPage: nextPage, pageCount: nextPageCount };
    }));
  }, [updateDocumentsState]);

  const toggleFavorite = useCallback((id: string) => {
    updateDocumentsState((old) => old.map((doc) => doc.id === id ? { ...doc, isFavorite: !doc.isFavorite } : doc));
    Haptics.selectionAsync().catch(() => undefined);
  }, [updateDocumentsState]);

  const removeDocument = useCallback((id: string) => {
    const target = documentsRef.current.find((doc) => doc.id === id);
    updateDocumentsState((old) => old.filter((doc) => doc.id !== id));
    if (target) deletePdfFile(target.uri);
  }, [updateDocumentsState]);

  const clearHistory = useCallback(() => {
    const targets = documentsRef.current.map((doc) => doc.uri);
    updateDocumentsState(() => []);
    targets.forEach(deletePdfFile);
    clearToolUsage().catch(() => undefined);
  }, [updateDocumentsState]);

  const patchSettings = useCallback((patch: Partial<ReaderSettings>) => {
    setSettings((old) => ({ ...old, ...patch }));
  }, []);

  const value = useMemo(() => ({
    ready, documents, settings, openPicker, addFromUrl, addFromExternalUri, addGeneratedDocument, getDocument, touchDocument,
    updateProgress, toggleFavorite, removeDocument, clearHistory, patchSettings
  }), [ready, documents, settings, openPicker, addFromUrl, addFromExternalUri, addGeneratedDocument, getDocument, touchDocument,
      updateProgress, toggleFavorite, removeDocument, clearHistory, patchSettings]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside AppProvider');
  return value;
}
