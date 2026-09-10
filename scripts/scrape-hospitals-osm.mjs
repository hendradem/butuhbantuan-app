#!/usr/bin/env node
/**
 * Scrape hospital master data from OpenStreetMap (Overpass API) for every
 * regency listed in apps/api/data/available_regions.json.
 *
 * Overpass is free, no API key, covers all Indonesia. Data quality varies:
 * name is almost always present, phone/address hit-rate depends on how well
 * each locality is mapped. The output writes over stub_by_regency.json so the
 * API's hospital stub provider serves the enriched set on next start.
 *
 * Usage:
 *   node scripts/scrape-hospitals-osm.mjs                 # all coverage
 *   node scripts/scrape-hospitals-osm.mjs 3404 3471       # specific regencies
 *
 * Rate limit: Overpass public endpoint recommends max 1 req/sec.
 * We throttle at 1.2s between regencies.
 */

import { readFile, writeFile } from "node:fs/promises";

const REGIONS_PATH = new URL("../apps/api/data/available_regions.json", import.meta.url);
const OUTPUT_PATH = new URL("../apps/api/data/hospitals/stub_by_regency.json", import.meta.url);
const OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
];
const THROTTLE_MS = 1500;
const REQUEST_TIMEOUT_MS = 90_000;
const MAX_RETRIES = 3;

// ── Helpers ──────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Overpass query keyed to the regency's OSM administrative boundary
 * (polygon), NOT a bounding box — otherwise a bbox around one regency bleeds
 * into neighbouring kabupaten and even other provinces.
 *
 * OSM Indonesia is inconsistent: some regencies are named "Kabupaten X" and
 * some just "X"; kotas similarly. We match by regex that accepts either form,
 * scoped to admin_level 5 (kabupaten/kota in ID). The bare name is used inside
 * the regex, e.g. "Sleman" → matches both "Sleman" and "Kabupaten Sleman".
 */
function overpassQuery(regencyName) {
  const bare = regencyName
    .replace(/^(Kabupaten|Kota)\s+/i, "")
    .replace(/"/g, '\\"')
    .trim();
  const isKota = /^Kota\s+/i.test(regencyName);
  const optionalPrefix = isKota ? "(Kota )?" : "(Kabupaten )?";
  return `[out:json][timeout:90];
area["boundary"="administrative"]["admin_level"="5"]["name"~"^${optionalPrefix}${bare}$"]->.a;
(
  node["amenity"="hospital"]["name"](area.a);
  way["amenity"="hospital"]["name"](area.a);
  relation["amenity"="hospital"]["name"](area.a);
);
out center tags;`;
}

async function fetchOverpass(query) {
  let lastError = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    for (const endpoint of OVERPASS_URLS) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          body: new URLSearchParams({ data: query }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          headers: {
            "User-Agent": "ButuhBantuan-hospital-scraper/1.0 (github.com/hendradem/butuhbantuan-app)",
          },
        });
        if (res.status === 429 || res.status === 504) {
          lastError = new Error(`${endpoint} → HTTP ${res.status} (rate-limit / timeout)`);
          continue;
        }
        if (!res.ok) {
          lastError = new Error(`${endpoint} → HTTP ${res.status}`);
          continue;
        }
        return await res.json();
      } catch (err) {
        lastError = err;
      }
    }
    if (attempt < MAX_RETRIES) {
      const backoff = 3000 * attempt;
      process.stderr.write(`(retry ${attempt}/${MAX_RETRIES - 1} in ${backoff}ms) `);
      await sleep(backoff);
    }
  }
  throw lastError ?? new Error("all Overpass endpoints failed");
}

function normalizePhone(raw) {
  if (!raw) return "";
  const first = String(raw).split(/[;,]/)[0] ?? "";
  return first.replace(/[^\d+]/g, "");
}

function assembleAddress(tags, fallbackRegency) {
  if (tags["addr:full"]) return tags["addr:full"];
  const parts = [
    tags["addr:street"] &&
      (tags["addr:housenumber"]
        ? `${tags["addr:street"]} No. ${tags["addr:housenumber"]}`
        : tags["addr:street"]),
    tags["addr:village"] || tags["addr:suburb"],
    tags["addr:city"] || fallbackRegency,
  ].filter(Boolean);
  return parts.join(", ");
}

function extractLatLng(el) {
  if (typeof el.lat === "number" && typeof el.lon === "number") {
    return { lat: el.lat, lng: el.lon };
  }
  if (el.center && typeof el.center.lat === "number") {
    return { lat: el.center.lat, lng: el.center.lon };
  }
  return null;
}

function deriveOwnership(tags) {
  const t = String(tags.operator_type ?? tags["operator:type"] ?? "").toLowerCase();
  if (t.includes("public") || t.includes("government")) return "Pemerintah";
  if (t.includes("private")) return "Swasta";
  if (t.includes("religious")) return "Swasta / Yayasan";
  const op = String(tags.operator ?? "").toLowerCase();
  if (op.includes("pemda") || op.includes("pemerintah") || op.includes("rsud")) return "Pemerintah";
  return "";
}

// Indonesian hospital name conventions. OSM `amenity=hospital` and
// `healthcare=hospital` are both noisy here — apoteks, kliniks, praktek
// dokter, even psychology offices and gyms get mis-tagged. Real Rumah Sakit
// almost universally begin with "RS…" or "Rumah Sakit". Name-only allowlist
// is the highest-precision filter.
const INCLUDE_NAME =
  /^(rs\b|rsu\b|rsud\b|rsup\b|rsia\b|rskia\b|rsj\b|rsk\b|rspau\b|rspad\b|rspal\b|rumah\s*sakit\b)/i;

function isRealHospital(_tags, name) {
  return INCLUDE_NAME.test(name);
}

function toStubHospital(el, regency) {
  const geo = extractLatLng(el);
  if (!geo) return null;
  const tags = el.tags ?? {};
  const name = String(tags.name ?? "").trim();
  if (!name) return null;
  if (!isRealHospital(tags, name)) return null;

  return {
    source_code: `osm-${regency.regency_id}-${el.type[0]}${el.id}`,
    name,
    address: assembleAddress(tags, regency.regency),
    phone: normalizePhone(tags.phone || tags["contact:phone"]),
    class: String(tags["healthcare:speciality"] ?? "").split(";")[0] ?? "",
    ownership: deriveOwnership(tags),
    latitude: Number(geo.lat.toFixed(6)),
    longitude: Number(geo.lng.toFixed(6)),
  };
}

function dedupeByName(list) {
  const seen = new Map();
  for (const h of list) {
    const key = h.name.toLowerCase().replace(/\s+/g, " ").trim();
    // Prefer entries that have a phone number when duplicated by name.
    const existing = seen.get(key);
    if (!existing || (!existing.phone && h.phone)) seen.set(key, h);
  }
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name, "id"));
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function loadRegions(filterIds) {
  const raw = JSON.parse(await readFile(REGIONS_PATH, "utf8"));
  const rows = raw.filter((r) => Number.isFinite(r.latitude) && Number.isFinite(r.longitude));
  if (filterIds.length > 0) {
    const set = new Set(filterIds);
    return rows.filter((r) => set.has(r.regency_id));
  }
  return rows;
}

async function loadExistingStub() {
  try {
    return JSON.parse(await readFile(OUTPUT_PATH, "utf8"));
  } catch {
    return {};
  }
}

async function main() {
  const filterIds = process.argv.slice(2);
  const regions = await loadRegions(filterIds);
  if (regions.length === 0) {
    console.error("No regions found. Check available_regions.json or the CLI filter.");
    process.exit(1);
  }

  const isPartial = filterIds.length > 0;
  console.error(
    `Scraping OSM for ${regions.length} regenc${regions.length === 1 ? "y" : "ies"} ` +
      `(${isPartial ? "partial → merge into existing" : "full → replace stub with coverage only"})\n`,
  );

  // Full sweep replaces the stub with the current coverage set. Partial runs
  // (specific regency IDs) merge, so ad-hoc updates don't drop other keys.
  const output = isPartial ? await loadExistingStub() : {};
  let totalHospitals = 0;

  for (const region of regions) {
    const query = overpassQuery(region.regency);
    process.stderr.write(`[${region.regency_id}] ${region.regency} … `);

    try {
      const data = await fetchOverpass(query);
      const raw = Array.isArray(data.elements) ? data.elements : [];
      const hospitals = dedupeByName(
        raw.map((el) => toStubHospital(el, region)).filter(Boolean),
      );

      output[region.regency_id] = {
        province_id: String(region.regency_id).slice(0, 2),
        province_name: region.province,
        regency_name: region.regency.replace(/^(Kabupaten|Kota)\s+/i, ""),
        hospitals,
      };

      totalHospitals += hospitals.length;
      process.stderr.write(`${hospitals.length} hospitals\n`);
    } catch (err) {
      process.stderr.write(`✗ FAILED: ${err.message}\n`);
      // Keep existing entry if present, else empty stub
      if (!output[region.regency_id]) {
        output[region.regency_id] = {
          province_id: String(region.regency_id).slice(0, 2),
          province_name: region.province,
          regency_name: region.regency.replace(/^(Kabupaten|Kota)\s+/i, ""),
          hospitals: [],
        };
      }
    }

    await sleep(THROTTLE_MS);
  }

  await writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2) + "\n");

  console.error(`\n═══════════════════════════════════════════════`);
  console.error(`✓ Regencies processed:  ${regions.length}`);
  console.error(`✓ Hospitals collected:  ${totalHospitals}`);
  console.error(`→ Output:               ${OUTPUT_PATH.pathname}`);
  console.error(`\nNext:`);
  console.error(`  1. Review the JSON. Missing phone/address is expected for less-mapped areas.`);
  console.error(`  2. Deploy — deploy.sh syncs apps/api/data/ to VPS automatically.`);
  console.error(`  3. Restart bb-api on VPS: sudo systemctl restart bb-api`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
