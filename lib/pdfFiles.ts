import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { PdfDocument } from '@/types/document';
import { t } from '@/constants/i18n';

const libraryDirectory = new Directory(Paths.document, 'pdf-reader-library');

function ensureLibrary() {
  if (!libraryDirectory.exists) {
    libraryDirectory.create({ idempotent: true, intermediates: true });
  }
}

function safeName(name: string) {
  // Strip only characters that are illegal in file names, so Turkish, Spanish and
  // any other Unicode document title survives intact.
  const clean = name.replace(/[\\/:*?"<>|\u0000-\u001F]/g, '_').trim();
  return clean.toLowerCase().endsWith('.pdf') ? clean : `${clean}.pdf`;
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function pickPdfFromDevice(): Promise<PdfDocument | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    copyToCacheDirectory: true,
    multiple: false
  });
  if (result.canceled || !result.assets?.length) return null;

  ensureLibrary();
  const asset = result.assets[0];
  const source = new File(asset.uri);
  const id = makeId();
  const filename = `${id}-${safeName(asset.name || 'document.pdf')}`;
  const destination = new File(libraryDirectory, filename);
  await source.copy(destination);
  const now = Date.now();

  return {
    id,
    name: asset.name || t('files.defaultName'),
    uri: destination.uri,
    source: 'device',
    size: asset.size,
    lastPage: 1,
    lastOpenedAt: now,
    createdAt: now,
    isFavorite: false
  };
}

export async function downloadPdfFromUrl(url: string): Promise<PdfDocument> {
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(t('files.onlyHttp'));
  }
  ensureLibrary();
  const id = makeId();
  const fallbackName = t('files.webName');
  const rawName = decodeURIComponent(parsed.pathname.split('/').pop() || fallbackName);
  const fileName = `${id}-${safeName(rawName || fallbackName)}`;
  const destination = new File(libraryDirectory, fileName);
  const output = await File.downloadFileAsync(url, destination, { idempotent: true });
  const now = Date.now();

  return {
    id,
    name: safeName(rawName || fallbackName),
    uri: output.uri,
    source: 'url',
    size: output.size ?? undefined,
    lastPage: 1,
    lastOpenedAt: now,
    createdAt: now,
    isFavorite: false
  };
}

export function deletePdfFile(uri: string) {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // The metadata can still be safely removed even if the file is already gone.
  }
}
