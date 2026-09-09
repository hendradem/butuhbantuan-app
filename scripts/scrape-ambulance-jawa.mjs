#!/usr/bin/env node
/**
 * Scrape PSC 119 + PMI ambulance data for all kab/kota di Pulau Jawa
 * (DKI, Banten, Jabar, Jateng, DIY, Jatim → 119 kab/kota × 2 = 238 lookups).
 *
 * Data source: Google Places API (Text Search + Place Details).
 *   - Coordinates, phone, formatted_address → from Places Details
 *   - WhatsApp → not exposed by Places; left blank, isi manual atau
 *     enrich pakai WebFetch ke website hasil Places nanti.
 *
 * Cost estimate:
 *   Text Search  $32/1000  + Place Details $17/1000
 *   238 × ($32 + $17) / 1000 ≈ $11.66  →  covered by Google's $200/month free tier.
 *
 * Setup:
 *   1. Enable Places API di https://console.cloud.google.com
 *      → APIs & Services → Enable APIs → "Places API"
 *   2. Buat API key (kotak search: "Credentials")
 *   3. Restrict key: Application → HTTP referrers = none; API = Places API only
 *
 * Run:
 *   GOOGLE_PLACES_API_KEY=AIza... node scripts/scrape-ambulance-jawa.mjs
 *
 * Output:
 *   apps/api/data/emergencies-jawa-generated.json  (review + merge manual)
 *   scripts/.cache/places-cache.json               (skip repeat lookups on re-run)
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname } from "node:path";

// ── Config ───────────────────────────────────────────────────────────────────

const KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!KEY) {
  console.error("❌ Set env GOOGLE_PLACES_API_KEY (get from console.cloud.google.com)");
  process.exit(1);
}

const JAVA_PROVINCES = new Set(["31", "32", "33", "34", "35", "36"]);
// 31=DKI, 32=Jabar, 33=Jateng, 34=DIY, 35=Jatim, 36=Banten

const PSC_LOGO =
  "https://res.cloudinary.com/djzrlqubf/image/upload/v1705743489/butuhbantuan/p6ldfcxxrjmxvnwjwkin.jpg";
const PMI_LOGO =
  "https://res.cloudinary.com/djzrlqubf/image/upload/v1705744061/butuhbantuan/xteksibif5uschl27nbe.png";

const REGENCIES_PATH = new URL("../apps/api/data/wilayah/regencies.json", import.meta.url);
const PROVINCES_PATH = new URL("../apps/api/data/wilayah/provinces.json", import.meta.url);
const OUTPUT_PATH = new URL("../apps/api/data/emergencies-jawa-generated.json", import.meta.url);
const CACHE_PATH = new URL("./.cache/places-cache.json", import.meta.url);

const REQUEST_DELAY_MS = 120; // safe throttle
const MAX_RETRY = 3;

// ── Helpers ──────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const cleanRegencyName = (name) =>
  // "KABUPATEN SLEMAN" → "Sleman", "KOTA BANDUNG" → "Bandung"
  name.replace(/^(KABUPATEN|KOTA)\s+/i, "").replace(/\b\w/g, (c) => c.toUpperCase());

async function fetchJson(url, attempt = 1) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    const data = await res.json();
    // Google Places status codes
    if (data.status === "OVER_QUERY_LIMIT" || data.status === "RESOURCE_EXHAUSTED") {
      throw new Error(`RATE_LIMIT ${data.status}`);
    }
    return data;
  } catch (err) {
    if (attempt < MAX_RETRY) {
      const backoff = 500 * 2 ** attempt;
      console.error(`   retry ${attempt}/${MAX_RETRY - 1} in ${backoff}ms — ${err.message}`);
      await sleep(backoff);
      return fetchJson(url, attempt + 1);
    }
    throw err;
  }
}

async function textSearch(query) {
  const url =
    `https://maps.googleapis.com/maps/api/place/textsearch/json` +
    `?query=${encodeURIComponent(query)}` +
    `&region=id&language=id&key=${KEY}`;
  const data = await fetchJson(url);
  if (data.status !== "OK") {
    if (data.status !== "ZERO_RESULTS")
      console.error(`   textsearch ${data.status} — ${data.error_message ?? ""}`);
    return null;
  }
  return data.results?.[0] ?? null;
}

async function placeDetails(placeId) {
  const fields = [
    "place_id",
    "name",
    "formatted_address",
    "formatted_phone_number",
    "international_phone_number",
    "geometry",
    "website",
    "url",
  ].join(",");
  const url =
    `https://maps.googleapis.com/maps/api/place/details/json` +
    `?place_id=${placeId}&fields=${fields}` +
    `&language=id&key=${KEY}`;
  const data = await fetchJson(url);
  if (data.status !== "OK") {
    console.error(`   details ${data.status}`);
    return null;
  }
  return data.result;
}

function normalizePhone(raw) {
  if (!raw) return "";
  // "(0274) 868-900" → "0274868900"; "+62 274 868900" → "62274868900"
  return raw.replace(/[^\d+]/g, "");
}

function buildEntry({ type, regency, place }) {
  const isPSC = type === "PSC";
  const cityShort = cleanRegencyName(regency.name);

  const lat = place.geometry?.location?.lat;
  const lng = place.geometry?.location?.lng;
  if (typeof lat !== "number" || typeof lng !== "number") return null;

  const phone = normalizePhone(place.formatted_phone_number || place.international_phone_number);

  const org = isPSC
    ? {
        name: `PSC 119 ${cityShort}`,
        organization_name: "Public Safety Center 119",
        logo: PSC_LOGO,
        description: `Layanan darurat resmi PSC 119 ${cityShort}. Operasional 24 jam. Milik pemerintah kabupaten/kota.`,
        typeOfService: "Emergency",
        typeArr: ["emergency"],
        isDispatcher: true,
        dashboardAccess: true,
      }
    : {
        name: `PMI ${cityShort}`,
        organization_name: "Palang Merah Indonesia",
        logo: PMI_LOGO,
        description: `Layanan ambulance PMI cabang ${cityShort}. Operasional 24 jam.`,
        typeOfService: "Emergency, Transport",
        typeArr: ["emergency", "transport"],
        isDispatcher: false,
        dashboardAccess: false,
      };

  return {
    id: randomUUID(),
    name: org.name,
    organization_name: org.organization_name,
    organization_type: "Ambulance",
    organization_logo: org.logo,
    description: org.description,
    coordinates: [String(lng), String(lat)],
    type_of_service: org.typeOfService,
    is_dispatcher: org.isDispatcher,
    is_province_dispatcher: false,
    emergency_type: { id: 1, name: "Ambulance", icon: "mynaui:ambulance-solid" },
    address: {
      district_id: "",
      district: "",
      regency_id: regency.id,
      regency: regency.name,
      province_id: regency.province_id,
      province: regency.province_name,
      full_address: place.formatted_address ?? "",
    },
    contact: {
      email: "",
      phone,
      whatsapp: "", // fill manually or via secondary enrichment
    },
    tipe_emergency: org.typeArr,
    dashboard_access: org.dashboardAccess,
    _meta: {
      google_place_id: place.place_id,
      google_maps_url: place.url ?? "",
      website: place.website ?? "",
      scraped_at: new Date().toISOString(),
    },
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function loadCache() {
  if (!existsSync(CACHE_PATH)) return {};
  try {
    return JSON.parse(await readFile(CACHE_PATH, "utf8"));
  } catch {
    return {};
  }
}

async function saveCache(cache) {
  await mkdir(dirname(CACHE_PATH.pathname), { recursive: true });
  await writeFile(CACHE_PATH, JSON.stringify(cache, null, 2));
}

async function main() {
  const regencies = JSON.parse(await readFile(REGENCIES_PATH, "utf8"));
  const provinces = JSON.parse(await readFile(PROVINCES_PATH, "utf8"));
  const provMap = new Map(provinces.map((p) => [p.id, p.name]));

  const javaRegencies = regencies
    .filter((r) => JAVA_PROVINCES.has(r.province_id))
    .map((r) => ({ ...r, province_name: provMap.get(r.province_id) }));

  console.error(`Java kab/kota: ${javaRegencies.length}`);
  console.error(`Total lookups: ${javaRegencies.length * 2} (PSC + PMI per city)\n`);

  const cache = await loadCache();
  const results = [];
  const notFound = [];
  let idx = 0;

  for (const regency of javaRegencies) {
    for (const type of ["PSC", "PMI"]) {
      idx += 1;
      const cityShort = cleanRegencyName(regency.name);
      const query =
        type === "PSC"
          ? `PSC 119 ${cityShort}`
          : `PMI Palang Merah Indonesia ${cityShort}`;

      const cacheKey = `${type}:${regency.id}`;
      console.error(
        `[${String(idx).padStart(3, "0")}/${javaRegencies.length * 2}] ${type} ${cityShort}`,
      );

      try {
        let placeId = cache[cacheKey]?.place_id;

        if (!placeId) {
          const hit = await textSearch(query);
          if (!hit) {
            console.error(`   ✗ ZERO_RESULTS`);
            notFound.push({ type, regency: regency.name, query });
            cache[cacheKey] = { place_id: null, ts: Date.now() };
            await sleep(REQUEST_DELAY_MS);
            continue;
          }
          placeId = hit.place_id;
          cache[cacheKey] = { place_id: placeId, ts: Date.now() };
          await sleep(REQUEST_DELAY_MS);
        }

        const details = await placeDetails(placeId);
        if (!details) {
          notFound.push({ type, regency: regency.name, query });
          await sleep(REQUEST_DELAY_MS);
          continue;
        }

        const entry = buildEntry({ type, regency, place: details });
        if (!entry) {
          console.error(`   ✗ invalid coords`);
          notFound.push({ type, regency: regency.name, query });
          await sleep(REQUEST_DELAY_MS);
          continue;
        }

        results.push(entry);
        console.error(
          `   ✓ ${entry.contact.phone || "no-phone"} @ ${entry.coordinates.join(",")}`,
        );
        await sleep(REQUEST_DELAY_MS);
      } catch (err) {
        console.error(`   ✗ ERROR: ${err.message}`);
        notFound.push({ type, regency: regency.name, query, error: err.message });
        if (String(err.message).includes("RATE_LIMIT")) {
          console.error("   pausing 30s for rate limit…");
          await sleep(30_000);
        }
      }

      // Periodic checkpoint save
      if (idx % 20 === 0) {
        await saveCache(cache);
        await writeFile(OUTPUT_PATH, JSON.stringify(results, null, 2));
      }
    }
  }

  await saveCache(cache);
  await writeFile(OUTPUT_PATH, JSON.stringify(results, null, 2));

  console.error(`\n═══════════════════════════════════════════════`);
  console.error(`✓ Scraped:    ${results.length} / ${javaRegencies.length * 2}`);
  console.error(`✗ Missing:    ${notFound.length}`);
  console.error(`→ Output:     ${OUTPUT_PATH.pathname}`);
  console.error(`→ Cache:      ${CACHE_PATH.pathname}\n`);

  if (notFound.length > 0) {
    console.error("Missing entries — isi manual atau retry query berbeda:");
    for (const m of notFound.slice(0, 40)) {
      console.error(`   ${m.type} ${m.regency}${m.error ? ` (${m.error})` : ""}`);
    }
    if (notFound.length > 40) console.error(`   … dan ${notFound.length - 40} lagi`);
  }
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
