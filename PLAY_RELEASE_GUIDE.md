# PDF Okuyucu — Play Store release kılavuzu

## 1. Tek seferlik upload key ve GitHub Secrets

Play Store’a yüklenen AAB, size ait bir **upload key** ile imzalanmalıdır. Bu anahtarı repoya eklemeyin ve kaybedilmemesi için güvenli bir yedeğini saklayın.

Windows PowerShell’de proje klasöründen:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\create-upload-keystore.ps1
```

Script keystore üretir ve Base64 içeriğini panoya kopyalar. GitHub → Repository → Settings → Secrets and variables → Actions bölümüne şunları ekleyin:

| Secret | Değer |
|---|---|
| `ANDROID_UPLOAD_KEYSTORE_BASE64` | Scriptin panoya kopyaladığı uzun Base64 metni |
| `ANDROID_UPLOAD_STORE_PASSWORD` | Seçtiğiniz keystore parolası |
| `ANDROID_UPLOAD_KEY_ALIAS` | Varsayılan: `pdf-okuyucu-upload` |
| `ANDROID_UPLOAD_KEY_PASSWORD` | Seçtiğiniz key parolası |

GitHub → Actions → **Expo Android Build** → Run workflow → `İmzalı Play Store AAB üret` seçili olarak çalıştırın. İndirilecek artifact adı `pdf-okuyucu-play-aab-v...` olur. Her workflow çalışmasında `versionCode`, GitHub `run_number` ile otomatik artar.

İlk yayında Play App Signing’i etkinleştirin. Sonraki tüm sürümlerde aynı upload key kullanılmalıdır.

## 2. AdMob eşleştirmesi — yayından önce zorunlu kontrol

Kodda kullanılan kimlikler:

- App ID: `ca-app-pub-1380972808968213~3816043340`
- Banner: `ca-app-pub-1380972808968213/7265047779`
- App open: `ca-app-pub-1380972808968213/1189880008`
- Android package: `com.aitolian.pdfokuyucu`

AdMob’daki bu App ID’nin uygulama kaydı **PDF Okuyucu** ve paket `com.aitolian.pdfokuyucu` ile eşleşmelidir. AdMob ekranındaki görünen adın “Hedef Zikirmatik” olması tek başına teknik hata değildir; fakat kayıt başka bir Play uygulamasına/paketine bağlıysa bu kimlikleri kullanmayın. AdMob’da PDF Okuyucu için doğru uygulama kaydı ve reklam birimleri oluşturup `.env` / workflow değerlerini güncelleyin.

Geliştirme derlemeleri otomatik olarak Google test banner ve app-open unit ID’lerini kullanır. Production kimlikleri yalnız release davranışında reklam isteği için kullanılır.

## 3. Gizlilik, UMP ve Data Safety

1. AdMob → Privacy & messaging → European regulations mesajını oluşturup yayımlayın.
2. Play Console gizlilik URL’si: `https://mrzekai.github.io/privacy-policy.html`
3. Play Data Safety yanıtları için `play-store/DATA_SAFETY_TR.md` dosyasını izleyin.
4. “Uygulama reklam içeriyor mu?” sorusuna **Evet** deyin.
5. Uygulama çocuklara yönelik değilse çocuk yaş gruplarını hedef kitleye eklemeyin. Eklenirse Families reklam kuralları ayrıca uygulanmalıdır.

## 4. app-ads.txt

Hazır satır `docs/app-ads.txt` içindedir:

```text
google.com, pub-1380972808968213, DIRECT, f08c47fec0942fa0
```

AdMob tarayıcısı dosyayı Play’deki geliştirici web sitesinin **alan adı kökünde** arar. Bu proje private kaldığı için yasal dosyalar ayrı ve public `MrZekai/MrZekai.github.io` reposunun kökünde yayınlanmalıdır. `docs/index.html`, `docs/privacy-policy.html` ve `docs/app-ads.txt` dosyalarını o reponun köküne kopyalayın. Son URL’ler `https://mrzekai.github.io/privacy-policy.html` ve `https://mrzekai.github.io/app-ads.txt` olmalıdır. Manuel AAB workflow’u iki adres de gerçekten açılmadan derlemeyi durdurur.

## 5. Mağaza dosyaları

- 512×512 ikon: `play-store/icon-512.png`
- 1024×500 feature graphic: `play-store/feature-graphic-1024x500.png`
- Türkçe için 4 adet 1080×1920 ekran: `play-store/screenshots/`
- İngilizce için 4 adet 1080×1920 ekran: `play-store/screenshots/en-US/`
- İspanyolca için 4 adet 1080×1920 ekran: `play-store/screenshots/es-ES/`
- Türkçe / İngilizce / İspanyolca metinler: `play-store/listings/`

## 6. Son kontrol

```bash
npm ci --legacy-peer-deps
npm run check
npm run lint
npm run doctor
npm run release:check
npx expo prebuild --platform android --clean --no-install
```

Push sonucunda oluşan release-minified QA APK yalnız Google demo reklamlarını kullanır ve Android debug anahtarıyla imzalıdır; cihaz testi içindir, Play’e yüklenmez. CI bu APK’nın 16 KB zip hizalamasını da doğrular.

Play Internal testing’e yalnız manuel workflow’dan çıkan upload-key imzalı AAB’yi yükleyin. Gerçek cihazda PDF seçme, URL indirme, parola ekranı, kalıcı gece modu/yön, paylaşma, banner, uygulama açılışı reklamı ve UMP izin akışını test edin. Canlı reklam birimlerine kendiniz tıklamayın.
