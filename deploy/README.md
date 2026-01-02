# GitHub Webhook Deploy Yapılandırması

Bu klasör GitHub webhook entegrasyonu için gerekli dosyaları içerir.

## Kurulum

### 1. GitHub Webhook Ayarları

GitHub repository'nizde:
1. Settings → Webhooks → Add webhook
2. Payload URL: 
   - **Doğrudan webhook:** `http://your-server-ip:9001/hooks/deploy`
   - **Nginx üzerinden:** `http://your-domain/hooks/deploy`
3. Content type: `application/json`
4. Secret: (opsiyonel, güvenlik için önerilir - `.env` dosyasındaki `WEBHOOK_SECRET`)
5. Events: **"Just the push event"** seçin
6. Active: ✓

**Not:** Hook ID `deploy` olduğu için URL `/hooks/deploy` olmalıdır.

### 2. Webhook Secret (Opsiyonel ama Önerilir)

Güvenlik için webhook secret kullanmak isterseniz:

1. Güçlü bir secret oluşturun:
   ```bash
   openssl rand -hex 32
   ```

2. `hooks.json` dosyasını düzenleyin ve `trigger-rule` kısmını şu şekilde güncelleyin:
   ```json
   "trigger-rule": {
     "and": [
       {
         "match": {
           "type": "value",
           "value": "refs/heads/main",
           "parameter": {
             "source": "payload",
             "name": "ref"
           }
         }
       },
       {
         "match": {
           "type": "payload-hmac-sha256",
           "secret": "BURAYA_SECRET_GELECEK",
           "parameter": {
             "source": "header",
             "name": "X-Hub-Signature-256"
           }
         }
       }
     ]
   }
   ```

3. GitHub webhook ayarlarında aynı secret'ı girin.

### 3. Deploy Script

`deploy.sh` script'i şunları yapar:
1. Git fetch origin main
2. Git reset --hard origin/main (sunucudaki değişiklikleri GitHub ile senkronize eder)
3. docker compose down
4. docker compose up -d

**Tüm işlemler** `/data/web-site/deploy.log` dosyasına loglanır.

**Not:** Script SSH deploy key kullanır (`.deploy_key` dosyası).

### 4. Test

Webhook'u test etmek için:
```bash
# Doğrudan webhook container'ına
curl -X POST http://localhost:9001/hooks/deploy \
  -H "Content-Type: application/json" \
  -d '{"ref":"refs/heads/main","head_commit":{"id":"test"}}'

# Nginx üzerinden (eğer domain varsa)
curl -X POST http://your-domain/hooks/deploy \
  -H "Content-Type: application/json" \
  -d '{"ref":"refs/heads/main","head_commit":{"id":"test"}}'
```

**Başarılı yanıt:** `Deploy başlatıldı` veya benzeri bir mesaj almalısınız.

## Sorun Giderme

- Webhook loglarını kontrol edin: `docker logs webhook`
- Deploy loglarını kontrol edin: `cat deploy.log`
- Container durumunu kontrol edin: `docker-compose ps`

