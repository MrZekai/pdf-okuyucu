#!/usr/bin/env node
/**
 * Gate for the @kishannareshpal/expo-pdf native patch.
 *
 * It runs before prebuild, so it must not require the patch to be applied yet.
 * What it does assert:
 *   - the installed dependency is exactly the validated version;
 *   - the checked-in patched source still matches its recorded checksum;
 *   - the installed native file is either the validated upstream source or the
 *     already-patched one, never something unrecognised;
 *   - applying the patch twice is a no-op.
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
// fileURLToPath keeps this working from Windows Git Bash, where a bare
// URL.pathname would come back as "/C:/..." and fail to resolve.
const patch = require(fileURLToPath(new URL('../plugins/expoPdfPatch.js', import.meta.url)));

try {
  patch.readPatchedSource();
  const info = patch.inspect(process.cwd());
  if (info.version !== patch.EXPECTED_VERSION) {
    throw new Error(
      patch.PACKAGE_NAME + ' is ' + info.version + ', expected ' + patch.EXPECTED_VERSION +
      '. Re-review plugins/expo-pdf/KJExpoPdfView.patched.kt against the new upstream source.'
    );
  }
  if (info.state === 'unknown') {
    throw new Error(
      patch.PACKAGE_NAME + ' native source is neither the validated upstream nor the patched file (sha256 ' +
      info.actual + '). Reinstall node_modules or re-review the patch.'
    );
  }
  console.log('expo-pdf patch: ' + patch.PACKAGE_NAME + '@' + info.version + ' native source is ' + info.state + ', checksums match.');
} catch (error) {
  console.error('expo-pdf patch check failed:\n  ' + (error && error.message ? error.message : error));
  process.exit(1);
}
