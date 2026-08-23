/**
 * Same-origin map tile proxy.
 * Providers:
 *   - osm (classic OpenStreetMap) — legacy default
 *   - voyager (CARTO Voyager) — Apple Maps–like soft colors
 *   - dark (CARTO Dark Matter) — for dark UI mode
 *
 * Path: /map-tiles/:z/:x/:y?provider=voyager|osm|dark
 */
export default defineEventHandler(async (event) => {
  const zRaw = getRouterParam(event, "z") || "";
  const xRaw = getRouterParam(event, "x") || "";
  const yRaw = getRouterParam(event, "y") || "";
  const query = getQuery(event);
  const providerRaw = String(query.provider || "voyager").toLowerCase();
  const provider =
    providerRaw === "osm" || providerRaw === "classic"
      ? "osm"
      : providerRaw === "dark" || providerRaw === "dark_all"
        ? "dark"
        : "voyager";

  if (!/^\d+$/.test(zRaw) || !/^\d+$/.test(xRaw) || !/^\d+$/.test(yRaw)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid tile coords" });
  }

  const z = Number(zRaw);
  const x = Number(xRaw);
  const y = Number(yRaw);
  if (z < 0 || z > 22 || x < 0 || y < 0) {
    throw createError({ statusCode: 400, statusMessage: "Tile out of range" });
  }

  const upstreams =
    provider === "dark"
      ? [
          `https://a.basemaps.cartocdn.com/dark_all/${z}/${x}/${y}@2x.png`,
          `https://b.basemaps.cartocdn.com/dark_all/${z}/${x}/${y}.png`,
          `https://c.basemaps.cartocdn.com/dark_all/${z}/${x}/${y}.png`,
        ]
      : provider === "voyager"
        ? [
            `https://a.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}@2x.png`,
            `https://b.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`,
            `https://c.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`,
          ]
        : [
            `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
            `https://a.tile.openstreetmap.fr/osmfr/${z}/${x}/${y}.png`,
          ];

  let lastStatus = 502;
  for (const upstream of upstreams) {
    try {
      const res = await fetch(upstream, {
        headers: {
          "User-Agent": "ButuhBantuan/1.0 (emergency map; contact localhost)",
          Accept: "image/png,image/*;q=0.8,*/*;q=0.5",
          Referer: "https://butuhbantuan.local/",
        },
      });
      if (!res.ok) {
        lastStatus = res.status;
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      setHeader(event, "Content-Type", res.headers.get("content-type") || "image/png");
      setHeader(event, "Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
      setHeader(event, "X-Tile-Provider", provider);
      return buf;
    } catch {
      /* try next */
    }
  }

  throw createError({
    statusCode: lastStatus === 404 ? 404 : 502,
    statusMessage: "Tile upstream failed",
  });
});
