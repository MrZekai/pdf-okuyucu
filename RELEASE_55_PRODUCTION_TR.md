# Sürüm 55 - Production yayın hazırlığı

Çalışma zamanı davranışı v54 ile **birebir aynıdır**. Bu sürüm yalnızca beyanı
tamamlar ve yayın kapılarını sıkılaştırır. Yani v54 QA APK'sında doğruladığınız
her şey bu sürüm için de geçerlidir.

## 1. Gizlilik politikası eksik beyan ediyordu

Canlı politika yalnızca **banner ve uygulama açılışı** reklamlarını sayıyordu.
v53 ile geçiş, v54 ile ödüllü reklam eklendi ve politika güncellenmedi. Eksik
veri beyanı hem Play Kullanıcı Verileri politikası hem AdMob açısından risktir.

`docs/privacy-policy.html` üç dilde (tr, en, es) güncellendi. Yeni metin dört
biçimi de sayıyor ve ödüllü reklamın gönüllü olduğunu, hiçbir özelliğin reklam
izlemeye bağlı olmadığını açıkça söylüyor.

**Bu dosya ayrıca canlı siteye (MrZekai/MrZekai.github.io) kopyalanmalıdır.**
Depodaki kopya tek başına yeterli değildir.

## 2. Ödüllü teklif metni daha şeffaf

AdMob'un ödüllü reklam politikası "her reklam gösteriminden önce eylemin ve
ödülün açıkça bildirilmesini" istiyor. Metin "kısa bir video izle" diyordu;
izlenecek şeyin bir reklam olduğu bağlamdan anlaşılıyordu ama yazılı değildi.

14 dilde "kısa bir reklam videosu" olarak netleştirildi. Zorunlu bir düzeltme
değil, ücretsiz bir güvenlik marjı.

## 3. release:check artık dört reklam birimini de koruyor

Doğrulayıcı banner ve app-open unit ID'lerini kontrol ediyordu; v53 ile eklenen
geçiş ve ödüllü birimleri kapsam dışındaydı. Yani production'a yanlışlıkla demo
bir geçiş kimliğiyle çıkmak mümkündü.

Eklenen kurallar:

- interstitial ve rewarded unit ID biçim kontrolü
- her dördü için "Google demo kimliği kullanılamaz" kontrolü
- gizlilik politikasında dört biçimin de beyan edilmiş olması

Negatif test yapıldı: politikadan `rewarded` kelimesi silindiğinde doğrulayıcı
beklendiği gibi başarısız oluyor.

## 4. Production workflow canlı siteyi denetliyor

Workflow production hedefinde canlı gizlilik politikasını zaten indiriyordu ama
yalnızca uygulama adını arıyordu. Yani depodaki dosyayı güncelleyip canlı siteyi
senkronlamayı unutmak sessizce yayına çıkabilirdi.

Artık canlı sayfada `ödüllü` ve `geçiş` kelimeleri de aranıyor. Senkronlanmamış
site ile production AAB üretilemez.

## Açıkta kalan tek risk

**Geçiş reklamı akışı hiçbir zaman gerçek cihazda doğrulanmadı.** Kod yolu
gözden geçirildi, tip denetiminden geçti, sınır mantığı test edildi; ama "üçüncü
araç kullanımından sonra reklam gerçekten çıkıyor mu" sorusunun cevabı henüz
ölçülmedi.

Bu, v54 QA APK'sı ile üç dakikada kapatılabilir:

1. Ayarlar > Uygulamalar > PDF: Okuyucu > Zorla durdur + Verileri temizle
2. Uygulamayı aç, Ayarlar sekmesine girme
3. Araçlar > PDF döndür > "Bitti"  (x3)
4. Üçüncüsünde geçiş reklamı gelmeli

Gelmezse: Ayarlar > "hakkında" yazısına 7 dokunuş, tanılama ekranındaki
sayaçlara bakılır.

Bu test yapılmadan production'a çıkmak mümkündür ve muhtemelen sorun da çıkmaz;
ama çıkarsa bedeli mağazadaki puandır ve puan geri alınması en zor şeydir.

## Doğrulama

```
npm run check        # 215 anahtar x 14 dil, tsc temiz, 13 routing testi
npm run lint         # temiz
npm run release:check
```
