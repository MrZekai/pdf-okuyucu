const ANDROID_SAMPLE_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
const IOS_SAMPLE_APP_ID = 'ca-app-pub-3940256099942544~1458002511';
const ANDROID_PRODUCTION_APP_ID = 'ca-app-pub-1380972808968213~3816043340';
const ANDROID_PRODUCTION_BANNER_ID = 'ca-app-pub-1380972808968213/7265047779';
const ANDROID_PRODUCTION_APP_OPEN_ID = 'ca-app-pub-1380972808968213/1189880008';
const PRIVACY_POLICY_URL = 'https://mrzekai.github.io/privacy-policy.html';

const androidAppId = process.env.EXPO_PUBLIC_ADMOB_APP_ID_ANDROID || ANDROID_PRODUCTION_APP_ID;
const iosAppId = process.env.EXPO_PUBLIC_ADMOB_APP_ID_IOS || IOS_SAMPLE_APP_ID;
const androidVersionCode = Number.parseInt(process.env.ANDROID_VERSION_CODE || '1', 10);

if (!Number.isInteger(androidVersionCode) || androidVersionCode < 1) {
  throw new Error('ANDROID_VERSION_CODE must be a positive integer.');
}

module.exports = ({ config }) => ({
  ...config,
  name: 'PDF Okuyucu',
  slug: 'pdf-okuyucu-premium',
  version: '1.0.0',
  icon: './assets/icon.png',
  orientation: 'default',
  scheme: 'pdfokuyucu',
  userInterfaceStyle: 'automatic',
  platforms: ['android', 'ios'],
  locales: {
    tr: './locales/tr.json',
    en: './locales/en.json',
    es: './locales/es.json'
  },
  android: {
    package: 'com.aitolian.pdfokuyucu',
    allowBackup: false,
    versionCode: androidVersionCode,
    intentFilters: [
      {
        action: 'VIEW',
        category: ['DEFAULT', 'BROWSABLE'],
        data: [
          { scheme: 'content', mimeType: 'application/pdf' },
          { scheme: 'file', mimeType: 'application/pdf' }
        ]
      }
    ],
    blockedPermissions: [
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE'
    ],
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      monochromeImage: './assets/monochrome-icon.png',
      backgroundColor: '#0B1020'
    }
  },
  ios: {
    bundleIdentifier: 'com.aitolian.pdfokuyucu',
    supportsTablet: true
  },
  plugins: [
    'expo-router',
    [
      'expo-localization',
      {
        supportedLocales: {
          android: ['tr', 'en', 'es'],
          ios: ['tr', 'en', 'es']
        }
      }
    ],
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 180,
        resizeMode: 'contain',
        backgroundColor: '#0B1020',
        dark: {
          image: './assets/splash-icon.png',
          backgroundColor: '#0B1020'
        }
      }
    ],
    [
      'expo-file-system',
      {
        supportsOpeningDocumentsInPlace: true,
        enableFileSharing: true
      }
    ],
    [
      'expo-build-properties',
      {
        android: {
          compileSdkVersion: 36,
          targetSdkVersion: 36,
          // Expo SDK 57 / RN 0.86 arac zinciri Kotlin 2.1.20 + KSP 2.1.20-2.0.1 +
          // bu Kotlin surumune sabitlenmis Compose derleyicisi ile gelir.
          // Sadece kotlinVersion'i yukseltmek KSP ve Compose derleyicisini
          // senkronizasyondan cikarir; Run #7 bu yuzden
          // :expo-modules-core:compileDebugKotlin asamasinda
          // "Exception in type checkers" ile cokmustur (AutoSizingComposable.kt).
          // Bu yuzden Kotlin Expo'nun sabitledigi surumde birakilir ve
          // uyumsuz metadata iceren play-services-ads 25.x, plugins/withAdsSdkPin.js
          // ile 24.6.0'a sabitlenir.
          kotlinVersion: '2.1.20',
          enableMinifyInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
          extraProguardRules: '-keep class com.google.android.gms.internal.consent_sdk.** { *; }'
        }
      }
    ],
    './plugins/withAdsSdkPin',
    [
      'react-native-google-mobile-ads',
      {
        androidAppId,
        iosAppId,
        delayAppMeasurementInit: true,
        optimizeInitialization: true,
        optimizeAdLoading: true,
        userTrackingUsageDescription: 'Bu tanımlayıcı, izin vermeniz halinde size daha uygun reklamlar sunmak için kullanılabilir.'
      }
    ]
  ],
  experiments: {
    typedRoutes: true
  },
  extra: {
    privacyPolicyUrl: PRIVACY_POLICY_URL,
    admob: {
      bannerAndroid: process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID || ANDROID_PRODUCTION_BANNER_ID,
      bannerIos: process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS,
      appOpenAndroid: process.env.EXPO_PUBLIC_ADMOB_APP_OPEN_ANDROID || ANDROID_PRODUCTION_APP_OPEN_ID,
      appOpenIos: process.env.EXPO_PUBLIC_ADMOB_APP_OPEN_IOS,
      usesAndroidSampleAppId: androidAppId === ANDROID_SAMPLE_APP_ID,
      usesIosSampleAppId: iosAppId === IOS_SAMPLE_APP_ID
    }
  }
});
