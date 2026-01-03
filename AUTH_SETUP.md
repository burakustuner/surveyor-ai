# Google OAuth & Rate Limiting Kurulum Rehberi

Bu rehber, Google OAuth authentication ve rate limiting sisteminin kurulumunu açıklar.

## 📋 Gereksinimler

1. Google Cloud Console'da bir proje
2. OAuth 2.0 Client ID
3. Docker ve Docker Compose

## 🔧 Kurulum Adımları

### 1. Google Cloud Console Ayarları

1. [Google Cloud Console](https://console.cloud.google.com/)'a gidin
2. Yeni bir proje oluşturun veya mevcut projeyi seçin
3. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**
4. Application type: **Web application**
5. **Authorized JavaScript origins** ekleyin:
   - `http://localhost:8082` (geliştirme)
   - `https://yourdomain.com` (production)
6. **Authorized redirect URIs** ekleyin:
   - `http://localhost:8082` (geliştirme)
   - `https://yourdomain.com` (production)
7. **Client ID**'yi kopyalayın

### 2. Environment Variables

`.env` dosyasını oluşturun veya güncelleyin:

```bash
# Mevcut değişkenler
WEBHOOK_SECRET=your_webhook_secret_here
CLOUDFLARE_TUNNEL_TOKEN=your_cloudflare_token_here

# Yeni değişkenler
GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=3600
ALLOWED_ORIGINS=https://www.surveyor.work,http://localhost:8082
```

**Açıklamalar:**
- `GOOGLE_CLIENT_ID`: Google Cloud Console'dan aldığınız Client ID
- `RATE_LIMIT_REQUESTS`: Kullanıcı başına saatlik istek limiti (varsayılan: 100)
- `RATE_LIMIT_WINDOW`: Rate limit penceresi saniye cinsinden (varsayılan: 3600 = 1 saat)
- `ALLOWED_ORIGINS`: CORS için izin verilen domain'ler (virgülle ayrılmış). Production için sadece kendi domain'inizi ekleyin. Varsayılan: `https://www.surveyor.work,http://localhost:8082`

### 3. Frontend Google Client ID

`html/index.html` dosyasında `GOOGLE_CLIENT_ID` değişkenini güncelleyin:

```javascript
const GOOGLE_CLIENT_ID = "your_google_client_id_here.apps.googleusercontent.com";
```

**Not:** Production'da bu değeri backend'den almak daha güvenlidir. Şu anda backend `/api/user/config` endpoint'i üzerinden Client ID'yi sağlıyor.

### 4. Docker Compose ile Başlatma

```bash
docker compose up -d --build
```

Backend servisi otomatik olarak:
- SQLite veritabanını oluşturur (`./db/app.db`)
- Rate limiting tablolarını başlatır
- API loglarını kaydeder

### 5. Veritabanı Yapısı

Sistem otomatik olarak şu tabloları oluşturur:

- **users**: Google OAuth kullanıcı bilgileri
- **rate_limits**: Kullanıcı bazlı rate limit kayıtları
- **api_logs**: API istek logları

## 🔍 Kullanım

### Frontend'de Giriş

1. Sayfa yüklendiğinde "Google ile Giriş" butonu görünür
2. Butona tıklayarak Google hesabınızla giriş yapın
3. Token otomatik olarak localStorage'a kaydedilir
4. Tüm API istekleri otomatik olarak Authorization header'ı ile gönderilir

### Rate Limit Kontrolü

- Kullanıcı başına saatlik istek limiti: `RATE_LIMIT_REQUESTS` (varsayılan: 100)
- Limit aşıldığında 429 (Too Many Requests) hatası döner
- Frontend'de rate limit bilgileri sidebar'da gösterilir

### API Logları

Tüm API istekleri `api_logs` tablosuna kaydedilir:
- Kullanıcı ID
- Endpoint
- HTTP Method
- Status Code
- Response Time
- IP Address
- User Agent
- Timestamp
- Hata mesajları (varsa)

## 🗄️ Veritabanı Yönetimi

### SQLite Veritabanına Erişim

```bash
# Container içinden
docker exec -it backend-api sqlite3 /data/db/app.db

# Lokal (volume mount edilmişse)
sqlite3 ./db/app.db
```

### Örnek Sorgular

```sql
-- Kullanıcı sayısı
SELECT COUNT(*) FROM users;

-- Rate limit durumu
SELECT user_id, requests, window_start FROM rate_limits;

-- Son 10 API logu
SELECT * FROM api_logs ORDER BY timestamp DESC LIMIT 10;

-- Hatalı istekler
SELECT * FROM api_logs WHERE status_code >= 400 ORDER BY timestamp DESC;

-- Kullanıcı bazlı istek sayısı
SELECT user_id, COUNT(*) as request_count 
FROM api_logs 
GROUP BY user_id 
ORDER BY request_count DESC;
```

## 🔒 Güvenlik Notları

1. **Google Client ID**: Production'da environment variable olarak saklanmalı
2. **Token Doğrulama**: Her istekte Google token doğrulaması yapılır
3. **Rate Limiting**: Kullanıcı bazlı rate limiting ile API kötüye kullanımı önlenir
4. **Logging**: Tüm API istekleri loglanır (güvenlik ve analiz için)

## 🐛 Sorun Giderme

### "Authentication required" Hatası

- Google ile giriş yapıldığından emin olun
- Token'ın geçerli olduğunu kontrol edin
- Browser console'da hata mesajlarını kontrol edin

### "Rate limit exceeded" Hatası

- Rate limit penceresi dolmuş olabilir
- Bekleyin veya `RATE_LIMIT_REQUESTS` değerini artırın
- Veritabanında rate limit kayıtlarını kontrol edin

### Google Sign-In Butonu Görünmüyor

- Google Client ID'nin doğru yapılandırıldığından emin olun
- Browser console'da JavaScript hatalarını kontrol edin
- Google Sign-In script'inin yüklendiğini kontrol edin

### Backend Başlamıyor

- `.env` dosyasının doğru yapılandırıldığını kontrol edin
- Docker loglarını kontrol edin: `docker logs backend-api`
- Port çakışması olup olmadığını kontrol edin

## 📊 PostgreSQL'e Geçiş (Opsiyonel)

SQLite yerine PostgreSQL kullanmak isterseniz:

1. `docker-compose.yml`'e PostgreSQL servisi ekleyin
2. `backend/main.py`'de SQLite yerine PostgreSQL bağlantısı kullanın
3. Connection string'i environment variable olarak ayarlayın

Örnek PostgreSQL servisi:

```yaml
postgres:
  image: postgres:15-alpine
  container_name: postgres-db
  restart: unless-stopped
  environment:
    POSTGRES_DB: surveyor_ai
    POSTGRES_USER: surveyor
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
  volumes:
    - ./postgres_data:/var/lib/postgresql/data
```

## 📝 Notlar

- SQLite dosyası `./db/app.db` konumunda saklanır
- Veritabanı volume mount edilmiştir, container yeniden başlatılsa bile veriler korunur
- Rate limit penceresi her saat başında sıfırlanır
- API logları süresiz saklanır (manuel temizleme gerekebilir)


