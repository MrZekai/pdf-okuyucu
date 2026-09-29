/**
 * lib/adOpenGuard.ts davranis testi.
 *
 * Bagimliliksiz calisir: TypeScript kaynagini tek dosya olarak derler ve
 * dogrudan calistirir. Cihaz, emulator veya reklam SDK'si gerekmez.
 *
 *   node scripts/test-ad-open-guard.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'lib/adOpenGuard.ts'), 'utf8');

// Modul yalnizca tip aciklamalari ve export kullanir; tipleri soyup dogrudan
// ESM olarak calistirmak icin ufak bir donusum yeterli. Harici derleyici veya
// node_modules gerekmiyor.
const js = source
  .replace(/:\s*number\s*=/g, ' =')
  .replace(/\(now:\s*number\b/g, '(now')
  .replace(/\(endedAt:\s*number\b/g, '(endedAt')
  .replace(/\)\s*:\s*boolean/g, ')');

const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'adguard-')), 'adOpenGuard.mjs');
fs.writeFileSync(tmp, js, 'utf8');
const guard = await import(pathToFileURL(tmp).href);
const { beginDocumentOpen, documentOpenInFlight, resetDocumentOpenGuardForTests,
        DOCUMENT_OPEN_SETTLE_MS, DOCUMENT_OPEN_MAX_MS } = guard;

let passed = 0;
let failed = 0;

function test(name, fn) {
  resetDocumentOpenGuardForTests();
  try {
    fn();
    passed += 1;
    console.log(`  GECTI  ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`  KALDI  ${name}`);
    console.log(`         ${error.message}`);
  }
}

console.log('lib/adOpenGuard.ts\n');

test('bosta iken reklam engellenmez', () => {
  assert.equal(documentOpenInFlight(1_000), false);
});

test('acma suresince reklam engellenir', () => {
  beginDocumentOpen(1_000);
  assert.equal(documentOpenInFlight(1_050), true);
  assert.equal(documentOpenInFlight(5_000), true);
});

test('bitisten sonra yerlesme penceresi boyunca hala engellenir', () => {
  const end = beginDocumentOpen(1_000);
  end(2_000);
  assert.equal(documentOpenInFlight(2_100), true, 'yonlendirme karesi korunmali');
  assert.equal(documentOpenInFlight(2_000 + DOCUMENT_OPEN_SETTLE_MS - 1), true);
});

test('yerlesme penceresi dolunca reklam serbest kalir', () => {
  const end = beginDocumentOpen(1_000);
  end(2_000);
  assert.equal(documentOpenInFlight(2_000 + DOCUMENT_OPEN_SETTLE_MS), false);
  assert.equal(documentOpenInFlight(9_000), false);
});

test('IPTAL: secici kapatilinca da yerlesme penceresi uygulanir', () => {
  // Kullanici PDF Ac'a basip secimi iptal etti: cikis yolu ayni, reklam cikmamali.
  const end = beginDocumentOpen(1_000);
  end(1_400);
  assert.equal(documentOpenInFlight(1_450), true, 'iptal eden kullaniciya reklam cikmamali');
});

test('bitis islevi iki kez cagrilirsa sayac bir kereden fazla dusmez', () => {
  const endA = beginDocumentOpen(1_000);
  const endB = beginDocumentOpen(1_010);
  endA(1_100);
  endA(1_100); // yinelenen cagri
  assert.equal(documentOpenInFlight(1_200), true, 'ikinci acma hala surmekte');
  endB(1_300);
  assert.equal(documentOpenInFlight(1_300 + DOCUMENT_OPEN_SETTLE_MS), false);
});

test('ic ice acmalar: sonuncusu bitene kadar engellenir', () => {
  // Art arda gelen iki dis PDF istegi (WhatsApp'tan ardisik dosya).
  const endA = beginDocumentOpen(1_000);
  const endB = beginDocumentOpen(1_020);
  endA(1_100);
  assert.equal(documentOpenInFlight(1_500), true);
  endB(2_000);
  assert.equal(documentOpenInFlight(2_000 + DOCUMENT_OPEN_SETTLE_MS), false);
});

test('bitis bildirimi kaybolursa sayac kalici takilmaz', () => {
  beginDocumentOpen(1_000); // bitis hic cagrilmiyor
  assert.equal(documentOpenInFlight(1_000 + DOCUMENT_OPEN_MAX_MS - 1), true);
  assert.equal(documentOpenInFlight(1_000 + DOCUMENT_OPEN_MAX_MS), false,
    'emniyet suresi dolunca reklam yeniden mumkun olmali');
  assert.equal(documentOpenInFlight(1_000 + DOCUMENT_OPEN_MAX_MS + 10_000), false);
});

test('uzun suren dosya seciminde koruma surer', () => {
  beginDocumentOpen(0);
  assert.equal(documentOpenInFlight(60_000), true, '60 sn dosya gezinmesi normaldir');
});

console.log(`\n${passed} gecti, ${failed} kaldi`);
process.exit(failed === 0 ? 0 : 1);
