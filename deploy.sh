#!/bin/sh
# Robust deploy script for webhook container
# - avoids "docker compose down" (kills webhook itself)
# - does git hard reset to origin/main
# - does safe compose up with build

set -e

LOG_FILE="/data/web-site/deploy.log"
PROJECT_DIR="/data/web-site"

log() {
  TIMESTAMP="$(date '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo 'N/A')"
  # log dosyasına yazamazsa stdout'a bas
  echo "[$TIMESTAMP] $*" >> "$LOG_FILE" 2>/dev/null || echo "[$TIMESTAMP] $*"
}

run() {
  # Komutu hem log'a hem ekrana düşür
  log "CMD: $*"
  # tee log dosyası yoksa bile çalışsın diye klasörü garanti ediyoruz
  mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || true
  sh -c "$*" 2>&1 | tee -a "$LOG_FILE"
}

log "=== Deploy başlatıldı ==="
log "Working directory (before cd): $(pwd)"
log "User: $(whoami)"

cd "$PROJECT_DIR" || {
  log "HATA: Dizin değiştirilemedi: $PROJECT_DIR"
  exit 1
}

# GitHub SSH deploy key ile pull
export GIT_SSH_COMMAND="ssh -i /data/web-site/.deploy_key -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new"

log "Git remote kontrol..."
# remote yoksa logdan anlaşılır
run "git remote -v"

log "Git fetch (origin main)..."
run "git fetch origin main"

log "Git reset --hard origin/main..."
run "git reset --hard origin/main"

log "Docker compose config kontrol..."
run "docker compose config >/dev/null"

log "Docker compose pull (varsa yeni image çeksin, hata olursa devam)..."
# private image vs durumlarında fail edebilir, deployu öldürmesin
(run "docker compose pull" && true) || log "UYARI: docker compose pull hata verdi (devam ediliyor)"

# KRİTİK: docker compose down YAPMA! webhook'u öldürür.
# Güncelleme: servisleri rebuild + recreate et
log "Docker compose up (build + recreate) başlatılıyor..."
run "docker compose up -d --build --remove-orphans"

log "Container durumları:"
run "docker compose ps"

log "Son 50 log satırı (nginx/ollama/webhook):"
# loglar çok büyümesin diye tail
(run "docker logs --tail=50 nginx-web" && true) || true
(run "docker logs --tail=50 ollama" && true) || true
(run "docker logs --tail=50 webhook" && true) || true

log "=== Deploy tamamlandı ==="
exit 0
