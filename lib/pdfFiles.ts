import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { PdfDocument } from '@/types/document';

const libraryDirectory = new Directory(Paths.document, 'pdf-reader-library');

function ensureLibrary() {
  if (!libraryDirectory.exists) {
    libraryDirectory.create({ idempotent: true, intermediates: true });
  }
}

function safeName(name: string) {
  const clean = name.replace(/[^a-zA-Z0-9._()\-çÇğĞıİöÖşŞüÜ ]/g, '_').trim();
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
    name: asset.name || 'Belge.pdf',
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
    throw new Error('Yalnızca http/https bağlantıları desteklenir.');
  }
  ensureLibrary();
  const id = makeId();
  const rawName = decodeURIComponent(parsed.pathname.split('/').pop() || 'internet-belgesi.pdf');
  const fileName = `${id}-${safeName(rawName || 'internet-belgesi.pdf')}`;
  const destination = new File(libraryDirectory, fileName);
  const output = await File.downloadFileAsync(url, destination, { idempotent: true });
  const now = Date.now();

  return {
    id,
    name: safeName(rawName || 'İnternet belgesi.pdf'),
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
