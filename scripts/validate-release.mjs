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
  // Satir sonlari normalize edilir. Windows'ta git, calisma kopyasini CRLF ile
  // olusturur; bu dosyadaki cok satirli kapilar ise '\n' arar. Normalize
  // edilmezse o kapilar CRLF'li bir kopyada sessizce yanlis sonuc verir -
  // ZIP'ten (LF) calisirken gecen bir kontrol, temiz bir klonda duser. Kapinin
  // sonucu dosyanin nasil teslim edildigine degil, icerigine bagli olmali.
  return fs.readFileSync(fullPath, 'utf8').replace(/\r\n/g, '\n');
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
if (config.name !== 'Offline PDF') fail('Desteklenmeyen cihaz dilleri için varsayılan uygulama adı Offline PDF olmalı.');
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
// Kamera ve galeriden gelen gorsel, gomulmeden once kucultulur. Bu olmazsa
// 12 MP'lik bir fotograf 4 MB olarak gomulur, uc fotograf 12 MB'lik bir PDF
// uretir ve uygulamanin kendi Optimize araci onu kucultemez - cunku pdf-lib
// belgenin icine girmis bir gorseli yeniden kodlayamaz. Sikayetin kaynagi
// burasiydi; bu satirlardan biri duserse sessizce geri gelir.
if (!packageJson.dependencies?.['expo-image-manipulator']) fail('Gorsel kucultme icin expo-image-manipulator eksik.');
const manipulatorRange = packageJson.dependencies?.['expo-image-manipulator'] || '';
if (!/^~57\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(manipulatorRange)) fail('expo-image-manipulator Expo SDK 57 tilde aralığında olmalı.');
const packageLock = JSON.parse(text('package-lock.json'));
if (packageLock.packages?.['']?.dependencies?.['pdf-lib'] !== '1.17.1' || packageLock.packages?.['node_modules/pdf-lib']?.version !== '1.17.1') fail('package-lock.json içindeki pdf-lib sabiti package.json ile eşleşmiyor.');
const localizationRange = packageJson.dependencies?.['expo-localization'] || '';
if (!/^~57\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(localizationRange)) fail('expo-localization Expo SDK 57 ile uyumlu tilde sürüm aralığında olmalı.');
const localizationPlugin = config.plugins.find((item) => Array.isArray(item) && item[0] === 'expo-localization')?.[1];
// Beklenen dil listesi elle yazılmaz: tek kaynak constants/i18n.ts içindeki
// languages dizisidir. Elle yazıldığında uygulama arayüzü 24 dile çıkarken bu
// kapı 14'te kalıyor ve yeni dillerin sistem ayarlarında görünmediği fark
// edilmiyordu. Kod 'fil' gibi üç harfli kodları da kapsar.
const languagesMatch = text('constants/i18n.ts').match(/export const languages\s*=\s*\[([^\]]+)\]/);
if (!languagesMatch) fail('constants/i18n.ts içinde languages dizisi bulunamadı.');
const expectedLocales = [...(languagesMatch?.[1] || '').matchAll(/'([a-z]{2,3})'/g)].map((match) => match[1]);
if (expectedLocales.length < 24) fail(`Uygulama arayüzü dil sayısı 24'ün altına düşmüş (${expectedLocales.length}).`);
for (const platform of ['android', 'ios']) {
  const supported = localizationPlugin?.supportedLocales?.[platform] || [];
  for (const language of expectedLocales) {
    if (!supported.includes(language)) fail(`${platform} desteklenen dillerinde ${language} eksik.`);
  }
}
const expectedAppNames = { en:'Offline PDF',tr:'Çevrimdışı PDF',de:'Offline PDF',es:'PDF Offline',fr:'PDF Hors Ligne',it:'PDF Offline',pt:'PDF Offline',nl:'Offline PDF',pl:'PDF Offline',ro:'PDF Offline',ru:'Офлайн PDF',uk:'Офлайн PDF',ar:'PDF أوفلاين',ur:'آف لائن PDF',hi:'ऑफ़लाइन PDF',bn:'অফলাইন PDF',id:'PDF Offline',ms:'PDF Offline',fil:'Offline PDF',vi:'PDF Offline',th:'PDF ออฟไลน์',ja:'オフラインPDF',ko:'오프라인 PDF',zh:'离线PDF' };
for (const language of expectedLocales) {
  if (!(language in expectedAppNames)) fail(`${language} için beklenen uygulama adı tanımlanmamış.`);
}
// Ikonun altindaki yazi kisa olmali. 14 karakteri asan ad launcher'da iki
// satira tasar ve kirpilir; kullanici uygulamayi adiyla taniyamaz hale gelir.
// Magaza baslugi uzun olabilir ve olmalidir da - o ayri bir alandir.
for (const [language, name] of Object.entries(expectedAppNames)) {
  if (name.length > 14) fail(`${language} uygulama adı ${name.length} karakter; ikon altında kırpılır (sınır 14).`);
}
for (const [language, expectedName] of Object.entries(expectedAppNames)) {
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
// Uygulamanin KENDI ICINDEKI adi ile IKON ALTINDAKI ad ayni sey degil ve ayni
// olmamali. Ikon altindaki yazi yukaridaki 14 karakter sinirina tabidir, cunku
// launcher onu kirpar. Uygulamanin icindeki baslik ise magaza basligiyla ayni
// olmali: yerellestirilmis tam magaza basligi. Kisa launcher adi yalnizca
// ikon altinda kullanilir; uygulama icinde ve Play Store basliginda tam ad kullanilir.
{
  const launcherNames = new Set(Object.values(expectedAppNames));
  const dictionaryFiles = ['constants/i18n.ts', ...fs.readdirSync(path.join(root, 'constants/translations')).map((file) => `constants/translations/${file}`)];
  let brandCount = 0;
  for (const file of dictionaryFiles) {
    for (const match of text(file).matchAll(/'app\.name'\s*:\s*'([^']*)'/g)) {
      brandCount += 1;
      if (launcherNames.has(match[1])) fail(`${file}: uygulama içi ad "${match[1]}" ikon altındaki kısa ad; mağaza başlığıyla aynı tam ad olmalı.`);
    }
  }
  if (brandCount !== expectedLocales.length) fail(`app.name tanımı ${brandCount} dilde bulundu, ${expectedLocales.length} bekleniyordu.`);
  if (!text('constants/i18n.ts').includes("'app.name': 'Offline PDF Viewer & Tools'")) fail('İngilizce uygulama içi ad mağaza başlığıyla eşleşmiyor.');
  const expectedInAppNames = {"en":"Offline PDF Viewer & Tools","tr":"Çevrimdışı PDF Okuyucu","es":"Lector PDF sin conexión","pt":"Leitor de PDF Offline","de":"PDF-Reader offline & Tools","fr":"Lecteur PDF hors ligne","it":"Lettore PDF offline: strumenti","ru":"PDF-ридер офлайн и инструменты","hi":"ऑफलाइन PDF रीडर व टूल्स","id":"Pembaca PDF Offline & Alat","ar":"قارئ PDF دون إنترنت وأدوات","ja":"オフラインPDFビューア・ツール","ko":"오프라인 PDF 뷰어 및 도구","zh":"离线 PDF 阅读器和工具","vi":"Đọc PDF ngoại tuyến & công cụ","th":"โปรแกรมอ่าน PDF ออฟไลน์","fil":"Offline PDF Reader at Tools","ms":"Pembaca PDF Luar Talian","bn":"অফলাইন PDF রিডার ও টুলস","ur":"آف لائن PDF ریڈر اور ٹولز","pl":"Czytnik PDF offline: narzędzia","uk":"PDF-рідер офлайн","nl":"Offline PDF-lezer & tools","ro":"Cititor PDF Offline & Unelte"};
  for (const [language, expectedName] of Object.entries(expectedInAppNames)) {
    const file = ['tr','en','es'].includes(language) ? 'constants/i18n.ts' : `constants/translations/${language}.ts`;
    const source = text(file);
    if (!source.includes(`'app.name': '${expectedName}'`) && !source.includes(`'app.name':'${expectedName}'`)) fail(`${language} uygulama içi adı final mağaza başlığıyla eşleşmiyor.`);
  }
}

const appConfigSource = text('app.config.js');
if (!config.plugins.some((item) => Array.isArray(item) && item[0] === 'expo-image-picker')) fail('expo-image-picker config plugin eksik.');
if (!config.android?.blockedPermissions?.includes('android.permission.RECORD_AUDIO')) fail('Belge tarama özelliğinde gereksiz mikrofon izni engellenmemiş.');
if (appConfigSource.includes('supportsOpeningDocumentsInPlace') || appConfigSource.includes('enableFileSharing')) fail('iOS belge paylaşımı gizlilik politikasıyla çelişiyor.');
if (!appConfigSource.includes("['expo-router', { sitemap: false }]")) fail('Expo Router sitemap production buildde kapalı değil.');
if (!appConfigSource.includes("{ scheme: 'content', mimeType: 'application/octet-stream' }")) fail('PDF dış açma intent filtresinde application/octet-stream desteği eksik.');

// --- Filigran: sessiz yanlis sonuc bir daha olmasin ---------------------
// Eski kod, gomulu fontun cizemedigi her karakteri bosluga cevirip geriye bir
// sey kalmayinca belgeye "PDF" basiyordu. Rusca СЕКРЕТНО yazan kullanici
// belgesinde "PDF" goruyordu - ve uygulama basarili diyordu. Bir aracin
// istenenden baska bir sey yapip basardim demesi, yapamam demesinden kotudur.
const toolsLibSource = text('lib/pdfTools.ts');
exists('assets/fonts/NotoSans-Watermark.ttf');
if (!packageJson.dependencies?.['@pdf-lib/fontkit']) fail('Unicode filigran için @pdf-lib/fontkit eksik.');
if (!packageJson.dependencies?.['expo-asset']) fail('Font varlığını okumak için expo-asset eksik.');
if (!toolsLibSource.includes('function prepareWatermark')) fail('Filigran metni doğrulanmıyor; desteklenmeyen karakterler sessizce düşürülebilir.');
if (!toolsLibSource.includes("t('tools.watermarkUnsupported'")) fail('Desteklenmeyen yazı sistemi kullanıcıya bildirilmiyor.');
if (/\(ascii \|\| 'PDF'\)/.test(toolsLibSource)) fail('Filigranda "PDF" yedek metni geri gelmiş; bu sessiz yanlış sonuç demektir.');
if (!toolsLibSource.includes('registerFontkit(fontkit)')) fail('Filigran gömülü Unicode fontunu kullanmıyor.');

// --- Sikistirma: vaat, davranis ve sonuc ayni seyi soylemeli --------------
// Magazanin kisa aciklamasi "compress PDF" diyor. Arac yalnizca dosya yapisini
// toparlasaydi bu vaat karsilanmazdi; goruntuleri yeniden kodlama olmadan
// taranmis bir belge kucultulemez. Kayipli gecis izin istemeden calismamali.
if (!toolsLibSource.includes('export async function compressPdfWithImages')) fail('Görsel yeniden kodlayan ikinci sıkıştırma geçişi yok.');
if (!toolsLibSource.includes('export type CompressOutcome')) fail('Sıkıştırma önce/sonra boyutunu döndürmüyor.');
const toolsScreen = text('app/(tabs)/tools.tsx');
if (!toolsScreen.includes("t('tools.compressResult'")) fail('Sıkıştırma sonucu kullanıcıya gösterilmiyor.');
if (!toolsScreen.includes("t('tools.compressLossyMessage')")) fail('Kayıplı sıkıştırma için kullanıcı onayı sorulmuyor.');
if (!toolsScreen.includes('runLossyCompression(staged)')) fail('Kayıplı geçiş yalnızca onaydan sonra çalışmıyor olabilir.');

// Yeniden kodlama yalnizca DeviceRGB akislara dokunabilir. DeviceGray hem
// seffaflik maskelerinin kendi renk uzayi hem de kodlayicinin uc kanalli JPEG
// dondurdugu durum; ikisinde de sayfa buyuk degil, yanlis cizilir. Ayrica yeni
// akis DeviceRGB sozluguyle yazildigi icin gercekten uc kanalli oldugu JPEG
// basligindan dogrulanmali - "kodlayici herhalde boyle yapar" bir dogrulama
// degildir.
if (toolsLibSource.includes("PDFName.of('DeviceGray')")) fail('Sıkıştırma DeviceGray akışlara dokunuyor; maske ve renk uzayı bozulabilir.');
if (!toolsLibSource.includes('function jpegComponentCount')) fail('Yeniden kodlanan JPEG kanal sayısı doğrulanmıyor.');

// Kayipsiz gecisin "kazandim" esigi. Ilk surumde kosul `repacked < source` idi:
// tek baytlik kazanc bile basari sayiliyordu. Taranmis bir belgede yeniden
// paketleme %1 kazanir, arac "3.9 MB -> 3.9 MB" yazip dururdu ve gercekten ise
// yarayacak goruntu gecisi hic onerilmezdi. Kullanicinin gordugu sey, araci
// calistirip hicbir sey olmamasiydi.
if (!toolsLibSource.includes('const MEANINGFUL_GAIN = 0.1')) fail('Kayıpsız sıkıştırma için anlamlı kazanç eşiği yok.');
if (!toolsLibSource.includes('if (gain >= MEANINGFUL_GAIN) return keepRepacked();')) fail('Kayıpsız sonuç eşiğe bakmadan döndürülüyor.');
if (!toolsLibSource.includes('if (countRecompressableImages(input) > 0) {')) fail('Görsel geçişi, yeniden kodlanacak görsel olup olmadığına bakmadan öneriliyor.');
if (!toolsLibSource.includes('function isRecompressableImage')) fail('Görsel seçim ölçütü tek yerde tanımlı değil; sayım ile iş birbirinden ayrılabilir.');

// Iki gecisli sikistirmanin dosya omru. loadPdf, okudugu secici kopyasini
// varsayilan olarak siler. Sikistirma ayni dosyayi iki kez okur ve arada
// kullaniciya soru sorar; birinci gecis dosyayi silince ikinci gecis, kullanici
// "devam et" dedikten SONRA ENOENT ile oluyordu. Onay alindiktan sonra basarisiz
// olmak, hic denememekten kotudur.
if (!toolsLibSource.includes('const input = await loadPdf(source, true);')) fail('Sıkıştırmanın ilk geçişi kaynağı ikinci geçiş için saklamıyor.');
if (!toolsLibSource.includes('if (!keepSource) cleanupCacheFile(source.uri);')) fail('loadPdf kaynağı koşulsuz siliyor.');
if (!toolsLibSource.includes('export function discardStagedPdf')) fail('Saklanan kaynağı serbest bırakacak yol yok.');
if (!toolsScreen.includes('discardStagedPdf(staged.uri)')) fail('Kullanıcı vazgeçtiğinde saklanan dosya önbellekte kalıyor.');

// --- Meta veri: gorunmeyen kopya da silinmeli ----------------------------
// Adlandirilmis alanlari bosaltmak isin yarisi. Ayni baslik ve yazar genelde
// katalogdaki XMP paketinde tekrarlanir ve okuyucularin cogu basligi ORADAN
// okur; olculdu: temizlenmis bir police belgesinde Info bombostu ama XMP hala
// sigortalinin adini tasiyordu. Ureticiye ozel anahtarlar (/Company,
// /SourceModified) da hicbir setter'in dokunmadigi yerde duruyordu.
if (!toolsLibSource.includes('function stripDocumentMetadata')) fail('Meta veri temizleme yalnızca adlandırılmış alanları siliyor.');
if (!toolsLibSource.includes("input.catalog.delete(key)")) fail('XMP paketi katalogdan silinmiyor.');
if (!toolsLibSource.includes('for (const key of [...info.keys()]) info.delete(key);')) fail('Info sözlüğündeki üreticiye özel anahtarlar bırakılıyor.');
if (!toolsLibSource.includes('stripDocumentMetadata(input);')) fail('cleanMetadata yeni temizlemeyi çağırmıyor.');

// --- Filigran: olculerek yerlesmeli, tahmin edilerek degil ---------------
// Eski yerlesim punto'yu karakter SAYISINDAN turetiyor ve metni donmemis gibi
// konumlandiriyordu. Olculdu: 18 durumun 8'inde metin sayfanin disina tasiyor,
// tasmadigi durumlarda da gozle gorulur sekilde sola kaciyordu.
if (!toolsLibSource.includes('export function layoutWatermark')) fail('Filigran yerleşimi ölçülerek hesaplanmıyor.');
if (!toolsLibSource.includes('measured * cos + size * sin <= usableWidth')) fail('Filigran döndürülmüş genişliğe göre sığdırılmıyor.');
if (/const size = Math\.max\(24, Math\.min\(64, width \//.test(toolsLibSource)) fail('Filigran punto tahmini karakter sayısından geri gelmiş.');

// --- Resimden PDF: butce gomulen baytlara bakmali ------------------------
// Eski butce secilen dosyalara bakiyordu (40 MB). Artik her gorsel gomulmeden
// once kucultuldugu icin bu olcu yanlis: siradan bir onikili fotograf destesi,
// sonucta uc megabayt tutacak bir belge icin reddediliyordu.
if (!toolsLibSource.includes('const MAX_EMBEDDED_TOTAL_BYTES')) fail('Gömülen bayt bütçesi yok.');
if (!toolsLibSource.includes('if (embeddedBytes > MAX_EMBEDDED_TOTAL_BYTES)')) fail('Gömülen bayt bütçesi kontrol edilmiyor.');
if (toolsLibSource.includes('MAX_IMAGE_TOTAL_BYTES')) fail('Ham girdiye bakan eski toplam görsel bütçesi geri gelmiş.');
if (!toolsLibSource.includes('if (jpegComponentCount(bytes) !== 3) continue;')) fail('Kanal sayısı doğrulanmadan akış değiştiriliyor.');

// --- Meta veri: tarihler da meta veridir ---------------------------------
if (!toolsLibSource.includes('input.setCreationDate(cleared)') || !toolsLibSource.includes('input.setModificationDate(cleared)')) fail('Meta veri temizlemede tarihler bırakılıyor.');

const workflowSource = text('.github/workflows/expo-android.yml');
// Uygulama adlari bir zamanlar hem burada hem workflow'da sabit yaziliydi.
// Buradaki liste 24 dile cikarildi, workflow'daki 14'te kaldi ve uygulama adi
// degisince build, kodda hicbir hata olmadigi halde dustu. Iki kaynak bir arada
// duramaz: workflow artik listeyi scripts/check-android-locales.mjs uzerinden
// locales/*.json dosyalarindan turetiyor.
if (!workflowSource.includes('node scripts/check-android-locales.mjs')) fail('Workflow, Android dil kontrolunu turetilmis betik uzerinden yapmiyor.');
if (/^\s+(en|tr)\|PDF/m.test(workflowSource)) fail('Workflow icinde sabit uygulama adi listesi geri gelmis.');
exists('scripts/check-android-locales.mjs');

const pdfToolsSource = text('lib/pdfTools.ts');
if (!pdfToolsSource.includes('const EMBED_MAX_EDGE = 1700')) fail('Gömme öncesi görsel küçültme sınırı kaldırılmış.');
if (!pdfToolsSource.includes('const scaled = await downscaleForEmbedding(source.uri, isPng);')) fail('Görsel, PDF\'e gömülmeden önce küçültülmüyor.');

const admob = config.extra?.admob || {};
if (!/^ca-app-pub-\d{16}~\d{10}$/.test(config.plugins.find((item) => Array.isArray(item) && item[0] === 'react-native-google-mobile-ads')?.[1]?.androidAppId || '')) fail('Geçerli production Android AdMob App ID yok.');
if (!/^ca-app-pub-\d{16}\/\d{10}$/.test(admob.bannerAndroid || '')) fail('Geçerli Android banner unit ID yok.');
if (!/^ca-app-pub-\d{16}\/\d{10}$/.test(admob.appOpenAndroid || '')) fail('Geçerli Android app-open unit ID yok.');
if (!/^ca-app-pub-\d{16}\/\d{10}$/.test(admob.interstitialAndroid || '')) fail('Geçerli Android interstitial unit ID yok.');
if (!/^ca-app-pub-\d{16}\/\d{10}$/.test(admob.rewardedAndroid || '')) fail('Geçerli Android rewarded unit ID yok.');
if ((admob.bannerAndroid || '').startsWith('ca-app-pub-3940256099942544')) fail('Release banner test ID kullanıyor.');
if ((admob.appOpenAndroid || '').startsWith('ca-app-pub-3940256099942544')) fail('Release app-open test ID kullanıyor.');
if ((admob.interstitialAndroid || '').startsWith('ca-app-pub-3940256099942544')) fail('Release interstitial test ID kullanıyor.');
if ((admob.rewardedAndroid || '').startsWith('ca-app-pub-3940256099942544')) fail('Release rewarded test ID kullanıyor.');

// Play "User Data" politikası, gizlilik politikasının İÇİNDE bir iletişim
// noktası ister; "Play kaydındaki adresi kullanın" yeterli sayılmaz ve bu,
// politika kaldırma bildirimlerinin en sık sebeplerinden biridir.
{
  const policy = text('docs/privacy-policy.html');
  if (!/mailto:[^"'@\s]+@[^"'\s]+/.test(policy)) fail('Gizlilik politikasında tıklanabilir bir iletişim e-postası yok (Play User Data şartı).');
  if (policy.includes('ILETISIM_EPOSTA_BURAYA')) fail('Gizlilik politikasındaki e-posta hâlâ yer tutucu; gerçek adresle değiştirin.');
  if (policy.includes('example.com')) fail('Gizlilik politikasında example.com adresi kalmış.');
}

// Gizlilik politikası dört reklam biçimini de saymalı; eksik beyan hem Play
// kullanıcı verisi politikası hem AdMob açısından risktir.
const policySource = text('docs/privacy-policy.html');
for (const marker of ['ödüllü', 'geçiş', 'rewarded', 'interstitial']) {
  if (!policySource.toLowerCase().includes(marker)) fail(`Gizlilik politikasında "${marker}" reklam biçimi beyan edilmemiş.`);
}

const i18nSource = text('constants/i18n.ts');
const homeSource = text('app/(tabs)/index.tsx');
const tabsSource = text('app/(tabs)/_layout.tsx');
const readerSource = text('app/reader/[id].tsx');
const storeHomeSource = text('play-store/source/screenshot-01-home.svg');
const iconSource = text('play-store/source/icon.svg');
const bannerSource = text('components/AdBanner.tsx');
const themeSource = text('constants/theme.ts');
const settingsSource = text('app/(tabs)/settings.tsx');
const toolsScreenSource = text('app/(tabs)/tools.tsx');
const pdfViewerSource = text('components/PdfViewer.tsx');
const adsBootstrapSource = text('hooks/useAdsBootstrap.ts');
const appOpenSource = text('components/AppOpenAdController.tsx');
const adGateSource = text('lib/adGate.ts');
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
// Cihaz dili languageCode'dan okunursa Android, Endonezce'yi Java'nin eski
// kodu olan "in" ile bildirir ve tam bir Endonezce sozluk dururken kullanici
// Ingilizce ekran gorur. languageTag her zaman modern BCP 47 kodunu verir;
// once o okunmali. Bu iki satirdan biri duserse kayip sessiz olur - kimse
// sikayet etmez, sadece o pazarda dil yanlis acilir.
if (!i18nSource.includes('locale?.languageTag?.toLowerCase().split(/[-_]/)[0]')) fail('Cihaz dili once languageTag üzerinden okunmuyor; Android eski dil kodlarında yanlış dil açılır.');
if (!i18nSource.includes("in: 'id'") || !i18nSource.includes("tl: 'fil'")) fail('Eski ISO dil kodu eşlemesi (in->id, tl->fil) eksik.');
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
if (!readerSource.includes("edges={['bottom','left','right']}") || !readerSource.includes("edges={['top','left','right']}")) fail('PDF okuyucu araç çubuğu veya başlığı yatay modda sistem güvenli alanını korumuyor.');
if (!readerSource.includes('router.canGoBack()') || !readerSource.includes('LOAD_TIMEOUT_MS')) fail('Okuyucu için garantili çıkış yolu veya yükleme zaman aşımı koruması eksik.');
if (!incomingHandlerSource.includes('handledParams.current.has(incomingPdf)')) fail('Harici PDF açılışında geri tuşunu kilitleyen tekrar yönlendirme koruması eksik.');
if (!toolsSource.includes('stagePdfForPrint(source.uri)') || toolsSource.includes('await Print.printAsync({ uri: source.uri })')) fail('Yazdırma, spooler hâlâ okurken silinen geçici dosyayı kullanıyor.');
// Bos filigran hala reddedilmeli. Kontrol prepareWatermark'a tasindi; kapi
// artik satirin tam metnini degil, davranisin yerinde durdugunu ariyor.
if (!toolsSource.includes("if (!text) throw new Error(t('tools.watermarkEmpty'))")) fail('Boş filigran metni doğrulaması eksik.');
if (!toolsSource.includes('MAX_PNG_PIXELS') || !toolsSource.includes('enforceImageBudget')) fail('Resimden PDF için tepe bellek sınırlaması eksik.');
if (!pdfFilesSource.includes('IMPORT_STAGING_PREFIX') || !pdfFilesSource.includes('cleanupPdfPrintCache')) fail('content:// görünen ad çözümü veya yazdırma önbelleği temizliği eksik.');
if (i18nSource.includes('Privacy & messaging')) fail('Kullanıcıya AdMob geliştirici konsolu yönergesi gösteriliyor.');
if (!config.plugins.includes('./plugins/withExpoPdfFixes')) fail('expo-pdf QA yaması config plugin olarak kayıtlı değil.');
exists('plugins/withExpoPdfFixes.js');
exists('plugins/expoPdfPatch.js');
exists('plugins/expo-pdf/KJExpoPdfView.patched.kt');
// BUG-17: sayfa ilk açılışta %30 çözünürlüklü ön katmanda kalıyordu, ancak
// parmakla yakınlaştırınca netleşiyordu. Bu üç değer olmadan hata geri gelir.
{
  const viewSource = text('plugins/expo-pdf/KJExpoPdfView.patched.kt');
  if (!viewSource.includes('Constants.THUMBNAIL_RATIO = SHARP_THUMBNAIL_RATIO') ||
      !viewSource.includes('Constants.Cache.CACHE_SIZE = TILE_CACHE_SIZE')) fail('PDF çizim kalitesi ayarları (BUG-17) kaldırılmış; sayfalar yeniden bulanık açılır.');
  if (!/private const val SHARP_THUMBNAIL_RATIO = 1\.0f/.test(viewSource)) fail('Ön katman tam çözünürlükte değil; aynı sayfa bir kalın bir ince görünmeye geri döner.');
  if (!viewSource.includes('Constants.Cache.THUMBNAILS_CACHE_SIZE = THUMBNAIL_CACHE_SIZE')) fail('Ön katman önbellek sınırı kaldırılmış; tam çözünürlüklü önizlemeler belleği zorlar.');
  if (viewSource.includes('Constants.PART_SIZE')) fail('PART_SIZE değiştirilmiş; bellek riski için cihazda ölçülmeden dokunulmamalı.');
  // PagesLoader ön yükleme alanını ÖNCE dolaşır ve parça sayısı CACHE_SIZE'a
  // ulaşınca durur. Bu değeri büyütmek bütçeyi ekran dışına harcar, bakılan
  // sayfa keskin katmanını hiç alamaz ve yazılar kalın/şişkin görünür.
  if (viewSource.includes('Constants.PRELOAD_OFFSET')) fail('PRELOAD_OFFSET değiştirilmiş; keskin katman bütçesi ekran dışına harcanır ve yazılar kalınlaşır.');
}
exists('plugins/expo-pdf/KJExpoPdfModule.patched.kt');
if (!toolsSource.includes('CAMERA_PERMISSION_BLOCKED') || !toolsSource.includes('permission.canAskAgain')) fail('Kalici kamera izni reddi icin canAskAgain isareti eksik.');
if (!toolsScreenSource.includes('CAMERA_PERMISSION_BLOCKED') || !toolsScreenSource.includes('Linking.openSettings()')) fail('Kalici kamera izni reddinde Ayarlari Ac yolu eksik.');
if (readerSource.includes('setError(message||')) fail('Yerel PDF motoru hata metni kullaniciya gosteriliyor.');
if (!readerSource.includes("failWith(code==='invalid_document'?t('reader.damagedError')")) fail('Bozuk PDF icin yerellestirilmis hata metni eslemesi eksik.');
if (!readerSource.includes("{error?t('reader.failedTitle'):count?t('reader.pageOf'")) fail('Hata durumunda okuyucu basligi hala yukleniyor gosteriyor.');
if (!readerSource.includes('const failWith=useCallback')) fail('Hata durumunda sayfa sayaci sifirlama korumasi eksik.');
if (!readerSource.includes('parsePageNumber') || !readerSource.includes("t('a11y.goToPage')") || !readerSource.includes('page={jumpTarget}')) fail('Sayfaya git ozelligi veya erisilebilirlik etiketi eksik.');
if (!pdfViewerSource.includes("requireNativeView('KJExpoPdf')") || !pdfViewerSource.includes('page?: number')) fail('Yerel PDF gorunumu sarmalayicisi sayfa prop destegini kaybetmis.');
if (!appConfigSource.includes('BUG-16 - intentional compatibility trade-off')) fail('octet-stream uyumluluk notu kaynakta yok.');
if (!readerSource.includes('patchSettings({horizontal:!settings.horizontal})') || !readerSource.includes('patchSettings({invertPdfPages:!settings.invertPdfPages})')) fail('Okuyucu görünüm ayarları kalıcı AppContext ayarlarına bağlı değil.');
if (!settingsSource.includes('showPrivacyOptionsForm()') || !settingsSource.includes('openPrivacyPolicy')) fail('Ayarlar ekranındaki reklam tercihleri veya gizlilik politikası bağlantısı eksik.');
if (settingsSource.includes('languageLabels') || settingsSource.includes("t('settings.languageSection')") || settingsSource.includes('patchSettings({language')) fail('İstenmeyen uygulama içi manuel dil seçici yeniden eklenmiş.');
if (!settingsSource.includes('await refreshAds()') || !adsBootstrapSource.includes('startInFlight')) fail('UMP sonrası reklam başlatma yenilemesi veya yarış koruması eksik.');
if (appOpenSource.includes('requestNonPersonalizedAdsOnly')) fail('App-open reklamı UMP kararını geçersiz kılabilecek kişiselleştirme bayrağı içeriyor.');
if (appOpenSource.includes("AppState.addEventListener('change'") || appOpenSource.includes('MIN_BACKGROUND_MS') || appOpenSource.includes("'warm'")) fail('App-open reklamı banner bulunan warm-resume içeriği üzerine çıkabilecek yol içeriyor.');
if (!appOpenSource.includes('FIRST_AD_LAUNCH = 2') || !appOpenSource.includes('AD_VALIDITY_MS = 4 * 60 * 60 * 1000') || !appOpenSource.includes('launchInitializedRef')) fail('Cold app-open ilk kullanım/creative tazelik/tek launch sayımı koruması eksik.');
// v58 reklam modeli: tempo AdMob panelinde, kodda tek kural var.
if (!appOpenSource.includes('Date.now() - lastShownAt >= MIN_FULL_SCREEN_GAP_MS')) fail('App-open paylaşılan tam ekran aralığı kuralını kullanmıyor.');
if (!appOpenSource.includes('openedWithDocument')) fail('PDF niyetiyle açılışta app-open reklamını bastırma koruması eksik.');
if (!adGateSource.includes('export const MIN_FULL_SCREEN_GAP_MS = 60 * 1000')) fail('Tam ekran reklamlar arası tek pacing kuralı (60 sn) değişmiş.');
if (!adGateSource.includes('export const AD_PAUSE_DURATION_MS = 10 * 60 * 1000')) fail('Ödüllü reklam karşılığı reklamsız süre 10 dakika değil.');
// Ödül süresi koddan değişip metinlerde eski değer kalırsa kullanıcıya yanlış
// vaat edilir; AdMob ödüllü politikası ödülün doğru bildirilmesini şart koşar.
// tr/en/es sözlükleri i18n.ts içinde satır içi durur; geri kalan her dil ayrı
// dosyadadır. Liste yine languages dizisinden türetilir ki yeni bir dil
// eklendiğinde bu kapı sessizce o dili atlamasın.
for (const dict of ['constants/i18n.ts', ...expectedLocales.filter((l) => !['tr','en','es'].includes(l)).map((l) => `constants/translations/${l}.ts`)]) {
  for (const line of text(dict).split('\n')) {
    if (line.includes("settings.adPause") && line.includes('30')) fail(`${dict}: ödül metni hâlâ 30 dakika vaat ediyor, süre 10 dakika.`);
  }
}
if (adGateSource.includes('MAX_INTERSTITIALS_PER_SESSION') || adGateSource.includes('MAX_INTERSTITIALS_PER_DAY') || adGateSource.includes('FREE_TOOL_RUNS')) fail('Geçiş reklamı yeniden koddaki sessiz kotalara bağlanmış; tempo AdMob panelinde olmalı.');
if (!adGateSource.includes('export async function prepareToolAd') || !toolsScreenSource.includes('void prepareToolAd()')) fail('Araçlar ekranı açılırken geçiş reklamını önden yükleme eksik.');
if (!toolsScreenSource.includes('deferFollowUpAd()') || !toolsScreenSource.includes('maybeShowPendingInterstitial()')) fail('"Aç" sonrası ertelenen geçiş reklamı okuyucudan dönüşte gösterilmiyor.');
// Ana sayfadan belge açma en yoğun eylem. Reklam belgenin ÖNÜNE asla konmaz;
// okuyucudan dönüşte gösterilir. Bu iki satırdan biri düşerse ya gelir kaybolur
// ya da Better Ads Experiences riski geri gelir.
if (!homeSource.includes('markInterstitialPending()') || !homeSource.includes('void maybeShowPendingInterstitial()')) fail('Ana sayfada belge açıldıktan sonra ertelenen geçiş reklamı eksik.');
if (homeSource.includes('maybeShowToolInterstitial')) fail('Ana sayfa reklamı belgenin önünde gösteriyor; yalnızca ertelemeli yol kullanılmalı.');
// Başka uygulamadan tıklanan PDF, uygulamaya en yoğun giriş yolu. Reklam
// belgenin önüne konmaz (app-open bu açılışta zaten bastırılıyor), okuyucudan
// dönüşte gösterilir.
if (!incomingHandlerSource.includes('markInterstitialPending()')) fail('Harici PDF açılışından sonra ertelenen geçiş reklamı eksik.');
if (incomingHandlerSource.includes('maybeShowToolInterstitial') || incomingHandlerSource.includes('maybeShowPendingInterstitial')) fail('Harici PDF yolunda reklam belgenin önünde gösteriliyor.');
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
// Reklam içerik derecelendirmesi: bir PDF okuyucuya yetişkin içerikli reklam
// düşmesi hem kullanıcı şikayeti hem politika sorunudur. Ayar initialize()
// çağrısından ÖNCE uygulanmalı, sonra uygulanırsa ilk istekler kaçar.
{
  const adsBootstrap = text('hooks/useAdsBootstrap.ts');
// UMP guidance: refresh consent on every launch before the first ad request.
const consentEffect = adsBootstrap.slice(adsBootstrap.indexOf('useEffect(() => {'), adsBootstrap.indexOf('return { status, refresh };'));
if (consentEffect.indexOf('void startIfAllowed()') !== -1 && consentEffect.indexOf('void startIfAllowed()') < consentEffect.indexOf('AdsConsent.gatherConsent()')) fail('gatherConsent() must happen before any cached-consent ad start.');

  if (!adsBootstrap.includes('maxAdContentRating: MaxAdContentRating.PG')) fail('AdMob içerik derecelendirmesi (PG) ayarlanmamış.');
  if (adsBootstrap.indexOf('setRequestConfiguration') > adsBootstrap.indexOf('mobileAds().initialize()')) fail('Reklam içerik derecelendirmesi initialize() sonrasına kalmış.');
}

// "Zaten optimize" bir sonuçtur, hata değil. Kırmızı hata penceresiyle
// gösterilmesi kullanıcıya bir şeyin bozulduğunu düşündürüyordu.
{
  const toolsLib = text('lib/pdfTools.ts');
  if (!toolsLib.includes('COMPRESSION_NO_GAIN')) fail('Sıkıştırma "kazanç yok" durumu ayrı bir kodla işaretlenmiyor.');
  if (!toolsScreenSource.includes("t('tools.infoTitle')")) fail('Sıkıştırma sonucu hâlâ hata başlığıyla gösteriliyor.');
}

// Uygulama içi puan isteme: yıldız ortalaması Play sıralamasında doğrudan
// sinyaldir ve kendiliğinden yorum yazanların çoğu memnun olmayanlardır.
{
  const review = text('lib/reviewPrompt.ts');
  if (!review.includes('StoreReview.requestReview()')) fail('Uygulama içi puan isteme akışı eksik.');
  if (!review.includes('MIN_SUCCESSFUL_RUNS')) fail('Puan isteme eşiği yok; ilk kullanımda sorulması ortalamayı düşürür.');
  if (!toolsScreenSource.includes('maybeAskForReview()')) fail('Puan isteme hiçbir yerden çağrılmıyor.');
  if (!toolsScreenSource.includes('if (!shownAd) await maybeAskForReview()')) fail('Puan isteme reklamdan hemen sonra sorulabiliyor; ayrı turda olmalı.');
}

// Sürüm adı derlemeden türetilmeli; 60+ sürüm boyunca "1.0.0" görünmek hem
// güvensiz duruyor hem hata raporlarını takip edilemez yapıyor.
if (!appConfigSource.includes('version: `1.${androidVersionCode}.0`')) fail('versionName derleme numarasından türetilmiyor.');
if (!config.android?.blockedPermissions?.includes('android.permission.FOREGROUND_SERVICE')) fail('Kullanılmayan FOREGROUND_SERVICE izni engellenmemiş.');

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
const canonicalAsoText = text('play-store/FINAL_26_LOCALES_ASO.txt');
const canonicalAso = new Map();
const canonicalSectionPattern = /^={10,}\r?\n([^\r\n]+)\r?\n={10,}\r?\n\r?\nSTORE TITLE \[\d+\/30\]\r?\n(.*?)\r?\n\r?\nSHORT DESCRIPTION \[\d+\/80\]\r?\n(.*?)\r?\n\r?\nFULL DESCRIPTION \[\d+\/4000\]\r?\n([\s\S]*?)(?=\r?\n={10,}\r?\n|(?![\s\S]))/gm;
for (const match of canonicalAsoText.matchAll(canonicalSectionPattern)) {
  const locale = match[1].split(' — ')[0].trim();
  canonicalAso.set(locale, { title: match[2], shortDescription: match[3], longDescription: match[4].replace(/\r/g, '').trimEnd() });
}
if (canonicalAso.size !== 26) fail(`Kanonik ASO dosyasında 26 locale bekleniyordu, ${canonicalAso.size} bulundu.`);
const expectedStoreTitles = {"en-US":"Offline PDF Viewer & Tools","de-DE":"PDF-Reader offline & Tools","ar":"قارئ PDF دون إنترنت وأدوات","bn-BD":"অফলাইন PDF রিডার ও টুলস","id":"Pembaca PDF Offline & Alat","nl-NL":"Offline PDF-lezer & tools","fil":"Offline PDF Reader at Tools","fr-FR":"Lecteur PDF hors ligne","hi-IN":"ऑफलाइन PDF रीडर व टूल्स","ja-JP":"オフラインPDFビューア・ツール","ko-KR":"오프라인 PDF 뷰어 및 도구","pl-PL":"Czytnik PDF offline: narzędzia","ms":"Pembaca PDF Luar Talian","pt-BR":"Leitor de PDF Offline","pt-PT":"Leitor de PDF Offline","ro":"Cititor PDF Offline & Unelte","ru-RU":"PDF-ридер офлайн и инструменты","th":"โปรแกรมอ่าน PDF ออฟไลน์","tr-TR":"Çevrimdışı PDF Okuyucu","uk":"PDF-рідер офлайн","ur":"آف لائن PDF ریڈر اور ٹولز","vi":"Đọc PDF ngoại tuyến & công cụ","zh-CN":"离线 PDF 阅读器和工具","es-419":"Lector PDF sin conexión","es-ES":"Lector PDF sin conexión","it-IT":"Lettore PDF offline: strumenti"};
const expectedStoreShortDescriptions = {"en-US":"View PDFs offline without internet. Merge, split and compress on your device.","de-DE":"PDFs ohne Internet lesen, zusammenfügen, teilen und auf dem Gerät komprimieren.","ar":"اقرأ PDF بلا إنترنت، وادمج الملفات وقسّمها واضغطها على جهازك.","bn-BD":"ইন্টারনেট ছাড়াই PDF পড়ুন; ফোনে মার্জ, স্প্লিট ও কমপ্রেস করুন।","id":"Baca PDF tanpa internet. Gabungkan, pisahkan, dan kompres di perangkat Anda.","nl-NL":"Lees pdf's zonder internet. Voeg samen, splits en comprimeer op je apparaat.","fil":"Magbasa ng PDF offline. Pagsamahin, hatiin at i-compress sa iyong device.","fr-FR":"Lisez vos PDF sans Internet. Fusionnez, divisez et compressez sur l'appareil.","hi-IN":"बिना इंटरनेट PDF पढ़ें। फोन पर मर्ज, स्प्लिट और कंप्रेस करें।","ja-JP":"ネットなしでPDFを閲覧。端末上で結合、分割、圧縮できます。","ko-KR":"인터넷 없이 PDF를 읽고 기기에서 병합, 분할, 압축하세요.","pl-PL":"Czytaj PDF bez internetu. Łącz, dziel i kompresuj pliki na urządzeniu.","ms":"Baca PDF tanpa internet. Gabung, pisah dan mampatkan fail pada peranti anda.","pt-BR":"Leia PDFs sem internet. Junte, divida e comprima arquivos no seu celular.","pt-PT":"Leia PDF sem Internet. Una, divida e comprima ficheiros no seu telemóvel.","ro":"Citește PDF fără internet. Unește, separă și comprimă fișiere pe dispozitiv.","ru-RU":"Читайте PDF без интернета. Объединяйте, разделяйте и сжимайте на устройстве.","th":"อ่าน PDF ไม่ใช้อินเทอร์เน็ต รวม แยก และบีบอัดไฟล์บนอุปกรณ์ของคุณ","tr-TR":"PDF'leri internetsiz okuyun; cihazda birleştirin, bölün ve sıkıştırın.","uk":"Читайте PDF без інтернету. Об'єднуйте, розділяйте й стискайте на пристрої.","ur":"بغیر انٹرنیٹ PDF پڑھیں، فون پر فائلیں ضم، تقسیم اور کمپریس کریں۔","vi":"Đọc PDF không cần mạng. Ghép, tách và nén tệp ngay trên thiết bị.","zh-CN":"无需联网即可阅读 PDF，并在设备上合并、拆分和压缩文件。","es-419":"Lee PDF sin internet. Une, divide y comprime archivos en tu celular.","es-ES":"Lee PDF sin internet. Une, divide y comprime archivos directamente en tu móvil.","it-IT":"Leggi PDF senza Internet. Unisci, dividi e comprimi i file sul dispositivo."};
for (const locale of Object.keys(expectedStoreTitles)) {
  const listingPath = `play-store/listings/${locale}.txt`;
  exists(listingPath);
  if (!fs.existsSync(path.join(root, listingPath))) continue;
  const listingText = text(listingPath);
  const blocks = listingText.trim().split(/\r?\n\s*\r?\n/);
  const title = (blocks[0]?.split(/\r?\n/)[1] || '').trim();
  const shortDescription = (blocks[1]?.split(/\r?\n/)[1] || '').trim();
  const longDescription = blocks.slice(2).join('\n\n').split(/\r?\n/).slice(1).join('\n').trim();
  if (!title || [...title].length > 30) fail(`${locale} mağaza başlığı boş veya 30 karakterden uzun.`);
  if (!shortDescription || [...shortDescription].length > 80) fail(`${locale} kısa açıklaması boş veya 80 karakterden uzun.`);
  if (!longDescription || [...longDescription].length > 4000) fail(`${locale} uzun açıklaması boş veya 4000 karakterden uzun.`);
  if (title !== expectedStoreTitles[locale]) fail(`${locale} mağaza başlığı final ASO setiyle eşleşmiyor.`);
  if (shortDescription !== expectedStoreShortDescriptions[locale]) fail(`${locale} kısa açıklaması final ASO setiyle eşleşmiyor.`);
  const canonical = canonicalAso.get(locale);
  if (!canonical) fail(`${locale} kanonik 26-locale ASO dosyasında bulunamadı.`);
  else {
    if (title !== canonical.title) fail(`${locale} mağaza başlığı kanonik ASO dosyasıyla birebir eşleşmiyor.`);
    if (shortDescription !== canonical.shortDescription) fail(`${locale} kısa açıklaması kanonik ASO dosyasıyla birebir eşleşmiyor.`);
    if (longDescription !== canonical.longDescription) fail(`${locale} tam açıklaması kanonik ASO dosyasıyla birebir eşleşmiyor.`);
  }
}
if (Object.keys(expectedStoreTitles).length !== 26) fail('Final Google Play locale seti 26 olmalı.');
exists('play-store/LISTING_REVIEW_STATUS.md');
exists('docs/privacy-policy.html');
exists('docs/app-ads.txt');
if (fs.existsSync(path.join(root, 'docs/app-ads.txt')) && fs.readFileSync(path.join(root, 'docs/app-ads.txt'), 'utf8').trim() !== 'google.com, pub-1380972808968213, DIRECT, f08c47fec0942fa0') fail('docs/app-ads.txt publisher satırı beklenen değer değil.');

if (errors.length) {
  console.error(`Release kontrolü başarısız (${errors.length}):\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`Release kontrolü başarılı. package=${config.android.package}, versionCode=${config.android.versionCode}, R8+resource shrink açık, ${expectedLocales.length} dil ve cihaz içi PDF araçları hazır.`);
