# Claude Red Team 5. Tur — MD5/ANR Hotfix Çözüm Kaydı

Tarih: 12 Ağustos 2026

Bu tur yalnız iki yeni kaynak bulgusunu kapatır. APK, AAB, Gradle, Android prebuild veya GitHub Actions bu düzeltme hazırlanırken çalıştırılmamıştır.

## Uygulanan düzeltmeler

### 1. Büyük PDF'de senkron MD5/ANR riski

- `File.md5` çağrısının önüne `FINGERPRINT_MAX_BYTES = 64 * 1024 * 1024` sınırı eklendi.
- `source.size`, MD5 getter'ı okunmadan önce yerel değişkene alınıp sınır kontrolü yapılıyor.
- 1–64 MB dosyalarda içerik özetiyle tekilleştirme korunuyor.
- 64 MB üzerindeki dosyalarda senkron MD5 çalışmıyor; bu dosyalar `sourceUri` eşleşmesiyle tekilleştiriliyor.
- MD5 yalnız yerel kopya tekilleştirmesi içindir; güvenlik kararı veya kullanıcı takibi için kullanılmaz.

### 2. Validator eksik dosya hata yönetimi

- `text()` artık dosyanın varlığını okumadan önce kontrol ediyor.
- Eksik kaynakta ham `ENOENT` yığını yerine diğer release hatalarıyla birlikte `Eksik dosya: ...` sonucu üretiyor.
- Fingerprint kapısı eski kırılgan `fingerprint: source.md5` metni yerine boyut sabitini ve MD5'in eşikten sonra okunduğu ifadeyi doğruluyor.

## Kaynak doğrulaması

- `npm run check`
- Expo ESLint
- Expo Doctor
- `npm run release:check`

Bu komutların sonucu teslim özetinde ayrıca belirtilir. Native derleme sonucu değildir.

## Sonraki sıra

1. Bu hotfix build atlamayan normal bir commit ile GitHub'a gönderilir.
2. Push workflow'u release-minified QA APK üretir.
3. QA APK gerçek cihazda normal PDF ve 100 MB üzeri PDF ile test edilir.
4. Ancak QA testi geçtikten sonra manuel `build_release: true` ile AAB istenir.
