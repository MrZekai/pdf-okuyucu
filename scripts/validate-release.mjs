import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = process.cwd();
const appConfigFactory = require(path.join(root, 'app.config.js'));
const config = appConfigFactory({ config: {} });
const errors = [];

function fail(message) { errors.push(message); }
function exists(relativePath) { if (!fs.existsSync(path.join(root, relativePath))) fail(`Eksik dosya: ${relativePath}`); }
function text(relativePath) { return fs.readFileSync(path.join(root, relativePath), 'utf8'); }
function pngSize(relativePath, expectedWidth, expectedHeight) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) return fail(`Eksik PNG: ${relativePath}`);
  const data = fs.readFileSync(fullPath);
  if (data.length < 24 || data.toString('ascii', 1, 4) !== 'PNG') return fail(`Geçersiz PNG: ${relativePath}`);
  const width = data.readUInt32BE(16); const height = data.readUInt32BE(20);
  if (width !== expectedWidth || height !== expectedHeight) fail(`${relativePath}: ${width}x${height}; beklenen ${expectedWidth}x${expectedHeight}`);
}

if (config.android?.package !== 'com.aitolian.pdfokuyucu') fail('Android package beklenen com.aitolian.pdfokuyucu değil.');
if (!Number.isInteger(config.android?.versionCode) || config.android.versionCode < 1) fail('android.versionCode pozitif tam sayı olmalı.');
if (!config.android?.adaptiveIcon?.foregroundImage) fail('Adaptive icon foregroundImage eksik.');
if (!config.icon) fail('Uygulama icon alanı eksik.');
if (config.extra?.privacyPolicyUrl !== 'https://mrzekai.github.io/privacy-policy.html') fail('Gizlilik politikası kök public Pages URL’sini kullanmalı.');
const pdfViewIntent = config.android?.intentFilters?.find((item) => item.action === 'VIEW' && item.data?.some((entry) => entry.mimeType === 'application/pdf' && entry.scheme === 'content'));
if (!pdfViewIntent) fail('Android application/pdf VIEW intent-filter eksik.');
const buildProperties = config.plugins.find((item) => Array.isArray(item) && item[0] === 'expo-build-properties')?.[1]?.android;
if (buildProperties?.enableMinifyInReleaseBuilds !== true) fail('Release R8/minify etkin değil.');
if (buildProperties?.enableShrinkResourcesInReleaseBuilds !== true) fail('Release resource shrinking etkin değil.');

const admob = config.extra?.admob || {};
if (!/^ca-app-pub-\d{16}~\d{10}$/.test(config.plugins.find((item) => Array.isArray(item) && item[0] === 'react-native-google-mobile-ads')?.[1]?.androidAppId || '')) fail('Geçerli production Android AdMob App ID yok.');
if (!/^ca-app-pub-\d{16}\/\d{10}$/.test(admob.bannerAndroid || '')) fail('Geçerli Android banner unit ID yok.');
if (!/^ca-app-pub-\d{16}\/\d{10}$/.test(admob.appOpenAndroid || '')) fail('Geçerli Android app-open unit ID yok.');
if ((admob.bannerAndroid || '').startsWith('ca-app-pub-3940256099942544')) fail('Release banner test ID kullanıyor.');
if ((admob.appOpenAndroid || '').startsWith('ca-app-pub-3940256099942544')) fail('Release app-open test ID kullanıyor.');

const i18nSource = text('constants/i18n.ts');
const homeSource = text('app/(tabs)/index.tsx');
const tabsSource = text('app/(tabs)/_layout.tsx');
const readerSource = text('app/reader/[id].tsx');
if (i18nSource.includes('Belgelerin. Hızın. Odağın.')) fail('Eski ve belirsiz ana ekran sloganı kaynakta kalmış.');
if (homeSource.includes('name="sparkles"')) fail('İşlevsiz ana ekran yıldız düğmesi yeniden eklenmiş.');
if (!tabsSource.includes('<AdBanner separateFromNavigation/>') || tabsSource.indexOf('<AdBanner separateFromNavigation/>') > tabsSource.indexOf('<BottomTabBar')) fail('Banner, alt sekme gezinmesinin üstünde ve ayrılmış olmalı.');
if (!readerSource.includes("edges={['bottom']}")) fail('PDF okuyucu alt araç çubuğu sistem güvenli alanını korumuyor.');

pngSize('assets/icon.png', 1024, 1024);
pngSize('assets/adaptive-icon.png', 1024, 1024);
pngSize('assets/monochrome-icon.png', 1024, 1024);
pngSize('play-store/icon-512.png', 512, 512);
pngSize('play-store/feature-graphic-1024x500.png', 1024, 500);
for (let i = 1; i <= 4; i += 1) pngSize(`play-store/screenshots/screenshot-0${i}-${['home','library','reader','settings'][i-1]}.png`, 1080, 1920);
for (const locale of ['tr-TR', 'en-US', 'es-ES']) exists(`play-store/listings/${locale}.txt`);
exists('docs/privacy-policy.html');
exists('docs/app-ads.txt');
if (fs.existsSync(path.join(root, 'docs/app-ads.txt')) && fs.readFileSync(path.join(root, 'docs/app-ads.txt'), 'utf8').trim() !== 'google.com, pub-1380972808968213, DIRECT, f08c47fec0942fa0') fail('docs/app-ads.txt publisher satırı beklenen değer değil.');

if (errors.length) {
  console.error(`Release kontrolü başarısız (${errors.length}):\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`Release kontrolü başarılı. package=${config.android.package}, versionCode=${config.android.versionCode}, R8+resource shrink açık, 4 mağaza ekranı hazır.`);
