import { normalizeIncomingPdfUri } from '../lib/incomingPdfUri';

/**
 * Expo Router assumes every incoming native URL is an application route.
 * Android PDF providers instead deliver document URIs. Rewrite those URIs to
 * the real home route and carry the original document URI as a query param so
 * the root IncomingPdfHandler can import it before an Unmatched Route appears.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    const externalPdfUri = normalizeIncomingPdfUri(path);
    if (externalPdfUri) return `/?incomingPdf=${encodeURIComponent(externalPdfUri)}`;
    if (/^pdfokuyucu:/i.test(path)) return '/';
    return path;
  } catch {
    return '/';
  }
}
