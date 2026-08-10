export const languages = ['tr', 'en', 'es'] as const;

export type AppLanguage = (typeof languages)[number];

export const languageLabels: Record<AppLanguage, string> = {
  tr: 'Türkçe',
  en: 'English',
  es: 'Español'
};

export const languageTags: Record<AppLanguage, string> = {
  tr: 'tr-TR',
  en: 'en-US',
  es: 'es-ES'
};

const tr = {
  'tabs.home': 'Ana Sayfa',
  'tabs.library': 'Kütüphane',
  'tabs.favorites': 'Favoriler',
  'tabs.settings': 'Ayarlar',

  'home.eyebrow': 'PDF OKUYUCU',
  'home.welcome': 'Belgelerin. Hızın. Odağın.',
  'home.heroPill': 'HIZLI • GİZLİ • CİHAZINDA',
  'home.heroTitle': 'PDF’lerini\nanında aç.',
  'home.heroText': 'Karmaşa yok. Hesap yok. Belgeni seç ve okumaya başla.',
  'home.openPdf': 'PDF Aç',
  'home.openFromUrl': 'URL’den PDF aç',
  'home.continueEyebrow': 'SON OKUNAN',
  'home.continueTitle': 'Son okuduğun belge',
  'home.continuePage': 'Sayfa {page} / {total}',
  'home.continueTap': 'Dokun ve belgeyi aç',
  'home.quickEyebrow': 'HIZLI İŞLEMLER',
  'home.quickTitle': 'Ne yapmak istersin?',
  'home.quickOpenTitle': 'PDF Aç',
  'home.quickOpenDesc': 'Cihazdan seç',
  'home.quickUrlTitle': 'URL’den',
  'home.quickUrlDesc': 'İndir ve oku',
  'home.quickFavTitle': 'Favoriler',
  'home.quickFavDesc': '{count} belge',
  'home.quickSettingsTitle': 'Okuma Ayarı',
  'home.quickSettingsDesc': 'Görünümü seç',
  'home.statDocuments': 'Belge',
  'home.statPages': 'Okunan sayfa',
  'home.statFavorites': 'Favori',
  'home.recentEyebrow': 'SON AÇILANLAR',
  'home.recentTitle': 'Dosyalarına hızlı dön',
  'home.seeAll': 'Tümünü gör',
  'home.emptyTitle': 'Henüz PDF yok',
  'home.emptyText': 'İlk belgeni açtığında burada otomatik görünecek.',
  'home.privacyTitle': 'Belgelerin sana ait',
  'home.privacyText': 'PDF’ler cihazında tutulur. Okumak için hesap oluşturman gerekmez.',

  'library.kicker': 'KÜTÜPHANE',
  'library.title': 'Tüm PDF’lerin',
  'library.searchPlaceholder': 'Dosya adına göre ara',
  'library.deleteTitle': 'Belgeyi sil',
  'library.deleteMessage': '“{name}” cihazdaki uygulama kütüphanesinden silinsin mi?',
  'library.noMatchTitle': 'Eşleşen belge bulunamadı',
  'library.noMatchText': 'Başka bir dosya adı deneyin.',
  'library.emptyTitle': 'Kütüphane boş',
  'library.emptyText': 'PDF Aç düğmesiyle ilk belgenizi ekleyin.',

  'favorites.kicker': 'FAVORİLER',
  'favorites.title': 'Önemli belgeler',
  'favorites.subtitle': 'Sık döndüğün PDF’leri tek yerde tut.',
  'favorites.emptyTitle': 'Henüz favori yok',
  'favorites.emptyText': 'Bir belgenin kalp simgesine dokunduğunda burada görünecek.',

  'settings.kicker': 'AYARLAR',
  'settings.title': 'Senin okuma alanın',
  'settings.subtitle': 'Okuma davranışını, dili ve gizlilik seçeneklerini yönet.',
  'settings.readingSection': 'VARSAYILAN OKUMA',
  'settings.horizontalTitle': 'Yatay okuma',
  'settings.horizontalDesc': 'Sayfaları sağa-sola kaydır',
  'settings.snapTitle': 'Sayfaya yapış',
  'settings.snapDesc': 'Her kaydırmada tek sayfaya otur',
  'settings.nightTitle': 'PDF gece modu',
  'settings.nightDesc': 'Sayfa renklerini ters çevir',
  'settings.languageSection': 'DİL',
  'settings.adsSection': 'REKLAM & GİZLİLİK',
  'settings.consentTitle': 'Reklam izinlerini yenile',
  'settings.consentDesc': 'Google UMP izin durumunu yeniden kontrol et',
  'settings.policyTitle': 'Gizlilik politikası',
  'settings.policyDesc': 'Verilerin nasıl işlendiğini görüntüle',
  'settings.policyErrorTitle': 'Bağlantı açılamadı',
  'settings.policyErrorMessage': 'Gizlilik politikası şu anda açılamıyor.',
  'settings.dataSection': 'VERİ',
  'settings.wipeTitle': 'Kütüphaneyi temizle',
  'settings.wipeDesc': 'Yerel PDF kopyalarını ve geçmişi sil',
  'settings.wipeAlertTitle': 'Kütüphaneyi temizle',
  'settings.wipeAlertMessage': '{count} belge ve okuma geçmişi uygulamadan silinecek.',
  'settings.consentUpdatedTitle': 'Reklam izinleri güncellendi',
  'settings.consentUpdatedMessage': 'Google reklam izin durumu yeniden kontrol edildi.',
  'settings.consentErrorTitle': 'Gizlilik seçenekleri',
  'settings.consentErrorMessage': 'AdMob izin akışı şu anda kullanılamıyor. AdMob > Privacy & messaging ayarlarını kontrol edin.',
  'settings.about': 'PDF Okuyucu • Expo SDK 57 • Yerel PDF işleme',

  'reader.notFound': 'Belge bulunamadı',
  'reader.goBack': 'Geri dön',
  'reader.pageOf': '{page} / {total} sayfa',
  'reader.loading': 'PDF yükleniyor…',
  'reader.failedTitle': 'PDF açılamadı',
  'reader.retry': 'Tekrar dene',
  'reader.genericError': 'Bu PDF görüntülenemedi.',
  'reader.horizontal': 'Yatay',
  'reader.vertical': 'Dikey',
  'reader.singlePage': 'Tek sayfa',
  'reader.flow': 'Akış',
  'reader.night': 'Gece',
  'reader.passwordTitle': 'Şifreli PDF',
  'reader.passwordText': 'Bu belgeyi açmak için PDF şifresini girin.',
  'reader.passwordPlaceholder': 'PDF şifresi',
  'reader.passwordUnlock': 'PDF’yi Aç',

  'card.pdf': 'PDF',
  'card.pages': '{count} sayfa',
  'card.pagesUnknown': 'Sayfa bilgisi açınca gelir',
  'card.minutesAgo': '{count} dk önce',
  'card.hoursAgo': '{count} sa önce',
  'card.yesterday': 'Dün',
  'card.daysAgo': '{count} gün önce',

  'url.title': 'URL’den PDF aç',
  'url.caption': 'Dosya cihazına güvenli şekilde indirilir.',
  'url.placeholder': 'https://ornek.com/dosya.pdf',
  'url.error': 'PDF indirilemedi. Bağlantıyı kontrol edin.',
  'url.submit': 'İndir ve Aç',

  'ads.placeholder': 'REKLAM ALANI',

  'common.cancel': 'Vazgeç',
  'common.delete': 'Sil',
  'common.clear': 'Temizle',

  'files.onlyHttp': 'Yalnızca http/https bağlantıları desteklenir.',
  'files.openErrorTitle': 'PDF açılamadı',
  'files.openErrorMessage': 'Belge hazırlanırken bir hata oluştu.',
  'files.invalidPdf': 'Seçilen dosya geçerli bir PDF değil.',
  'files.tooLarge': 'PDF dosyası 250 MB sınırını aşıyor.',
  'files.defaultName': 'Belge.pdf',
  'files.webName': 'internet-belgesi.pdf'
};

const en: Record<keyof typeof tr, string> = {
  'tabs.home': 'Home',
  'tabs.library': 'Library',
  'tabs.favorites': 'Favorites',
  'tabs.settings': 'Settings',

  'home.eyebrow': 'PDF READER',
  'home.welcome': 'Your documents. Your pace. Your focus.',
  'home.heroPill': 'FAST • PRIVATE • ON DEVICE',
  'home.heroTitle': 'Open your PDFs\nin an instant.',
  'home.heroText': 'No clutter. No account. Pick a document and start reading.',
  'home.openPdf': 'Open PDF',
  'home.openFromUrl': 'Open PDF from URL',
  'home.continueEyebrow': 'CONTINUE READING',
  'home.continueTitle': 'Where you left off',
  'home.continuePage': 'Page {page} of {total}',
  'home.continueTap': 'Tap to open the document',
  'home.quickEyebrow': 'QUICK ACTIONS',
  'home.quickTitle': 'What would you like to do?',
  'home.quickOpenTitle': 'Open PDF',
  'home.quickOpenDesc': 'Pick from device',
  'home.quickUrlTitle': 'From URL',
  'home.quickUrlDesc': 'Download and read',
  'home.quickFavTitle': 'Favorites',
  'home.quickFavDesc': '{count} documents',
  'home.quickSettingsTitle': 'Reading Setup',
  'home.quickSettingsDesc': 'Choose your view',
  'home.statDocuments': 'Documents',
  'home.statPages': 'Pages read',
  'home.statFavorites': 'Favorites',
  'home.recentEyebrow': 'RECENTLY OPENED',
  'home.recentTitle': 'Jump back into your files',
  'home.seeAll': 'See all',
  'home.emptyTitle': 'No PDFs yet',
  'home.emptyText': 'Your first document will show up here automatically.',
  'home.privacyTitle': 'Your documents stay yours',
  'home.privacyText': 'PDFs are kept on your device. No account needed to read them.',

  'library.kicker': 'LIBRARY',
  'library.title': 'All your PDFs',
  'library.searchPlaceholder': 'Search by file name',
  'library.deleteTitle': 'Delete document',
  'library.deleteMessage': 'Remove “{name}” from the app library on this device?',
  'library.noMatchTitle': 'No matching document',
  'library.noMatchText': 'Try a different file name.',
  'library.emptyTitle': 'Library is empty',
  'library.emptyText': 'Use the Open PDF button to add your first document.',

  'favorites.kicker': 'FAVORITES',
  'favorites.title': 'Documents that matter',
  'favorites.subtitle': 'Keep the PDFs you return to in one place.',
  'favorites.emptyTitle': 'No favorites yet',
  'favorites.emptyText': 'Tap the heart icon on a document and it will appear here.',

  'settings.kicker': 'SETTINGS',
  'settings.title': 'Your reading space',
  'settings.subtitle': 'Manage reading behaviour, language and privacy options.',
  'settings.readingSection': 'DEFAULT READING',
  'settings.horizontalTitle': 'Horizontal reading',
  'settings.horizontalDesc': 'Swipe pages left and right',
  'settings.snapTitle': 'Snap to page',
  'settings.snapDesc': 'Settle on a single page per swipe',
  'settings.nightTitle': 'PDF night mode',
  'settings.nightDesc': 'Invert page colours',
  'settings.languageSection': 'LANGUAGE',
  'settings.adsSection': 'ADS & PRIVACY',
  'settings.consentTitle': 'Refresh ad consent',
  'settings.consentDesc': 'Re-check the Google UMP consent state',
  'settings.policyTitle': 'Privacy policy',
  'settings.policyDesc': 'See how data is handled',
  'settings.policyErrorTitle': 'Could not open the link',
  'settings.policyErrorMessage': 'The privacy policy cannot be opened right now.',
  'settings.dataSection': 'DATA',
  'settings.wipeTitle': 'Clear library',
  'settings.wipeDesc': 'Delete local PDF copies and history',
  'settings.wipeAlertTitle': 'Clear library',
  'settings.wipeAlertMessage': '{count} documents and the reading history will be deleted from the app.',
  'settings.consentUpdatedTitle': 'Ad consent updated',
  'settings.consentUpdatedMessage': 'The Google ad consent state has been re-checked.',
  'settings.consentErrorTitle': 'Privacy options',
  'settings.consentErrorMessage': 'The AdMob consent flow is unavailable right now. Check AdMob > Privacy & messaging.',
  'settings.about': 'PDF Reader • Expo SDK 57 • On-device PDF handling',

  'reader.notFound': 'Document not found',
  'reader.goBack': 'Go back',
  'reader.pageOf': 'page {page} of {total}',
  'reader.loading': 'Loading PDF…',
  'reader.failedTitle': 'Could not open the PDF',
  'reader.retry': 'Try again',
  'reader.genericError': 'This PDF could not be displayed.',
  'reader.horizontal': 'Horizontal',
  'reader.vertical': 'Vertical',
  'reader.singlePage': 'Single page',
  'reader.flow': 'Flow',
  'reader.night': 'Night',
  'reader.passwordTitle': 'Protected PDF',
  'reader.passwordText': 'Enter the PDF password to open this document.',
  'reader.passwordPlaceholder': 'PDF password',
  'reader.passwordUnlock': 'Open PDF',

  'card.pdf': 'PDF',
  'card.pages': '{count} pages',
  'card.pagesUnknown': 'Page count appears once opened',
  'card.minutesAgo': '{count} min ago',
  'card.hoursAgo': '{count} h ago',
  'card.yesterday': 'Yesterday',
  'card.daysAgo': '{count} days ago',

  'url.title': 'Open PDF from URL',
  'url.caption': 'The file is downloaded securely to your device.',
  'url.placeholder': 'https://example.com/file.pdf',
  'url.error': 'Could not download the PDF. Check the link.',
  'url.submit': 'Download and Open',

  'ads.placeholder': 'AD SPACE',

  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.clear': 'Clear',

  'files.onlyHttp': 'Only http/https links are supported.',
  'files.openErrorTitle': 'Could not open PDF',
  'files.openErrorMessage': 'Something went wrong while preparing the document.',
  'files.invalidPdf': 'The selected file is not a valid PDF.',
  'files.tooLarge': 'The PDF exceeds the 250 MB limit.',
  'files.defaultName': 'Document.pdf',
  'files.webName': 'web-document.pdf'
};

const es: Record<keyof typeof tr, string> = {
  'tabs.home': 'Inicio',
  'tabs.library': 'Biblioteca',
  'tabs.favorites': 'Favoritos',
  'tabs.settings': 'Ajustes',

  'home.eyebrow': 'LECTOR DE PDF',
  'home.welcome': 'Tus documentos. Tu ritmo. Tu enfoque.',
  'home.heroPill': 'RÁPIDO • PRIVADO • EN EL DISPOSITIVO',
  'home.heroTitle': 'Abre tus PDF\nal instante.',
  'home.heroText': 'Sin desorden. Sin cuenta. Elige un documento y empieza a leer.',
  'home.openPdf': 'Abrir PDF',
  'home.openFromUrl': 'Abrir PDF desde una URL',
  'home.continueEyebrow': 'SEGUIR LEYENDO',
  'home.continueTitle': 'Donde lo dejaste',
  'home.continuePage': 'Página {page} de {total}',
  'home.continueTap': 'Toca para abrir el documento',
  'home.quickEyebrow': 'ACCIONES RÁPIDAS',
  'home.quickTitle': '¿Qué quieres hacer?',
  'home.quickOpenTitle': 'Abrir PDF',
  'home.quickOpenDesc': 'Elegir del dispositivo',
  'home.quickUrlTitle': 'Desde URL',
  'home.quickUrlDesc': 'Descargar y leer',
  'home.quickFavTitle': 'Favoritos',
  'home.quickFavDesc': '{count} documentos',
  'home.quickSettingsTitle': 'Ajustes de lectura',
  'home.quickSettingsDesc': 'Elige la vista',
  'home.statDocuments': 'Documentos',
  'home.statPages': 'Páginas leídas',
  'home.statFavorites': 'Favoritos',
  'home.recentEyebrow': 'ABIERTOS RECIENTEMENTE',
  'home.recentTitle': 'Vuelve rápido a tus archivos',
  'home.seeAll': 'Ver todo',
  'home.emptyTitle': 'Aún no hay PDF',
  'home.emptyText': 'Tu primer documento aparecerá aquí automáticamente.',
  'home.privacyTitle': 'Tus documentos son tuyos',
  'home.privacyText': 'Los PDF se guardan en tu dispositivo. No necesitas una cuenta para leerlos.',

  'library.kicker': 'BIBLIOTECA',
  'library.title': 'Todos tus PDF',
  'library.searchPlaceholder': 'Buscar por nombre de archivo',
  'library.deleteTitle': 'Eliminar documento',
  'library.deleteMessage': '¿Quitar “{name}” de la biblioteca de la aplicación en este dispositivo?',
  'library.noMatchTitle': 'Ningún documento coincide',
  'library.noMatchText': 'Prueba con otro nombre de archivo.',
  'library.emptyTitle': 'La biblioteca está vacía',
  'library.emptyText': 'Usa el botón Abrir PDF para añadir tu primer documento.',

  'favorites.kicker': 'FAVORITOS',
  'favorites.title': 'Documentos importantes',
  'favorites.subtitle': 'Ten en un solo lugar los PDF a los que vuelves.',
  'favorites.emptyTitle': 'Aún no hay favoritos',
  'favorites.emptyText': 'Toca el icono de corazón en un documento y aparecerá aquí.',

  'settings.kicker': 'AJUSTES',
  'settings.title': 'Tu espacio de lectura',
  'settings.subtitle': 'Gestiona el comportamiento de lectura, el idioma y la privacidad.',
  'settings.readingSection': 'LECTURA PREDETERMINADA',
  'settings.horizontalTitle': 'Lectura horizontal',
  'settings.horizontalDesc': 'Desliza las páginas a izquierda y derecha',
  'settings.snapTitle': 'Ajustar a la página',
  'settings.snapDesc': 'Detenerse en una sola página por gesto',
  'settings.nightTitle': 'Modo nocturno del PDF',
  'settings.nightDesc': 'Invertir los colores de la página',
  'settings.languageSection': 'IDIOMA',
  'settings.adsSection': 'ANUNCIOS Y PRIVACIDAD',
  'settings.consentTitle': 'Actualizar consentimiento de anuncios',
  'settings.consentDesc': 'Volver a comprobar el estado de consentimiento de Google UMP',
  'settings.policyTitle': 'Política de privacidad',
  'settings.policyDesc': 'Consulta cómo se gestionan los datos',
  'settings.policyErrorTitle': 'No se pudo abrir el enlace',
  'settings.policyErrorMessage': 'La política de privacidad no se puede abrir ahora.',
  'settings.dataSection': 'DATOS',
  'settings.wipeTitle': 'Borrar la biblioteca',
  'settings.wipeDesc': 'Eliminar las copias locales de PDF y el historial',
  'settings.wipeAlertTitle': 'Borrar la biblioteca',
  'settings.wipeAlertMessage': 'Se eliminarán {count} documentos y el historial de lectura de la aplicación.',
  'settings.consentUpdatedTitle': 'Consentimiento actualizado',
  'settings.consentUpdatedMessage': 'Se ha vuelto a comprobar el estado de consentimiento de Google.',
  'settings.consentErrorTitle': 'Opciones de privacidad',
  'settings.consentErrorMessage': 'El flujo de consentimiento de AdMob no está disponible ahora. Revisa AdMob > Privacy & messaging.',
  'settings.about': 'Lector de PDF • Expo SDK 57 • Procesamiento local de PDF',

  'reader.notFound': 'Documento no encontrado',
  'reader.goBack': 'Volver',
  'reader.pageOf': 'página {page} de {total}',
  'reader.loading': 'Cargando el PDF…',
  'reader.failedTitle': 'No se pudo abrir el PDF',
  'reader.retry': 'Intentar de nuevo',
  'reader.genericError': 'No se pudo mostrar este PDF.',
  'reader.horizontal': 'Horizontal',
  'reader.vertical': 'Vertical',
  'reader.singlePage': 'Una página',
  'reader.flow': 'Continuo',
  'reader.night': 'Noche',
  'reader.passwordTitle': 'PDF protegido',
  'reader.passwordText': 'Introduce la contraseña del PDF para abrir este documento.',
  'reader.passwordPlaceholder': 'Contraseña del PDF',
  'reader.passwordUnlock': 'Abrir PDF',

  'card.pdf': 'PDF',
  'card.pages': '{count} páginas',
  'card.pagesUnknown': 'El número de páginas aparece al abrirlo',
  'card.minutesAgo': 'hace {count} min',
  'card.hoursAgo': 'hace {count} h',
  'card.yesterday': 'Ayer',
  'card.daysAgo': 'hace {count} días',

  'url.title': 'Abrir PDF desde una URL',
  'url.caption': 'El archivo se descarga de forma segura a tu dispositivo.',
  'url.placeholder': 'https://ejemplo.com/archivo.pdf',
  'url.error': 'No se pudo descargar el PDF. Comprueba el enlace.',
  'url.submit': 'Descargar y abrir',

  'ads.placeholder': 'ESPACIO PUBLICITARIO',

  'common.cancel': 'Cancelar',
  'common.delete': 'Eliminar',
  'common.clear': 'Borrar',

  'files.onlyHttp': 'Solo se admiten enlaces http/https.',
  'files.openErrorTitle': 'No se pudo abrir el PDF',
  'files.openErrorMessage': 'Se produjo un error al preparar el documento.',
  'files.invalidPdf': 'El archivo seleccionado no es un PDF válido.',
  'files.tooLarge': 'El PDF supera el límite de 250 MB.',
  'files.defaultName': 'Documento.pdf',
  'files.webName': 'documento-web.pdf'
};

const dictionaries: Record<AppLanguage, Record<keyof typeof tr, string>> = { tr, en, es };

export type TranslationKey = keyof typeof tr;
export type TranslationVars = Record<string, string | number>;

function interpolate(template: string, vars?: TranslationVars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => (key in vars ? String(vars[key]) : match));
}

export function translate(language: AppLanguage, key: TranslationKey, vars?: TranslationVars) {
  const dictionary = dictionaries[language] ?? dictionaries.tr;
  return interpolate(dictionary[key] ?? dictionaries.tr[key] ?? key, vars);
}

// Module-level language, so non-React modules (lib/pdfFiles.ts) can translate too.
let activeLanguage: AppLanguage = 'tr';

export function setActiveLanguage(language: AppLanguage) {
  activeLanguage = language;
}

export function getActiveLanguage() {
  return activeLanguage;
}

export function t(key: TranslationKey, vars?: TranslationVars) {
  return translate(activeLanguage, key, vars);
}

export function isAppLanguage(value: unknown): value is AppLanguage {
  return typeof value === 'string' && (languages as readonly string[]).includes(value);
}

/** Best-effort device language without adding a dependency. Falls back to Turkish. */
export function detectDeviceLanguage(): AppLanguage {
  try {
    const resolved = Intl.DateTimeFormat().resolvedOptions().locale ?? '';
    const short = resolved.slice(0, 2).toLowerCase();
    if (isAppLanguage(short)) return short;
  } catch {
    // Intl is not guaranteed on every Hermes build; Turkish stays the default.
  }
  return 'tr';
}
