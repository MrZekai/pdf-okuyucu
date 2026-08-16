#!/usr/bin/env node
/**
 * Credit-free i18n guard. Runs with plain Node, no dependencies.
 *
 *  1. Every dictionary in constants/i18n.ts must expose exactly the same keys.
 *     (TypeScript already enforces this via Record<keyof typeof tr, string>;
 *      this script gives the same answer without a full tsc run.)
 *  2. Interpolation placeholders such as {count} must match across languages.
 *  3. No screen may keep a hardcoded Turkish-looking literal.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const source = readFileSync(join(root, 'constants/i18n.ts'), 'utf8');

function extractDictionary(sourceText, name, startToken = `const ${name}`) {
  const start = sourceText.indexOf(startToken);
  if (start === -1) throw new Error(`Dictionary "${name}" not found`);
  const open = sourceText.indexOf('{', start);
  let depth = 0;
  let end = open;
  for (let i = open; i < sourceText.length; i += 1) {
    if (sourceText[i] === '{') depth += 1;
    if (sourceText[i] === '}') {
      depth -= 1;
      if (depth === 0) { end = i; break; }
    }
  }
  const body = sourceText.slice(open, end + 1);
  const entries = new Map();
  const pattern = /'([\w.]+)'\s*:\s*'((?:\\.|[^'\\])*)'/g;
  let match;
  while ((match = pattern.exec(body)) !== null) {
    if (entries.has(match[1])) throw new Error(`Dictionary "${name}" has duplicate key "${match[1]}"`);
    entries.set(match[1], match[2]);
  }
  return entries;
}

const languagesMatch = source.match(/export const languages\s*=\s*\[([^\]]+)\]/);
if (!languagesMatch) throw new Error('languages array not found in constants/i18n.ts');
const languages = [...languagesMatch[1].matchAll(/'([a-z]{2})'/g)].map((match) => match[1]);
if (new Set(languages).size !== languages.length) throw new Error('languages array contains a duplicate language code');
const inline = new Set(['tr', 'en', 'es']);
const dictionaries = Object.fromEntries(languages.map((language) => {
  if (inline.has(language)) return [language, extractDictionary(source, language)];
  const localeSource = readFileSync(join(root, `constants/translations/${language}.ts`), 'utf8');
  return [language, extractDictionary(localeSource, language, 'export default')];
}));
const base = dictionaries.tr;
const problems = [];

for (const [language, entries] of Object.entries(dictionaries)) {
  for (const key of base.keys()) if (!entries.has(key)) problems.push(`${language}: missing key ${key}`);
  for (const key of entries.keys()) if (!base.has(key)) problems.push(`${language}: extra key ${key}`);
}

const placeholders = (value) => (value.match(/\{(\w+)\}/g) ?? []).sort().join(',');
for (const key of base.keys()) {
  const expected = placeholders(base.get(key));
  for (const [language, entries] of Object.entries(dictionaries)) {
    if (!entries.has(key)) continue;
    const actual = placeholders(entries.get(key));
    if (actual !== expected) problems.push(`${language}: placeholder mismatch on ${key} -> "${actual}" vs tr "${expected}"`);
  }
}

const turkish = /[çğıöşüÇĞİÖŞÜ]|’/;
const scanDirs = ['app', 'components', 'hooks', 'context', 'lib'];
const files = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full);
    else if (['.ts', '.tsx'].includes(extname(full))) files.push(full);
  }
};
for (const dir of scanDirs) walk(join(root, dir));

for (const file of files) {
  readFileSync(file, 'utf8').split('\n').forEach((line, index) => {
    if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) return;
    for (const literal of line.match(/'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)"/g) ?? []) {
      const text = literal.slice(1, -1);
      if (text.length > 2 && turkish.test(text)) {
        problems.push(`${file.replace(root, '')}:${index + 1} hardcoded literal ${literal}`);
      }
    }
  });
}

// 4. Every t('key') used in the app must exist in the dictionaries.
const usedKeys = new Set();
for (const file of files) {
  const content = readFileSync(file, 'utf8');
  for (const match of content.matchAll(/\b(?:t|tr)\(\s*'([\w.]+)'/g)) usedKeys.add(match[1]);
  for (const match of content.matchAll(/translate\(\s*\w+\s*,\s*'([\w.]+)'/g)) usedKeys.add(match[1]);
}
for (const key of usedKeys) if (!base.has(key)) problems.push(`unknown key used in code: ${key}`);
const unused = [...base.keys()].filter((key) => !usedKeys.has(key));

console.log(`i18n: ${base.size} keys x ${Object.keys(dictionaries).length} languages, ${files.length} source files, ${usedKeys.size} keys referenced`);
if (unused.length) console.log(`note: ${unused.length} key(s) defined but not referenced: ${unused.join(', ')}`);
if (problems.length) {
  console.error('\nFAIL');
  problems.forEach((problem) => console.error(`  - ${problem}`));
  process.exit(1);
}
console.log('OK - dictionaries aligned and no hardcoded strings left');
