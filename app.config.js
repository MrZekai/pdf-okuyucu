const ANDROID_SAMPLE_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
const IOS_SAMPLE_APP_ID = 'ca-app-pub-3940256099942544~1458002511';
const ANDROID_PRODUCTION_APP_ID = 'ca-app-pub-1380972808968213~2930057843';
const ANDROID_PRODUCTION_BANNER_ID = 'ca-app-pub-1380972808968213/6623949751';
const ANDROID_PRODUCTION_APP_OPEN_ID = 'ca-app-pub-1380972808968213/3997786415';
const PRIVACY_POLICY_URL = 'https://mrzekai.github.io/pdf-okuyucu/privacy-policy.html';

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
  android: {
    package: 'com.aitolian.pdfokuyucu',
    versionCode: androidVersionCode,
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
          // Google Mobile Ads SDK 25.x, Kotlin 2.3 metadata ile derlenmis durumda.
          // Expo SDK 57'nin varsayilani 2.1.20 oldugu icin
          // ":react-native-google-mobile-ads:compileDebugKotlin" hatasi veriyordu.
          kotlinVersion: '2.3.0',
          extraProguardRules: '-keep class com.google.android.gms.internal.consent_sdk.** { *; }'
        }
      }
    ],
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
