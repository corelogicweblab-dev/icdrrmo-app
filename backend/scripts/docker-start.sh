#!/bin/sh
set -e

echo "[icdrrmo] Running database migrations…"
npx prisma migrate deploy

echo "[icdrrmo] Running seed (non-fatal if already applied)…"
if ! npx prisma db seed; then
  echo "[icdrrmo] WARN: db seed exited non-zero — API will still start."
fi

echo "[icdrrmo] Starting API…"
exec node dist/main.js
