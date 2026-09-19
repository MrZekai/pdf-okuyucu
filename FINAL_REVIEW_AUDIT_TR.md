# Offline PDF Viewer & Tools — final yayın öncesi kaynak denetimi

Tarih: 20 Eylül 2026

## Kesin marka sözleşmesi

- Google Play varsayılan mağaza adı: `Offline PDF Viewer & Tools` — 26/30
- İngilizce uygulama içi başlık: `Offline PDF Viewer & Tools`
- İngilizce launcher / ikon altı: `Offline PDF`
- Türkçe mağaza ve uygulama içi başlık: `Çevrimdışı PDF Okuyucu`
- Türkçe launcher / ikon altı: `Çevrimdışı PDF`
- Android paket kimliği değişmedi: `com.aitolian.pdfokuyucu`

## Mağaza metinleri

Kanonik kaynak `play-store/FINAL_26_LOCALES_ASO.txt` dosyasıdır. `play-store/listings/` altındaki 26 locale dosyası bu kaynaktan birebir üretilmiştir. Release validator artık yalnız karakter sınırını değil; her locale için başlık, kısa açıklama ve **tam açıklamanın kanonik dosyayla birebir eşleşmesini** denetler.

Varsayılan en-US metni:

- Başlık: `Offline PDF Viewer & Tools`
- Kısa açıklama: `View PDFs offline without internet. Merge, split and compress on your device.`
- Tam açıklama: 3666 karakter

Uygulama arayüzü 24 dil destekler. Play Store'da İspanyolca ve Portekizce bölgesel mağaza varyantları ayrı tutulduğu için mağaza locale sayısı 26'dır.

## Uygulama içi ve launcher adları

`constants/i18n.ts` ve `constants/translations/*.ts` içindeki `app.name` / `settings.about` değerleri final mağaza adlarıyla eşlendi. `locales/*.json` launcher adları kısa tutuldu ve release validator bunları hem dil bazında hem Android/iOS eşitliği açısından kontrol ediyor.

## Gizlilik / reklam uyumu

- Privacy Policy marka adları TR/EN/ES olarak güncellendi.
- Privacy Policy tarihi 20 Eylül 2026 olarak güncellendi.
- PDF içeriğinin geliştirici sunucusuna yüklenmediği, ancak URL ile indirme ve kullanıcı tarafından başlatılan Android Paylaş işleminin ağ/üçüncü taraf etkileşimi olduğu netleştirildi.
- Google Mobile Ads SDK / UMP'nin IP adresi, ürün etkileşimleri, tanılama ve cihaz tanımlayıcıları gibi reklamla ilgili verileri işleyebileceği açıklandı.
- Ödüllü reklamın isteğe bağlı olduğu ve 10 dakika reklamsız kullanım verdiği metinle kod aynı kaldı.
- `useAdsBootstrap.ts` UMP durumunu her açılışta ilk reklam isteğinden **önce** yenileyecek şekilde sertleştirildi. Güncelleme başarısızsa eski önbellek onayına güvenip reklam başlatılmıyor.
- `play-store/DATA_SAFETY_TR.md` hesap silme / yerel veri silme ayrımını daha açık anlatacak şekilde güncellendi.

## Mağaza vaadiyle kodu eşlemek için yapılan fonksiyonel düzeltme

Final uzun açıklama, uygulamanın son okunan sayfayı hatırlayıp yeniden açıldığında oraya döndüğünü söylüyor. Eski kod ilerlemeyi kaydediyor ancak ilk açılışta otomatik sayfa atlamasını başlatmıyordu. `app/reader/[id].tsx` artık kayıtlı sayfayı PDF viewer'ın başlangıç `page` değerine geçiriyor. Release validator bu davranışı da koruyor.

## Görseller

- Feature graphic: `OFFLINE PDF / VIEWER & TOOLS`, `24 languages`, `PDF processing happens on-device.`
- TR/en-US/es-ES ana ekran screenshot'larında üst marka başlıkları güncellendi.
- Reader screenshot'larındaki mutlak “dosyalar hiçbir sunucuya gitmez” dili, daha doğru “PDF içeriği geliştirici sunucusuna yüklenmez” ifadesine çevrildi.
- “Gece modu gözlerinizi korur” gibi sağlık çağrışımlı pazarlama ifadesi, “daha rahat okuma” şeklinde nötrleştirildi.
- SVG kaynakları ile PNG çıktıları yeniden eşlendi.

## Yerel doğrulamalar

Başarılı:

```text
node scripts/check-i18n.mjs
→ 219 keys x 24 languages
→ dictionaries aligned and no hardcoded strings left

node scripts/validate-release.mjs
→ Release kontrolü başarılı
→ package=com.aitolian.pdfokuyucu
→ 24 dil
→ R8 + resource shrink kontrolü
→ 26 Play locale / karakter sınırı / kanonik metin eşitliği
```

Bu sandbox'ta `node_modules` başlangıçta mevcut değildi. `npm ci` ağ/ortam zaman aşımına uğradığı için TypeScript, Expo Doctor, lint ve native patch kontrolleri burada bağımlılıklı şekilde tamamlanamadı. Play incelemesine göndermeden önce GitHub Actions'ın yeşil olması veya yerelde aşağıdaki tam kapının çalıştırılması gerekir:

```bash
npm ci --legacy-peer-deps
npm run check
npm run lint
npm run doctor
npm run release:check
```

## Bilinçli olarak değiştirilmedi

- Paket adı `com.aitolian.pdfokuyucu`
- AdMob production kimlikleri
- Kotlin / Ads SDK pin stratejisi
- Eski sürümlere ait tarihsel `RELEASE_*`, `GITHUB-V*` ve tarihli health-check notları; bunlar geçmiş sürüm kayıtlarıdır ve canlı uygulama/mağaza kaynağı olarak kullanılmamalıdır.
