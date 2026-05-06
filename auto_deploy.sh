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
git checkout -- . 2>/dev/null || true
git clean -fd 2>/dev/null || true
git pull origin main
POSTGRES_PASSWORD=Jobezee_PG_2026! docker compose up -d postgres
POSTGRES_PASSWORD=Jobezee_PG_2026! docker compose up -d --build backend
echo "[auto-deploy] Done at $(date)"
