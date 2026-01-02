#!/bin/sh
set -eu

LOG_FILE="/data/web-site/deploy.log"
PROJECT_DIR="/data/web-site"

# Log fonksiyonu
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== Deploy başlatıldı ==="

cd "$PROJECT_DIR" || exit 1

# GitHub SSH deploy key ile pull
export GIT_SSH_COMMAND="ssh -i /data/web-site/.deploy_key -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new"

log "Git fetch yapılıyor..."
if git fetch origin main 2>&1 | tee -a "$LOG_FILE"; then
    log "Git fetch başarılı"
else
    log "HATA: Git fetch başarısız!"
    exit 1
fi

log "Git reset yapılıyor (hard reset to origin/main)..."
if git reset --hard origin/main 2>&1 | tee -a "$LOG_FILE"; then
    log "Git reset başarılı"
else
    log "HATA: Git reset başarısız!"
    exit 1
fi

log "Docker Compose durduruluyor..."
if docker compose down 2>&1 | tee -a "$LOG_FILE"; then
    log "Docker Compose down başarılı"
else
    log "UYARI: docker compose down sırasında hata (devam ediliyor)"
fi

log "Docker Compose başlatılıyor..."
if docker compose up -d 2>&1 | tee -a "$LOG_FILE"; then
    log "Docker Compose up başarılı"
else
    log "HATA: docker compose up başarısız!"
    exit 1
fi

log "Container durumları:"
docker compose ps 2>&1 | tee -a "$LOG_FILE"

log "=== Deploy tamamlandı ==="
