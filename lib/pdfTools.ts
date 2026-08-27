import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import { File, Paths } from 'expo-file-system';
import { PDFDocument, PDFImage, StandardFonts, degrees, rgb } from 'pdf-lib';
import { PdfDocument } from '@/types/document';
import { deletePdfFile, saveGeneratedPdf, stagePdfForPrint } from '@/lib/pdfFiles';
import { t } from '@/constants/i18n';

export type PdfToolId = 'scan' | 'images' | 'create' | 'merge' | 'split' | 'extract' | 'remove' | 'reorder' | 'rotate' | 'watermark' | 'compress' | 'clean' | 'print';
export type PdfToolResult = PdfDocument | PdfDocument[] | null;

const MAX_TOOL_INPUT_BYTES = 80 * 1024 * 1024;
// BUG-08: pdf-lib keeps every embedded image in memory until the document is
// serialised, and embedPng additionally decodes the whole bitmap, so a handful
// of very large sources can exceed the heap on mid-range devices. These budgets
// keep the peak bounded and turn an out-of-memory crash into a clear message.
const MAX_IMAGE_TOTAL_BYTES = 40 * 1024 * 1024;
const MAX_SINGLE_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_PNG_PIXELS = 20 * 1000 * 1000;
const A4_PORTRAIT = { width: 595.28, height: 841.89 };
const PAGE_MARGIN = 24;

type PickedPdf = { name: string; uri: string; size: number };
type PickedImage = { name: string; uri: string; size: number; mimeType?: string | null };

const decimalDigitSets = [0x0660, 0x06F0, 0x0966, 0xFF10]
  .map((start) => Array.from({ length: 10 }, (_, index) => String.fromCodePoint(start + index)).join(''));

function normalizePageDigits(value: string) {
  return [...value].map((character) => {
    for (const digits of decimalDigitSets) {
      const index = digits.indexOf(character);
      if (index >= 0) return String(index);
    }
    return character;
  }).join('');
}

function outputName(sourceName: string, suffix: string) {
  const base = sourceName.replace(/\.pdf$/i, '').trim() || 'document';
  return `${base}-${suffix}.pdf`;
}

function cleanupCacheFile(uri: string) {
  try {
    const file = new File(uri);
    if (file.uri.startsWith(Paths.cache.uri) && file.exists) file.delete();
  } catch {
    // A completed tool operation must not fail because picker cache cleanup failed.
  }
}

function enforceTotalSize(files: { size: number }[]) {
  if (files.reduce((sum, file) => sum + file.size, 0) > MAX_TOOL_INPUT_BYTES) throw new Error(t('tools.tooLarge'));
}

function enforceImageBudget(files: { size: number }[]) {
  if (files.some((file) => file.size > MAX_SINGLE_IMAGE_BYTES)) throw new Error(t('tools.imageTooLarge'));
  if (files.reduce((sum, file) => sum + file.size, 0) > MAX_IMAGE_TOTAL_BYTES) throw new Error(t('tools.imageTooLarge'));
}

/** Reads the IHDR block so an oversized PNG is rejected before it is decoded. */
function pngPixelCount(bytes: Uint8Array) {
  if (bytes.length < 24) return 0;
  const width = (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19];
  const height = (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23];
  if (width <= 0 || height <= 0) return 0;
  return width * height;
}

async function pickPdfs(multiple: boolean): Promise<PickedPdf[]> {
  const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true, multiple });
  if (result.canceled) return [];
  const files = result.assets.map((asset) => ({ name: asset.name || 'document.pdf', uri: asset.uri, size: asset.size || new File(asset.uri).size || 0 }));
  enforceTotalSize(files);
  return files;
}

async function pickImages(): Promise<PickedImage[]> {
  const result = await DocumentPicker.getDocumentAsync({ type: ['image/jpeg', 'image/png'], copyToCacheDirectory: true, multiple: true });
  if (result.canceled) return [];
  const files = result.assets.map((asset) => ({ name: asset.name || 'image', uri: asset.uri, size: asset.size || new File(asset.uri).size || 0, mimeType: asset.mimeType }));
  enforceTotalSize(files);
  return files;
}

async function loadPdf(file: PickedPdf) {
  const source = new File(file.uri);
  try {
    return await PDFDocument.load(await source.bytes(), { updateMetadata: false });
  } finally {
    cleanupCacheFile(source.uri);
  }
}

async function imageFilesToPdf(files: PickedImage[], requestedName: string): Promise<PdfDocument | null> {
  if (!files.length) return null;
  enforceTotalSize(files);
  enforceImageBudget(files);
  const output = await PDFDocument.create();
  try {
    for (const source of files) {
      const file = new File(source.uri);
      let embedded: PDFImage;
      const isPng = source.mimeType === 'image/png' || /\.png$/i.test(source.name);
      let imageBytes: Uint8Array;
      try {
        imageBytes = await file.bytes();
      } catch {
        throw new Error(t('tools.unsupportedImage'));
      }
      if (isPng && pngPixelCount(imageBytes) > MAX_PNG_PIXELS) throw new Error(t('tools.imageTooLarge'));
      try {
        embedded = isPng ? await output.embedPng(imageBytes) : await output.embedJpg(imageBytes);
      } catch {
        throw new Error(t('tools.unsupportedImage'));
      }
      const landscape = embedded.width > embedded.height;
      const pageWidth = landscape ? A4_PORTRAIT.height : A4_PORTRAIT.width;
      const pageHeight = landscape ? A4_PORTRAIT.width : A4_PORTRAIT.height;
      const scale = Math.min((pageWidth - PAGE_MARGIN * 2) / embedded.width, (pageHeight - PAGE_MARGIN * 2) / embedded.height);
      const width = embedded.width * scale;
      const height = embedded.height * scale;
      const page = output.addPage([pageWidth, pageHeight]);
      page.drawImage(embedded, { x: (pageWidth - width) / 2, y: (pageHeight - height) / 2, width, height });
      await new Promise<void>((resolve) => { setTimeout(resolve, 0); });
    }
    const bytes = await output.save({ useObjectStreams: true });
    return saveGeneratedPdf(bytes, requestedName);
  } finally {
    files.forEach((file) => cleanupCacheFile(file.uri));
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] || character));
}

function safeWatermark(value: string) {
  const mapped = value.replace(/ı/g, 'i').replace(/İ/g, 'I').replace(/ş/g, 's').replace(/Ş/g, 'S').replace(/ğ/g, 'g').replace(/Ğ/g, 'G');
  const ascii = mapped.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim();
  return (ascii || 'PDF').slice(0, 80);
}

export function parsePageRange(input: string, pageCount: number) {
  const indexes = new Set<number>();
  const tokens = normalizePageDigits(input).split(',').map((part) => part.trim()).filter(Boolean);
  if (!tokens.length) throw new Error(t('tools.invalidRange'));
  for (const token of tokens) {
    const match = token.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match) throw new Error(t('tools.invalidRange'));
    const start = Number.parseInt(match[1], 10);
    const end = Number.parseInt(match[2] || match[1], 10);
    if (start < 1 || end < start || end > pageCount) throw new Error(t('tools.invalidRange'));
    for (let page = start; page <= end; page += 1) indexes.add(page - 1);
  }
  return [...indexes].sort((a, b) => a - b);
}

export function parsePageOrder(input: string, pageCount: number) {
  const indexes: number[] = [];
  const seen = new Set<number>();
  const tokens = normalizePageDigits(input).split(',').map((part) => part.trim()).filter(Boolean);
  if (!tokens.length) throw new Error(t('tools.invalidOrder'));
  for (const token of tokens) {
    const match = token.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match) throw new Error(t('tools.invalidOrder'));
    const start = Number.parseInt(match[1], 10);
    const end = Number.parseInt(match[2] || match[1], 10);
    if (start < 1 || end < start || end > pageCount) throw new Error(t('tools.invalidOrder'));
    for (let page = start; page <= end; page += 1) {
      const index = page - 1;
      if (seen.has(index)) throw new Error(t('tools.invalidOrder'));
      seen.add(index);
      indexes.push(index);
    }
  }
  if (indexes.length !== pageCount) throw new Error(t('tools.invalidOrder'));
  return indexes;
}

export async function scanToPdf(): Promise<PdfDocument | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) throw new Error(t('tools.cameraPermission'));
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9, allowsEditing: false });
  if (result.canceled || !result.assets.length) return null;
  const asset = result.assets[0];
  return imageFilesToPdf([{ name: asset.fileName || 'scan.jpg', uri: asset.uri, size: asset.fileSize || new File(asset.uri).size || 0, mimeType: asset.mimeType }], `scan-${Date.now()}.pdf`);
}

export async function imagesToPdf(): Promise<PdfDocument | null> {
  const sources = await pickImages();
  if (!sources.length) return null;
  return imageFilesToPdf(sources, `images-${Date.now()}.pdf`);
}

export async function createPdf(title: string, body: string): Promise<PdfDocument> {
  const cleanTitle = title.trim() || t('tools.createDefaultTitle');
  if (!body.trim()) throw new Error(t('tools.createEmpty'));
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>@page{margin:24mm}body{font-family:Arial,sans-serif;color:#17191d;font-size:12pt;line-height:1.55}h1{font-size:22pt;margin:0 0 18pt;word-break:break-word}p{white-space:pre-wrap;word-break:break-word}</style></head><body><h1>${escapeHtml(cleanTitle)}</h1><p>${escapeHtml(body)}</p></body></html>`;
  const temporary = await Print.printToFileAsync({ html });
  const file = new File(temporary.uri);
  try {
    return saveGeneratedPdf(await file.bytes(), `${cleanTitle}.pdf`);
  } finally {
    cleanupCacheFile(file.uri);
  }
}

export async function mergePdfs(): Promise<PdfDocument | null> {
  const sources = await pickPdfs(true);
  if (!sources.length) return null;
  if (sources.length < 2) throw new Error(t('tools.minimumMerge'));
  const output = await PDFDocument.create();
  for (const source of sources) {
    const input = await loadPdf(source);
    const pages = await output.copyPages(input, input.getPageIndices());
    pages.forEach((page) => output.addPage(page));
  }
  return saveGeneratedPdf(await output.save({ useObjectStreams: true }), outputName(sources[0].name, 'merged'));
}

export async function splitPdf(afterPage: string): Promise<PdfDocument[] | null> {
  const [source] = await pickPdfs(false);
  if (!source) return null;
  const input = await loadPdf(source);
  const splitAt = Number.parseInt(normalizePageDigits(afterPage).trim(), 10);
  if (!Number.isInteger(splitAt) || splitAt < 1 || splitAt >= input.getPageCount()) throw new Error(t('tools.invalidSplit'));
  const first = await PDFDocument.create();
  const second = await PDFDocument.create();
  const firstPages = await first.copyPages(input, Array.from({ length: splitAt }, (_, index) => index));
  const secondPages = await second.copyPages(input, Array.from({ length: input.getPageCount() - splitAt }, (_, index) => splitAt + index));
  firstPages.forEach((page) => first.addPage(page));
  secondPages.forEach((page) => second.addPage(page));
  const firstDocument = saveGeneratedPdf(await first.save({ useObjectStreams: true }), outputName(source.name, 'part-1'));
  try {
    const secondDocument = saveGeneratedPdf(await second.save({ useObjectStreams: true }), outputName(source.name, 'part-2'));
    return [firstDocument, secondDocument];
  } catch (error) {
    deletePdfFile(firstDocument.uri);
    throw error;
  }
}

export async function extractPages(range: string): Promise<PdfDocument | null> {
  const [source] = await pickPdfs(false);
  if (!source) return null;
  const input = await loadPdf(source);
  const indexes = parsePageRange(range, input.getPageCount());
  const output = await PDFDocument.create();
  const pages = await output.copyPages(input, indexes);
  pages.forEach((page) => output.addPage(page));
  return saveGeneratedPdf(await output.save({ useObjectStreams: true }), outputName(source.name, 'pages'));
}

export async function removePages(range: string): Promise<PdfDocument | null> {
  const [source] = await pickPdfs(false);
  if (!source) return null;
  const input = await loadPdf(source);
  const removed = new Set(parsePageRange(range, input.getPageCount()));
  const kept = input.getPageIndices().filter((index) => !removed.has(index));
  if (!kept.length) throw new Error(t('tools.removeAll'));
  const output = await PDFDocument.create();
  const pages = await output.copyPages(input, kept);
  pages.forEach((page) => output.addPage(page));
  return saveGeneratedPdf(await output.save({ useObjectStreams: true }), outputName(source.name, 'trimmed'));
}

export async function reorderPages(order: string): Promise<PdfDocument | null> {
  const [source] = await pickPdfs(false);
  if (!source) return null;
  const input = await loadPdf(source);
  const indexes = parsePageOrder(order, input.getPageCount());
  const output = await PDFDocument.create();
  const pages = await output.copyPages(input, indexes);
  pages.forEach((page) => output.addPage(page));
  return saveGeneratedPdf(await output.save({ useObjectStreams: true }), outputName(source.name, 'reordered'));
}

export async function rotatePages(): Promise<PdfDocument | null> {
  const [source] = await pickPdfs(false);
  if (!source) return null;
  const input = await loadPdf(source);
  input.getPages().forEach((page) => page.setRotation(degrees((page.getRotation().angle + 90) % 360)));
  return saveGeneratedPdf(await input.save({ useObjectStreams: true }), outputName(source.name, 'rotated'));
}

export async function addWatermark(text: string): Promise<PdfDocument | null> {
  if (!text.trim()) throw new Error(t('tools.watermarkEmpty'));
  const [source] = await pickPdfs(false);
  if (!source) return null;
  const input = await loadPdf(source);
  const font = await input.embedFont(StandardFonts.HelveticaBold);
  const watermark = safeWatermark(text);
  input.getPages().forEach((page) => {
    const { width, height } = page.getSize();
    const size = Math.max(24, Math.min(64, width / Math.max(8, watermark.length * 0.55)));
    const textWidth = font.widthOfTextAtSize(watermark, size);
    page.drawText(watermark, { x: Math.max(18, (width - textWidth) / 2), y: height / 2, size, font, color: rgb(0.78, 0.08, 0.1), opacity: 0.2, rotate: degrees(35) });
  });
  return saveGeneratedPdf(await input.save({ useObjectStreams: true }), outputName(source.name, 'watermarked'));
}

export async function compressPdf(): Promise<PdfDocument | null> {
  const [source] = await pickPdfs(false);
  if (!source) return null;
  const input = await loadPdf(source);
  const optimized = await input.save({ useObjectStreams: true, addDefaultPage: false, objectsPerTick: 25 });
  if (source.size > 0 && optimized.length >= source.size) throw new Error(t('tools.compressionNoGain'));
  return saveGeneratedPdf(optimized, outputName(source.name, 'compressed'));
}

export async function cleanMetadata(): Promise<PdfDocument | null> {
  const [source] = await pickPdfs(false);
  if (!source) return null;
  const input = await loadPdf(source);
  input.setTitle('');
  input.setAuthor('');
  input.setSubject('');
  input.setKeywords([]);
  input.setCreator('');
  input.setProducer('');
  return saveGeneratedPdf(await input.save({ useObjectStreams: true }), outputName(source.name, 'clean'));
}

export async function printPdf(): Promise<null> {
  const [source] = await pickPdfs(false);
  if (!source) return null;
  try {
    // The spooler reads the file long after printAsync has resolved, so it must
    // point at a copy that nothing deletes underneath it.
    const printableUri = await stagePdfForPrint(source.uri);
    await Print.printAsync({ uri: printableUri });
  } finally {
    cleanupCacheFile(source.uri);
  }
  return null;
}
