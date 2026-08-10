import AsyncStorage from '@react-native-async-storage/async-storage';
import { ReaderSettings, PdfDocument } from '@/types/document';

const DOCS_KEY = '@pdf-reader/documents-v1';
const SETTINGS_KEY = '@pdf-reader/settings-v1';

export const defaultSettings: ReaderSettings = {
  horizontal: false,
  pagingEnabled: false,
  invertPdfPages: false
};

export async function loadDocuments(): Promise<PdfDocument[]> {
  try {
    const raw = await AsyncStorage.getItem(DOCS_KEY);
    return raw ? JSON.parse(raw) : [];
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
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

export async function saveSettings(settings: ReaderSettings) {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
