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
 * DIKKAT — SADECE TAM AD ESLESMESI
 * --------------------------------
 * Onceki surumde `name.startsWith('play-services-ads')` kullanilmisti ve bu
 * kural `play-services-ads-identifier`'i da yakaliyordu. O artefakt BAGIMSIZ
 * bir surum hattinda (18.x) ilerler, 24.6.0 diye bir surumu yoktur. Sonuc:
 *
 *   Could not determine the dependencies of task ':app:processDebugResources'.
 *   Could not find com.google.android.gms:play-services-ads-identifier:24.6.0.
 *
 * Bu yuzden yalnizca ana artefaktin TAM ADI sabitlenir. play-services-ads
 * 24.6.0'in POM'u -base, -lite ve -identifier icin dogru surumleri kendisi
 * getirir; onlara dokunmak gerekmez ve dokunmak zararlidir.
 *
 * KALICILIK
 * ---------
 * android/ klasoru `expo prebuild --clean` ile her seferinde yeniden uretilir.
 * Bu yuzden duzeltme uretilen dosyaya degil, kaynak kontrollu bu config
 * plugin'ine yazilmistir ve her prebuild'de yeniden uygulanir.
 */

const ADS_SDK_VERSION = '24.6.0';

// Ana Ads SDK artefakti ile AYNI surum hattinda ilerleyenler.
// play-services-ads-identifier BILINCLI olarak listede degildir (18.x hatti).
const PINNED_ARTIFACTS = ['play-services-ads', 'play-services-ads-lite'];

const MARKER = '// expo-config-plugin: withAdsSdkPin';

const BLOCK = `
${MARKER}
allprojects {
    configurations.configureEach {
        resolutionStrategy {
            eachDependency { details ->
                def pinned = ${JSON.stringify(PINNED_ARTIFACTS).replace(/"/g, "'")}
                if (details.requested.group == 'com.google.android.gms'
                        && pinned.contains(details.requested.name)) {
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
