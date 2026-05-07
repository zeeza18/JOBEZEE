#!/bin/bash
# Runs every 2 min via cron — pulls latest commit and rebuilds if changed.
set -e
cd /opt/jobezee

git fetch origin main --quiet

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
    exit 0
fi

echo "[auto-deploy] $(date) — $LOCAL -> $REMOTE"
git reset --hard origin/main
git clean -fd 2>/dev/null || true
chmod +x /opt/jobezee/auto_deploy.sh
POSTGRES_PASSWORD=Jobezee_PG_2026! docker compose up -d postgres
POSTGRES_PASSWORD=Jobezee_PG_2026! docker compose up -d --build backend
systemctl restart jobezee-worker 2>/dev/null || true
echo "[auto-deploy] Done at $(date)"
