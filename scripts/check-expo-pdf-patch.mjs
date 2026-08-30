#!/usr/bin/env node
/**
 * Gate for the @kishannareshpal/expo-pdf native patch.
 *
 * It runs before prebuild, so it must not require the patch to be applied yet.
 * What it does assert:
 *   - the installed dependency is exactly the validated version;
 *   - every checked-in patched source still matches its recorded checksum;
 *   - every installed native file is a source this patch was validated against
 *     (validated upstream, the already patched file, or the Build 41 revision),
 *     never something unrecognised.
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
// fileURLToPath keeps this working from Windows Git Bash, where a bare
// URL.pathname would come back as "/C:/..." and fail to resolve.
const patch = require(fileURLToPath(new URL('../plugins/expoPdfPatch.js', import.meta.url)));

try {
  patch.readPatchedSources();
  const info = patch.inspect(process.cwd());
  if (info.version !== patch.EXPECTED_VERSION) {
    throw new Error(
      patch.PACKAGE_NAME + ' is ' + info.version + ', expected ' + patch.EXPECTED_VERSION +
      '. Re-review plugins/expo-pdf/*.patched.kt against the new upstream sources.'
    );
  }
  const broken = info.files.filter((file) => file.state === 'unknown');
  if (broken.length) {
    throw new Error(
      'Unrecognised native source(s) in ' + patch.PACKAGE_NAME + ':\n' +
      broken.map((file) => '  ' + file.relativePath + ' (sha256 ' + file.actual + ')').join('\n') +
      '\nReinstall node_modules or re-review the patch.'
    );
  }
  console.log(
    'expo-pdf patch: ' + patch.PACKAGE_NAME + '@' + info.version + ' -> ' +
    info.files.map((file) => file.relativePath.split(/[\\/]/).pop() + '=' + file.state).join(', ') + ', checksums match.'
  );
} catch (error) {
  console.error('expo-pdf patch check failed:\n  ' + (error && error.message ? error.message : error));
  process.exit(1);
}
