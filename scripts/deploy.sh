#!/bin/bash
# ButuhBantuan — Deployment script (runs on the VPS).
# Called by GitHub Actions via SSH after artifacts are uploaded to /tmp/bb-deploy/.
#
# Expects at /tmp/bb-deploy/:
#   server                  Go API binary (linux/amd64)
#   dashboard-output/       Nuxt SSR build (.output tree)
#   webapp-dist/            Static web-app (nuxt generate output)

set -euo pipefail

DEPLOY_DIR="/tmp/bb-deploy"
APP_DIR="/opt/butuhbantuan"

log()  { echo "[deploy] $*"; }
fail() { echo "[deploy] ❌ $*" >&2; exit 1; }

# ── Validate artifacts ────────────────────────────────────────────────────────

[[ -f "$DEPLOY_DIR/server" ]]           || fail "Missing: server binary"
[[ -d "$DEPLOY_DIR/dashboard-output" ]] || fail "Missing: dashboard-output/"
[[ -d "$DEPLOY_DIR/webapp-dist" ]]      || fail "Missing: webapp-dist/"

# ── Backup current API binary (for rollback) ─────────────────────────────────

if [[ -f "$APP_DIR/api/bin/server" ]]; then
  log "Backing up current API binary → server.bak"
  cp "$APP_DIR/api/bin/server" "$APP_DIR/api/bin/server.bak"
fi

# ── Swap artifacts ────────────────────────────────────────────────────────────

log "Installing API binary…"
install -m 755 "$DEPLOY_DIR/server" "$APP_DIR/api/bin/server"

log "Syncing dashboard SSR output…"
rsync -a --delete "$DEPLOY_DIR/dashboard-output/" "$APP_DIR/dashboard/.output/"

log "Syncing web-app static dist…"
rsync -a --delete "$DEPLOY_DIR/webapp-dist/" "$APP_DIR/web-app/dist/"

# ── Restart services ──────────────────────────────────────────────────────────

log "Restarting bb-api…"
sudo /bin/systemctl restart bb-api

log "Restarting bb-dashboard…"
sudo /bin/systemctl restart bb-dashboard

# web-app is static → Nginx picks up new files immediately, no restart needed.

# ── Health checks ─────────────────────────────────────────────────────────────

check() {
  local name=$1 url=$2 attempts=8
  for i in $(seq 1 $attempts); do
    if curl -sf --max-time 3 "$url" >/dev/null 2>&1; then
      log "✓ $name healthy"
      return 0
    fi
    sleep 2
  done
  return 1
}

log "Health-checking services…"
if ! check "bb-api" "http://127.0.0.1:8080/api/v1/health"; then
  log "API health failed — rolling back binary."
  if [[ -f "$APP_DIR/api/bin/server.bak" ]]; then
    cp "$APP_DIR/api/bin/server.bak" "$APP_DIR/api/bin/server"
    sudo /bin/systemctl restart bb-api
    log "Rollback done. Investigate: journalctl -u bb-api -n 100"
  fi
  fail "Deploy aborted (API unhealthy)."
fi

if ! check "bb-dashboard" "http://127.0.0.1:3002/"; then
  fail "Dashboard unhealthy. journalctl -u bb-dashboard -n 100"
fi

# Web-app is static (served by Nginx) — verify the built entry file exists.
# Skip HTTP probe: nginx vhost may be domain-scoped so 127.0.0.1 won't match.
if [[ ! -s "$APP_DIR/web-app/dist/index.html" ]]; then
  fail "Web-app not deployed — $APP_DIR/web-app/dist/index.html missing/empty"
fi
log "✓ web-app dist present"

# ── Cleanup ───────────────────────────────────────────────────────────────────

rm -rf "$DEPLOY_DIR"
log "✅ Deploy complete."
