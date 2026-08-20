import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const sourcePath = path.join(process.cwd(), 'lib/incomingPdfUri.ts');
const source = fs.readFileSync(sourcePath, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022
  }
}).outputText;

const temporaryModule = path.join(process.cwd(), `.incoming-pdf-routing-${process.pid}.mjs`);
fs.writeFileSync(temporaryModule, compiled);

try {
  const { normalizeIncomingPdfUri } = await import(`${pathToFileURL(temporaryModule).href}?t=${Date.now()}`);
  const cases = [
    ['content://com.whatsapp.provider.media/item/abc', 'content://com.whatsapp.provider.media/item/abc'],
    ['content%3A%2F%2Fcom.whatsapp.provider.media%2Fitem%2Fabc', 'content://com.whatsapp.provider.media/item/abc'],
    ['file:///storage/emulated/0/Download/test.pdf', 'file:///storage/emulated/0/Download/test.pdf'],
    ['pdfokuyucu://com.whatsapp.provider.media/item/abc', 'content://com.whatsapp.provider.media/item/abc'],
    ['com.whatsapp.provider.media/item/abc', 'content://com.whatsapp.provider.media/item/abc'],
    ['pdfokuyucu://com.google.android.apps.docs.storage/document/xyz?x=1', 'content://com.google.android.apps.docs.storage/document/xyz?x=1'],
    ['pdfokuyucu://media/external/file/123', 'content://media/external/file/123'],
    ['media/external/file/123', 'content://media/external/file/123'],
    ['pdfokuyucu://downloads/public_downloads/42', 'content://downloads/public_downloads/42'],
    ['downloads/public_downloads/42', 'content://downloads/public_downloads/42'],
    ['pdfokuyucu://reader/123', null],
    ['https://example.com/test.pdf', null],
    ['', null]
  ];

  for (const [input, expected] of cases) {
    const actual = normalizeIncomingPdfUri(input);
    if (actual !== expected) {
      console.error('Incoming PDF routing check failed:', { input, expected, actual });
      process.exitCode = 1;
      break;
    }
  }

  if (!process.exitCode) console.log(`Incoming PDF routing: ${cases.length} cases passed.`);
} finally {
  fs.rmSync(temporaryModule, { force: true });
}
