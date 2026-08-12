import AsyncStorage from '@react-native-async-storage/async-storage';
import { ReaderSettings, PdfDocument } from '@/types/document';
import { detectDeviceLanguage, isAppLanguage } from '@/constants/i18n';

const DOCS_KEY = '@pdf-reader/documents-v1';
const SETTINGS_KEY = '@pdf-reader/settings-v1';

export const defaultSettings: ReaderSettings = {
  horizontal: false,
  pagingEnabled: false,
  invertPdfPages: false,
  language: detectDeviceLanguage()
};

function isPdfDocument(value: unknown): value is PdfDocument {
  if (typeof value !== 'object' || value === null) return false;
  const document = value as Record<string, unknown>;
  return typeof document.id === 'string'
    && typeof document.name === 'string'
    && typeof document.uri === 'string'
    && (document.sourceUri === undefined || typeof document.sourceUri === 'string')
    && (document.fingerprint === undefined || typeof document.fingerprint === 'string')
    && (document.source === 'device' || document.source === 'url')
    && typeof document.lastPage === 'number'
    && Number.isFinite(document.lastPage)
    && typeof document.lastOpenedAt === 'number'
    && Number.isFinite(document.lastOpenedAt)
    && typeof document.createdAt === 'number'
    && Number.isFinite(document.createdAt)
    && typeof document.isFavorite === 'boolean';
}

export async function loadDocuments(): Promise<PdfDocument[]> {
  try {
    const raw = await AsyncStorage.getItem(DOCS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isPdfDocument) : [];
  } catch {
    return [];
  }
}

export async function saveDocuments(documents: PdfDocument[]) {
  await AsyncStorage.setItem(DOCS_KEY, JSON.stringify(documents));
}

export async function loadSettings(): Promise<ReaderSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings;
    const merged: ReaderSettings = { ...defaultSettings, ...JSON.parse(raw) };
    // Older installs have no language stored, and a corrupted value must not break the UI.
    if (!isAppLanguage(merged.language)) merged.language = defaultSettings.language;
    return merged;
  } catch {
    return defaultSettings;
  }
}

export async function saveSettings(settings: ReaderSettings) {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
