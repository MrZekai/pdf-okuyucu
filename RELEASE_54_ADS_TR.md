# Sürüm 54 - Ödüllü reklamın görünürlüğü, önceden yükleme ve tanılama

Sürüm 53 canlı testinde üç şey ortaya çıktı:

1. Ödüllü reklam Ayarlar'a gömülüydü; kimsenin bulmasını bekleyemeyiz.
2. Geçiş reklamı test sırasında hiç görünmedi; sebebi büyük olasılıkla reklamın
   tam ihtiyaç anında istenmesi ve 5 saniyede dolmaması.
3. Reklam sayaçları cihazda görünmediği için her test körlemesine yapılıyor.

Bu sürüm üçünü de kapatıyor. Uygulama içi satın alma yine yok, her özellik
ücretsiz kalmaya devam ediyor.

## 1. Ödüllü teklif ana sayfaya taşındı

`components/AdPauseOffer.tsx` yeni bir bileşen. Ana sayfada marka çubuğunun
hemen altında, ince tek satırlık bir şerit olarak duruyor. Ayarlar'daki satır
da yerinde kaldı; oraya bakmayı bilen kullanıcı yine bulabilsin.

Görünürlük kuralları, şeridin dilenen bir reklam bandına dönüşmemesi için:

| Durum | Şerit |
| --- | --- |
| Kullanıcı henüz hiç tam ekran reklam görmedi | Hiç görünmez |
| Reklamlar hazır değil (rıza yok, doluluk yok) | Hiç görünmez |
| Normal | "30 dakika reklamsız" teklifi, dokunulabilir |
| Reklamsız pencere açık | Dokunulamaz durum satırı: kalan dakika |

Renk olarak kırmızı **kullanılmadı**; kırmızı uygulamada birincil belge
eylemlerine ayrılmış durumda. Teklif amber tonunda ve sessiz.

Pencere açıkken şeridin kaybolmak yerine kalan süreyi göstermesi bilinçli:
ödülün gerçekten verildiğini görmek, bir daha izlemeye en çok ikna eden şey.

## 2. Geçiş reklamı artık önceden yükleniyor

Önceki sürümde reklam gösterileceği anda isteniyordu ve 5 saniyede gelmezse
sessizce vazgeçiliyordu. Yavaş bağlantıda bu sürenin yetmemesi kuvvetle
muhtemeldi.

Artık `primeInterstitial()` ikinci araç kullanımından sonra arka planda reklamı
hazırlıyor; üçüncü kullanımda gösterim anında hazır bekliyor. Gösterimden sonra,
oturum ve gün sınırları hâlâ izin veriyorsa bir sonraki hazırlanıyor.

- Hazır reklam 50 dakika sonra bayat sayılıp atılıyor.
- Hazır reklam yoksa eski yol (anında istek + 5 sn) yedek olarak duruyor.
- Reklamsız pencere açıkken hazırlık hiç başlamıyor.

Ödüllü reklamın yükleme zaman aşımı 8 saniyeden 12 saniyeye çıkarıldı.
Kullanıcı zaten bir bekleme göstergesine bakıyor; "video yok" demektense biraz
daha beklemek doğru takas.

## 3. Gizli tanılama ekranı

Ayarlar'ın en altındaki "hakkında" satırına **7 kez** dokunulduğunda bir pencere
açılıyor ve şunları yazıyor:

```
tool runs: 4 (free: 2)
interstitials this session: 1/2
interstitials today: 1/6
last full screen ad: 3 min ago
min gap: 3 min
ad pause: off
interstitial prepared: yes
```

Bilerek çevrilmedi; bu ekran geliştirici içindir. Bir sonraki reklam ayarını
tahminle değil bu sayılarla yapacağız.

## 4. Birleştirme hata mesajları düzeltildi

Sürüm 53'te 13 dosya seçen kullanıcı "toplam dosya boyutu 80 MB'ı geçemez"
mesajını alıyordu. Sınır aşılan şey boyut değil dosya sayısıydı; mesaj yanlıştı.

İki yeni anahtar eklendi ve 14 dile çevrildi:

- `tools.mergeTooManyFiles` - "Tek seferde en fazla 12 PDF birleştirilebilir."
- `tools.mergeTooLarge` - "Birleştirme için seçilen dosyaların toplamı 40 MB'ı geçemez."

## Doğrulama

```
npm run check      # 215 anahtar x 14 dil, tsc temiz, 13 routing testi, patch checksum
npm run lint       # temiz
npm run release:check
```

## Sürüm 53 testinde açıkta kalanlar

Aşağıdakiler hâlâ doğrulanmadı ve v54 QA APK'sında test edilmeli:

- [ ] Dışarıdan PDF açarken uygulama açılış reklamının bastırılması
- [ ] Üçüncü araç kullanımından sonra geçiş reklamı
- [ ] Sonuç penceresinde "Aç" denince reklamın atlanması
- [ ] Oturum başına en fazla iki geçiş reklamı
