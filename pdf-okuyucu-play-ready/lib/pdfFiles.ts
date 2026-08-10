import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { PdfDocument } from '@/types/document';
import { t } from '@/constants/i18n';

const libraryDirectory = new Directory(Paths.document, 'pdf-reader-library');
const MAX_PDF_BYTES = 250 * 1024 * 1024;

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

function validatePdfFile(file: File) {
  const handle = file.open();
  try {
    const size = handle.size || 0;
    if (size > MAX_PDF_BYTES) throw new Error(t('files.tooLarge'));
    const bytes = handle.readBytes(Math.min(1024, size));
    let headerFound = false;
    for (let i = 0; i <= bytes.length - 5; i += 1) {
      if (bytes[i] === 0x25 && bytes[i + 1] === 0x50 && bytes[i + 2] === 0x44 && bytes[i + 3] === 0x46 && bytes[i + 4] === 0x2D) { headerFound = true; break; }
    }
    if (!headerFound) throw new Error(t('files.invalidPdf'));
  } finally {
    handle.close();
  }
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
  try {
    await source.copy(destination);
    validatePdfFile(destination);
  } catch (error) {
    if (destination.exists) destination.delete();
    throw error;
  }
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
  let output: File;
  try {
    output = await File.downloadFileAsync(url, destination, { idempotent: true });
    validatePdfFile(output);
  } catch (error) {
    if (destination.exists) destination.delete();
    throw error;
  }
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
