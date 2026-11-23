#!/usr/bin/env bash
set -euo pipefail
APP=/home/api/shophouse
WEB=/home/frontend/shophouse
TOKEN=$(tr -d '\n' </root/.config/gh-token)
cd "$APP"
git remote set-url origin "https://oauth2:${TOKEN}@github.com/Kietvu12/DuAnTest.git"
git fetch origin && git checkout main && git pull --ff-only origin main
git remote set-url origin https://github.com/Kietvu12/DuAnTest.git
echo "commit $(git rev-parse --short HEAD)"
git rev-parse --short HEAD > "$APP/backend/RELEASE"
cd "$APP/backend" && npm ci --omit=dev
cd "$APP/frontend" && npm ci && npm run build
mkdir -p "$WEB" && rsync -a --delete "$APP/frontend/dist/" "$WEB/" && chmod -R a+rX "$WEB"
cd "$APP/backend"
pm2 restart shophouse-api --update-env || pm2 start src/index.js --name shophouse-api --node-args='--env-file=.env' --cwd "$APP/backend"
pm2 save
sleep 2
curl -fsS http://127.0.0.1:4000/api/health
echo
