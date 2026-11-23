#!/usr/bin/env bash
# Publish built checkout → live ShopHouse (VoltTech) app + nginx web root.
# Does not touch backend/.env, nginx, or database.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP="/home/api/shophouse"
WEB="/home/frontend/shophouse"
PM2="${PM2:-$(command -v pm2 || echo /usr/local/bin/pm2)}"
if [[ $(id -u) -ne 0 ]]; then PM2="sudo -n $PM2"; fi

if [[ "$ROOT" == "$APP" ]]; then
  echo "Refusing to deploy from the live app directory. Use scripts/pull-and-deploy.sh instead." >&2
  exit 1
fi
if [[ ! -f "$APP/backend/.env" ]]; then
  echo "$APP/backend/.env is missing." >&2
  exit 1
fi
if [[ ! -d "$ROOT/frontend/dist" ]]; then
  echo "Missing $ROOT/frontend/dist — run: cd frontend && npm ci && npm run build" >&2
  exit 1
fi

mkdir -p "$APP/backend" "$APP/frontend/dist" "$APP/scripts" "$WEB"
rsync -rltD --delete --chmod=Du+rwx,Dgo+rx,Fu+rw,Fgo+r "$ROOT/backend/src/" "$APP/backend/src/"
rsync -rltD --delete --chmod=Du+rwx,Dgo+rx,Fu+rw,Fgo+r "$ROOT/backend/db/" "$APP/backend/db/"
cp "$ROOT/backend/package.json" "$ROOT/backend/package-lock.json" "$ROOT/backend/.env.example" "$APP/backend/"
rsync -rltD --delete --chmod=Du+rwx,Dgo+rx,Fu+rw,Fgo+r "$ROOT/scripts/" "$APP/scripts/"
rsync -rltD --delete --chmod=Du+rwx,Dgo+rx,Fu+rw,Fgo+r "$ROOT/frontend/dist/" "$APP/frontend/dist/"
rsync -rltD --delete --chmod=Du+rwx,Dgo+rx,Fu+rw,Fgo+r "$ROOT/frontend/dist/" "$WEB/"
chmod -R a+rX "$WEB"

git -C "$ROOT" rev-parse --short HEAD > "$APP/backend/RELEASE" 2>/dev/null || true

cd "$APP/backend"
npm ci --omit=dev

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
echo "ShopHouse deployed OK"
