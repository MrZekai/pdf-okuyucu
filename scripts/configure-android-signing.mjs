import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const gradlePath = path.join(projectRoot, 'android', 'app', 'build.gradle');
const propertiesPath = path.join(projectRoot, 'android', 'keystore.properties');

if (!fs.existsSync(gradlePath)) throw new Error('android/app/build.gradle bulunamadı. Önce expo prebuild çalıştırın.');
if (!fs.existsSync(propertiesPath)) throw new Error('android/keystore.properties bulunamadı. Release imza bilgileri eksik.');

let source = fs.readFileSync(gradlePath, 'utf8');
const marker = 'def uploadKeystorePropertiesFile = rootProject.file("keystore.properties")';
if (source.includes(marker)) {
  console.log('Android release signing zaten yapılandırılmış.');
  process.exit(0);
}

const androidMarker = '\nandroid {\n';
if (!source.includes(androidMarker)) throw new Error('build.gradle içinde android bloğu bulunamadı.');
source = source.replace(androidMarker, `
${marker}
def uploadKeystoreProperties = new Properties()
uploadKeystoreProperties.load(new FileInputStream(uploadKeystorePropertiesFile))

android {
`);

const signingStart = source.indexOf('    signingConfigs {');
const buildTypesStart = source.indexOf('    buildTypes {', signingStart);
if (signingStart < 0 || buildTypesStart < 0) throw new Error('Gradle signingConfigs/buildTypes yapısı beklenen biçimde değil.');
const signingSection = source.slice(signingStart, buildTypesStart);
const signingClose = signingSection.lastIndexOf('    }');
if (signingClose < 0) throw new Error('signingConfigs kapanışı bulunamadı.');
const releaseSigning = `        release {
            storeFile file(uploadKeystoreProperties['storeFile'])
            storePassword uploadKeystoreProperties['storePassword']
            keyAlias uploadKeystoreProperties['keyAlias']
            keyPassword uploadKeystoreProperties['keyPassword']
        }
`;
const patchedSigning = signingSection.slice(0, signingClose) + releaseSigning + signingSection.slice(signingClose);
source = source.slice(0, signingStart) + patchedSigning + source.slice(buildTypesStart);

const releaseStart = source.indexOf('        release {', source.indexOf('    buildTypes {'));
const releaseEnd = source.indexOf('        }', releaseStart);
if (releaseStart < 0 || releaseEnd < 0) throw new Error('Release build type bulunamadı.');
const releaseBlock = source.slice(releaseStart, releaseEnd);
if (!releaseBlock.includes('signingConfig signingConfigs.debug')) throw new Error('Debug signing satırı bulunamadı; güvenli biçimde değiştirilemedi.');
source = source.slice(0, releaseStart) + releaseBlock.replace('signingConfig signingConfigs.debug', 'signingConfig signingConfigs.release') + source.slice(releaseEnd);

fs.writeFileSync(gradlePath, source);
console.log('Android release signing upload keystore için yapılandırıldı.');
