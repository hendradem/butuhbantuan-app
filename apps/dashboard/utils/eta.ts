/** Approximate driving ETA from haversine distance at avgSpeedKmh (default 40). */
export function estimateEtaMinutes(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  avgSpeedKmh = 40
): number | null {
  if ((!fromLat && !fromLng) || (!toLat && !toLng)) return null;
  const km = haversineKm(fromLat, fromLng, toLat, toLng);
  if (!Number.isFinite(km)) return null;
  const mins = Math.ceil((km / avgSpeedKmh) * 60);
  return Math.min(180, Math.max(1, mins));
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Emergency coordinates are stored as [lng, lat] strings. */
export function etaFromEmergency(
  emergency: { coordinates?: [string | number, string | number] } | null | undefined,
  requesterLat: number,
  requesterLng: number
): number | null {
  if (!emergency?.coordinates) return null;
  const lng = Number(emergency.coordinates[0]);
  const lat = Number(emergency.coordinates[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return estimateEtaMinutes(lat, lng, requesterLat, requesterLng);
}

export function formatEta(minutes: number | null | undefined): string {
  if (minutes == null || minutes <= 0) return "—";
  if (minutes < 60) return `±${minutes} mnt`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `±${h}j ${m}m` : `±${h} jam`;
}
