const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['android/**', 'ios/**', 'dist/**', 'play-store/source/**']
  },
  {
    // Build time Node scripts and config plugins. They are CommonJS and run
    // under Node, never in the app bundle, so they get Node globals. Without
    // this block __dirname and require read as undefined globals and the lint
    // run is permanently red - which is worse than useless, because a red
    // baseline hides the next real error.
    files: ['plugins/**/*.js', 'scripts/**/*.mjs', '*.config.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        __dirname: 'readonly',
        __filename: 'readonly',
        require: 'readonly',
        module: 'writable',
        exports: 'writable',
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly'
      }
    }
  }
]);
