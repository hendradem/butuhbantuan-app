#!/bin/bash
# ButuhBantuan — VPS initial setup for Ubuntu 22.04 LTS (2 vCPU / 2 GB RAM).
#
# Usage:
#   sudo bash setup-vps.sh                     # IP mode (no domain yet)
#   sudo bash setup-vps.sh butuhbantuan.id     # domain mode (3 subdomains)
#
# What this script does (idempotent — safe to re-run):
#   1. System update + install (Node 20, pnpm, MySQL 8, Nginx, fail2ban, certbot)
#   2. 4 GB swap file (required for 2 GB RAM)
#   3. bb user + /opt/butuhbantuan/{api,dashboard,web-app/dist,uploads} tree
#   4. MySQL database + tuned config (innodb_buffer_pool_size=256M)
#   5. Nginx vhost (IP mode: web-app on :80, dashboard on :8080, api on :8081;
#                   domain mode: 3 subdomains on :80, ready for certbot)
#   6. systemd units bb-api + bb-dashboard (web-app is static → nginx serves)
#   7. UFW firewall + fail2ban

set -euo pipefail

DOMAIN="${1:-}"
APP_DIR="/opt/butuhbantuan"
BB_USER="bb"
DB_NAME="butuhbantuan"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { echo -e "${GREEN}[setup]${NC} $1"; }
warn() { echo -e "${YELLOW}[warn]${NC}  $1"; }
err()  { echo -e "${RED}[error]${NC} $1" >&2; exit 1; }

[[ $EUID -ne 0 ]] && err "Run as root: sudo bash setup-vps.sh [domain]"

if [[ -z "$DOMAIN" ]]; then
  MODE="ip"
  log "Mode: IP (no domain). Access via http://<VPS-IP>:{80,8080,8081}."
else
  MODE="domain"
  log "Mode: domain ($DOMAIN). Will configure api./app./dashboard. subdomains."
fi

# ── 1. System packages ────────────────────────────────────────────────────────

log "Updating system…"
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -qq

log "Installing base packages…"
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
  curl wget git rsync ufw fail2ban unattended-upgrades \
  nginx certbot python3-certbot-nginx \
  mysql-server

# Node 20 LTS
if ! command -v node >/dev/null || [[ "$(node -v)" != v20* ]]; then
  log "Installing Node.js 20…"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nodejs
fi

# pnpm via corepack (bundled with Node 20)
if ! command -v pnpm >/dev/null; then
  log "Enabling pnpm via corepack…"
  corepack enable
  corepack prepare pnpm@9 --activate
fi

# ── 2. Swap (mandatory for 2 GB RAM) ─────────────────────────────────────────

if [[ ! -f /swapfile ]]; then
  log "Creating 4 GB swap file…"
  fallocate -l 4G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo 'vm.swappiness=10' > /etc/sysctl.d/99-swappiness.conf
  sysctl -p /etc/sysctl.d/99-swappiness.conf >/dev/null
else
  warn "Swap file already exists — skipping."
fi

# ── 3. User + directory tree ─────────────────────────────────────────────────

if ! id -u "$BB_USER" &>/dev/null; then
  log "Creating user '$BB_USER'…"
  useradd -m -s /bin/bash "$BB_USER"
fi

mkdir -p /home/$BB_USER/.ssh
chmod 700 /home/$BB_USER/.ssh
touch /home/$BB_USER/.ssh/authorized_keys
chmod 600 /home/$BB_USER/.ssh/authorized_keys
chown -R $BB_USER:$BB_USER /home/$BB_USER/.ssh

# Sudoers: allow bb to restart its services & reload nginx without password
cat > /etc/sudoers.d/bb-services <<EOF
$BB_USER ALL=(root) NOPASSWD: /bin/systemctl restart bb-api
$BB_USER ALL=(root) NOPASSWD: /bin/systemctl restart bb-dashboard
$BB_USER ALL=(root) NOPASSWD: /bin/systemctl reload nginx
$BB_USER ALL=(root) NOPASSWD: /bin/systemctl status bb-api
$BB_USER ALL=(root) NOPASSWD: /bin/systemctl status bb-dashboard
EOF
chmod 440 /etc/sudoers.d/bb-services

log "Creating app directory tree…"
mkdir -p \
  "$APP_DIR/api/bin" \
  "$APP_DIR/dashboard" \
  "$APP_DIR/web-app/dist" \
  "$APP_DIR/uploads" \
  "$APP_DIR/backups"

# API needs ./uploads relative to WorkingDirectory — symlink to shared
ln -sfn "$APP_DIR/uploads" "$APP_DIR/api/uploads"

chown -R $BB_USER:$BB_USER "$APP_DIR"

# ── 4. MySQL ─────────────────────────────────────────────────────────────────

if [[ ! -f "$APP_DIR/api/.db-credentials" ]]; then
  log "Configuring MySQL…"
  DB_PASS=$(openssl rand -hex 20)

  mysql <<SQL
CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$BB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$BB_USER'@'localhost';
FLUSH PRIVILEGES;
SQL

  # Persist password for follow-up steps + backup script
  echo "$DB_PASS" > "$APP_DIR/api/.db-credentials"
  chmod 600 "$APP_DIR/api/.db-credentials"
  chown $BB_USER:$BB_USER "$APP_DIR/api/.db-credentials"

  warn "MySQL password for user '$BB_USER': $DB_PASS"
  warn "Saved to $APP_DIR/api/.db-credentials (chmod 600)."
else
  DB_PASS=$(cat "$APP_DIR/api/.db-credentials")
  warn "MySQL user '$BB_USER' already exists — reusing saved password."
fi

# Tuning for 2 GB RAM
cat > /etc/mysql/mysql.conf.d/butuhbantuan.cnf <<'EOF'
[mysqld]
innodb_buffer_pool_size = 256M
innodb_log_file_size    = 64M
max_connections         = 50
performance_schema      = OFF
slow_query_log          = 1
slow_query_log_file     = /var/log/mysql/slow.log
long_query_time         = 2
EOF
systemctl restart mysql

# ── 5. .env template ─────────────────────────────────────────────────────────

ADMIN_KEY=$(openssl rand -hex 24)

if [[ "$MODE" == "domain" ]]; then
  API_URL="https://api.$DOMAIN"
  APP_URL="https://app.$DOMAIN"
  DASH_URL="https://dashboard.$DOMAIN"
  ALLOW_ORIGINS="$APP_URL,$DASH_URL"
else
  # IP mode — try to auto-detect public IP; fall back to placeholder if all lookups fail
  log "Detecting public IP…"
  PUBLIC_IP=$(curl -fsS --max-time 5 https://ifconfig.me 2>/dev/null \
    || curl -fsS --max-time 5 https://icanhazip.com 2>/dev/null \
    || curl -fsS --max-time 5 https://api.ipify.org 2>/dev/null \
    || echo "")
  PUBLIC_IP=$(echo "$PUBLIC_IP" | tr -d '[:space:]')
  if [[ -z "$PUBLIC_IP" ]]; then
    warn "Auto-detect failed — using placeholder. Edit /opt/butuhbantuan/*/env manually."
    PUBLIC_IP="<VPS-PUBLIC-IP>"
  else
    log "Detected public IP: $PUBLIC_IP"
  fi
  API_URL="http://$PUBLIC_IP:8081"
  APP_URL="http://$PUBLIC_IP"
  DASH_URL="http://$PUBLIC_IP:8080"
  ALLOW_ORIGINS="$APP_URL,$DASH_URL"
fi

if [[ ! -f "$APP_DIR/api/.env" ]]; then
  log "Writing $APP_DIR/api/.env template…"
  cat > "$APP_DIR/api/.env" <<EOF
# Generated by setup-vps.sh — fill in the blanks, then: systemctl restart bb-api
PORT=:8080
ENV=production
STORAGE=mysql
ALLOW_ORIGINS=$ALLOW_ORIGINS

DB=$BB_USER:$DB_PASS@tcp(127.0.0.1:3306)/$DB_NAME?charset=utf8mb4&parseTime=True&loc=Local

ADMIN_API_KEY=$ADMIN_KEY

MAPBOX_URL=https://api.mapbox.com
MAPBOX_API_KEY=
MAPBOX_PUBLIC_KEY=
GEOAPIFY_URL=https://api.geoapify.com/v1/geocode
GEOAPIFY_API_KEY=
NOMINATIM_URL=https://nominatim.openstreetmap.org

VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@butuhbantuan.id

SATUSEHAT_BASE_URL=https://api-satusehat-stg.dto.kemkes.go.id
SATUSEHAT_CLIENT_ID=
SATUSEHAT_CLIENT_SECRET=
SATUSEHAT_FORCE_STUB=1

# DISPATCH_SLA_SECONDS=90
# COMMUNITY_CLAIM_WINDOW_SECS=300
EOF
  chmod 600 "$APP_DIR/api/.env"
  chown $BB_USER:$BB_USER "$APP_DIR/api/.env"
else
  warn "$APP_DIR/api/.env already exists — leaving untouched."
fi

if [[ ! -f "$APP_DIR/dashboard/.env" ]]; then
  cat > "$APP_DIR/dashboard/.env" <<EOF
# Injected by systemd as EnvironmentFile.
PORT=3002
HOST=127.0.0.1
NODE_ENV=production
NUXT_PUBLIC_API_BASE_URL=$API_URL
NUXT_PUBLIC_ADMIN_API_KEY=$ADMIN_KEY
NUXT_PUBLIC_WEB_APP_URL=$APP_URL
EOF
  chmod 600 "$APP_DIR/dashboard/.env"
  chown $BB_USER:$BB_USER "$APP_DIR/dashboard/.env"
fi

# ── 6. Nginx vhost ───────────────────────────────────────────────────────────

log "Writing Nginx vhost (mode: $MODE)…"
rm -f /etc/nginx/sites-enabled/default

NGINX_CONF=/etc/nginx/sites-available/butuhbantuan

if [[ "$MODE" == "domain" ]]; then

cat > "$NGINX_CONF" <<NGINX
# ButuhBantuan — domain mode
# After DNS points api./app./dashboard.$DOMAIN → this server, run:
#   sudo certbot --nginx -d api.$DOMAIN -d app.$DOMAIN -d dashboard.$DOMAIN

# ── API ──────────────────────────────────────────────────────────────────────
server {
    listen 80;
    server_name api.$DOMAIN;
    client_max_body_size 20M;

    # SSE endpoints must not be buffered
    location ~* /(sse|stream|events) {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_buffering    off;
        proxy_cache        off;
        proxy_read_timeout 24h;
        proxy_send_timeout 24h;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_set_header   Connection        '';
    }

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
    }
}

# ── Web-app (static PWA) ─────────────────────────────────────────────────────
server {
    listen 80;
    server_name app.$DOMAIN;

    root $APP_DIR/web-app/dist;
    gzip on;
    gzip_types text/plain text/css application/json application/javascript
               text/xml application/xml image/svg+xml;
    gzip_min_length 1024;

    # Service worker must not be cached
    location = /sw.js               { add_header Cache-Control "no-cache"; try_files \$uri =404; }
    location = /manifest.webmanifest{ add_header Cache-Control "no-cache"; try_files \$uri =404; }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)\$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}

# ── Dashboard (Nuxt SSR) ─────────────────────────────────────────────────────
server {
    listen 80;
    server_name dashboard.$DOMAIN;
    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_set_header   Upgrade           \$http_upgrade;
        proxy_set_header   Connection        'upgrade';
    }
}
NGINX

else  # IP mode

cat > "$NGINX_CONF" <<NGINX
# ButuhBantuan — IP mode (no domain yet)
#   http://<VPS-IP>       → web-app (static PWA)
#   http://<VPS-IP>:8080  → dashboard (Nuxt SSR)
#   http://<VPS-IP>:8081  → API (Go/Fiber)

# ── Web-app (default vhost, static) ──────────────────────────────────────────
server {
    listen 80 default_server;
    server_name _;

    root $APP_DIR/web-app/dist;
    gzip on;
    gzip_types text/plain text/css application/json application/javascript
               text/xml application/xml image/svg+xml;
    gzip_min_length 1024;

    location = /sw.js               { add_header Cache-Control "no-cache"; try_files \$uri =404; }
    location = /manifest.webmanifest{ add_header Cache-Control "no-cache"; try_files \$uri =404; }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)\$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}

# ── Dashboard on port 8080 ───────────────────────────────────────────────────
server {
    listen 8080;
    server_name _;
    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   Upgrade           \$http_upgrade;
        proxy_set_header   Connection        'upgrade';
    }
}

# ── API on port 8081 ─────────────────────────────────────────────────────────
server {
    listen 8081;
    server_name _;
    client_max_body_size 20M;

    location ~* /(sse|stream|events) {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_buffering    off;
        proxy_cache        off;
        proxy_read_timeout 24h;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   Connection        '';
    }

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
    }
}
NGINX

fi

ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/butuhbantuan
nginx -t
systemctl reload nginx

# ── 7. systemd services ──────────────────────────────────────────────────────

log "Writing systemd units…"

cat > /etc/systemd/system/bb-api.service <<EOF
[Unit]
Description=ButuhBantuan API (Go/Fiber)
After=network.target mysql.service
Wants=mysql.service

[Service]
Type=simple
User=$BB_USER
Group=$BB_USER
WorkingDirectory=$APP_DIR/api
EnvironmentFile=$APP_DIR/api/.env
ExecStart=$APP_DIR/api/bin/server
Restart=always
RestartSec=5
MemoryMax=200M
StandardOutput=journal
StandardError=journal
SyslogIdentifier=bb-api

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/bb-dashboard.service <<EOF
[Unit]
Description=ButuhBantuan Dashboard (Nuxt SSR)
After=network.target

[Service]
Type=simple
User=$BB_USER
Group=$BB_USER
WorkingDirectory=$APP_DIR/dashboard
EnvironmentFile=$APP_DIR/dashboard/.env
ExecStart=/usr/bin/node .output/server/index.mjs
Restart=always
RestartSec=5
MemoryMax=500M
StandardOutput=journal
StandardError=journal
SyslogIdentifier=bb-dashboard

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable bb-api bb-dashboard

# ── 8. Firewall + fail2ban ───────────────────────────────────────────────────

log "Configuring UFW firewall…"
ufw --force reset >/dev/null
ufw default deny incoming >/dev/null
ufw default allow outgoing >/dev/null
ufw allow OpenSSH >/dev/null

if [[ "$MODE" == "domain" ]]; then
  ufw allow 'Nginx Full' >/dev/null
else
  ufw allow 80/tcp   >/dev/null   # web-app
  ufw allow 8080/tcp >/dev/null   # dashboard
  ufw allow 8081/tcp >/dev/null   # api
fi

ufw --force enable >/dev/null

log "Enabling fail2ban + unattended-upgrades…"
systemctl enable --now fail2ban >/dev/null
dpkg-reconfigure -f noninteractive -plow unattended-upgrades >/dev/null

# ── 9. MySQL backup cron ─────────────────────────────────────────────────────

install -o root -g root -m 755 \
  "$(dirname "$0")/backup-mysql.sh" \
  /usr/local/sbin/bb-mysql-backup 2>/dev/null || \
  warn "backup-mysql.sh not found alongside this script — copy it manually."

cat > /etc/cron.daily/bb-mysql-backup <<EOF
#!/bin/sh
[ -x /usr/local/sbin/bb-mysql-backup ] && /usr/local/sbin/bb-mysql-backup
EOF
chmod 755 /etc/cron.daily/bb-mysql-backup

# ── Done ─────────────────────────────────────────────────────────────────────

echo ""
log "✅ Setup complete!"
echo ""
warn "Next steps:"
warn "  1. Paste GitHub Actions deploy public key into:"
warn "     /home/$BB_USER/.ssh/authorized_keys"
warn "  2. Fill secrets in $APP_DIR/api/.env (MAPBOX/GEOAPIFY/VAPID)"
warn "     then: systemctl restart bb-api"
if [[ "$MODE" == "ip" ]]; then
  if [[ "$PUBLIC_IP" == "<VPS-PUBLIC-IP>" ]]; then
    warn "  3. Auto-detect public IP failed. Edit these files manually:"
    warn "       $APP_DIR/api/.env         → ALLOW_ORIGINS"
    warn "       $APP_DIR/dashboard/.env   → NUXT_PUBLIC_API_BASE_URL, NUXT_PUBLIC_WEB_APP_URL"
    warn "     then: systemctl restart bb-api bb-dashboard"
  else
    warn "  3. .env files already point to detected IP: $PUBLIC_IP"
  fi
fi
warn "  4. GitHub repo secrets required:"
warn "       VPS_HOST         → this server's IP"
warn "       VPS_USER         → $BB_USER"
warn "       VPS_SSH_KEY      → deploy private key"
warn "       API_BASE_URL     → $API_URL"
warn "       WEB_APP_URL      → $APP_URL"
warn "       ADMIN_API_KEY    → $ADMIN_KEY"
if [[ "$MODE" == "domain" ]]; then
  warn "  5. Once DNS is live:"
  warn "     certbot --nginx -d api.$DOMAIN -d app.$DOMAIN -d dashboard.$DOMAIN"
fi
echo ""
warn "Admin API key (also in $APP_DIR/api/.env): $ADMIN_KEY"
