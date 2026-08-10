const { withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * Google Mobile Ads Android SDK'sini Kotlin 2.1 metadata'si ile derlenmis
 * son surume sabitler.
 *
 * NEDEN GEREKLI
 * -------------
 * play-services-ads 25.0.0 (Subat 2026) Kotlin 2.3.0 metadata'si ile derlenmis
 * halde yayinlandi. Expo SDK 57 / React Native 0.86 arac zinciri ise
 * Kotlin 2.1.20 + KSP 2.1.20-2.0.1 kullanir. Bu ikisi bir arada calismaz:
 *
 *   :react-native-google-mobile-ads:compileDebugKotlin FAILED
 *   play-services-ads-25.4.0-api.jar!/META-INF/....kotlin_module
 *   Module was compiled with an incompatible version of Kotlin.
 *   The binary version of its metadata is 2.3.0, expected version is 2.1.0.
 *
 * Kotlin'i 2.3.x'e cikarmak cozum DEGIL: KSP ve Compose derleyicisi Expo
 * tarafindan 2.1.20'ye sabitlendigi icin bu kez expo-modules-core cokuyor
 * ("Exception in type checkers", AutoSizingComposable.kt).
 *
 * Dogru cozum: Kotlin'i Expo'nun sabitledigi surumde birakip Ads SDK'sini
 * 24.x hattina cekmek. react-native-google-mobile-ads 16.0.3 zaten
 * Android 24.6.0 kullanir; buradaki force yalnizca herhangi bir gecisli
 * bagimliligin 25.x'i geri surukleyememesi icin emniyet kemeridir.
 *
 * KALICILIK
 * ---------
 * android/ klasoru `expo prebuild --clean` ile her seferinde yeniden uretilir.
 * Bu yuzden duzeltme uretilen dosyaya degil, kaynak kontrollu bu config
 * plugin'ine yazilmistir ve her prebuild'de yeniden uygulanir.
 */

const ADS_SDK_VERSION = '24.6.0';

const MARKER = '// expo-config-plugin: withAdsSdkPin';

const BLOCK = `
${MARKER}
allprojects {
    configurations.configureEach {
        resolutionStrategy {
            eachDependency { details ->
                if (details.requested.group == 'com.google.android.gms'
                        && details.requested.name.startsWith('play-services-ads')) {
                    details.useVersion '${ADS_SDK_VERSION}'
                    details.because 'Kotlin 2.1.20 toolchain cannot read Kotlin 2.3 metadata shipped by play-services-ads 25.x'
                }
            }
        }
    }
}
`;

module.exports = function withAdsSdkPin(config) {
  return withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      throw new Error(
        'withAdsSdkPin: yalnizca Groovy android/build.gradle destekleniyor, bulunan: ' +
          cfg.modResults.language
      );
    }

    if (cfg.modResults.contents.includes(MARKER)) {
      return cfg;
    }

    cfg.modResults.contents = `${cfg.modResults.contents.trimEnd()}\n${BLOCK}`;
    return cfg;
  });
};
