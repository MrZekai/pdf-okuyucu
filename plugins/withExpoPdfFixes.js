/* eslint-env node */
/**
 * Applies the reviewed @kishannareshpal/expo-pdf native patch during
 * `expo prebuild`, so the fix is reproducible in CI and never depends on a
 * hand-edited node_modules tree. The mod runs before Gradle compiles the
 * autolinked module sources.
 */
const { withDangerousMod } = require('expo/config-plugins');
const expoPdfPatch = require('./expoPdfPatch');

const withExpoPdfFixes = (config) =>
  withDangerousMod(config, [
    'android',
    (mod) => {
      const result = expoPdfPatch.apply(mod.modRequest.projectRoot);
      console.log('[withExpoPdfFixes] ' + expoPdfPatch.PACKAGE_NAME + '@' + expoPdfPatch.EXPECTED_VERSION + ': ' + result);
      return mod;
    }
  ]);

module.exports = withExpoPdfFixes;
