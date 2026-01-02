# GitHub Webhook Deploy Yapılandırması

Bu klasör GitHub webhook entegrasyonu için gerekli dosyaları içerir.

## Kurulum

### 1. GitHub Webhook Ayarları

GitHub repository'nizde:
1. Settings → Webhooks → Add webhook
2. Payload URL: `http://your-server-ip:9001/hooks/github-deploy`
   - Veya nginx üzerinden: `http://your-domain/hooks/github-deploy`
3. Content type: `application/json`
4. Secret: (opsiyonel, güvenlik için önerilir)
5. Events: "Just the push event" seçin
6. Active: ✓

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
- Git pull (main branch)
- docker-compose down
- docker-compose up -d --build

Tüm işlemler `/data/web-site/deploy.log` dosyasına loglanır.

### 4. Test

Webhook'u test etmek için:
```bash
curl -X POST http://localhost:9001/hooks/github-deploy \
  -H "Content-Type: application/json" \
  -d '{"ref":"refs/heads/main","head_commit":{"id":"test"}}'
```

## Sorun Giderme

- Webhook loglarını kontrol edin: `docker logs webhook`
- Deploy loglarını kontrol edin: `cat deploy.log`
- Container durumunu kontrol edin: `docker-compose ps`

