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
function text(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    fail(`Eksik dosya: ${relativePath}`);
    return '';
  }
  return fs.readFileSync(fullPath, 'utf8');
}
function pngSize(relativePath, expectedWidth, expectedHeight) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) return fail(`Eksik PNG: ${relativePath}`);
  const data = fs.readFileSync(fullPath);
  if (data.length < 24 || data.toString('ascii', 1, 4) !== 'PNG') return fail(`Geçersiz PNG: ${relativePath}`);
  const width = data.readUInt32BE(16); const height = data.readUInt32BE(20);
  if (width !== expectedWidth || height !== expectedHeight) fail(`${relativePath}: ${width}x${height}; beklenen ${expectedWidth}x${expectedHeight}`);
}

if (config.android?.package !== 'com.aitolian.pdfokuyucu') fail('Android package beklenen com.aitolian.pdfokuyucu değil.');
if (config.name !== 'PDF: Reader - Tools') fail('Desteklenmeyen cihaz dilleri için varsayılan uygulama adı PDF: Reader - Tools olmalı.');
if (!Number.isInteger(config.android?.versionCode) || config.android.versionCode < 1) fail('android.versionCode pozitif tam sayı olmalı.');
if (!config.android?.adaptiveIcon?.foregroundImage) fail('Adaptive icon foregroundImage eksik.');
if (!config.icon) fail('Uygulama icon alanı eksik.');
if (config.extra?.privacyPolicyUrl !== 'https://mrzekai.github.io/privacy-policy.html') fail('Gizlilik politikası kök public Pages URL’sini kullanmalı.');
const pdfViewIntent = config.android?.intentFilters?.find((item) => item.action === 'VIEW' && item.data?.some((entry) => entry.mimeType === 'application/pdf' && entry.scheme === 'content'));
if (!pdfViewIntent) fail('Android application/pdf VIEW intent-filter eksik.');
const buildProperties = config.plugins.find((item) => Array.isArray(item) && item[0] === 'expo-build-properties')?.[1]?.android;
if (buildProperties?.compileSdkVersion !== 36) fail('compileSdkVersion açıkça 36 olmalı.');
if (buildProperties?.targetSdkVersion !== 36) fail('targetSdkVersion açıkça 36 olmalı.');
if (buildProperties?.enableMinifyInReleaseBuilds !== true) fail('Release R8/minify etkin değil.');
if (buildProperties?.enableShrinkResourcesInReleaseBuilds !== true) fail('Release resource shrinking etkin değil.');

const packageJson = JSON.parse(text('package.json'));
exists('.env.example');
if (packageJson.dependencies?.['pdf-lib'] !== '1.17.1') fail('Cihaz içi PDF araçları için pdf-lib 1.17.1 sabiti eksik.');
if (!packageJson.dependencies?.['expo-image-picker']) fail('Kamera ile PDF tarama için expo-image-picker eksik.');
if (!packageJson.dependencies?.['expo-print']) fail('PDF oluşturma/yazdırma için expo-print eksik.');
const packageLock = JSON.parse(text('package-lock.json'));
if (packageLock.packages?.['']?.dependencies?.['pdf-lib'] !== '1.17.1' || packageLock.packages?.['node_modules/pdf-lib']?.version !== '1.17.1') fail('package-lock.json içindeki pdf-lib sabiti package.json ile eşleşmiyor.');
const localizationRange = packageJson.dependencies?.['expo-localization'] || '';
if (!/^~57\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(localizationRange)) fail('expo-localization Expo SDK 57 ile uyumlu tilde sürüm aralığında olmalı.');
const localizationPlugin = config.plugins.find((item) => Array.isArray(item) && item[0] === 'expo-localization')?.[1];
const expectedLocales = ['en', 'tr', 'es', 'pt', 'de', 'fr', 'it', 'ru', 'hi', 'id', 'ar', 'ja', 'ko', 'zh'];
for (const platform of ['android', 'ios']) {
  const supported = localizationPlugin?.supportedLocales?.[platform] || [];
  for (const language of expectedLocales) {
    if (!supported.includes(language)) fail(`${platform} desteklenen dillerinde ${language} eksik.`);
  }
}
for (const [language, expectedName] of Object.entries({ en:'PDF: Reader - Tools',tr:'PDF: Okuyucu - Araçları',es:'Lector PDF',pt:'Leitor de PDF',de:'PDF-Reader',fr:'Lecteur PDF',it:'Lettore PDF',ru:'PDF-ридер',hi:'PDF रीडर',id:'Pembaca PDF',ar:'قارئ PDF',ja:'PDFリーダー',ko:'PDF 리더',zh:'PDF 阅读器' })) {
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
if (!config.plugins.some((item) => Array.isArray(item) && item[0] === 'expo-image-picker')) fail('expo-image-picker config plugin eksik.');
if (!config.android?.blockedPermissions?.includes('android.permission.RECORD_AUDIO')) fail('Belge tarama özelliğinde gereksiz mikrofon izni engellenmemiş.');
if (appConfigSource.includes('supportsOpeningDocumentsInPlace') || appConfigSource.includes('enableFileSharing')) fail('iOS belge paylaşımı gizlilik politikasıyla çelişiyor.');
if (!appConfigSource.includes("['expo-router', { sitemap: false }]")) fail('Expo Router sitemap production buildde kapalı değil.');
if (!appConfigSource.includes("{ scheme: 'content', mimeType: 'application/octet-stream' }")) fail('PDF dış açma intent filtresinde application/octet-stream desteği eksik.');

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
const iconSource = text('play-store/source/icon.svg');
const bannerSource = text('components/AdBanner.tsx');
const themeSource = text('constants/theme.ts');
const settingsSource = text('app/(tabs)/settings.tsx');
const adsBootstrapSource = text('hooks/useAdsBootstrap.ts');
const appOpenSource = text('components/AppOpenAdController.tsx');
const appContextSource = text('context/AppContext.tsx');
const pdfFilesSource = text('lib/pdfFiles.ts');
const storageSource = text('lib/storage.ts');
const toolsSource = text('lib/pdfTools.ts');
const incomingHandlerSource = text('components/IncomingPdfHandler.tsx');
const incomingUriSource = text('lib/incomingPdfUri.ts');
const nativeIntentSource = text('app/+native-intent.tsx');
if (!nativeIntentSource.includes('redirectSystemPath') || !nativeIntentSource.includes('incomingPdf=') || !nativeIntentSource.includes('normalizeIncomingPdfUri')) fail('Expo Router native PDF intent rewrite kapısı eksik.');
if (!incomingUriSource.includes('parsed.protocol.toLowerCase() !== APP_SCHEME') || !incomingUriSource.includes('return `content://${authority}') || !incomingUriSource.includes('/^content:\\/\\//i')) fail('Android content URI / Expo custom-scheme normalizasyonu eksik.');
if (!incomingHandlerSource.includes('useGlobalSearchParams') || !incomingHandlerSource.includes('params.incomingPdf') || !incomingHandlerSource.includes('normalizeIncomingPdfUri')) fail('Incoming PDF handler native-intent query yolunu işlemiyor.');
if (i18nSource.includes('Belgelerin. Hızın. Odağın.')) fail('Eski ve belirsiz ana ekran sloganı kaynakta kalmış.');
if (storeHomeSource.includes('Belgelerin,') || storeHomeSource.includes('her an yanında')) fail('Eski ana ekran sloganı Türkçe mağaza görselinde kalmış.');
if (homeSource.includes('name="sparkles"')) fail('İşlevsiz ana ekran yıldız düğmesi yeniden eklenmiş.');
if (homeSource.includes("t('home.welcome')")) fail('İstenmeyen ana ekran sloganı yeniden eklenmiş.');
if ((
  (!homeSource.includes('colors={gradients.redPanel}') || !homeSource.includes('minHeight:158') || !homeSource.includes('numberOfLines={2}'))
  &&
  !(
    /* __industrialControlPanelAccepted */
    (
  homeSource.includes('PdfStackGraphic') &&
  homeSource.includes('styles.heroPanel') &&
  homeSource.includes('styles.sideRail') &&
  homeSource.includes('styles.dashboard')
)
  )
)) fail('Global dil uyumlu kırmızı metal ana ekran veya esnek araç kartları eksik.');
if (!i18nSource.includes("'home.privacyText': 'Your PDFs are not uploaded to the developer server.'") || !i18nSource.includes("'home.privacyText': 'PDF dosyalarınız geliştirici sunucusuna yüklenmez.'")) fail('PDF gizlilik iddiası geliştirici sunucusu sınırını doğru anlatmıyor.');
if (i18nSource.includes("'tools.localOnly': 'OFFLINE") || i18nSource.includes("'tools.localOnly': 'ÇEVRİMDIŞI")) fail('Uygulamanın tamamı için yanıltıcı çevrimdışı iddiası geri gelmiş.');
if (!iconSource.includes('<rect width="1024" height="1024" fill="url(#red)"') || !iconSource.includes('fill="#D3161E"')) fail('Play ikonu tam yüzey kırmızı kimliği veya net PDF rozeti taşımıyor.');
if (!tabsSource.includes('<AdBanner separateFromNavigation/>') || tabsSource.indexOf('<AdBanner separateFromNavigation/>') > tabsSource.indexOf('<BottomTabBar')) fail('Banner, alt sekme gezinmesinin üstünde ve ayrılmış olmalı.');
if (!bannerSource.includes('style={styles.contentGap}') || !bannerSource.includes('height: layout.adSeparation') || !themeSource.includes('adSeparation: 16')) fail('Banner ile içerik arasındaki 16 dp güvenli boşluk eksik.');
if (!bannerSource.includes('style={styles.navigationGap}') || !bannerSource.includes('height: layout.navigationSeparation') || !themeSource.includes('navigationSeparation: 28')) fail('Banner ile alt gezinme arasındaki 28 dp güvenli boşluk eksik.');
if (!bannerSource.includes('contentGap: { height: layout.adSeparation, backgroundColor: palette.ink, borderTopWidth') || !bannerSource.includes('navigationGap: { height: layout.navigationSeparation, backgroundColor: palette.ink, borderTopWidth')) fail('Banner güvenli boşluklarının görünür ayırıcı sınırları eksik.');
if (!bannerSource.includes('RETRY_DELAY_MS = 45_000') || !bannerSource.includes('MAX_ATTEMPTS = 3')) fail('Banner kontrollü yeniden deneme koruması eksik.');
if (!bannerSource.includes("AppState.addEventListener('change'") || !bannerSource.includes("state === 'active' && hidden")) fail('Android banner foreground kurtarma yolu eksik.');
if (!readerSource.includes("edges={['bottom']}")) fail('PDF okuyucu alt araç çubuğu sistem güvenli alanını korumuyor.');
if (!readerSource.includes('patchSettings({horizontal:!settings.horizontal})') || !readerSource.includes('patchSettings({invertPdfPages:!settings.invertPdfPages})')) fail('Okuyucu görünüm ayarları kalıcı AppContext ayarlarına bağlı değil.');
if (!settingsSource.includes('showPrivacyOptionsForm()') || !settingsSource.includes('openPrivacyPolicy')) fail('Ayarlar ekranındaki reklam tercihleri veya gizlilik politikası bağlantısı eksik.');
if (settingsSource.includes('languageLabels') || settingsSource.includes("t('settings.languageSection')") || settingsSource.includes('patchSettings({language')) fail('İstenmeyen uygulama içi manuel dil seçici yeniden eklenmiş.');
if (!settingsSource.includes('await refreshAds()') || !adsBootstrapSource.includes('startInFlight')) fail('UMP sonrası reklam başlatma yenilemesi veya yarış koruması eksik.');
if (appOpenSource.includes('requestNonPersonalizedAdsOnly')) fail('App-open reklamı UMP kararını geçersiz kılabilecek kişiselleştirme bayrağı içeriyor.');
if (appOpenSource.includes("AppState.addEventListener('change'") || appOpenSource.includes('MIN_BACKGROUND_MS') || appOpenSource.includes("'warm'")) fail('App-open reklamı banner bulunan warm-resume içeriği üzerine çıkabilecek yol içeriyor.');
if (!appOpenSource.includes('FIRST_AD_LAUNCH = 3') || !appOpenSource.includes('AD_VALIDITY_MS = 4 * 60 * 60 * 1000') || !appOpenSource.includes('launchInitializedRef')) fail('Cold app-open ilk kullanım/frequency-cap/tek launch sayımı koruması eksik.');
if (!appOpenSource.includes('showingRef.current = true;\n    cancelGateTimeout();\n    ad.show()')) fail('App-open show/OPENED yarışına karşı gate timeout iptali eksik.');
if (!readerSource.includes("if(id&&doc.pageCount!==pageCount)updateProgress(id,doc.lastPage,pageCount)")) fail('PDF yüklenirken kayıtlı son sayfayı 1’e sıfırlamama koruması eksik.');
if (!readerSource.includes("AppState.addEventListener('change'") || !readerSource.includes("state==='inactive'||state==='background'") || !readerSource.includes('flushProgress()')) fail('Reader background progress flush koruması eksik.');
if (!appContextSource.includes("AppState.addEventListener('change'") || !appContextSource.includes('saveDocuments(documentsRef.current)')) fail('Uygulama arka plana geçerken PDF kayıtlarını hemen kalıcılaştırma koruması eksik.');
if (!appContextSource.includes('isSameImportedPdf') || !pdfFilesSource.includes('FINGERPRINT_MAX_BYTES') || !pdfFilesSource.includes('(size ?? 0) <= FINGERPRINT_MAX_BYTES ? source.md5 : null')) fail('Aynı PDF’nin değişken picker URI’larıyla yinelenmesini güvenli boyut eşiğinde önleyen içerik özeti eksik.');
if (!pdfFilesSource.includes("t('files.invalidUrl')") || !pdfFilesSource.includes("method: 'HEAD', signal: controller.signal")) fail('URL doğrulaması veya HEAD zaman aşımı koruması eksik.');
if (!pdfFilesSource.includes("host.startsWith('::ffff:')")) fail('IPv4-mapped IPv6 yerel ağ engeli eksik.');
if (!pdfFilesSource.includes('const sourceSize = asset.size || source.size || 0') || !pdfFilesSource.includes('Paths.availableDiskSpace < sourceSize + MIN_FREE_DISK_BYTES')) fail('Cihazdan PDF kopyalanmadan önce boyut/disk preflight koruması eksik.');
if (!pdfFilesSource.includes('try { rawName = decodeURIComponent(encodedName); } catch { rawName = fallbackName; }')) fail('URL dosya adı için güvenli decode fallback eksik.');
if (!storageSource.includes('parsed.filter(isPdfDocument)')) fail('Kalıcı PDF kayıtları şema doğrulamasından geçmiyor.');
for (const guard of ['scanToPdf', 'imagesToPdf', 'createPdf', 'mergePdfs', 'splitPdf', 'extractPages', 'removePages', 'reorderPages', 'rotatePages', 'addWatermark', 'compressPdf', 'cleanMetadata', 'printPdf', 'MAX_TOOL_INPUT_BYTES']) if (!toolsSource.includes(guard)) fail(`PDF araç kapısı eksik: ${guard}`);
if (!toolsSource.includes('deletePdfFile(firstDocument.uri)')) fail('splitPdf ikinci çıktı başarısızlığında ilk dosya rollback koruması eksik.');
if (!toolsSource.includes('const bytes = await output.save({ useObjectStreams: true });') || toolsSource.includes("return saveGeneratedPdf(await output.save({ useObjectStreams: true }), requestedName);\n  } catch {\n    throw new Error(t('tools.unsupportedImage'))")) fail('Resimden PDF kaydetme hataları unsupported-image hatasıyla maskelenmemeli.');
if (!tabsSource.includes('name="tools"') || !tabsSource.includes('name="favorites" options={{ href: null }}')) fail('Araçlar sekmesi veya Kütüphane içi favori mimarisi eksik.');
if (!i18nSource.includes("return 'en';") || !i18nSource.includes("let activeLanguage: AppLanguage = 'en'")) fail('Desteklenmeyen dil için İngilizce yedekleme eksik.');

pngSize('assets/icon.png', 1024, 1024);
pngSize('assets/adaptive-icon.png', 1024, 1024);
pngSize('assets/monochrome-icon.png', 1024, 1024);
pngSize('play-store/icon-512.png', 512, 512);
pngSize('play-store/feature-graphic-1024x500.png', 1024, 500);
for (let i = 1; i <= 4; i += 1) pngSize(`play-store/screenshots/screenshot-0${i}-${['home','library','reader','settings'][i-1]}.png`, 1080, 1920);
for (const locale of ['en-US', 'es-ES']) {
  for (let i = 1; i <= 4; i += 1) pngSize(`play-store/screenshots/${locale}/screenshot-0${i}-${['home','library','reader','settings'][i-1]}.png`, 1080, 1920);
}
const forbiddenResumeClaims = {
  'fr-FR': 'reprise à la dernière page',
  'it-IT': 'ripresa dall’ultima pagina',
  'id-ID': 'lanjutkan dari halaman terakhir',
  'ar-SA': 'متابعة من آخر صفحة',
  'zh-CN': '从上次页面继续阅读',
  'hi-IN': 'अंतिम पृष्ठ से पढ़ना जारी रखें',
  'pt-BR': 'retomada da última página',
  'ja-JP': '最後のページから再開',
  'ko-KR': '마지막 페이지부터 이어 읽기'
};
for (const locale of ['en-US','tr-TR','es-ES','pt-BR','de-DE','fr-FR','it-IT','ru-RU','hi-IN','id-ID','ar-SA','ja-JP','ko-KR','zh-CN']) {
  const listingPath = `play-store/listings/${locale}.txt`;
  exists(listingPath);
  if (!fs.existsSync(path.join(root, listingPath))) continue;
  const listingText = text(listingPath);
  if (forbiddenResumeClaims[locale] && listingText.includes(forbiddenResumeClaims[locale])) fail(`${locale} mağaza metni otomatik son sayfaya devam özelliğini yanlış vaat ediyor.`);
  const blocks = listingText.trim().split(/\r?\n\s*\r?\n/);
  const title = (blocks[0]?.split(/\r?\n/)[1] || '').trim();
  const shortDescription = (blocks[1]?.split(/\r?\n/)[1] || '').trim();
  const longDescription = blocks.slice(2).join('\n\n').split(/\r?\n/).slice(1).join('\n').trim();
  if (!title || [...title].length > 30) fail(`${locale} mağaza başlığı boş veya 30 karakterden uzun.`);
  if (!shortDescription || [...shortDescription].length > 80) fail(`${locale} kısa açıklaması boş veya 80 karakterden uzun.`);
  if (!longDescription || [...longDescription].length > 4000) fail(`${locale} uzun açıklaması boş veya 4000 karakterden uzun.`);
}
exists('play-store/LISTING_REVIEW_STATUS.md');
exists('docs/privacy-policy.html');
exists('docs/app-ads.txt');
if (fs.existsSync(path.join(root, 'docs/app-ads.txt')) && fs.readFileSync(path.join(root, 'docs/app-ads.txt'), 'utf8').trim() !== 'google.com, pub-1380972808968213, DIRECT, f08c47fec0942fa0') fail('docs/app-ads.txt publisher satırı beklenen değer değil.');

if (errors.length) {
  console.error(`Release kontrolü başarısız (${errors.length}):\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`Release kontrolü başarılı. package=${config.android.package}, versionCode=${config.android.versionCode}, R8+resource shrink açık, 14 dil ve cihaz içi PDF araçları hazır.`);
