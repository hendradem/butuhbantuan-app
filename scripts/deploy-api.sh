#!/bin/bash
# Quick API-only deploy from your laptop (bypasses GitHub Actions).
# Useful for hot-patching a Go change without triggering a full pipeline.
#
# Usage:
#   DEPLOY_HOST=1.2.3.4 bash scripts/deploy-api.sh
#   DEPLOY_HOST=api.butuhbantuan.id DEPLOY_USER=bb bash scripts/deploy-api.sh

set -euo pipefail

DEPLOY_USER="${DEPLOY_USER:-bb}"
DEPLOY_HOST="${DEPLOY_HOST:?DEPLOY_HOST not set}"
DEPLOY_PATH="/opt/butuhbantuan/api"

echo "→ Building API (linux/amd64)…"
(cd apps/api && \
  GOOS=linux GOARCH=amd64 CGO_ENABLED=0 \
  go build -ldflags="-s -w" -o bin/server ./cmd/main.go)

echo "→ Uploading binary to $DEPLOY_HOST…"
rsync -avz apps/api/bin/server \
  "$DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH/bin/server"

echo "→ Restarting bb-api…"
ssh "$DEPLOY_USER@$DEPLOY_HOST" "sudo /bin/systemctl restart bb-api"

echo "→ Health check…"
ssh "$DEPLOY_USER@$DEPLOY_HOST" \
  "curl -sf --max-time 5 http://127.0.0.1:8080/api/v1/health >/dev/null" \
  && echo "✅ API healthy" \
  || { echo "❌ API health failed"; exit 1; }
