#!/usr/bin/env bash
# Pull → build frontend → restart PM2 (không chạy db:setup)
set -euo pipefail
APP=/home/api/shophouse
WEB=/home/frontend/shophouse
BRANCH="${1:-main}"
REPO=Kietvu12/DuAnTest
TOKEN_FILE=/root/.config/gh-token

cd "$APP"
ORIGIN_CLEAN="https://github.com/${REPO}.git"
if [[ -f "$TOKEN_FILE" ]]; then
  TOKEN="$(tr -d '\n' < "$TOKEN_FILE")"
  git remote set-url origin "https://oauth2:${TOKEN}@github.com/${REPO}.git"
fi
git fetch origin
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"
git remote set-url origin "$ORIGIN_CLEAN"
echo "commit $(git rev-parse --short HEAD) — $(git log -1 --pretty=%s)"
git rev-parse --short HEAD > "$APP/backend/RELEASE"

cd "$APP/backend" && npm ci --omit=dev
cd "$APP/frontend" && npm ci && npm run build

mkdir -p "$WEB"
rsync -a --delete "$APP/frontend/dist/" "$WEB/"
chmod -R a+rX "$WEB"

cd "$APP/backend"
pm2 restart shophouse-api --update-env || pm2 start src/index.js --name shophouse-api --node-args='--env-file=.env' --cwd "$APP/backend"
pm2 save

for i in $(seq 1 20); do
  if curl -fsS -m 2 http://127.0.0.1:4000/api/health >/dev/null 2>&1; then break; fi
  sleep 1
done
curl -fsS http://127.0.0.1:4000/api/health
echo
echo "OK ShopHouse $(git -C "$APP" rev-parse --short HEAD)"
