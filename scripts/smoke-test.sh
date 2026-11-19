#!/usr/bin/env bash
# Hit the main API endpoints and fail if any of them misbehaves.
# Usage: scripts/smoke-test.sh [base-url]   (default http://127.0.0.1:4000)
set -euo pipefail

BASE="${1:-http://127.0.0.1:4000}"

for attempt in $(seq 1 30); do
  if curl -fsS "$BASE/api/health" >/dev/null 2>&1; then break; fi
  if [[ "$attempt" == 30 ]]; then
    echo "API at $BASE did not become healthy" >&2
    exit 1
  fi
  sleep 1
done

check() {
  local label="$1" pattern="$2"
  shift 2
  local body
  body="$(curl -fsS "$@")"
  if ! grep -q "$pattern" <<<"$body"; then
    echo "FAIL $label: response did not contain $pattern" >&2
    echo "$body" | head -c 500 >&2
    exit 1
  fi
  echo "ok   $label"
}

check "categories" '"slug"' "$BASE/api/categories"
check "products" '"items"' "$BASE/api/products?limit=4"
check "product detail" '"variants"' "$BASE/api/products/iphone-16-pro-max"
check "login" '"token"' -X POST -H 'Content-Type: application/json' \
  -d '{"email":"khach@voltmart.vn","password":"Khach@123"}' "$BASE/api/auth/login"
