/* eslint-env node */
/**
 * Reproducible source patch for @kishannareshpal/expo-pdf.
 *
 * Two defects in the shipped Android view are release blockers for this app:
 *
 *  1. Password-protected documents could never be opened. The upstream view
 *     loads once without a password, waits for the "password required" failure
 *     and then calls load() a second time on the *same* builder with the
 *     password attached. For a content:// document that builder owns an
 *     InputStream the first attempt already drained, so the retry decodes an
 *     empty buffer and every correct password comes back as "incorrect".
 *  2. Any other decode failure was swallowed, so a truncated or corrupted PDF
 *     with a valid %PDF header sat on "Loading PDF..." forever.
 *
 * The patch also remembers the logical page index so a rotation restores the
 * page instead of a proportional scroll offset.
 *
 * Rather than rewriting fragments with fragile multi-line anchors, the whole
 * file is swapped for a reviewed copy that lives in the repository, and the
 * swap only happens when the installed file hashes exactly to the validated
 * upstream 0.3.2 source. Anything else fails loudly instead of guessing.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PACKAGE_NAME = '@kishannareshpal/expo-pdf';
const EXPECTED_VERSION = '0.3.2';
const TARGET_RELATIVE_PATH = path.join(
  'android', 'src', 'main', 'java', 'com', 'kishannareshpal', 'expopdf', 'KJExpoPdfView.kt'
);
const UPSTREAM_SHA256 = 'd086763caa2aca4a15fb9b505dce11cd02740ce6e50b85f10498cd239d330e00';
const PATCHED_SHA256 = 'e882880bc9275ee77c349adf69d41c04c9217fb02de1c0282ba61f854c65882f';
const PATCHED_SOURCE_PATH = path.join(__dirname, 'expo-pdf', 'KJExpoPdfView.patched.kt');

/** CRLF and LF checkouts must hash the same, so normalise before hashing. */
function digest(text) {
  return crypto.createHash('sha256').update(String(text).replace(/\r\n/g, '\n'), 'utf8').digest('hex');
}

function resolvePackageDirectory(projectRoot) {
  try {
    return path.dirname(require.resolve(PACKAGE_NAME + '/package.json', { paths: [projectRoot] }));
  } catch (error) {
    throw new Error(PACKAGE_NAME + ' is not installed under ' + projectRoot + '.');
  }
}

function readPatchedSource() {
  if (!fs.existsSync(PATCHED_SOURCE_PATH)) {
    throw new Error('Missing patched source file: ' + PATCHED_SOURCE_PATH);
  }
  const source = fs.readFileSync(PATCHED_SOURCE_PATH, 'utf8');
  const actual = digest(source);
  if (actual !== PATCHED_SHA256) {
    throw new Error(
      'plugins/expo-pdf/KJExpoPdfView.patched.kt does not match its recorded checksum.\n' +
      '  expected ' + PATCHED_SHA256 + '\n  actual   ' + actual
    );
  }
  return source.replace(/\r\n/g, '\n');
}

/** Returns { version, targetPath, state } where state is pristine | patched | unknown. */
function inspect(projectRoot) {
  const packageDirectory = resolvePackageDirectory(projectRoot);
  const manifest = JSON.parse(fs.readFileSync(path.join(packageDirectory, 'package.json'), 'utf8'));
  const targetPath = path.join(packageDirectory, TARGET_RELATIVE_PATH);
  if (!fs.existsSync(targetPath)) {
    throw new Error('Expected native source not found: ' + targetPath);
  }
  const actual = digest(fs.readFileSync(targetPath, 'utf8'));
  const state = actual === UPSTREAM_SHA256 ? 'pristine' : actual === PATCHED_SHA256 ? 'patched' : 'unknown';
  return { version: manifest.version, targetPath, state, actual, packageDirectory };
}

/** Idempotent. Returns 'applied' or 'already-applied'; throws with a clear reason otherwise. */
function apply(projectRoot) {
  const patched = readPatchedSource();
  const info = inspect(projectRoot);
  if (info.version !== EXPECTED_VERSION) {
    throw new Error(
      PACKAGE_NAME + ' is version ' + info.version + ' but this patch was validated against ' +
      EXPECTED_VERSION + '. Re-review the native source before bumping the dependency.'
    );
  }
  if (info.state === 'patched') return 'already-applied';
  if (info.state === 'unknown') {
    throw new Error(
      'Refusing to patch ' + PACKAGE_NAME + ': ' + TARGET_RELATIVE_PATH + ' does not match the validated ' +
      EXPECTED_VERSION + ' source.\n  expected upstream ' + UPSTREAM_SHA256 + '\n  expected patched  ' +
      PATCHED_SHA256 + '\n  actual            ' + info.actual
    );
  }
  fs.writeFileSync(info.targetPath, patched, 'utf8');
  return 'applied';
}

module.exports = {
  PACKAGE_NAME,
  EXPECTED_VERSION,
  TARGET_RELATIVE_PATH,
  UPSTREAM_SHA256,
  PATCHED_SHA256,
  inspect,
  apply,
  readPatchedSource
};
