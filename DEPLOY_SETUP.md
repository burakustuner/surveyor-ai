# Otomatik Deploy Kurulum Rehberi

Bu rehber, GitHub'a push yapıldığında sunucuda otomatik deploy yapılmasını sağlar.

## 🔄 İş Akışı

1. **Lokal PC'de:** Kod değişiklikleri yapılır
2. **Lokal PC'de:** `git commit` ve `git push origin main` yapılır
3. **GitHub:** Push event'i tetiklenir
4. **GitHub Webhook:** Sunucudaki webhook endpoint'ine POST isteği gönderir
5. **Sunucu:** `deploy.sh` script'i otomatik çalışır:
   - Git fetch ve reset (GitHub'dan son değişiklikleri alır)
   - Docker Compose down
   - Docker Compose up -d

## 📋 Kurulum Adımları

### 1. Sunucuda Gerekli Dosyalar

Aşağıdaki dosyaların sunucuda mevcut olduğundan emin olun:
- ✅ `deploy.sh` - Deploy script'i
- ✅ `deploy/hooks.json` - Webhook yapılandırması
- ✅ `.deploy_key` - GitHub SSH deploy key (read-only)
- ✅ `.env` - Environment variables (WEBHOOK_SECRET, CLOUDFLARE_TUNNEL_TOKEN)

### 2. GitHub Webhook Kurulumu

1. GitHub repository'nize gidin: `https://github.com/burakustuner/surveyor-ai`
2. **Settings** → **Webhooks** → **Add webhook**
3. Ayarlar:
   - **Payload URL:** 
     - `http://your-server-ip:9001/hooks/deploy` (doğrudan)
     - Veya `http://your-domain/hooks/deploy` (nginx üzerinden)
   - **Content type:** `application/json`
   - **Secret:** `.env` dosyasındaki `WEBHOOK_SECRET` değeri (opsiyonel ama önerilir)
   - **Events:** "Just the push event" seçin
   - **Active:** ✓ işaretli olsun
4. **Add webhook** butonuna tıklayın

### 3. Test

Lokal PC'de küçük bir değişiklik yapıp push edin:

```bash
# Lokal PC'de
echo "# Test" >> README.md
git add README.md
git commit -m "Test deploy"
git push origin main
```

Sunucuda logları kontrol edin:

```bash
# Sunucuda
tail -f /data/web-site/deploy.log
# Veya
docker logs -f webhook
```

## 🔍 Sorun Giderme

### Webhook Çalışmıyor

1. **Webhook loglarını kontrol edin:**
   ```bash
   docker logs webhook
   ```

2. **Container'ın çalıştığından emin olun:**
   ```bash
   docker compose ps
   ```

3. **GitHub webhook delivery'lerini kontrol edin:**
   - GitHub → Settings → Webhooks → Son delivery'leri kontrol edin
   - Hata mesajlarını okuyun

### Deploy Başarısız Oluyor

1. **Deploy loglarını kontrol edin:**
   ```bash
   tail -50 /data/web-site/deploy.log
   ```

2. **Git SSH key kontrolü:**
   ```bash
   # .deploy_key dosyasının var olduğundan emin olun
   ls -la /data/web-site/.deploy_key
   
   # GitHub'a bağlantıyı test edin
   GIT_SSH_COMMAND="ssh -i /data/web-site/.deploy_key -o IdentitiesOnly=yes" git ls-remote origin
   ```

3. **Docker Compose kontrolü:**
   ```bash
   docker compose ps
   docker compose logs
   ```

### GitHub Webhook Secret Hatası

Eğer secret kullanıyorsanız:
1. GitHub webhook'taki secret ile `.env` dosyasındaki `WEBHOOK_SECRET` aynı olmalı
2. Secret'ı değiştirdiyseniz, her iki yerde de güncelleyin

## 📝 Notlar

- Deploy script'i `git reset --hard` kullanır, bu yüzden sunucudaki yerel değişiklikler kaybolur
- Sadece `main` branch'ine push yapıldığında deploy tetiklenir
- Deploy sırasında container'lar yeniden başlatılır (downtime olabilir)
- Tüm işlemler `deploy.log` dosyasına kaydedilir

## ✅ Başarı Kriterleri

Deploy başarılı olduğunda:
- ✅ `deploy.log` dosyasında "Deploy tamamlandı" mesajı görünür
- ✅ Container'lar çalışır durumda (`docker compose ps`)
- ✅ Web uygulaması erişilebilir
- ✅ GitHub webhook delivery'lerinde 200 OK yanıtı görünür

