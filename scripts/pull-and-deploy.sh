#!/usr/bin/env bash
# Pull main, install deps, build frontend, restart ShopHouse API (pm2).
# Nginx root: /home/DuAnTest/frontend/dist → API proxy 127.0.0.1:4000
set -euo pipefail

APP=/home/DuAnTest
TOKEN_FILE="${GH_TOKEN_FILE:-/root/.config/gh-token}"
PM2="${PM2:-$(command -v pm2 || echo /usr/local/bin/pm2)}"

if [[ ! -f "$TOKEN_FILE" ]]; then
  echo "Missing GitHub token file: $TOKEN_FILE" >&2
  exit 1
fi
TOKEN=$(tr -d '\n' <"$TOKEN_FILE")

cd "$APP"
git remote set-url origin "https://oauth2:${TOKEN}@github.com/Kietvu12/DuAnTest.git"
git fetch origin
git checkout main
git pull --ff-only origin main
git remote set-url origin https://github.com/Kietvu12/DuAnTest.git
echo "commit $(git rev-parse --short HEAD)"
git rev-parse --short HEAD > "$APP/backend/RELEASE"

cd "$APP/backend"
npm ci --omit=dev

cd "$APP/frontend"
npm ci
npm run build
chmod -R a+rX "$APP/frontend/dist"

cd "$APP/backend"
if $PM2 describe shophouse-api >/dev/null 2>&1; then
  $PM2 restart shophouse-api --update-env
elif $PM2 describe voltmart-api >/dev/null 2>&1; then
  $PM2 restart voltmart-api --update-env
else
  $PM2 start src/index.js --name shophouse-api --node-args='--env-file=.env' --cwd "$APP/backend"
fi
$PM2 save

sleep 2
PORT="$(grep -oP '^PORT=\K\d+' .env || echo 4000)"
curl -fsS -m 15 "http://127.0.0.1:${PORT}/api/health"
echo
echo "ShopHouse deployed OK"
