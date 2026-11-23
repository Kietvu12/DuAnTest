#!/usr/bin/env bash
# Trên server: git pull main → build frontend → sync backend src → restart PM2.
# Giữ nguyên backend/.env. Không chạy db:setup (tránh xóa data).
set -euo pipefail

APP="/home/api/shophouse"
WEB="/home/frontend/shophouse"
PM2="${PM2:-$(command -v pm2 || echo /usr/local/bin/pm2)}"
if [[ $(id -u) -ne 0 ]]; then PM2="sudo -n $PM2"; fi
BRANCH="${1:-main}"

cd "$APP"
echo "==> $(date -Is) pull $BRANCH @ $APP"
git fetch origin
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"
echo "commit: $(git rev-parse --short HEAD) — $(git log -1 --pretty=%s)"
git rev-parse --short HEAD > "$APP/backend/RELEASE"

echo "==> backend deps"
cd "$APP/backend"
npm ci --omit=dev

echo "==> build frontend"
cd "$APP/frontend"
npm ci
npm run build

echo "==> publish web"
mkdir -p "$WEB"
rsync -rltD --delete --chmod=Du+rwx,Dgo+rx,Fu+rw,Fgo+r "$APP/frontend/dist/" "$WEB/"
chmod -R a+rX "$WEB"

echo "==> restart API"
cd "$APP/backend"
if $PM2 describe shophouse-api >/dev/null 2>&1; then
  $PM2 restart shophouse-api --update-env
elif $PM2 describe voltmart-api >/dev/null 2>&1; then
  $PM2 restart voltmart-api --update-env
else
  $PM2 start src/index.js --name shophouse-api --node-args="--env-file=.env" --cwd "$APP/backend"
fi
$PM2 save

PORT="$(grep -oP '^PORT=\K\d+' .env || echo 4000)"
bash "$APP/scripts/smoke-test.sh" "http://127.0.0.1:$PORT"
echo "OK ShopHouse $(git -C "$APP" rev-parse --short HEAD)"
