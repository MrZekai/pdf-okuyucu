# Global kaynak revizyonu — teslim özeti

Bu tur yalnız kaynak kodu günceller. APK/AAB üretilmedi ve hiçbir depoya otomatik push yapılmadı.

## Uygulananlar

- Desteklenmeyen cihaz dilleri ve eksik çeviriler artık İngilizceye düşer.
- Görünen varsayılan uygulama adı `PDF Reader`; 14 dilin launcher adı ayrı yerelleştirilmiştir.
- TR, EN, ES, PT, DE, FR, IT, RU, HI, ID, AR, JA, KO ve ZH için 174 anahtarlık eksiksiz arayüz sözlükleri vardır.
- Dil denetimi dil listesini otomatik okur; yeni bir sözlük doğrulama dışında bırakılamaz.
- Ayarlardaki dil seçici aranabilir ve uzun listeye uygundur.
- Arapça uygulama içi RTL yönü, mantıksal boşluklar ve aynalanan yön ikonları uygulanmıştır.
- Tarih, göreli zaman, dosya boyutu ve sayılar seçili BCP-47 etiketiyle biçimlendirilir.
- `Araçlar` sekmesi eklendi: PDF birleştir, sayfa çıkar, sayfa sil, sayfaları sırala, tüm sayfaları 90° döndür ve ortak meta verileri temizle.
- Araçlar `pdf-lib` ile cihaz içinde çalışır; kaynak PDF değiştirilmez, sonuç yeni yerel PDF olarak kitaplığa eklenir.
- Ana sayfa yalnız gerçek özellikleri önerir. Word/Excel/PPT dönüştürme eklenmedi; mevcut teknolojiyle gerçek ve güvenilir dönüşüm sunulmadan bu düğmeler yanıltıcı olurdu.
- Öneri sırası yalnız cihazdaki kullanım sayaçları ve günlük keşif sırası ile belirlenir; analitik veya sunucuya gönderim yoktur.
- TR/en-US/es-ES mağaza ekranları yeni Araçlar ve Kütüphane yapısına göre yenilenmiştir.
- 14 dilin mağaza metni vardır; yeni 11 taslak `play-store/LISTING_REVIEW_STATUS.md` uyarısı gereği ana dili konuşan biri tarafından kontrol edilmeden yayınlanmamalıdır.

## Bilinçli olarak değiştirilmedi

- Android paket adı `com.aitolian.pdfokuyucu` kaldı. Bu kullanıcıya gösterilen marka değil, Play kimliğidir. İlk Play yüklemesinden sonra paket adı değiştirilemez; yeni ve benzersiz bir paket adı isteniyorsa ilk yüklemeden önce ayrıca karar verilmelidir.
- Kotlin 2.1.20, Ads SDK 24.6.0 sabiti ve üretim AdMob kimlikleri korunmuştur.
- PDF motoru değiştirilmemiştir.
- Sıkıştırma, OCR, Office dönüştürme ve imza araçları eklenmemiştir; yarım veya yanıltıcı özellik sunulmamıştır.

## Yayın öncesi insan testi

1. 14 dilde ekran taşması; özellikle Almanca, Rusça, Hintçe, Arapça, Japonca ve Çince.
2. Arapça sekme, liste, modal ve yön ikonları.
3. Her araç için küçük, bozuk, parolalı ve 50–80 MB arası PDF.
4. Düşük/orta segment cihazda araç işlemi sırasında bellek davranışı.
5. Sonuç PDF'lerin açılması, paylaşılması ve kaynak dosyanın değişmeden kalması.
6. AdMob UMP, test reklamları ve banner ile gezinme arasındaki güvenli boşluk.

## Kaynak kalite kapıları

```bash
npm ci --legacy-peer-deps
npm run check
npm run lint
npm run doctor
npm run release:check
```
