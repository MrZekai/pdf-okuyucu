import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { PDFDocument, degrees } from 'pdf-lib';
import { PdfDocument } from '@/types/document';
import { saveGeneratedPdf } from '@/lib/pdfFiles';
import { t } from '@/constants/i18n';

export type PdfToolId = 'merge' | 'extract' | 'remove' | 'reorder' | 'rotate' | 'clean';

const MAX_TOOL_INPUT_BYTES = 80 * 1024 * 1024;

type PickedPdf = { name: string; uri: string; size: number };

const decimalDigitSets = ['٠١٢٣٤٥٦٧٨٩', '۰۱۲۳۴۵۶۷۸۹', '०१२३४५६७८९', '０１２３４５６７۸９'];

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

async function pickPdfs(multiple: boolean): Promise<PickedPdf[]> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    copyToCacheDirectory: true,
    multiple
  });
  if (result.canceled) return [];
  const files = result.assets.map((asset) => ({
    name: asset.name || 'document.pdf',
    uri: asset.uri,
    size: asset.size || new File(asset.uri).size || 0
  }));
  if (files.reduce((sum, file) => sum + file.size, 0) > MAX_TOOL_INPUT_BYTES) {
    throw new Error(t('tools.tooLarge'));
  }
  return files;
}

async function loadPdf(file: PickedPdf) {
  const source = new File(file.uri);
  try {
    return await PDFDocument.load(await source.bytes(), { updateMetadata: false });
  } finally {
    try {
      if (source.uri.startsWith(Paths.cache.uri) && source.exists) source.delete();
    } catch {
      // Picker cache cleanup must not hide a successful PDF read.
    }
  }
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
