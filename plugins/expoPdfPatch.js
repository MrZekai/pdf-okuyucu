/* eslint-env node */
/**
 * Reproducible source patch for @kishannareshpal/expo-pdf 0.3.2.
 *
 * Defects fixed in the Android view (all confirmed on device):
 *
 *  1. BUG-02 - password protected documents could never be opened. Upstream
 *     loads once without a password, waits for the "password required" failure
 *     and then calls load() again on the *same* builder, whose content://
 *     InputStream the first attempt already drained, so every correct password
 *     came back as incorrect. The password is attached before the single load.
 *  2. BUG-03 - any other decode failure was swallowed, leaving a truncated or
 *     corrupted document on an endless loading state. Every failure is now
 *     reported back to JavaScript.
 *  3. BUG-06 - the viewer restored a proportional scroll offset after a resize,
 *     so a rotation jumped to an unrelated page. The logical page index is
 *     remembered and re-applied through defaultPage.
 *  4. BUG-14 - a "page" prop lets the app jump to a logical page through that
 *     same defaultPage path, without needing any additional viewer API.
 *
 * Rather than rewriting fragments with fragile multi-line anchors, whole files
 * are swapped for reviewed copies that live in this repository, and the swap
 * only happens when the installed file hashes exactly to a source this patch
 * was validated against. Anything else fails loudly instead of guessing.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PACKAGE_NAME = '@kishannareshpal/expo-pdf';
const EXPECTED_VERSION = '0.3.2';
const KOTLIN_DIR = path.join('android', 'src', 'main', 'java', 'com', 'kishannareshpal', 'expopdf');

const TARGETS = [
  {
    relativePath: path.join(KOTLIN_DIR, 'KJExpoPdfView.kt'),
    patchedFile: 'KJExpoPdfView.patched.kt',
    upstreamSha256: 'd086763caa2aca4a15fb9b505dce11cd02740ce6e50b85f10498cd239d330e00',
    patchedSha256: '64488bb81494aa21cabda11103f1796acaa9ab9b3c49a94c031671fa513b32d1',
    // Build 41 shipped an earlier revision of this file; it is a valid source
    // to patch from, so an already prebuilt tree upgrades cleanly.
    supersededSha256: ['e882880bc9275ee77c349adf69d41c04c9217fb02de1c0282ba61f854c65882f']
  },
  {
    relativePath: path.join(KOTLIN_DIR, 'KJExpoPdfModule.kt'),
    patchedFile: 'KJExpoPdfModule.patched.kt',
    upstreamSha256: '4f745f001bb9d21b55086c05a196808490f4546b14cdb01be9cd9c0a5d36688c',
    patchedSha256: '634d1be56907fc74baba031ff620cd1acc78a8673d9f3871338604b3e077f494',
    supersededSha256: []
  }
];

/** CRLF and LF checkouts must hash the same, so normalise before hashing. */
function digest(text) {
  return crypto.createHash('sha256').update(String(text).replace(/\r\n/g, '\n'), 'utf8').digest('hex');
}

function resolvePackageDirectory(projectRoot) {
  try {
    return path.dirname(require.resolve(PACKAGE_NAME + '/package.json', { paths: [projectRoot] }));
  } catch {
    throw new Error(PACKAGE_NAME + ' is not installed under ' + projectRoot + '.');
  }
}

function readPatchedSource(target) {
  const sourcePath = path.join(__dirname, 'expo-pdf', target.patchedFile);
  if (!fs.existsSync(sourcePath)) {
    throw new Error('Missing patched source file: ' + sourcePath);
  }
  const source = fs.readFileSync(sourcePath, 'utf8');
  const actual = digest(source);
  if (actual !== target.patchedSha256) {
    throw new Error(
      'plugins/expo-pdf/' + target.patchedFile + ' does not match its recorded checksum.\n' +
      '  expected ' + target.patchedSha256 + '\n  actual   ' + actual
    );
  }
  return source.replace(/\r\n/g, '\n');
}

/** Validates every checked-in patched source. Throws on the first mismatch. */
function readPatchedSources() {
  return TARGETS.map((target) => ({ target, source: readPatchedSource(target) }));
}

/**
 * Returns { version, files: [{ relativePath, absolutePath, state, actual }] }.
 * state is one of: patched | pristine | superseded | unknown.
 */
function inspect(projectRoot) {
  const packageDirectory = resolvePackageDirectory(projectRoot);
  const manifest = JSON.parse(fs.readFileSync(path.join(packageDirectory, 'package.json'), 'utf8'));
  const files = TARGETS.map((target) => {
    const absolutePath = path.join(packageDirectory, target.relativePath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error('Expected native source not found: ' + absolutePath);
    }
    const actual = digest(fs.readFileSync(absolutePath, 'utf8'));
    const state = actual === target.patchedSha256
      ? 'patched'
      : actual === target.upstreamSha256
        ? 'pristine'
        : target.supersededSha256.indexOf(actual) !== -1
          ? 'superseded'
          : 'unknown';
    return { target, relativePath: target.relativePath, absolutePath, state, actual };
  });
  const state = files.every((file) => file.state === 'patched')
    ? 'patched'
    : files.some((file) => file.state === 'unknown')
      ? 'unknown'
      : 'patchable';
  return { version: manifest.version, packageDirectory, files, state };
}

/** Idempotent. Returns 'applied' or 'already-applied'; throws with a clear reason otherwise. */
function apply(projectRoot) {
  const sources = readPatchedSources();
  const info = inspect(projectRoot);
  if (info.version !== EXPECTED_VERSION) {
    throw new Error(
      PACKAGE_NAME + ' is version ' + info.version + ' but this patch was validated against ' +
      EXPECTED_VERSION + '. Re-review the native sources before bumping the dependency.'
    );
  }
  const broken = info.files.filter((file) => file.state === 'unknown');
  if (broken.length) {
    throw new Error(
      'Refusing to patch ' + PACKAGE_NAME + '. These files do not match any source this patch was validated against:\n' +
      broken.map((file) => '  ' + file.relativePath + '\n    expected upstream ' + file.target.upstreamSha256 +
        '\n    expected patched  ' + file.target.patchedSha256 + '\n    actual            ' + file.actual).join('\n')
    );
  }
  if (info.state === 'patched') return 'already-applied';
  info.files.forEach((file, index) => {
    if (file.state === 'patched') return;
    fs.writeFileSync(file.absolutePath, sources[index].source, 'utf8');
  });
  return 'applied';
}

module.exports = {
  PACKAGE_NAME,
  EXPECTED_VERSION,
  TARGETS,
  inspect,
  apply,
  readPatchedSources
};
