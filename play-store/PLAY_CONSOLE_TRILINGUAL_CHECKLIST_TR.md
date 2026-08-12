# Google Play — üç dilli yayın kontrol listesi

## Mağaza listelemeleri

- Ana mağaza listelemesinde Türkçe (`tr-TR`) metinleri `listings/tr-TR.txt` dosyasından girin.
- Manage translations ile English (United States) (`en-US`) ekleyip `listings/en-US.txt` ve `screenshots/en-US/` dosyalarını yükleyin.
- Manage translations ile Español (España) (`es-ES`) ekleyip `listings/es-ES.txt` ve `screenshots/es-ES/` dosyalarını yükleyin.
- Her dilde başlık, kısa açıklama, uzun açıklama ve dört ekran görüntüsünün doğru dilde göründüğünü önizleyin.
- Feature graphic ve ikon dilden bağımsızdır; aynı varlıklar kullanılabilir.

## Ülke ve yayın kapsamı

- Reach and devices → Countries/regions bölümünden hedef ülkeleri seçin.
- İngilizce ve İspanyolca çeviri eklemek ülke dağıtımını otomatik açmaz.
- Sadece internal/closed testing’de olan uygulama herkese açık aramada görünmez.
- Production yayını açmadan önce Internal testing’de gerçek Play kurulumu ile test edin.

## AdMob ve gizlilik

- AdMob uygulamasının paket adı `com.aitolian.pdfokuyucu` olmalıdır.
- AdMob → Privacy & messaging → European regulations mesajını oluşturup yayımlayın.
- Play Console’da “Uygulama reklam içeriyor” sorusuna Evet yanıtı verin.
- Gizlilik politikası olarak `https://mrzekai.github.io/privacy-policy.html` adresini girin.
- Data Safety yanıtlarını `DATA_SAFETY_TR.md` ile ve kullandığınız Mobile Ads SDK sürümünün güncel Google açıklamasıyla karşılaştırın.

## Banner yerleşimi

- Banner içerik ile alt gezinmenin arasında sabit alandadır.
- Reklamın üstünde 16 dp, alt gezinme düğmelerine bakan tarafında 28 dp dokunulamaz tampon ve görsel sınırlar vardır.
- Google sabit bir asgari dp değeri yayımlamaz; ölçüt yanlış tıklamayı önleyecek açık ayrımdır.
- Yeni ekran boyutlarında reklamın içerik veya sistem/uygulama düğmelerini örtmediğini Internal testing’de kontrol edin.
