const ANDROID_SAMPLE_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
const IOS_SAMPLE_APP_ID = 'ca-app-pub-3940256099942544~1458002511';

module.exports = ({ config }) => ({
  ...config,
  name: 'PDF Okuyucu',
  slug: 'pdf-okuyucu-premium',
  version: '1.0.0',
  orientation: 'default',
  scheme: 'pdfokuyucu',
  userInterfaceStyle: 'automatic',
  platforms: ['android', 'ios'],
  android: {
    package: 'com.aitolian.pdfokuyucu',
    adaptiveIcon: {
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
          extraProguardRules: '-keep class com.google.android.gms.internal.consent_sdk.** { *; }'
        }
      }
    ],
    [
      'react-native-google-mobile-ads',
      {
        androidAppId: process.env.EXPO_PUBLIC_ADMOB_APP_ID_ANDROID || ANDROID_SAMPLE_APP_ID,
        iosAppId: process.env.EXPO_PUBLIC_ADMOB_APP_ID_IOS || IOS_SAMPLE_APP_ID,
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
    admobUsesSampleAppIds:
      !process.env.EXPO_PUBLIC_ADMOB_APP_ID_ANDROID && !process.env.EXPO_PUBLIC_ADMOB_APP_ID_IOS
  }
});
