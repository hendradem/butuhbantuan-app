#!/bin/bash
# ButuhBantuan — Deployment script
# Called by GitHub Actions on the VPS via SSH.
# Expects artifacts to be pre-uploaded to /tmp/bb-deploy/ by CI.

set -euo pipefail

DEPLOY_DIR="/tmp/bb-deploy"
APP_DIR="/opt/butuhbantuan"

log() { echo "[deploy] $1"; }

# ── Validate artifacts ────────────────────────────────────────────────────────

[[ -f "$DEPLOY_DIR/server" ]]               || { log "❌ Missing: server binary"; exit 1; }
[[ -d "$DEPLOY_DIR/dashboard-output" ]]     || { log "❌ Missing: dashboard output"; exit 1; }
[[ -d "$DEPLOY_DIR/webapp-dist" ]]          || { log "❌ Missing: web-app dist"; exit 1; }

# ── Backup current binary (for rollback) ─────────────────────────────────────

if [[ -f "$APP_DIR/api/bin/server" ]]; then
  log "Backing up current binary..."
  cp "$APP_DIR/api/bin/server" "$APP_DIR/api/server.bak"
fi

# ── Swap artifacts ────────────────────────────────────────────────────────────

log "Deploying API binary..."
mv "$DEPLOY_DIR/server" "$APP_DIR/api/bin/server"
chmod +x "$APP_DIR/api/bin/server"

log "Deploying Dashboard..."
rsync -a --delete "$DEPLOY_DIR/dashboard-output/" "$APP_DIR/dashboard/.output/"

log "Deploying Web-app..."
rsync -a --delete "$DEPLOY_DIR/webapp-dist/" "$APP_DIR/web-app/dist/"

# ── Restart services ──────────────────────────────────────────────────────────

log "Restarting services..."
sudo systemctl restart bb-api
sudo systemctl restart bb-dashboard

# ── Health check ──────────────────────────────────────────────────────────────

log "Running health check..."
sleep 3

for i in {1..5}; do
  if curl -sf http://localhost:3001/api/v1/health > /dev/null 2>&1; then
    log "✅ API healthy"
    break
  fi

  if [[ $i -eq 5 ]]; then
    log "❌ Health check failed — rolling back API..."
    if [[ -f "$APP_DIR/api/server.bak" ]]; then
      cp "$APP_DIR/api/server.bak" "$APP_DIR/api/bin/server"
      sudo systemctl restart bb-api
      log "⏪ Rollback complete. Check logs: journalctl -u bb-api -n 50"
    fi
    exit 1
  fi

  log "Waiting... ($i/5)"
  sleep 2
done

# ── Cleanup ───────────────────────────────────────────────────────────────────

rm -rf "$DEPLOY_DIR"
log "✅ Deployment complete"
