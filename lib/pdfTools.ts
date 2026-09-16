import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as Print from 'expo-print';
import { Asset } from 'expo-asset';
import { File, Paths } from 'expo-file-system';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, PDFImage, PDFName, PDFNumber, PDFRawStream, degrees, rgb } from 'pdf-lib';
import { PdfDocument } from '@/types/document';
import { deletePdfFile, saveGeneratedPdf, stagePdfForPrint } from '@/lib/pdfFiles';
import { t } from '@/constants/i18n';

export type PdfToolId = 'scan' | 'images' | 'create' | 'merge' | 'split' | 'extract' | 'remove' | 'reorder' | 'rotate' | 'watermark' | 'compress' | 'clean' | 'print';
export type PdfToolResult = PdfDocument | PdfDocument[] | CompressOutcome | null;

/**
 * NEW-01: marks the camera permission failure that Android will never prompt
 * for again (USER_FIXED / canAskAgain === false). The Tools screen turns this
 * into a Cancel / Open Settings dialog instead of a dead-end alert.
 */
export const CAMERA_PERMISSION_BLOCKED = 'camera_permission_blocked';
/**
 * "Already optimised" is an outcome, not a failure. It used to surface through
 * the red error dialog, so a viewer who ran the tool on a file that was already
 * compact was told something had gone wrong. Nothing had. The caller uses this
 * code to present it as information instead.
 */
export const COMPRESSION_NO_GAIN = 'compression_no_gain';
export type ToolError = Error & { code?: string; source?: { name: string; uri: string; size: number } };

const MAX_TOOL_INPUT_BYTES = 80 * 1024 * 1024;
// Merge is the only tool that holds every source document in memory at once and
// then serialises the combined result, so its peak is roughly two to three
// times the input. The single file tools stay on the wider budget above.
const MAX_MERGE_INPUT_BYTES = 40 * 1024 * 1024;
const MAX_MERGE_FILES = 12;
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

/**
 * Reads a picked document and, by default, removes the copy the picker left in
 * the cache: every tool here is a one shot operation, and leaving the user's
 * documents lying around in cache storage is not something to do casually.
 *
 * `keepSource` exists for the one flow that reads the same file twice. Compress
 * asks the viewer between its two passes, so the file has to survive that
 * question. Without this the second pass opened a path the first pass had
 * already deleted and the tool died with ENOENT after the viewer had said yes -
 * the worst possible moment to fail. Whoever passes true owns the cleanup:
 * discardStagedPdf on every path that does not go on to read it again.
 */
async function loadPdf(file: PickedPdf, keepSource = false) {
  const source = new File(file.uri);
  try {
    return await PDFDocument.load(await source.bytes(), { updateMetadata: false });
  } finally {
    if (!keepSource) cleanupCacheFile(source.uri);
  }
}

/** Releases a file held back by loadPdf(..., true). Safe to call twice. */
export function discardStagedPdf(uri: string) {
  cleanupCacheFile(uri);
}

/**
 * An A4 page is 595 points wide. At 1700 pixels across that page the image is
 * rendered at roughly 200 dpi, which is past what a phone screen shows and past
 * what an office printer resolves. Every pixel above it is weight the reader
 * carries and never sees.
 *
 * This matters more than it looks. A 12 megapixel phone photo is about 4 MB, and
 * the embed path used to store it untouched - so three camera shots produced a
 * 12 MB PDF, and the app's own Optimize tool could not shrink it afterwards
 * because pdf-lib cannot re-encode an image once it is inside the document. The
 * cheapest place to fix that is here, before it goes in.
 */
const EMBED_MAX_EDGE = 1700;
const EMBED_JPEG_QUALITY = 0.75;

/**
 * Scales one picked image down to the embedding budget.
 *
 * Returns null whenever the original should be kept: an image already inside the
 * budget, or an encoder that refused the file. The caller then embeds the source
 * bytes exactly as before, so a failure here can never cost the viewer their
 * document - it only costs the saving.
 *
 * A JPEG source is re-encoded as JPEG, which is what photographs want. A PNG
 * source stays PNG: screenshots and diagrams are mostly text and flat colour,
 * and JPEG smears both. Fewer pixels already carries most of the saving there.
 */
async function downscaleForEmbedding(uri: string, isPng: boolean): Promise<Uint8Array | null> {
  let savedUri: string | null = null;
  try {
    const measured = await ImageManipulator.manipulate(uri).renderAsync();
    const longestEdge = Math.max(measured.width, measured.height);
    if (!Number.isFinite(longestEdge) || longestEdge <= EMBED_MAX_EDGE) return null;

    const context = ImageManipulator.manipulate(uri);
    context.resize(measured.width >= measured.height ? { width: EMBED_MAX_EDGE } : { height: EMBED_MAX_EDGE });
    const rendered = await context.renderAsync();
    const saved = await rendered.saveAsync({
      compress: isPng ? 1 : EMBED_JPEG_QUALITY,
      format: isPng ? SaveFormat.PNG : SaveFormat.JPEG
    });
    savedUri = saved.uri;
    const bytes = await new File(saved.uri).bytes();
    return bytes.length ? bytes : null;
  } catch {
    return null;
  } finally {
    if (savedUri) cleanupCacheFile(savedUri);
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
      // Scaled down before the pixel-count guard runs: an oversized photo that
      // used to be rejected outright now simply fits.
      const scaled = await downscaleForEmbedding(source.uri, isPng);
      if (scaled) imageBytes = scaled;
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

const WATERMARK_MAX_CHARS = 80;

/**
 * The scripts the bundled font can actually draw.
 *
 * This is not a preference, it is the contents of
 * assets/fonts/NotoSans-Watermark.ttf: Latin with its extensions, Vietnamese,
 * Cyrillic and Greek. Arabic, the Indic scripts, Thai and CJK each need their
 * own font, and CJK alone would add several megabytes to the download.
 *
 * What this replaces matters more than what it adds. The old code mapped every
 * character the base font could not encode to a space and fell back to the
 * literal string "PDF" when nothing survived. A Russian viewer typed
 * SEKRETNO in Cyrillic, the app reported success, and stamped "PDF" across
 * their document. Turkish lost its dotted capital I, Vietnamese lost its tones.
 * A tool that quietly does something other than what it was asked is worse than
 * one that says it cannot.
 */
const WATERMARK_SUPPORTED = /^[\p{Script=Latin}\p{Script=Cyrillic}\p{Script=Greek}\p{Script=Common}\p{Script=Inherited}]*$/u;

/** Characters the font has no glyph for, deduplicated, to name in the message. */
function unsupportedWatermarkCharacters(value: string) {
  const missing: string[] = [];
  for (const character of value) {
    if (character === ' ' || WATERMARK_SUPPORTED.test(character)) continue;
    if (!missing.includes(character)) missing.push(character);
  }
  return missing;
}

/**
 * Normalises the watermark and refuses anything the font cannot draw, naming the
 * characters so the viewer knows why.
 */
function prepareWatermark(value: string) {
  const text = value.replace(/\s+/g, ' ').trim().slice(0, WATERMARK_MAX_CHARS);
  if (!text) throw new Error(t('tools.watermarkEmpty'));
  const missing = unsupportedWatermarkCharacters(text);
  if (missing.length) throw new Error(t('tools.watermarkUnsupported', { characters: missing.slice(0, 8).join(' ') }));
  return text;
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
  if (!permission.granted) {
    // A permanently denied permission resolves immediately without showing
    // the system prompt, so the user needs a route to the app settings.
    const error: ToolError = new Error(permission.canAskAgain ? t('tools.cameraPermission') : t('tools.cameraBlockedMessage'));
    if (!permission.canAskAgain) error.code = CAMERA_PERMISSION_BLOCKED;
    throw error;
  }
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
  if (sources.length > MAX_MERGE_FILES) throw new Error(t('tools.mergeTooManyFiles', { count: MAX_MERGE_FILES }));
  if (sources.reduce((sum, file) => sum + file.size, 0) > MAX_MERGE_INPUT_BYTES) throw new Error(t('tools.mergeTooLarge'));
  const output = await PDFDocument.create();
  for (const source of sources) {
    const input = await loadPdf(source);
    const pages = await output.copyPages(input, input.getPageIndices());
    pages.forEach((page) => output.addPage(page));
    // Give the bridge a chance to collect the source document before the next
    // one is parsed; without it several large inputs peak at the same time.
    await new Promise<void>((resolve) => { setTimeout(resolve, 0); });
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

/**
 * Loads the bundled Unicode font once per session.
 *
 * The asset is only read when somebody actually watermarks a document, so the
 * 192 KB never touches memory for the viewers who never use the tool.
 */
let watermarkFontBytes: Uint8Array | null = null;
async function loadWatermarkFont(): Promise<Uint8Array> {
  if (watermarkFontBytes) return watermarkFontBytes;
  const asset = Asset.fromModule(require('../assets/fonts/NotoSans-Watermark.ttf'));
  await asset.downloadAsync();
  const uri = asset.localUri || asset.uri;
  watermarkFontBytes = await new File(uri).bytes();
  return watermarkFontBytes;
}

export async function addWatermark(text: string): Promise<PdfDocument | null> {
  // Validated before the picker opens: being asked to choose a file and only
  // then told the text cannot be used wastes the viewer's time.
  const watermark = prepareWatermark(text);
  const [source] = await pickPdfs(false);
  if (!source) return null;
  const input = await loadPdf(source);
  input.registerFontkit(fontkit);
  const font = await input.embedFont(await loadWatermarkFont(), { subset: true });
  input.getPages().forEach((page) => {
    const { width, height } = page.getSize();
    const size = Math.max(24, Math.min(64, width / Math.max(8, watermark.length * 0.55)));
    const textWidth = font.widthOfTextAtSize(watermark, size);
    page.drawText(watermark, { x: Math.max(18, (width - textWidth) / 2), y: height / 2, size, font, color: rgb(0.78, 0.08, 0.1), opacity: 0.2, rotate: degrees(35) });
  });
  return saveGeneratedPdf(await input.save({ useObjectStreams: true }), outputName(source.name, 'watermarked'));
}

/**
 * Re-encodes the photographs inside a PDF.
 *
 * This is the only way to make a scanned document meaningfully smaller: its
 * weight is in its images, and repacking the file structure - which is all the
 * lossless pass can do - never touches them. pdf-lib has no image encoder, so
 * each picture is written out, re-encoded through the platform encoder at a
 * lower resolution and quality, and put back in place of the original stream.
 *
 * It only touches streams it is certain about:
 *   - /Subtype /Image carrying a plain JPEG payload (/DCTDecode, no chain)
 *   - DeviceRGB at 8 bits per component
 *   - no /SMask, /Mask, /Decode or /ColorSpace indirection
 *   - big enough that re-encoding can actually win something
 * Anything else is left exactly as it was. A picture put back wrongly does not
 * look worse, it corrupts the page - so when in doubt this does nothing.
 *
 * DeviceGray is deliberately excluded even though grey scans would compress
 * well. Two reasons, and either one on its own is enough. A soft mask - the
 * channel that makes part of a picture transparent - is itself an image object
 * with /Subtype /Image and DeviceGray, and it is reached from another image's
 * /SMask, so skipping images that *have* an /SMask does not skip the mask. And
 * the platform encoder returns a three channel JPEG, so a grey stream comes
 * back as colour and the dictionary would have to be rewritten to match. Either
 * way the page renders wrong rather than merely larger. Grey pages stay as they
 * are; the lossless pass still repacks the file around them.
 */
const COMPRESS_IMAGE_MAX_EDGE = 1400;
const COMPRESS_IMAGE_QUALITY = 0.6;
/** Below this a re-encode costs more in overhead than it saves. */
const COMPRESS_IMAGE_MIN_BYTES = 48 * 1024;

/**
 * Number of colour channels a JPEG actually carries, read from its frame
 * header. The encoder is expected to return three (YCbCr), but "expected" is
 * not "verified", and writing /DeviceRGB over a single channel payload is
 * exactly the kind of quietly corrupted page this whole pass is built to avoid.
 * Returns 0 when the markers cannot be walked, which means: leave it alone.
 */
function jpegComponentCount(bytes: Uint8Array) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return 0;
  let offset = 2;
  while (offset + 3 < bytes.length) {
    if (bytes[offset] !== 0xff) return 0;
    const marker = bytes[offset + 1];
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { offset += 2; continue; }
    if (marker === 0xd9 || marker === 0xda) return 0;
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (length < 2) return 0;
    // SOF0/1/2/3, 5/6/7, 9/10/11, 13/14/15 - every frame header except the
    // DHT/DAC/DRI markers that share the 0xC0 block.
    const isFrameHeader = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isFrameHeader) return offset + 9 < bytes.length ? bytes[offset + 9] : 0;
    offset += 2 + length;
  }
  return 0;
}

/**
 * The single definition of "a picture this tool may re-encode".
 *
 * It has to be one function because two different places ask the question: the
 * pass that does the work, and the check that decides whether to offer the pass
 * at all. If those two ever disagreed, the app would either offer to re-encode
 * a document with nothing to re-encode, or stay silent about one it could have
 * halved. Both are the tool lying about itself.
 */
function isRecompressableImage(object: unknown): object is PDFRawStream {
  if (!(object instanceof PDFRawStream)) return false;
  const dict = object.dict;
  if (dict.get(PDFName.of('Subtype')) !== PDFName.of('Image')) return false;
  if (dict.get(PDFName.of('Filter')) !== PDFName.of('DCTDecode')) return false;
  if (dict.get(PDFName.of('ColorSpace')) !== PDFName.of('DeviceRGB')) return false;
  if (dict.get(PDFName.of('SMask')) || dict.get(PDFName.of('Mask')) || dict.get(PDFName.of('Decode'))) return false;
  const bits = dict.get(PDFName.of('BitsPerComponent'));
  if (bits instanceof PDFNumber && bits.asNumber() !== 8) return false;
  return object.getContents().length >= COMPRESS_IMAGE_MIN_BYTES;
}

function countRecompressableImages(document: PDFDocument) {
  let count = 0;
  for (const [, object] of document.context.enumerateIndirectObjects()) {
    if (isRecompressableImage(object)) count += 1;
  }
  return count;
}

async function recompressImages(document: PDFDocument): Promise<number> {
  let replaced = 0;

  for (const [ref, object] of document.context.enumerateIndirectObjects()) {
    if (!isRecompressableImage(object)) continue;
    const dict = object.dict;
    const original = object.getContents();

    const scratch = new File(Paths.cache, `recompress-${replaced}-${Date.now()}.jpg`);
    let savedUri: string | null = null;
    try {
      scratch.create({ overwrite: true });
      scratch.write(original);
      const measured = await ImageManipulator.manipulate(scratch.uri).renderAsync();
      const longestEdge = Math.max(measured.width, measured.height);
      if (!Number.isFinite(longestEdge) || longestEdge < 2) continue;

      const context = ImageManipulator.manipulate(scratch.uri);
      if (longestEdge > COMPRESS_IMAGE_MAX_EDGE) {
        context.resize(measured.width >= measured.height
          ? { width: COMPRESS_IMAGE_MAX_EDGE }
          : { height: COMPRESS_IMAGE_MAX_EDGE });
      }
      const rendered = await context.renderAsync();
      const saved = await rendered.saveAsync({ compress: COMPRESS_IMAGE_QUALITY, format: SaveFormat.JPEG });
      savedUri = saved.uri;
      const bytes = await new File(saved.uri).bytes();
      // A re-encode that grew the picture is a re-encode not worth keeping.
      if (!bytes.length || bytes.length >= original.length) continue;
      // The dictionary says DeviceRGB, so the payload has to have three
      // channels. If it does not, or the header cannot be read, the original
      // stream stays: a slightly larger file beats a wrongly rendered page.
      if (jpegComponentCount(bytes) !== 3) continue;

      const replacement = PDFRawStream.of(dict.clone(document.context), bytes);
      replacement.dict.set(PDFName.of('Width'), PDFNumber.of(rendered.width));
      replacement.dict.set(PDFName.of('Height'), PDFNumber.of(rendered.height));
      replacement.dict.set(PDFName.of('Length'), PDFNumber.of(bytes.length));
      document.context.assign(ref, replacement);
      replaced += 1;
    } catch {
      // One picture that refuses to re-encode must not cost the whole document.
    } finally {
      if (savedUri) cleanupCacheFile(savedUri);
      cleanupCacheFile(scratch.uri);
      // Let the bridge reclaim the decoded bitmap before the next page.
      await new Promise<void>((resolve) => { setTimeout(resolve, 0); });
    }
  }
  return replaced;
}

/** Narrows the tool runner's union without it having to know each tool's shape. */
export function isCompressOutcome(value: unknown): value is CompressOutcome {
  return typeof value === 'object' && value !== null && 'beforeBytes' in value && 'afterBytes' in value;
}

/**
 * Sizes as a person reads them. Kept here so the before and after in one
 * sentence are always produced by the same rounding.
 */
export function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

export type CompressOutcome = {
  document: PdfDocument;
  beforeBytes: number;
  afterBytes: number;
};

/**
 * Anything under this and the repack has not delivered what the tool's name
 * promises. A scan repacked from 3.9 MB to 3.9 MB is not a compressed document;
 * showing "3.9 MB -> 3.9 MB (1% smaller)" and stopping there is the tool
 * declaring success for work nobody asked for. Above this the viewer keeps a
 * lossless file and is never asked to trade away picture quality.
 */
const MEANINGFUL_GAIN = 0.1;

/**
 * Pass one: repack the file structure. Lossless, and enough on documents whose
 * weight is bookkeeping rather than pictures.
 *
 * Three outcomes, in order:
 *   - the repack won something worth having, so it is returned;
 *   - it did not, but the document carries pictures this app can re-encode, so
 *     the caller is handed the staged file and asks the viewer first;
 *   - it did not and there is nothing to re-encode, which is simply the answer:
 *     the file is already compact.
 * A token win on a document full of photographs falls into the second case, not
 * the first - that mistake is exactly what made this tool useless on scans.
 * Nothing here degrades a document without being asked.
 */
export async function compressPdf(): Promise<CompressOutcome | null> {
  const [source] = await pickPdfs(false);
  if (!source) return null;
  // Held back deliberately: the second pass may still need this file, and the
  // viewer is about to be asked a question in between. Every path below either
  // hands it to that pass or releases it.
  const input = await loadPdf(source, true);
  const repacked = await input.save({ useObjectStreams: true, addDefaultPage: false, objectsPerTick: 25 });

  const keepRepacked = (): CompressOutcome => {
    discardStagedPdf(source.uri);
    return {
      document: saveGeneratedPdf(repacked, outputName(source.name, 'compressed')),
      beforeBytes: source.size,
      afterBytes: repacked.length
    };
  };

  const gain = source.size > 0 ? 1 - repacked.length / source.size : 0;
  if (gain >= MEANINGFUL_GAIN) return keepRepacked();

  const outcome = new Error(t('tools.compressionNoGain')) as ToolError;
  outcome.code = COMPRESSION_NO_GAIN;
  if (countRecompressableImages(input) > 0) {
    // Only offer the second pass when there is something for it to do. Asking a
    // viewer to approve lower picture quality on a document whose pictures this
    // app cannot touch would spend their trust on nothing. The file stays on
    // disk until they answer; the caller releases it if they decline.
    outcome.source = { name: source.name, uri: source.uri, size: source.size };
    throw outcome;
  }

  // No pictures to re-encode. A small lossless win is then the best available
  // answer and worth keeping rather than discarding.
  if (source.size > 0 && repacked.length < source.size) return keepRepacked();
  discardStagedPdf(source.uri);
  throw outcome;
}

/**
 * Pass two, and only ever after the viewer has agreed to it: re-encode the
 * pictures. Runs on the file the first pass already staged, so the viewer is
 * not asked to choose their document a second time.
 */
export async function compressPdfWithImages(source: PickedPdf): Promise<CompressOutcome> {
  const input = await loadPdf(source);
  const replaced = await recompressImages(input);
  const bytes = await input.save({ useObjectStreams: true, addDefaultPage: false, objectsPerTick: 25 });
  if (!replaced || (source.size > 0 && bytes.length >= source.size)) {
    const outcome = new Error(t('tools.compressionNoGain')) as ToolError;
    outcome.code = COMPRESSION_NO_GAIN;
    throw outcome;
  }
  return {
    document: saveGeneratedPdf(bytes, outputName(source.name, 'compressed')),
    beforeBytes: source.size,
    afterBytes: bytes.length
  };
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
  // The dates are metadata too, and they are the part that actually leaks
  // something: when a contract was drafted, when a scan was taken. Clearing the
  // text fields while leaving the timestamps in place would be a half measure
  // in an app that promises documents stay private. The epoch is used because
  // the PDF structure expects dates to be present, not absent.
  const cleared = new Date(0);
  input.setCreationDate(cleared);
  input.setModificationDate(cleared);
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
