# Deployment

VPS target: **Ubuntu 22.04 LTS, 2 vCPU / 2 GB RAM / 60 GB SSD**.
Stack: native systemd + Nginx + MySQL 8 (no Docker). CI/CD via GitHub Actions.

Runtime layout:

| Layer        | How it runs               | Port      |
|--------------|---------------------------|-----------|
| API          | Go binary via `bb-api.service` | :8080 |
| Dashboard    | Nuxt SSR via `bb-dashboard.service` | :3002 |
| Web-app      | Static files served by Nginx | (nginx) |

## First-time VPS bootstrap

SSH in as root once, then:

```bash
# On your laptop → copy the two scripts to the VPS
scp scripts/setup-vps.sh scripts/backup-mysql.sh root@<VPS-IP>:/root/

# On the VPS
sudo bash /root/setup-vps.sh                     # IP mode (no domain yet)
# — OR —
sudo bash /root/setup-vps.sh butuhbantuan.id     # domain mode (3 subdomains)
```

The script is idempotent — safe to re-run.

It does:

1. `apt update`, install Node 20 / pnpm / MySQL 8 / Nginx / certbot / fail2ban
2. Create 4 GB swap (**mandatory** on 2 GB RAM)
3. Create `bb` user + `/opt/butuhbantuan/{api,dashboard,web-app/dist,uploads,backups}`
4. MySQL: `butuhbantuan` DB + `bb` user with random password (saved to `/opt/butuhbantuan/api/.db-credentials`)
5. MySQL tuning for 2 GB RAM (`innodb_buffer_pool_size=256M`, `max_connections=50`)
6. Nginx vhost (IP or domain mode), SSE-safe proxy for API
7. systemd: `bb-api`, `bb-dashboard` (enabled, not started until first deploy)
8. UFW firewall + fail2ban + unattended-upgrades
9. Daily MySQL backup cron (7-day retention → `/opt/butuhbantuan/backups/`)

At the end it prints:
- Generated MySQL password
- Generated `ADMIN_API_KEY`
- Next-step checklist

## Post-bootstrap: fill secrets

Edit `/opt/butuhbantuan/api/.env` and set:

- `MAPBOX_API_KEY`
- `GEOAPIFY_API_KEY`
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` (optional — generate with `npx web-push generate-vapid-keys`)
- `SATUSEHAT_CLIENT_ID` / `SATUSEHAT_CLIENT_SECRET` (optional — leave `SATUSEHAT_FORCE_STUB=1` if not using)

For **IP mode**, also edit `/opt/butuhbantuan/dashboard/.env` and replace `<VPS-PUBLIC-IP>` with the actual public IP in `NUXT_PUBLIC_API_BASE_URL` and `NUXT_PUBLIC_WEB_APP_URL`.

Then:

```bash
sudo systemctl restart bb-api bb-dashboard
```

## Install the deploy public key

CI needs to SSH as `bb`. On the VPS:

```bash
sudo -u bb tee -a /home/bb/.ssh/authorized_keys < deploy_key.pub
```

## GitHub Actions secrets

Add these under **Settings → Secrets and variables → Actions → New repository secret**:

| Secret               | Value                                          |
|----------------------|------------------------------------------------|
| `VPS_HOST`           | Public IP or hostname of the VPS               |
| `VPS_USER`           | `bb`                                           |
| `VPS_SSH_KEY`        | Contents of the deploy **private** key (ed25519) |
| `API_BASE_URL`       | e.g. `http://1.2.3.4:8081` or `https://api.butuhbantuan.id` |
| `WEB_APP_URL`        | e.g. `http://1.2.3.4`     or `https://app.butuhbantuan.id` |
| `ADMIN_API_KEY`      | Same value as in `/opt/butuhbantuan/api/.env`  |
| `GEOAPIFY_API_KEY`   | Public Geoapify key (baked into web-app build) |

Also create an **Environment** named `production` (Settings → Environments) — the deploy job requires it, giving you an approval gate for manual runs.

## Deploy flow

Push to `master` (or trigger `workflow_dispatch`):

1. **test** — `go test ./...`
2. **build** — cross-compile API + `nuxt build` dashboard + `nuxt generate` web-app on the Actions runner (7 GB RAM, keeps the 2 GB VPS free)
3. **deploy** — SCP artifacts → `/tmp/bb-deploy/` on VPS → run `scripts/deploy.sh`:
   - Backup current API binary
   - Rsync new artifacts into place
   - Restart `bb-api` + `bb-dashboard`
   - Health-check all three endpoints
   - Roll back API binary if the health check fails

## Migrating from IP → domain (later)

Once you have a domain and DNS points `api.` `app.` `dashboard.` → your VPS IP:

```bash
# Re-run setup-vps.sh in domain mode (idempotent, rewrites nginx config)
sudo bash setup-vps.sh butuhbantuan.id

# Issue TLS certs
sudo certbot --nginx -d api.butuhbantuan.id -d app.butuhbantuan.id -d dashboard.butuhbantuan.id

# Update GitHub secrets:
#   API_BASE_URL = https://api.butuhbantuan.id
#   WEB_APP_URL  = https://app.butuhbantuan.id

# Update /opt/butuhbantuan/dashboard/.env with the new URLs, then:
sudo systemctl restart bb-dashboard

# Trigger a redeploy so the built-in NUXT_PUBLIC_* values match
```

Also close the temporary ports on the firewall:

```bash
sudo ufw delete allow 8080/tcp
sudo ufw delete allow 8081/tcp
```

## Reference files in this repo

| Path                                       | What it is                                     |
|--------------------------------------------|------------------------------------------------|
| `.github/workflows/deploy.yml`             | CI/CD pipeline (test → build → deploy)         |
| `scripts/setup-vps.sh`                     | One-shot VPS bootstrap (run once as root)      |
| `scripts/deploy.sh`                        | Runs on VPS during each deploy (called by CI)  |
| `scripts/deploy-api.sh`                    | Laptop-side API-only hot-patch helper          |
| `scripts/backup-mysql.sh`                  | Daily MySQL dump, 7-day retention              |
| `deploy/systemd/bb-api.service`            | systemd unit reference (installed by setup)    |
| `deploy/systemd/bb-dashboard.service`      | systemd unit reference                         |
| `deploy/nginx/butuhbantuan-ip.conf`        | Nginx vhost — IP mode                          |
| `deploy/nginx/butuhbantuan-domain.conf`    | Nginx vhost — domain mode (replace `DOMAIN`)   |
| `deploy/docker/`                           | (Optional) Docker alternative — not used by CI |

## Troubleshooting

```bash
# API logs
sudo journalctl -u bb-api -f -n 100

# Dashboard logs
sudo journalctl -u bb-dashboard -f -n 100

# Nginx access & error
sudo tail -f /var/log/nginx/access.log /var/log/nginx/error.log

# Memory pressure — 2 GB RAM will feel it under load
free -h
top -o %MEM

# Manual rollback (if deploy.sh's auto-rollback didn't fire)
sudo cp /opt/butuhbantuan/api/bin/server.bak /opt/butuhbantuan/api/bin/server
sudo systemctl restart bb-api

# MySQL restore from backup
gunzip -c /opt/butuhbantuan/backups/butuhbantuan-YYYYMMDD-HHMMSS.sql.gz \
  | mysql -u bb -p"$(sudo cat /opt/butuhbantuan/api/.db-credentials)" butuhbantuan
```
