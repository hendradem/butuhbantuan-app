#!/usr/bin/env node
/**
 * Deduplicate hospital / clinic emergency units.
 *
 * SATUSEHAT MSI often surfaces multiple `sarana` codes for the same physical
 * hospital (branch registrations, historical entries). After import, the map
 * ends up with a cluster of near-identical pins (e.g. 3× RSUP Dr. Sardjito
 * within 200 m). This script finds each duplicate cluster and keeps the
 * single best entry.
 *
 * Grouping key: normalised name (strip prefix + spaces + lowercase) + rounded
 * coordinates. Any pair within ~330 m ends up in the same cluster.
 *
 * Scoring (higher = kept):
 *   +100 if phone present
 *   +40  if whatsapp present
 *   +30  if email present
 *   +1   per char of full_address (up to 100)
 *   +20  if has organization_logo
 *   +10  if description non-empty
 *
 * Env:
 *   ADMIN_KEY  — required
 *   API_BASE   — default https://api.butuhbantuan.space
 *   DRY_RUN=1  — list actions but don't call DELETE
 *   REGENCY=xxx — limit to one regency (default: all Java regencies)
 */

const ADMIN_KEY = process.env.ADMIN_KEY;
if (!ADMIN_KEY) {
  console.error("Set ADMIN_KEY env (from /opt/butuhbantuan/api/.env)");
  process.exit(1);
}
const API_BASE = process.env.API_BASE ?? "https://api.butuhbantuan.space";
const DRY_RUN = process.env.DRY_RUN === "1";
const REGENCY_FILTER = process.env.REGENCY;

const HEADERS = { "X-Admin-Key": ADMIN_KEY, "Content-Type": "application/json" };
const JAVA_PROVINCES = new Set(["31", "32", "33", "34", "35", "36"]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function normaliseName(s) {
  return String(s ?? "")
    .toLowerCase()
    .replace(/\b(rsup|rsud|rsu|rsia|rsk|rsj|rs|klinik|rumah\s+sakit)\b/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();
}

function roundCoord(v, digits = 2) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "?";
  return n.toFixed(digits); // ~1.1 km cells at digits=2; entries close but not identical merge
}

function scoreEntry(e) {
  const c = e.contact ?? {};
  let s = 0;
  if (String(c.phone ?? "").trim()) s += 100;
  if (String(c.whatsapp ?? "").trim()) s += 40;
  if (String(c.email ?? "").trim()) s += 30;
  const addr = String(e.address?.full_address ?? "").trim();
  s += Math.min(100, addr.length);
  if (String(e.organization_logo ?? "").trim()) s += 20;
  if (String(e.description ?? "").trim()) s += 10;
  return s;
}

function isHospitalLike(e) {
  const orgType = String(e.organization_type ?? "").toLowerCase();
  const typeName = String(e.emergency_type?.name ?? "").toLowerCase();
  return (
    orgType === "rumah_sakit" ||
    typeName === "rumah sakit" ||
    typeName === "hospital" ||
    /^(rs|rsup|rsud|rsu|rsia|rsk|rsj|rumah\s*sakit|klinik)\b/i.test(String(e.name ?? ""))
  );
}

async function fetchRegencies() {
  if (REGENCY_FILTER) return [REGENCY_FILTER];
  const url = new URL(
    "../apps/api/data/wilayah/regencies.json",
    import.meta.url,
  );
  const { readFile } = await import("node:fs/promises");
  const rows = JSON.parse(await readFile(url, "utf8"));
  return rows
    .filter((r) => JAVA_PROVINCES.has(r.province_id))
    .map((r) => r.id);
}

async function fetchEmergenciesByRegion(regencyId) {
  const url = `${API_BASE}/api/v1/emergency/by-region/${encodeURIComponent(regencyId)}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`GET ${regencyId} → ${res.status}`);
  const body = await res.json();
  return Array.isArray(body?.data) ? body.data : [];
}

async function deleteEmergency(id) {
  const url = `${API_BASE}/api/v1/emergency/${encodeURIComponent(id)}`;
  const res = await fetch(url, { method: "DELETE", headers: HEADERS });
  if (!res.ok) throw new Error(`DELETE ${id} → ${res.status}`);
}

function groupDuplicates(rows) {
  const byKey = new Map();
  for (const e of rows) {
    if (!isHospitalLike(e)) continue;
    const key = [
      normaliseName(e.name),
      roundCoord(e.coordinates?.[0], 2),
      roundCoord(e.coordinates?.[1], 2),
    ].join("|");
    if (!key.startsWith("|")) {
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(e);
    }
  }
  return [...byKey.values()].filter((arr) => arr.length > 1);
}

async function main() {
  const regencies = await fetchRegencies();
  console.error(`Scanning ${regencies.length} regencies (dry-run=${DRY_RUN})…\n`);

  let totalDupes = 0;
  let totalDeleted = 0;
  let totalKept = 0;

  for (const rid of regencies) {
    let rows;
    try {
      rows = await fetchEmergenciesByRegion(rid);
    } catch (err) {
      console.error(`[${rid}] fetch failed: ${err.message}`);
      continue;
    }

    const groups = groupDuplicates(rows);
    if (groups.length === 0) continue;

    console.error(`[${rid}] ${groups.length} duplicate cluster(s):`);
    for (const group of groups) {
      group.sort((a, b) => scoreEntry(b) - scoreEntry(a));
      const [keeper, ...losers] = group;
      console.error(
        `   KEEP  ${keeper.id.slice(0, 8)}  ${keeper.name}  (score ${scoreEntry(keeper)})`,
      );
      for (const loser of losers) {
        console.error(
          `   DROP  ${loser.id.slice(0, 8)}  ${loser.name}  (score ${scoreEntry(loser)})`,
        );
        if (!DRY_RUN) {
          try {
            await deleteEmergency(loser.id);
            totalDeleted += 1;
          } catch (err) {
            console.error(`      ✗ delete failed: ${err.message}`);
          }
          await sleep(80);
        }
      }
      totalKept += 1;
      totalDupes += group.length;
    }

    await sleep(150);
  }

  console.error(`\n═══════════════════════════════════════════════`);
  console.error(`Clusters found:   ${totalKept}`);
  console.error(`Total in clusters: ${totalDupes}`);
  console.error(`Deleted:           ${DRY_RUN ? "(dry run)" : totalDeleted}`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
