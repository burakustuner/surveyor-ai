# Güvenlik Notları

## ⚠️ ÖNEMLİ: Secret Key'ler Git'e Pushlanmamalı!

Bu projede kullanılan secret key'ler environment variable olarak yönetiliyor.

### Kurulum

1. `.env` dosyası oluşturun:
   ```bash
   cp .env.example .env  # Eğer .env.example varsa
   # Veya manuel olarak oluşturun
   ```

2. `.env` dosyasını düzenleyin ve secret key'leri girin:
   ```bash
   WEBHOOK_SECRET=your_webhook_secret_here
   CLOUDFLARE_TUNNEL_TOKEN=your_cloudflare_token_here
   ```

3. `.env` dosyası `.gitignore`'da olduğu için Git'e eklenmeyecek.

### Sunucuda Yapılacaklar

**1. `.env` dosyasını oluşturun:**
```bash
cd /data/web-site
cat > .env << EOF
WEBHOOK_SECRET=dsgsbmımwoe203_AWergbsg_+r3f-
CLOUDFLARE_TUNNEL_TOKEN=eyJhIjoiN2ZiNjBkYTI5ZWEyN2VmOGNkOTBlMzc0N2RkZjQ4ODkiLCJ0IjoiMGZiNjQyOGUtYzg3Mi00ZDBiLTg0MmMtMWQ0NGQ1ZjY4N2JkIiwicyI6Ik5XUmhOakl6TURBdE1XVmlZaTAwTXpVMkxXRXdaall0TVRNMk5XVTROMk15TldVMCJ9
EOF
```

**2. Webhook Secret (Opsiyonel ama Önerilir):**

`hooks.json` dosyası şu anda secret olmadan çalışıyor (sadece branch kontrolü). Güvenlik için secret eklemek isterseniz:

1. Sunucuda `deploy/hooks.json` dosyasını düzenleyin:
   ```json
   {
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
             "secret": "YOUR_SECRET_HERE",
             "parameter": {
               "source": "header",
               "name": "X-Hub-Signature-256"
             }
           }
         }
       ]
     }
   }
   ```

2. GitHub webhook ayarlarında aynı secret'ı girin.

**Not:** `hooks.json` Git'te olduğu için, secret'ı manuel olarak sunucuda eklemeniz gerekiyor. Her deploy'da üzerine yazılmayacak şekilde düzenleyebilirsiniz.

### Eğer Secret Key Git'e Pushlandıysa

⚠️ **ACİL**: Eğer secret key'ler Git'e pushlandıysa:

1. **Hemen secret key'leri değiştirin:**
   - GitHub webhook'ta yeni secret oluşturun
   - Cloudflare'de yeni tunnel token oluşturun

2. **Git geçmişinden temizleyin** (gerekirse):
   ```bash
   # DİKKAT: Bu komut Git geçmişini değiştirir!
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch deploy/hooks.json docker-compose.yml" \
     --prune-empty --tag-name-filter cat -- --all
   ```

3. **Yeni secret'ları `.env` dosyasına ekleyin**

4. **Force push yapın** (sadece gerekirse ve dikkatli!):
   ```bash
   git push origin --force --all
   ```

### Best Practices

- ✅ Secret key'leri environment variable olarak kullanın
- ✅ `.env` dosyasını `.gitignore`'a ekleyin
- ✅ `.env.example` dosyası oluşturun (secret olmadan)
- ❌ Secret key'leri kod içine yazmayın
- ❌ Secret key'leri Git'e pushlamayın

