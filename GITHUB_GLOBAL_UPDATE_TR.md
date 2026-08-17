# GitHub'a kaynak güncellemesini aktarma

Bu teslim APK/AAB üretmez. Aşağıdaki commit mesajlarında `[skip ci]` bulunduğu için kaynak kod GitHub'a giderken Android build workflow'u başlamaz.

## Tek yapıştırmada ZIP'i aç, doğrula ve kaynak commit'ini gönder

Git Bash:

```bash
cd ~/Downloads && \
rm -rf pdf-okuyucu-metallic-tools-source-review && \
unzip -o pdf-okuyucu-metallic-tools-source-review.zip -d pdf-okuyucu-metallic-tools-source-review && \
cd ~/Downloads/pdf-okuyucu-github/pdf-okuyucu-github-2 && \
git remote get-url origin | grep -Eq 'github.com[:/]MrZekai/pdf-okuyucu(.git)?$' && \
test -z "$(git status --porcelain)" && \
test -f "$HOME/Downloads/pdf-okuyucu-metallic-tools-source-review/package.json" && \
cp -a "$HOME/Downloads/pdf-okuyucu-metallic-tools-source-review"/. . && \
npm ci --legacy-peer-deps && \
npm run check && \
npm run lint && \
npm run doctor && \
npm run release:check && \
git -c core.safecrlf=false --no-pager diff --check && \
git add -A && \
git --no-pager diff --cached --stat && \
git commit -m "Metalik arayuz ve gercek cihaz ici PDF araclari [skip ci]" && \
git push origin main && \
git status -sb && \
git log -1 --oneline
```

Bu komut yalnız `MrZekai/pdf-okuyucu` uzak adresini kabul eder ve kirli çalışma ağacında durur; başka proje üzerine yazmaz. `[skip ci]` nedeniyle Android derlemesi başlamaz. Claude kaynak incelemesi tamamlanmadan APK/AAB workflow'unu çalıştırmayın.

## Gizlilik sayfası

Araçların cihaz içinde işlendiğini açıklayan politika kaynakta güncellendi. Yayın öncesinde şu dosyayı public Pages deposundaki karşılığının üzerine kopyalayın:

```bash
cp ~/Downloads/pdf-okuyucu-github/pdf-okuyucu-github-2/docs/privacy-policy.html \
  ~/Downloads/MrZekai-github-site/privacy-policy.html

cd ~/Downloads/MrZekai-github-site
git add privacy-policy.html
git commit -m "PDF araclari icin gizlilik politikasini guncelle"
git push origin main
```
