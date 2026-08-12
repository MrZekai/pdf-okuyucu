import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { PdfDocument, ReaderSettings } from '@/types/document';
import { defaultSettings, loadDocuments, loadSettings, saveDocuments, saveSettings } from '@/lib/storage';
import { cleanupPdfImportCache, deletePdfFile, downloadPdfFromUrl, importPdfFromUri, pickPdfFromDevice } from '@/lib/pdfFiles';
import { setActiveLanguage } from '@/constants/i18n';

type AppContextValue = {
  ready: boolean;
  documents: PdfDocument[];
  settings: ReaderSettings;
  openPicker: () => Promise<PdfDocument | null>;
  addFromUrl: (url: string) => Promise<PdfDocument>;
  addFromExternalUri: (uri: string) => Promise<PdfDocument>;
  getDocument: (id: string) => PdfDocument | undefined;
  touchDocument: (id: string) => void;
  updateProgress: (id: string, page: number, pageCount?: number) => void;
  toggleFavorite: (id: string) => void;
  removeDocument: (id: string) => void;
  clearHistory: () => void;
  patchSettings: (patch: Partial<ReaderSettings>) => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [documents, setDocuments] = useState<PdfDocument[]>([]);
  const [settings, setSettings] = useState<ReaderSettings>(defaultSettings);

  useEffect(() => {
    Promise.all([loadDocuments(), loadSettings()]).then(([docs, savedSettings]) => {
      setDocuments(docs);
      setSettings(savedSettings);
      setActiveLanguage(savedSettings.language);
      cleanupPdfImportCache();
      setReady(true);
    });
  }, []);

  // Keep the module-level language in sync so non-React modules can translate too.
  useEffect(() => {
    setActiveLanguage(settings.language);
  }, [settings.language]);

  useEffect(() => {
    if (!ready) return;
    const timeout = setTimeout(() => { saveDocuments(documents).catch(() => undefined); }, 750);
    return () => clearTimeout(timeout);
  }, [documents, ready]);

  useEffect(() => {
    if (ready) saveSettings(settings).catch(() => undefined);
  }, [settings, ready]);


  const openPicker = useCallback(async () => {
    const doc = await pickPdfFromDevice();
    if (!doc) return null;
    const existing = documents.find((document) => document.sourceUri === doc.sourceUri);
    if (existing) {
      deletePdfFile(doc.uri);
      setDocuments((old) => old.map((document) => document.id === existing.id ? { ...document, lastOpenedAt: Date.now() } : document));
      return existing;
    }
    setDocuments((old) => [doc, ...old]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    return doc;
  }, [documents]);

  const addFromUrl = useCallback(async (url: string) => {
    const doc = await downloadPdfFromUrl(url);
    const existing = documents.find((document) => document.source === 'url' && document.sourceUri === doc.sourceUri);
    if (existing) {
      deletePdfFile(doc.uri);
      setDocuments((old) => old.map((document) => document.id === existing.id ? { ...document, lastOpenedAt: Date.now() } : document));
      return existing;
    }
    setDocuments((old) => [doc, ...old]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    return doc;
  }, [documents]);

  const addFromExternalUri = useCallback(async (uri: string) => {
    const existing = documents.find((document) => document.sourceUri === uri);
    if (existing) {
      setDocuments((old) => old.map((document) => document.id === existing.id ? { ...document, lastOpenedAt: Date.now() } : document));
      return existing;
    }
    const doc = await importPdfFromUri(uri);
    setDocuments((old) => [doc, ...old]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    return doc;
  }, [documents]);

  const getDocument = useCallback((id: string) => documents.find((doc) => doc.id === id), [documents]);

  const touchDocument = useCallback((id: string) => {
    setDocuments((old) => old.map((doc) => doc.id === id ? { ...doc, lastOpenedAt: Date.now() } : doc));
  }, []);

  const updateProgress = useCallback((id: string, page: number, pageCount?: number) => {
    setDocuments((old) => old.map((doc) => {
      if (doc.id !== id) return doc;
      const nextPage = Math.max(1, page);
      const nextPageCount = pageCount || doc.pageCount;
      if (doc.lastPage === nextPage && doc.pageCount === nextPageCount) return doc;
      return { ...doc, lastPage: nextPage, pageCount: nextPageCount };
    }));
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setDocuments((old) => old.map((doc) => doc.id === id ? { ...doc, isFavorite: !doc.isFavorite } : doc));
    Haptics.selectionAsync().catch(() => undefined);
  }, []);

  const removeDocument = useCallback((id: string) => {
    const target = documents.find((doc) => doc.id === id);
    setDocuments((old) => old.filter((doc) => doc.id !== id));
    if (target) deletePdfFile(target.uri);
  }, [documents]);

  const clearHistory = useCallback(() => {
    const targets = documents.map((doc) => doc.uri);
    setDocuments([]);
    targets.forEach(deletePdfFile);
  }, [documents]);

  const patchSettings = useCallback((patch: Partial<ReaderSettings>) => {
    setSettings((old) => ({ ...old, ...patch }));
  }, []);

  const value = useMemo(() => ({
    ready, documents, settings, openPicker, addFromUrl, addFromExternalUri, getDocument, touchDocument,
    updateProgress, toggleFavorite, removeDocument, clearHistory, patchSettings
  }), [ready, documents, settings, openPicker, addFromUrl, addFromExternalUri, getDocument, touchDocument,
      updateProgress, toggleFavorite, removeDocument, clearHistory, patchSettings]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside AppProvider');
  return value;
}
