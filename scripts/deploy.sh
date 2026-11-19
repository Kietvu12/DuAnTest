#!/usr/bin/env bash
# Copy a built checkout onto the live VoltTech app and reload the API.
# Does not touch backend/.env, nginx or the database (db:setup wipes data, run it by hand).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP="/home/DuAnTest"
PM2=/usr/local/bin/pm2

if [[ "$ROOT" == "$APP" ]]; then
  echo "Refusing to deploy from the live app directory." >&2
  exit 1
fi
if [[ ! -f "$APP/backend/.env" ]]; then
  echo "$APP/backend/.env is missing." >&2
  exit 1
fi

mkdir -p "$APP/backend" "$APP/frontend/dist" "$APP/scripts"
rsync -a --delete "$ROOT/backend/src/" "$APP/backend/src/"
rsync -a --delete "$ROOT/backend/db/" "$APP/backend/db/"
cp "$ROOT/backend/package.json" "$ROOT/backend/package-lock.json" "$ROOT/backend/.env.example" "$APP/backend/"
rsync -a --delete "$ROOT/scripts/" "$APP/scripts/"
rsync -a --delete "$ROOT/frontend/dist/" "$APP/frontend/dist/"

# Mã commit đang chạy, gửi kèm mỗi báo lỗi sang TicketForge (trường "release").
git -C "$ROOT" rev-parse --short HEAD > "$APP/backend/RELEASE" 2>/dev/null || true

cd "$APP/backend"
npm ci --omit=dev

if $PM2 describe voltmart-api >/dev/null 2>&1; then
  $PM2 restart voltmart-api
else
  $PM2 start src/index.js --name voltmart-api --node-args="--env-file=.env" --cwd "$APP/backend"
fi
$PM2 save

bash "$APP/scripts/smoke-test.sh" "http://127.0.0.1:$(grep -oP '^PORT=\K\d+' .env || echo 4000)"
