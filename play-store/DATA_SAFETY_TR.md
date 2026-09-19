# Google Play Data Safety yanıt taslağı

Bu taslak, projedeki `react-native-google-mobile-ads` / Google Mobile Ads SDK ve uygulamanın mevcut kodu temel alınarak hazırlanmıştır. Play Console’daki soru metni değişirse anlamı eşleştirerek yanıtlayın.

## Üst düzey yanıtlar

- Uygulama kullanıcı verisi topluyor veya paylaşıyor mu? **Evet**
- Tüm kullanıcı verileri aktarım sırasında şifreleniyor mu? **Evet**
- Uygulama hesap oluşturmayı destekliyor mu? **Hayır**. Bu nedenle Google Play’in uygulama hesabı silme zorunluluğu bu ürün için uygulanmaz.
- Yerel uygulama verileri silinebilir mi? **Evet** — Ayarlar → Kütüphaneyi temizle ile yerel PDF kopyaları, okuma geçmişi ve araç sayaçları silinir; uygulamanın kaldırılması da uygulama verilerini cihazdan kaldırır.
- Reklam kimliği kullanıcı tarafından Android ayarlarından sıfırlanabilir veya silinebilir. Play Console’daki “Data deletion” sorularını gönderim günündeki tam metne göre yanıtlayın; uygulama geliştirici sunucusunda kullanıcı hesabı veya PDF içeriği tutmaz.

## Bildirilecek veri türleri

| Play veri türü | Toplanır | Paylaşılır | Amaç | Zorunlu/isteğe bağlı |
|---|---:|---:|---|---|
| Yaklaşık konum | Evet | Evet | Reklam/pazarlama, analiz, sahtekârlığı önleme ve güvenlik | SDK reklam sunarken zorunlu; IP’den tahmin edilir |
| Uygulama etkileşimleri | Evet | Evet | Reklam/pazarlama, analiz, sahtekârlığı önleme ve güvenlik | Zorunlu |
| Tanılama / uygulama performans bilgileri | Evet | Evet | Analiz, sahtekârlığı önleme ve güvenlik | Zorunlu |
| Cihaz veya diğer kimlikler | Evet | Evet | Reklam/pazarlama, analiz, sahtekârlığı önleme ve güvenlik | Reklam kimliği kullanıcı tarafından sıfırlanabilir/silinebilir |

## Uygulamanın kendi yerel verileri

PDF dosyaları, araçlarla üretilen PDF'ler, belge adları, favoriler, son sayfa, okuma zamanları, yerel araç kullanım sayaçları ve ayarlar geliştirici sunucusuna otomatik olarak gönderilmez. Birleştirme, sayfa çıkarma/silme/sıralama/döndürme ve ortak meta veri temizleme işlemleri cihaz içinde yapılır. Kullanıcı **Paylaş** komutunu seçerse ilgili PDF, Android paylaşım menüsünde kullanıcının seçtiği üçüncü taraf uygulamaya aktarılır; bu kullanıcı tarafından başlatılan dosya aktarımı geliştiricinin veri toplaması değildir. Play formunda “toplanan veri”, uygulama veya SDK tarafından cihazdan dışarı iletilen veriyi ifade ettiğinden yerel PDF içeriği geliştirici tarafından **toplanıyor** olarak işaretlenmez.

## Console’da ayrıca

- **Uygulama reklam içeriyor mu?** Evet.
- Gizlilik politikası URL’si: `https://mrzekai.github.io/privacy-policy.html`
- Hedef kitle: Uygulama çocuklara özel tasarlanmadıysa çocuk yaş gruplarını seçmeyin. Çocuk yaş grubu seçilecekse reklam yapılandırması ve bu beyan yeniden yapılmalıdır.
- Google UMP için AdMob → Privacy & messaging bölümünde Avrupa düzenlemeleri mesajını yayımlayın.

Kaynak: Google Mobile Ads SDK’nin güncel veri açıklamasında IP adresi, ürün etkileşimleri, tanılama bilgileri ve cihaz/hesap tanımlayıcılarının otomatik toplandığı ve paylaşıldığı belirtilmektedir.


## Resmî kontrol bağlantıları

- Google Mobile Ads SDK Data Safety açıklaması: https://developers.google.com/admob/android/privacy/play-data-disclosure
- Google UMP Android kurulumu: https://developers.google.com/admob/android/privacy
- Google Play hesap/veri silme açıklaması: https://support.google.com/googleplay/android-developer/answer/13327111
