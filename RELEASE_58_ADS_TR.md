# Sürüm 58 — Reklam modeli sadeleştirmesi

Bu sürüm yeni özellik getirmiyor. Tek bir şey yapıyor: **reklamların neden
çıkmadığını** düzeltiyor ve bir daha aynı sorunun sessizce oluşmasını
imkânsızlaştırıyor.

## Cihazdaki tanılama ne söyledi

İki ekran görüntüsü meseleyi tahmin olmaktan çıkardı.

Birinci ölçüm:

```
tool runs: 1 (free: 2)          <- 3. araç kullanımına kadar reklam yok
interstitial prepared: no        <- reklam istenmemiş bile
```

İkinci ölçüm:

```
tool runs: 5 (free: 2)           <- eşik aşılmış
interstitial prepared: yes       <- reklam YÜKLENMİŞ, hazır bekliyor
interstitials this session: 0/2  <- ama hiç gösterilmemiş
last full screen ad: never
```

İkinci tablo kesin sonucu veriyor: **reklam hazırdı ve gösterim fonksiyonu hiç
çağrılmadı.** Reklam birimi, unit ID, AdMob tarafı, ağ — hepsi çalışıyordu.
Sorun tamamen benim koyduğum akıştaydı.

## Üç ayrı hata vardı

**1. Eşik saçmaydı.** Geçiş reklamı 3. araç kullanımından önce çıkmıyordu.
Sen test ederken bir ya da iki araç çalıştırıyordun; reklam hiç sırasını
görmedi.

**2. "Aç" reklamı iptal ediyordu.** Araç bitince çıkan pencerede iki seçenek
var: "Bitti" ve "Aç". Reklamı yalnızca "Bitti"ye bağlamıştım, "Aç" reklamı
tamamen siliyordu. Oysa yeni bir PDF üreten herkes onu açmak ister. Yani
pratikte reklam hiçbir zaman çıkmıyordu. Bu tasarım hatası tek başına
gelirlerin büyük kısmını yok ediyordu.

**3. Altı sessiz şart vardı.** Reklamın çıkması için aynı anda oturum kotası,
gün kotası, ücretsiz kullanım kotası, 3 dakikalık aralık, reklamsız süre ve
5 saniyelik yükleme penceresi — hepsi tutmak zorundaydı. Biri tutmazsa hiçbir
yerde iz bırakmadan vazgeçiliyordu. Bu yüzden cihazda teşhis edilemiyordu.

Aynı hata app-open reklamında da vardı: kod, iki reklam arasındaki aralığı
`AD_VALIDITY_MS` ile karşılaştırıyordu. O değer **4 saat** ve aslında reklam
görselinin tazelik süresi; aralık kuralı değil. Sonuç: herhangi bir reklamdan
sonra 4 saat boyunca açılış reklamı sessizce bastırılıyordu.

## Yeni model

Tempo artık **kodda değil, AdMob panelinde**. Kodda tek bir tane pacing kuralı
kaldı.

| Reklam | Ne zaman | Koddaki şart |
|---|---|---|
| Banner | Değişmedi | — |
| Ödüllü "10 dakika reklamsız" | Ana sayfada, reklamlar hazır olur olmaz | yok |
| Geçiş | Araç bitip pencere kapanınca; "Aç" denirse okuyucudan çıkışta | son tam ekran reklamdan 60 sn geçmiş olsun |
| Uygulama açılışı | Soğuk açılış | PDF'e tıklanarak açılmamış olsun + aynı 60 sn kuralı |

Somut değişiklikler:

- `MIN_FULL_SCREEN_GAP_MS`: 3 dakika → **60 saniye**
- `AD_PAUSE_DURATION_MS`: 30 dakika → **10 dakika**
- Oturum kotası, gün kotası, ücretsiz kullanım kotası: **kaldırıldı**
- Geçiş reklamı yükleme süresi: 5 sn → **9 sn** (yavaş bağlantıda dolum kaybı)
- Reklam artık **Araçlar ekranı açılır açılmaz** önden isteniyor
- App-open ilk reklam: 3. açılış → **2. açılış**
- App-open aralığı artık 4 saatlik tazelik değeriyle değil, 60 sn kuralıyla
  karşılaştırılıyor
- "Aç" reklamı iptal etmiyor, **okuyucudan dönüşe erteliyor**

Neden 10 dakika: 30 dakika hem senin test etmeni imkânsızlaştırıyordu hem de
tek bir ödüllü izleme günün yarısını reklamsız yapabiliyordu. 10 dakika
ödülü gerçek tutuyor, ama kullanıcıyı gün içinde tekrar ödüllü izlemeye
teşvik ediyor. Ödüllü reklam portföydeki en yüksek eCPM'li birim; daha sık
izlenmesi doğrudan gelir demek.

## AdMob panelinde olması gerekenler

Kod artık bunlara güveniyor, panelden kontrol et:

```
PDF Geçiş            -> Sıklık sınırı: kullanıcı başına saatte 3
PDF Uygulama açıken  -> Sıklık sınırı: kullanıcı başına günde 4
PDF BANNER           -> Otomatik yenileme: 60 saniye
```

Bundan sonra tempoyu değiştirmek istersen **yeni sürüm yayınlaman gerekmez**,
panelden döndürürsün. Bu sürümün asıl kazancı budur.

## Politika tarafı

- Ödüllü reklam gönüllü, hiçbir özellik ona bağlı değil, ödül devredilemez —
  AdMob ödüllü politikasına uygun.
- PDF niyetiyle açılışta app-open reklamı bastırılıyor — Play "Better Ads
  Experiences" politikasının beklenmedik tam ekran reklam maddesine karşı
  koruma. **Bu koruma şu an mağazadaki sürümde yok**, yani bu güncelleme
  mevcut bir riski kapatıyor.
- İki tam ekran reklam üst üste gelemez (60 sn paylaşımlı bütçe).
- Gizlilik politikası 10 dakikayı beyan edecek şekilde güncellendi (tr/en/es).
  **Canlı site de güncellenmeli**, aksi halde production build durur.

## Regresyon kapıları

`npm run release:check` artık şunları zorunlu kılıyor; biri bozulursa AAB
üretilmez:

- 60 saniyelik tek pacing kuralı yerinde mi
- Reklamsız süre 10 dakika mı
- Koda yeniden sessiz kota eklenmiş mi (`FREE_TOOL_RUNS`,
  `MAX_INTERSTITIALS_*` isimleri artık **yasak**)
- Araçlar ekranında önden yükleme var mı
- "Aç" sonrası ertelenen reklam okuyucudan dönüşte gösteriliyor mu
- PDF niyetiyle açılışta app-open bastırılıyor mu
- Canlı gizlilik politikası 10 dakikayı beyan ediyor mu

Her kapı negatif test edildi: ilgili satır bozulduğunda doğrulayıcı
beklendiği gibi başarısız oluyor.

## Doğrulama

```
npm run check          # 215 anahtar x 14 dil, tsc temiz, 13 routing testi
npm run lint           # temiz
npm run release:check  # başarılı
```
