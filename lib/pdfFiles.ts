import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { PdfDocument } from '@/types/document';
import { t } from '@/constants/i18n';

const libraryDirectory = new Directory(Paths.document, 'pdf-reader-library');
const documentPickerCache = new Directory(Paths.cache, 'DocumentPicker');
const MAX_PDF_BYTES = 250 * 1024 * 1024;
const MIN_FREE_DISK_BYTES = 32 * 1024 * 1024;
const MAX_FILE_NAME_CHARS = 100;
const MAX_FILE_NAME_BYTES = 180;

function ensureLibrary() {
  if (!libraryDirectory.exists) {
    libraryDirectory.create({ idempotent: true, intermediates: true });
  }
}

function truncateUtf8(value: string, maxBytes: number) {
  let bytes = 0;
  let result = '';
  for (const character of value) {
    const codePoint = character.codePointAt(0) || 0;
    const characterBytes = codePoint <= 0x7F ? 1 : codePoint <= 0x7FF ? 2 : codePoint <= 0xFFFF ? 3 : 4;
    if (bytes + characterBytes > maxBytes) break;
    result += character;
    bytes += characterBytes;
  }
  return result;
}

function safeName(name: string) {
  // Strip only characters that are illegal in file names, so Turkish, Spanish and
  // any other Unicode document title survives intact.
  const clean = name.replace(/[\\/:*?"<>|\u0000-\u001F]/g, '_').trim();
  const withoutExtension = clean.toLowerCase().endsWith('.pdf') ? clean.slice(0, -4) : clean;
  const limited = truncateUtf8(Array.from(withoutExtension || 'document').slice(0, MAX_FILE_NAME_CHARS).join(''), MAX_FILE_NAME_BYTES);
  return `${limited || 'document'}.pdf`;
}

function displayName(name: string) {
  const clean = name.replace(/[\u0000-\u001F]/g, ' ').trim();
  return clean || t('files.defaultName');
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

function createDocument(source: File, id: string, name: string, origin: PdfDocument['source'], sourceUri?: string): PdfDocument {
  const now = Date.now();
  return {
    id,
    name: displayName(name),
    uri: source.uri,
    sourceUri,
    fingerprint: source.md5 ? `md5:${source.md5}` : undefined,
    source: origin,
    size: source.size ?? undefined,
    lastPage: 1,
    lastOpenedAt: now,
    createdAt: now,
    isFavorite: false
  };
}

async function preflightRemotePdf(url: string) {
  let expectedBytes: number | undefined;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, { method: 'HEAD', signal: controller.signal });
    if (response.ok) {
      const rawLength = response.headers.get('content-length');
      const parsedLength = rawLength ? Number.parseInt(rawLength, 10) : 0;
      if (Number.isFinite(parsedLength) && parsedLength > 0) expectedBytes = parsedLength;
    }
  } catch {
    // Some valid PDF hosts reject HEAD. The streamed limits below remain active.
  } finally {
    clearTimeout(timeout);
  }
  if (expectedBytes && expectedBytes > MAX_PDF_BYTES) throw new Error(t('files.tooLarge'));
  if (Paths.availableDiskSpace < (expectedBytes || 0) + MIN_FREE_DISK_BYTES) throw new Error(t('files.notEnoughSpace'));
  return Paths.availableDiskSpace;
}

export function cleanupPdfImportCache() {
  try {
    if (documentPickerCache.exists) documentPickerCache.delete();
  } catch {
    // Cache cleanup must never block opening the app.
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
  } finally {
    try {
      if (source.uri.startsWith(Paths.cache.uri) && source.exists) source.delete();
    } catch {
      // The permanent library copy is already independent from the picker cache.
    }
  }
  return createDocument(destination, id, asset.name || t('files.defaultName'), 'device', asset.uri);
}

export async function importPdfFromUri(uri: string): Promise<PdfDocument> {
  if (!/^(content|file):/i.test(uri)) throw new Error(t('files.invalidPdf'));
  ensureLibrary();
  const source = new File(uri);
  if (!source.exists) throw new Error(t('files.invalidPdf'));
  if ((source.size || 0) > MAX_PDF_BYTES) throw new Error(t('files.tooLarge'));
  if (Paths.availableDiskSpace < (source.size || 0) + MIN_FREE_DISK_BYTES) throw new Error(t('files.notEnoughSpace'));
  const id = makeId();
  const originalName = source.name || t('files.defaultName');
  const destination = new File(libraryDirectory, `${id}-${safeName(originalName)}`);
  try {
    await source.copy(destination);
    validatePdfFile(destination);
  } catch (error) {
    if (destination.exists) destination.delete();
    throw error;
  }
  return createDocument(destination, id, originalName, 'device', uri);
}

export async function downloadPdfFromUrl(url: string): Promise<PdfDocument> {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    throw new Error(t('files.invalidUrl'));
  }
  if (parsed.protocol !== 'https:') throw new Error(t('files.onlyHttps'));
  const normalizedUrl = parsed.toString();
  const availableDiskAtStart = await preflightRemotePdf(normalizedUrl);
  ensureLibrary();
  const id = makeId();
  const fallbackName = t('files.webName');
  const rawName = decodeURIComponent(parsed.pathname.split('/').pop() || fallbackName);
  const fileName = `${id}-${safeName(rawName || fallbackName)}`;
  const destination = new File(libraryDirectory, fileName);
  let output: File;
  const controller = new AbortController();
  let limitError: Error | null = null;
  try {
    output = await File.downloadFileAsync(normalizedUrl, destination, {
      idempotent: true,
      signal: controller.signal,
      onProgress: ({ bytesWritten, totalBytes }) => {
        if (bytesWritten > MAX_PDF_BYTES || totalBytes > MAX_PDF_BYTES) {
          limitError = new Error(t('files.tooLarge'));
          controller.abort();
        } else if (bytesWritten + MIN_FREE_DISK_BYTES > availableDiskAtStart) {
          limitError = new Error(t('files.notEnoughSpace'));
          controller.abort();
        }
      }
    });
    validatePdfFile(output);
  } catch (error) {
    if (destination.exists) destination.delete();
    if (limitError) throw limitError;
    throw error;
  }
  return createDocument(output, id, rawName || fallbackName, 'url', normalizedUrl);
}

export function deletePdfFile(uri: string) {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // The metadata can still be safely removed even if the file is already gone.
  }
}
