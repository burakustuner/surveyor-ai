#!/usr/bin/env bash
set -euo pipefail

cd /data/web-site

# GitHub SSH deploy key ile pull
export GIT_SSH_COMMAND="ssh -i /data/web-site/.deploy_key -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new"

echo "[deploy] fetching..."
git fetch origin main

echo "[deploy] resetting..."
git reset --hard origin/main

echo "[deploy] docker compose down..."
docker compose down

echo "[deploy] docker compose up..."
docker compose up -d

echo "[deploy] done"
