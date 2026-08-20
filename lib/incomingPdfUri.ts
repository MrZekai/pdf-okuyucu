const APP_SCHEME = 'pdfokuyucu:';
const PROVIDER_AUTHORITY = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const KNOWN_PROVIDER_AUTHORITIES = new Set(['media', 'downloads']);

function isProviderAuthority(authority: string) {
  return PROVIDER_AUTHORITY.test(authority) && (authority.includes('.') || KNOWN_PROVIDER_AUTHORITIES.has(authority));
}

/**
 * Expo Router can receive Android ACTION_VIEW content URIs through the app's
 * custom scheme (for example pdfokuyucu://com.whatsapp.provider.media/item/...).
 * Convert only provider-looking wrapped URLs back to content://. Ordinary app
 * routes such as pdfokuyucu://reader/... must remain router URLs.
 */
export function normalizeIncomingPdfUri(value: string | null | undefined): string | null {
  let raw = value?.trim();
  if (!raw) return null;

  if (!/^[A-Za-z][A-Za-z0-9+.-]*:/.test(raw) && /%3A%2F%2F/i.test(raw)) {
    try { raw = decodeURIComponent(raw); } catch { return null; }
  }

  if (/^content:\/\//i.test(raw) || /^file:\/\//i.test(raw)) return raw;

  // +native-intent documents that `path` is not guaranteed to be a valid URL.
  // Accept a provider authority/path form as well as the full custom-scheme URL.
  const providerPath = raw.match(/^\/{0,2}([A-Za-z0-9][A-Za-z0-9._-]*)(\/.*)$/);
  if (providerPath && isProviderAuthority(providerPath[1])) return `content://${providerPath[1]}${providerPath[2]}`;

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }

  if (parsed.protocol.toLowerCase() !== APP_SCHEME) return null;

  const authority = parsed.hostname;
  if (authority && isProviderAuthority(authority)) {
    return `content://${authority}${parsed.pathname}${parsed.search}${parsed.hash}`;
  }

  // Defensive fallback for a file:// URI that was wrapped into the app scheme.
  if (!authority && /^\/(?:storage|sdcard)\//i.test(parsed.pathname)) {
    return `file://${parsed.pathname}${parsed.search}${parsed.hash}`;
  }

  return null;
}
