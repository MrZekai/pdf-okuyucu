# Sürüm 53 - Reklam mimarisi ve kararlılık

Kapsam: uygulama içi satın alma yok, her özellik ücretsiz kalır. Gelir tamamen
reklamdan gelir, bu yüzden reklam yerleşimi ürünün bir parçası olarak kurgulandı.

## 1. Ortak tam ekran reklam bütçesi (`lib/adGate.ts`)

AdMob her reklam birimini ayrı ayrı sınırlar, iki birimi birbirinden haberdar
edemez. Uygulama açılış reklamı ile araç geçiş reklamının aynı dakikada
gelmesini yalnızca uygulama tarafı engelleyebilir. Tek bir paylaşılan zaman
damgası bu yüzden var.

| Kural | Değer |
| --- | --- |
| İki tam ekran reklam arası en az | 3 dakika |
| Oturumda geçiş reklamı | en fazla 2 |
| Günde geçiş reklamı | en fazla 6 |
| Reklamsız ilk araç kullanımı | 2 |
| Uygulama açılış reklamı | 3. açılıştan sonra, 4 saatte 1 |

`lib/adGate.ts` içindeki hiçbir fonksiyon hata fırlatmaz. Depolama, ağ veya SDK
hatası her durumda "reklam gösterme" sonucuna düşer; bir belge işlemi hiçbir
zaman reklam yüzünden başarısız olamaz.

Eski `@pdf-reader/app-open-last-shown-v1` anahtarı okunmaya devam ediyor, böylece
güncelleme sonrası ilk açılışta beklenmedik bir reklam çıkmıyor; yeni anahtarla
birlikte yazılmaya da devam ediyor, böylece olası bir geri alma güvenli.

## 2. Dışarıdan gelen PDF'te reklam yok

Kullanıcı başka bir uygulamadan bir PDF'e dokunduğunda uygulama soğuk başlatma
ile açılır. Bu bir uygulama açılışı değil, bir belge açma isteğidir.
`AppOpenAdController` artık `Linking.getInitialURL()` sonucunu
`normalizeIncomingPdfUri` ile kontrol ediyor ve bu yolda reklam denemesi hiç
başlatmıyor.

Ayrıca açılış bekleme süresi 2500 ms yerine 1400 ms; reklam dolmadığında
kullanıcı açılış ekranında daha az bekliyor.

## 3. Geçiş reklamı (`ca-app-pub-1380972808968213/1706694218`)

Yalnızca bir araç belge ürettikten **ve** kullanıcı sonuç penceresini kapattıktan
sonra. Kullanıcı "Aç" derse reklam gösterilmez: okumaya giden birini kesmek
yanlış takas olur.

## 4. Ödüllü reklam (`ca-app-pub-1380972808968213/2249619690`)

Hiçbir özellik ödüllü reklamın arkasına kilitlenmedi. Ayarlar ekranındaki
"30 dakika reklamsız" satırı, kısa bir video karşılığında banner dahil tüm
reklamları 30 dakika kapatıyor. Uygulama içi satın alma olmayan bir üründe
reklamdan rahatsız olan kullanıcıya sunulabilecek tek dürüst çıkış kapısı bu.

Ödüllü reklam yüklenemezse kullanıcıya kısa bir bilgi verilir; hiçbir işlem
engellenmez.

## 5. Kararlılık düzeltmeleri

- `FINGERPRINT_MAX_BYTES` 24 MB -> 8 MB. `File.md5` senkron bir getter olduğu
  için büyük dosyalarda içe aktarma sırasında görünür bir donma yaratıyordu.
  Sınırın üstündeki belgeler yinelenen kontrolünde `sourceUri` ile eşleşir.
- Birleştirme için ayrı bütçe: en fazla 12 dosya ve 40 MB toplam girdi.
  pdf-lib tüm kaynakları bellekte tutup birleşik belgeyi serileştirdiği için
  tepe kullanım girdinin iki üç katına çıkıyor; eski 80 MB sınırı düşük RAM'li
  cihazlarda bellek hatası riski taşıyordu. Her kaynaktan sonra bir tick
  bırakılarak ara belgelerin toplanmasına izin veriliyor.
- Banner artık üç başarısız denemeden sonra kalıcı olarak gizlenmiyor; 5 dakika
  bekleyip yeniden deniyor. Uzun oturumlarda geçici doluluk sorunu tüm
  oturumun gösterimini kaybettiriyordu.

## 6. Yerelleştirme

5 yeni anahtar 14 dilin tamamına eklendi. `npm run i18n:check` sözlüklerin
hizalı olduğunu ve `{minutes}` yer tutucusunun her dilde bulunduğunu doğrular.

## Doğrulama

```
npm run check          # i18n + typecheck + incoming routing + expo-pdf patch
npx eslint .           # değişen dosyalarda uyarı yok
```

Kalan tek eslint hatası `plugins/expoPdfPatch.js` içindeki `__dirname` uyarısıdır
ve bu sürümden önce de vardı.

## Sürüm numarası

`ANDROID_VERSION_CODE` GitHub Actions `run_number` değerinden geliyor, elle
değiştirmek gerekmiyor. Bir önceki yayın 52 idi, sonraki çalıştırma 53 üretir.

## Yayından sonra izlenecekler

1. AdMob'da geçiş reklamı gösterim/oturum oranı. Beklenen: aktif kullanıcı
   başına günde 0,3 - 0,8 gösterim.
2. Ödüllü reklam tamamlama oranı. Düşükse ayarlar ekranı dışında ikinci bir
   giriş noktası gerekir.
3. Uygulama puanı. 4,0'ın altına inerse ilk şüpheli geçiş reklamı sıklığıdır;
   `MAX_INTERSTITIALS_PER_SESSION` 1'e indirilerek test edilebilir.
