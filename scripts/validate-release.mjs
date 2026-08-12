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

const packageJson = JSON.parse(text('package.json'));
const localizationRange = packageJson.dependencies?.['expo-localization'] || '';
if (!/^~57\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(localizationRange)) fail('expo-localization Expo SDK 57 ile uyumlu tilde sürüm aralığında olmalı.');
const localizationPlugin = config.plugins.find((item) => Array.isArray(item) && item[0] === 'expo-localization')?.[1];
for (const platform of ['android', 'ios']) {
  const supported = localizationPlugin?.supportedLocales?.[platform] || [];
  for (const language of ['tr', 'en', 'es']) {
    if (!supported.includes(language)) fail(`${platform} desteklenen dillerinde ${language} eksik.`);
  }
}
for (const [language, expectedName] of Object.entries({ tr: 'PDF Okuyucu', en: 'PDF Reader', es: 'Lector PDF' })) {
  const localePath = config.locales?.[language];
  if (!localePath) {
    fail(`Yerelleştirilmiş uygulama adı yapılandırmasında ${language} eksik.`);
    continue;
  }
  exists(localePath);
  if (fs.existsSync(path.join(root, localePath))) {
    const locale = JSON.parse(text(localePath));
    if (locale.android?.app_name !== expectedName) fail(`${language} Android uygulama adı beklenen değer değil.`);
    if (locale.ios?.CFBundleDisplayName !== expectedName) fail(`${language} iOS uygulama adı beklenen değer değil.`);
  }
}
const appConfigSource = text('app.config.js');
if (appConfigSource.includes('supportsOpeningDocumentsInPlace') || appConfigSource.includes('enableFileSharing')) fail('iOS belge paylaşımı gizlilik politikasıyla çelişiyor.');

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
const storeHomeSource = text('play-store/source/screenshot-01-home.svg');
const bannerSource = text('components/AdBanner.tsx');
const settingsSource = text('app/(tabs)/settings.tsx');
const adsBootstrapSource = text('hooks/useAdsBootstrap.ts');
const appOpenSource = text('components/AppOpenAdController.tsx');
const appContextSource = text('context/AppContext.tsx');
const pdfFilesSource = text('lib/pdfFiles.ts');
const storageSource = text('lib/storage.ts');
if (i18nSource.includes('Belgelerin. Hızın. Odağın.')) fail('Eski ve belirsiz ana ekran sloganı kaynakta kalmış.');
if (storeHomeSource.includes('Belgelerin,') || storeHomeSource.includes('her an yanında')) fail('Eski ana ekran sloganı Türkçe mağaza görselinde kalmış.');
if (homeSource.includes('name="sparkles"')) fail('İşlevsiz ana ekran yıldız düğmesi yeniden eklenmiş.');
if (homeSource.includes("t('home.welcome')")) fail('İstenmeyen ana ekran sloganı yeniden eklenmiş.');
if (!tabsSource.includes('<AdBanner separateFromNavigation/>') || tabsSource.indexOf('<AdBanner separateFromNavigation/>') > tabsSource.indexOf('<BottomTabBar')) fail('Banner, alt sekme gezinmesinin üstünde ve ayrılmış olmalı.');
if (!bannerSource.includes('style={styles.contentGap}') || !bannerSource.includes('contentGap: { height: 16')) fail('Banner ile içerik arasındaki 16 dp güvenli boşluk eksik.');
if (!bannerSource.includes('style={styles.navigationGap}') || !bannerSource.includes('navigationGap: { height: 28')) fail('Banner ile alt gezinme arasındaki 28 dp güvenli boşluk eksik.');
if (!bannerSource.includes("contentGap: { height: 16, backgroundColor: '#050814', borderTopWidth") || !bannerSource.includes("navigationGap: { height: 28, backgroundColor: '#050814', borderTopWidth")) fail('Banner güvenli boşluklarının görünür ayırıcı sınırları eksik.');
if (!bannerSource.includes('RETRY_DELAY_MS = 45_000') || !bannerSource.includes('MAX_ATTEMPTS = 3')) fail('Banner kontrollü yeniden deneme koruması eksik.');
if (!bannerSource.includes("AppState.addEventListener('change'") || !bannerSource.includes("state === 'active' && hidden")) fail('Android banner foreground kurtarma yolu eksik.');
if (!readerSource.includes("edges={['bottom']}")) fail('PDF okuyucu alt araç çubuğu sistem güvenli alanını korumuyor.');
if (!readerSource.includes('patchSettings({horizontal:!settings.horizontal})') || !readerSource.includes('patchSettings({invertPdfPages:!settings.invertPdfPages})')) fail('Okuyucu görünüm ayarları kalıcı AppContext ayarlarına bağlı değil.');
if (!settingsSource.includes('showPrivacyOptionsForm()') || !settingsSource.includes('openPrivacyPolicy')) fail('Ayarlar ekranındaki reklam tercihleri veya gizlilik politikası bağlantısı eksik.');
if (!settingsSource.includes('await refreshAds()') || !adsBootstrapSource.includes('startInFlight')) fail('UMP sonrası reklam başlatma yenilemesi veya yarış koruması eksik.');
if (appOpenSource.includes('requestNonPersonalizedAdsOnly')) fail('App-open reklamı UMP kararını geçersiz kılabilecek kişiselleştirme bayrağı içeriyor.');
if (!readerSource.includes("if(id&&doc.pageCount!==pageCount)updateProgress(id,doc.lastPage,pageCount)")) fail('PDF yüklenirken kayıtlı son sayfayı 1’e sıfırlamama koruması eksik.');
if (!appContextSource.includes("AppState.addEventListener('change'") || !appContextSource.includes('saveDocuments(documentsRef.current)')) fail('Uygulama arka plana geçerken PDF kayıtlarını hemen kalıcılaştırma koruması eksik.');
if (!appContextSource.includes('isSameImportedPdf') || !pdfFilesSource.includes('fingerprint: source.md5')) fail('Aynı PDF’nin değişken picker URI’larıyla yinelenmesini önleyen içerik özeti eksik.');
if (!pdfFilesSource.includes("t('files.invalidUrl')") || !pdfFilesSource.includes("method: 'HEAD', signal: controller.signal")) fail('URL doğrulaması veya HEAD zaman aşımı koruması eksik.');
if (!storageSource.includes('parsed.filter(isPdfDocument)')) fail('Kalıcı PDF kayıtları şema doğrulamasından geçmiyor.');

pngSize('assets/icon.png', 1024, 1024);
pngSize('assets/adaptive-icon.png', 1024, 1024);
pngSize('assets/monochrome-icon.png', 1024, 1024);
pngSize('play-store/icon-512.png', 512, 512);
pngSize('play-store/feature-graphic-1024x500.png', 1024, 500);
for (let i = 1; i <= 4; i += 1) pngSize(`play-store/screenshots/screenshot-0${i}-${['home','library','reader','settings'][i-1]}.png`, 1080, 1920);
for (const locale of ['en-US', 'es-ES']) {
  for (let i = 1; i <= 4; i += 1) pngSize(`play-store/screenshots/${locale}/screenshot-0${i}-${['home','library','reader','settings'][i-1]}.png`, 1080, 1920);
}
for (const locale of ['tr-TR', 'en-US', 'es-ES']) exists(`play-store/listings/${locale}.txt`);
exists('docs/privacy-policy.html');
exists('docs/app-ads.txt');
if (fs.existsSync(path.join(root, 'docs/app-ads.txt')) && fs.readFileSync(path.join(root, 'docs/app-ads.txt'), 'utf8').trim() !== 'google.com, pub-1380972808968213, DIRECT, f08c47fec0942fa0') fail('docs/app-ads.txt publisher satırı beklenen değer değil.');

if (errors.length) {
  console.error(`Release kontrolü başarısız (${errors.length}):\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`Release kontrolü başarılı. package=${config.android.package}, versionCode=${config.android.versionCode}, R8+resource shrink açık, tr/en/es için 4’er mağaza ekranı hazır.`);
