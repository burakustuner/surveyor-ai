#!/bin/sh
# Deploy script (webhook container içinden güvenli)
# Amaç: webhook'u öldürmeden sadece uygulama servislerini güncellemek.

set -e

LOG_FILE="/data/web-site/deploy.log"
PROJECT_DIR="/data/web-site"

# Webhook'u ASLA hedefleme!
TARGET_SERVICES="nginx ollama cloudflared"

mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || true

log() {
  TS="$(date '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo 'N/A')"
  echo "[$TS] $*" >> "$LOG_FILE" 2>/dev/null || echo "[$TS] $*"
}

run() {
  log "CMD: $*"
  # Komutu çalıştır, hem ekrana hem loga yaz
  "$@" 2>&1 | tee -a "$LOG_FILE"
}

log "=== Deploy başlatıldı ==="
log "PWD(before cd): $(pwd)"
log "USER: $(whoami)"

cd "$PROJECT_DIR" || { log "HATA: cd olmadi: $PROJECT_DIR"; exit 1; }

# SSH (deploy key) ayarları
mkdir -p /root/.ssh 2>/dev/null || true
export GIT_SSH_COMMAND="ssh -i /data/web-site/.deploy_key -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new"

log "Git remote:"
run git remote -v

log "Git fetch origin main:"
run git fetch origin main

log "Git reset --hard origin/main:"
run git reset --hard origin/main

log "Docker compose config kontrol:"
run docker compose config >/dev/null

log "Images pull (sadece hedef servisler) - hata olursa devam:"
# pull hata verirse deployu öldürmesin
( run docker compose pull $TARGET_SERVICES ) || log "UYARI: docker compose pull hata verdi (devam)"

log "Up (build + recreate) - SADECE hedef servisler:"
# webhook'u restart etmez çünkü listede yok
run docker compose up -d --build --force-recreate $TARGET_SERVICES

log "Container durumları:"
run docker compose ps

log "Son 80 satır log (nginx/ollama/cloudflared):"
( docker logs --tail=80 nginx-web 2>&1 | tee -a "$LOG_FILE" ) || true
( docker logs --tail=80 ollama 2>&1 | tee -a "$LOG_FILE" ) || true
( docker logs --tail=80 cloudflared 2>&1 | tee -a "$LOG_FILE" ) || true

log "=== Deploy tamamlandı ==="
exit 0
