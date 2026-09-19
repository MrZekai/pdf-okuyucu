# Global kaynak revizyonu — güncel teslim özeti

Bu kaynak seti `Offline PDF Viewer & Tools` marka/ASO kararıyla eşlenmiştir. Android paket kimliği değişmemiştir: `com.aitolian.pdfokuyucu`.

## Güncel sözleşme

- Google Play varsayılan başlık: `Offline PDF Viewer & Tools`.
- Uygulama içi İngilizce başlık: `Offline PDF Viewer & Tools`.
- İngilizce launcher/ikon altı adı: `Offline PDF`.
- Türkçe mağaza ve uygulama içi başlık: `Çevrimdışı PDF Okuyucu`.
- Türkçe launcher/ikon altı adı: `Çevrimdışı PDF`.
- Arayüz 24 dil destekler; launcher adları `locales/` altında ayrı yerelleştirilir.
- Google Play için 26 locale vardır. `es-419`/`es-ES` ve `pt-BR`/`pt-PT` mağazada ayrı tutulduğu için mağaza locale sayısı arayüz dilinden fazladır.
- Kanonik mağaza metni `play-store/FINAL_26_LOCALES_ASO.txt`; kopyalanabilir alanlar `play-store/listings/*.txt` içindedir.

## Ürün ve gizlilik

- PDF okuma ve temel PDF araçları cihazda çalışır; PDF içeriği geliştirici sunucusuna yüklenmez.
- URL’den PDF alma ve kullanıcı tarafından başlatılan Android Paylaş işlemi bu yerel işleme ilkesinin açık istisnalarıdır.
- Google Mobile Ads SDK / UMP reklam ve izin akışı için kullanılır. UMP durumu uygulama açılışında ilk reklam isteğinden önce yenilenir.
- Ödüllü reklam isteğe bağlıdır ve 10 dakika reklamsız kullanım sağlar; hiçbir PDF aracı reklam izlemeye kilitli değildir.
- Son okunan sayfa cihazda saklanır ve belge yeniden açıldığında okuyucu bu sayfaya geri döner.

## Yayın öncesi kalite kapıları

```bash
npm ci --legacy-peer-deps
npm run check
npm run lint
npm run doctor
npm run release:check
```

Ek olarak gerçek cihazda 24 dilde taşma, Arapça RTL, parola korumalı PDF, URL açma, paylaşma, sıkıştırma, sayfa araçları, UMP ve reklam akışları test edilmelidir.
