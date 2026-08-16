# GitHub'a kaynak güncellemesini aktarma

Bu teslim APK/AAB üretmez. Aşağıdaki commit mesajlarında `[skip ci]` bulunduğu için kaynak kod GitHub'a giderken Android build workflow'u başlamaz.

## 1. ZIP'i aç ve mevcut depoya kopyala

Git Bash:

```bash
cd ~/Downloads
unzip -o pdf-reader-global-source-review.zip -d pdf-reader-global-source-review

cd ~/Downloads/pdf-okuyucu-github/pdf-okuyucu-github-2
git status --short

PATCH_DIR="/c/Users/limno/Downloads/pdf-reader-global-source-review"
test -f "$PATCH_DIR/package.json" || echo "HATA: package.json bulunamadı"
cp -a "$PATCH_DIR"/. .
```

`test` satırı hata yazarsa `cp` komutunu çalıştırmayın; klasör yolunu kontrol edin. Bu blokta terminali kapatabilecek `exit 1` yoktur.

## 2. Bağımlılık ve kaynak kontrolü

```bash
npm ci --legacy-peer-deps
npm run check
npm run lint
npm run doctor
npm run release:check
git -c core.safecrlf=false --no-pager diff --check
```

## 3. Kaynak commit'i ve push

```bash
git add -A
git --no-pager diff --cached --stat
git commit -m "Global diller ve cihaz ici PDF araclari [skip ci]"
git push origin main
git status
git log -1 --oneline
```

Bu aşamada GitHub Actions'ta Android derlemesinin başlamaması bilinçlidir. Claude kaynak incelemesi tamamlanmadan `[skip ci]` işaretini kaldıran yeni commit oluşturmayın ve manuel AAB workflow'unu çalıştırmayın.

## 4. Gizlilik sayfası

Araçların cihaz içinde işlendiğini açıklayan politika kaynakta güncellendi. Yayın öncesinde şu dosyayı public Pages deposundaki karşılığının üzerine kopyalayın:

```bash
cp ~/Downloads/pdf-okuyucu-github/pdf-okuyucu-github-2/docs/privacy-policy.html \
  ~/Downloads/MrZekai-github-site/privacy-policy.html

cd ~/Downloads/MrZekai-github-site
git add privacy-policy.html
git commit -m "PDF araclari icin gizlilik politikasini guncelle"
git push origin main
```
