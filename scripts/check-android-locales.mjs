#!/usr/bin/env node
/**
 * Verifies the Android project that prebuild generated actually carries every
 * language the app claims to support.
 *
 * Why this file exists: the workflow used to inline a list of fourteen
 * "language|app name" pairs. Two separate things then went wrong with it. The
 * list stayed at fourteen while the app grew to twenty four, so ten languages
 * were never checked at all; and when the app name changed, the build failed
 * with a bare grep error even though nothing was broken - the list was simply
 * out of date. A hardcoded expectation that has to be maintained by hand is not
 * a gate, it is a second source of truth waiting to drift.
 *
 * There is exactly one source of truth here: constants/i18n.ts names the
 * languages, and locales/<language>.json names the app in each of them. Both
 * are the same files the app itself reads.
 *
 * Runs after prebuild, against android/. No dependencies.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const problems = [];

const i18n = readFileSync(join(root, 'constants/i18n.ts'), 'utf8');
const match = i18n.match(/export const languages\s*=\s*\[([^\]]+)\]/);
if (!match) {
  console.error('constants/i18n.ts icinde languages dizisi bulunamadi.');
  process.exit(1);
}
// Two and three letter codes both: Filipino is 'fil' and has no two letter form.
const languages = [...match[1].matchAll(/'([a-z]{2,3})'/g)].map((entry) => entry[1]);

const localesConfigPath = join(root, 'android/app/src/main/res/xml/locales_config.xml');
if (!existsSync(localesConfigPath)) {
  console.error('android/app/src/main/res/xml/locales_config.xml yok. Once prebuild calismali.');
  process.exit(1);
}
const localesConfig = readFileSync(localesConfigPath, 'utf8');

for (const language of languages) {
  if (!localesConfig.includes(`<locale android:name="${language}"/>`)) {
    problems.push(`${language}: locales_config.xml icinde yok - sistem dil listesinde gorunmez`);
  }

  const localeJsonPath = join(root, `locales/${language}.json`);
  if (!existsSync(localeJsonPath)) {
    problems.push(`${language}: locales/${language}.json yok`);
    continue;
  }
  const appName = JSON.parse(readFileSync(localeJsonPath, 'utf8'))?.android?.app_name;
  if (!appName) {
    problems.push(`${language}: locales/${language}.json icinde android.app_name yok`);
    continue;
  }

  // Expo writes these as values-b+<language>; older toolchains used values-<language>.
  const resDir = join(root, 'android/app/src/main/res');
  const candidates = [`values-b+${language}`, `values-${language}`];
  const dir = candidates.find((name) => existsSync(join(resDir, name)));
  if (!dir) {
    problems.push(`${language}: ${candidates[0]} klasoru uretilmemis`);
    continue;
  }
  const found = readdirSync(join(resDir, dir))
    .filter((file) => file.endsWith('.xml'))
    .some((file) => readFileSync(join(resDir, dir, file), 'utf8').includes(appName));
  if (!found) {
    problems.push(`${language}: "${appName}" ${dir} icinde bulunamadi`);
  }
}

if (problems.length) {
  console.error(`\nAndroid yerellestirme kontrolu BASARISIZ (${problems.length}):`);
  problems.forEach((problem) => console.error(`  - ${problem}`));
  process.exit(1);
}
console.log(`Android yerellestirme: ${languages.length} dil ve uygulama adi dogrulandi.`);
