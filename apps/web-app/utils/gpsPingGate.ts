/**
 * Gate field GPS POSTs so watchPosition updates don't hammer the API.
 * Send when: first fix, OR moved ≥ minMeters, OR minInterval elapsed.
 */

const EARTH_M = 6_371_000;

export type GpsPingGateOptions = {
  /** Minimum time between successful sends (default 6s). */
  minIntervalMs?: number;
  /** Minimum movement to send early (default 30m). */
  minMoveMeters?: number;
};

export function createGpsPingGate(opts: GpsPingGateOptions = {}) {
  const minIntervalMs = opts.minIntervalMs ?? 6_000;
  const minMoveMeters = opts.minMoveMeters ?? 30;

  let lastLat: number | null = null;
  let lastLng: number | null = null;
  let lastAt = 0;

  function haversineM(aLat: number, aLng: number, bLat: number, bLng: number): number {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(bLat - aLat);
    const dLng = toRad(bLng - aLng);
    const lat1 = toRad(aLat);
    const lat2 = toRad(bLat);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * EARTH_M * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  /** Whether this fix should be POSTed. */
  function shouldSend(lat: number, lng: number, now = Date.now()): boolean {
    if (lastLat == null || lastLng == null || lastAt === 0) return true;
    const elapsed = now - lastAt;
    if (elapsed >= minIntervalMs) return true;
    return haversineM(lastLat, lastLng, lat, lng) >= minMoveMeters;
  }

  /** Call after a successful POST (or when intentionally accepting a fix). */
  function markSent(lat: number, lng: number, now = Date.now()) {
    lastLat = lat;
    lastLng = lng;
    lastAt = now;
  }

  function reset() {
    lastLat = null;
    lastLng = null;
    lastAt = 0;
  }

  return { shouldSend, markSent, reset };
}
