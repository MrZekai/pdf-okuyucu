# Google Play Data Safety yanıt taslağı

Bu taslak, projedeki `react-native-google-mobile-ads` / Google Mobile Ads SDK ve uygulamanın mevcut kodu temel alınarak hazırlanmıştır. Play Console’daki soru metni değişirse anlamı eşleştirerek yanıtlayın.

## Üst düzey yanıtlar

- Uygulama kullanıcı verisi topluyor veya paylaşıyor mu? **Evet**
- Tüm kullanıcı verileri aktarım sırasında şifreleniyor mu? **Evet**
- Kullanıcılar verilerinin silinmesini talep edebilir mi? **Hayır / uygulanamaz** — uygulama hesabı veya geliştirici sunucusunda tutulan kullanıcı profili yoktur. Yerel veriler uygulama içinden silinebilir.
- Uygulama hesap oluşturmayı destekliyor mu? **Hayır**

## Bildirilecek veri türleri

| Play veri türü | Toplanır | Paylaşılır | Amaç | Zorunlu/isteğe bağlı |
|---|---:|---:|---|---|
| Yaklaşık konum | Evet | Evet | Reklam/pazarlama, analiz, sahtekârlığı önleme ve güvenlik | SDK reklam sunarken zorunlu; IP’den tahmin edilir |
| Uygulama etkileşimleri | Evet | Evet | Reklam/pazarlama, analiz, sahtekârlığı önleme ve güvenlik | Zorunlu |
| Kilitlenme günlükleri / tanılama | Evet | Evet | Analiz, sahtekârlığı önleme ve güvenlik | Zorunlu |
| Cihaz veya diğer kimlikler | Evet | Evet | Reklam/pazarlama, analiz, sahtekârlığı önleme ve güvenlik | Reklam kimliği kullanıcı tarafından sıfırlanabilir/silinebilir |

## Uygulamanın kendi yerel verileri

PDF dosyaları, belge adları, favoriler, son sayfa, okuma zamanları ve ayarlar yalnızca cihazda tutulur; geliştiriciye veya başka bir sunucuya gönderilmez. Play formunda “toplanan veri”, cihazdan dışarı iletilen veriyi ifade ettiğinden bunlar **toplanıyor** olarak işaretlenmez.

## Console’da ayrıca

- **Uygulama reklam içeriyor mu?** Evet.
- Gizlilik politikası URL’si: `https://mrzekai.github.io/privacy-policy.html`
- Hedef kitle: Uygulama çocuklara özel tasarlanmadıysa çocuk yaş gruplarını seçmeyin. Çocuk yaş grubu seçilecekse reklam yapılandırması ve bu beyan yeniden yapılmalıdır.
- Google UMP için AdMob → Privacy & messaging bölümünde Avrupa düzenlemeleri mesajını yayımlayın.

Kaynak: Google Mobile Ads SDK’nin güncel veri açıklamasında IP adresi, ürün etkileşimleri, tanılama bilgileri ve cihaz/hesap tanımlayıcılarının otomatik toplandığı ve paylaşıldığı belirtilmektedir.
