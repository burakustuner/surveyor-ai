<<<<<<< HEAD
#!/usr/bin/env bash
set -euo pipefail

cd /data/web-site

# GitHub SSH deploy key ile pull
export GIT_SSH_COMMAND="ssh -i /data/web-site/.deploy_key -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new"

echo "[deploy] fetching..."
git fetch origin main

echo "[deploy] resetting..."
git reset --hard origin/main

echo "[deploy] docker compose up..."
docker compose down
docker compose up -d

echo "[deploy] done"
=======
#!/bin/bash

# Deploy script for GitHub webhook
# Bu script GitHub webhook tarafından çağrılır

set -e  # Hata durumunda dur

LOG_FILE="/data/web-site/deploy.log"
PROJECT_DIR="/data/web-site"

# Log fonksiyonu
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== Deploy başlatıldı ==="

cd "$PROJECT_DIR" || exit 1

# Mevcut branch'i al (main veya master)
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
log "Mevcut branch: $CURRENT_BRANCH"

# Git pull
log "Git pull yapılıyor (branch: $CURRENT_BRANCH)..."
git pull origin "$CURRENT_BRANCH" 2>&1 | tee -a "$LOG_FILE" || {
    log "HATA: Git pull başarısız!"
    exit 1
}

# Docker Compose down
log "Docker Compose durduruluyor..."
docker-compose down 2>&1 | tee -a "$LOG_FILE" || {
    log "UYARI: docker-compose down sırasında hata (devam ediliyor)"
}

# Docker Compose up -d (detached mode)
log "Docker Compose başlatılıyor..."
docker-compose up -d --build 2>&1 | tee -a "$LOG_FILE" || {
    log "HATA: docker-compose up başarısız!"
    exit 1
}

# Container durumlarını kontrol et
log "Container durumları kontrol ediliyor..."
docker-compose ps 2>&1 | tee -a "$LOG_FILE"

log "=== Deploy tamamlandı ==="

>>>>>>> b4af2c72e36d07c2283f15c0ee0c6de5826424e7
