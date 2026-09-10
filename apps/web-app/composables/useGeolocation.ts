import { formatGeoAddress } from "~/utils/geo";

/** DIY seed near Sleman — map paint only, never treated as “current GPS”. */
const DIY_CENTER = { lat: -7.715, long: 110.355 };

const LAST_GEO_KEY = "bb-last-geo-v1";
/** Don't persist / reuse fixes worse than this (typical bad Wi‑Fi geolocation). */
const MAX_CACHE_ACCURACY_M = 400;

/** Locate: stop as soon as we have a tight GPS lock. */
const GOOD_ENOUGH_M = 50;
/** Locate: after a few seconds, accept a decent fix instead of waiting longer. */
const ACCEPTABLE_M = 100;
/** Hard ceiling for the locate button. */
const PREFER_GPS_DEADLINE_MS = 12_000;
/** Boot sampling window. */
const BOOT_MAX_MS = 6_000;
/** Reuse in-session GPS from map watch when this fresh. */
const SESSION_GPS_FRESH_MS = 20_000;
/** Ignore coarse Wi‑Fi once we have anything tighter. */
const COARSE_DISCARD_M = 200;

export type GeoFix = {
  lat: number;
  long: number;
  fromGps: boolean;
  accuracyM?: number;
  errorCode?: number;
};

export function readLastGeo(): {
  lat: number;
  long: number;
  accuracyM?: number;
} | null {
  if (!import.meta.client) return null;
  try {
    const raw = localStorage.getItem(LAST_GEO_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      lat?: number;
      long?: number;
      accuracyM?: number;
      at?: number;
    };
    const lat = Number(parsed.lat);
    const long = Number(parsed.long);
    const accuracyM = Number(parsed.accuracyM);
    if (!Number.isFinite(lat) || !Number.isFinite(long)) return null;
    if (parsed.at && Date.now() - parsed.at > 7 * 24 * 3600_000) return null;
    if (Number.isFinite(accuracyM) && accuracyM > MAX_CACHE_ACCURACY_M) return null;
    return {
      lat,
      long,
      accuracyM: Number.isFinite(accuracyM) ? accuracyM : undefined,
    };
  } catch {
    return null;
  }
}

function writeLastGeo(lat: number, long: number, accuracyM?: number) {
  if (!import.meta.client) return;
  if (accuracyM != null && accuracyM > MAX_CACHE_ACCURACY_M) return;
  try {
    const prev = readLastGeo();
    if (
      prev?.accuracyM != null &&
      accuracyM != null &&
      accuracyM > prev.accuracyM
    ) {
      return;
    }
    localStorage.setItem(
      LAST_GEO_KEY,
      JSON.stringify({ lat, long, accuracyM, at: Date.now() }),
    );
  } catch {
    /* ignore */
  }
}

/** Hard cap — some browsers never invoke getCurrentPosition callbacks despite `timeout`. */
function readPosition(options: PositionOptions): Promise<GeolocationPosition> {
  const timeoutMs = options.timeout ?? 10_000;
  return new Promise((resolve, reject) => {
    if (!navigator?.geolocation) {
      reject(Object.assign(new Error("unsupported"), { code: 0 }));
      return;
    }

    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(hardTimer);
      fn();
    };

    const hardTimer = setTimeout(() => {
      finish(() => {
        reject(Object.assign(new Error("timeout"), { code: 3 }));
      });
    }, timeoutMs + 750);

    navigator.geolocation.getCurrentPosition(
      (pos) => finish(() => resolve(pos)),
      (err) => finish(() => reject(err)),
      options,
    );
  });
}

function toFix(pos: GeolocationPosition): GeoFix {
  const fix: GeoFix = {
    lat: pos.coords.latitude,
    long: pos.coords.longitude,
    fromGps: true,
    accuracyM: pos.coords.accuracy,
  };
  writeLastGeo(fix.lat, fix.long, fix.accuracyM);
  return fix;
}

function pickBest(fixes: GeoFix[]): GeoFix | null {
  if (!fixes.length) return null;
  return [...fixes].sort((a, b) => {
    const da = a.accuracyM ?? 50_000;
    const db = b.accuracyM ?? 50_000;
    return da - db;
  })[0]!;
}

function metersBetween(a: GeoFix, b: GeoFix): number {
  const dlat = (a.lat - b.lat) * 111_000;
  const dlng =
    (a.long - b.long) * 111_000 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dlat, dlng);
}

/**
 * Prefer the single best fix. Only average samples that sit within ~40 m of it
 * (averaging Wi‑Fi + GPS used to yank the pin toward a city-center guess).
 */
function stabilize(fixes: GeoFix[]): GeoFix | null {
  const best = pickBest(fixes);
  if (!best) return null;

  const cluster = fixes.filter((f) => {
    const acc = f.accuracyM ?? 50_000;
    if (acc > (best.accuracyM ?? 50_000) * 2.5) return false;
    return metersBetween(f, best) <= 40;
  });

  if (cluster.length <= 1) return best;

  const lat = cluster.reduce((s, f) => s + f.lat, 0) / cluster.length;
  const long = cluster.reduce((s, f) => s + f.long, 0) / cluster.length;
  const accuracyM = Math.min(...cluster.map((f) => f.accuracyM ?? 50_000));
  return { lat, long, fromGps: true, accuracyM };
}

type CollectOpts = {
  goodEnoughM?: number;
  acceptableM?: number;
  /** After this many ms, accept `acceptableM` instead of waiting for perfect. */
  acceptAfterMs?: number;
  /** Allow a slightly stale browser fix for the initial kick (locate UX). */
  kickMaximumAgeMs?: number;
  onSample?: (fix: GeoFix) => void;
};

/**
 * Sample GPS quickly: stream improving fixes to the pin, stop early when good enough.
 */
function collectHighAccuracyFixes(
  durationMs: number,
  opts?: CollectOpts,
): Promise<GeoFix | null> {
  return new Promise((resolve) => {
    if (!navigator?.geolocation) {
      resolve(null);
      return;
    }

    const samples: GeoFix[] = [];
    let denied = false;
    let settled = false;
    let bestAcc = Number.POSITIVE_INFINITY;
    const startedAt = Date.now();
    let earlyTimer: ReturnType<typeof setTimeout> | null = null;

    const finish = () => {
      if (settled) return;
      settled = true;
      navigator.geolocation.clearWatch(id);
      clearTimeout(timer);
      if (earlyTimer) clearTimeout(earlyTimer);

      const usable = samples.filter((s) => {
        const a = s.accuracyM ?? 50_000;
        if (bestAcc <= COARSE_DISCARD_M && a > COARSE_DISCARD_M) return false;
        return true;
      });
      const pool = usable.length ? usable : samples;
      const best = stabilize(pool) || pickBest(pool);
      if (best) {
        resolve(best);
        return;
      }
      resolve(
        denied
          ? { ...DIY_CENTER, fromGps: false, errorCode: 1 }
          : null,
      );
    };

    const maybeFinishEarly = () => {
      if (settled || earlyTimer) return;
      const elapsed = Date.now() - startedAt;
      const goodEnough = opts?.goodEnoughM ?? 0;
      const acceptable = opts?.acceptableM ?? 0;
      const acceptAfter = opts?.acceptAfterMs ?? 2_500;

      // Tight GPS lock — stop almost immediately
      if (goodEnough > 0 && bestAcc <= goodEnough) {
        earlyTimer = setTimeout(finish, 350);
        return;
      }

      // Decent fix after a short wait — don't make the user wait the full window
      if (acceptable > 0 && elapsed >= acceptAfter && bestAcc <= acceptable) {
        earlyTimer = setTimeout(finish, 200);
        return;
      }

      // Any reading after a short wait — better than waiting on a cold GPS chip
      if (elapsed >= acceptAfter && samples.length > 0 && bestAcc < 2_000) {
        earlyTimer = setTimeout(finish, 250);
      }
    };

    const ingest = (pos: GeolocationPosition) => {
      if (settled) return;
      const fix = toFix(pos);
      const acc = fix.accuracyM ?? 50_000;

      // Drop absurd first Wi‑Fi hits if we already have something tighter
      if (
        Number.isFinite(bestAcc) &&
        bestAcc <= COARSE_DISCARD_M &&
        acc > COARSE_DISCARD_M
      ) {
        return;
      }

      samples.push(fix);

      const improved =
        !Number.isFinite(bestAcc) ||
        acc < bestAcc * 0.9 ||
        acc < bestAcc - 8;

      if (improved) {
        bestAcc = Math.min(bestAcc, acc);
        opts?.onSample?.(fix);
      } else if (samples.length === 1) {
        // Always paint the first reading so the pin moves instantly
        opts?.onSample?.(fix);
        bestAcc = acc;
      }

      maybeFinishEarly();
    };

    const id = navigator.geolocation.watchPosition(
      ingest,
      (err) => {
        if (err.code === 1) denied = true;
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: durationMs,
      },
    );

    // Kick GPS immediately (watch alone is slow on some browsers)
    void readPosition({
      enableHighAccuracy: true,
      maximumAge: opts?.kickMaximumAgeMs ?? 0,
      timeout: Math.min(4_000, durationMs),
    })
      .then(ingest)
      .catch((err: any) => {
        if (err?.code === 1) denied = true;
      });

    const timer = setTimeout(finish, durationMs);
  });
}

export function useGeolocation() {
  const config = useRuntimeConfig();
  const userLocation = useUserLocationStore();

  async function reverseGeocode(lng: number, lat: number) {
    try {
      const baseUrl = config.public.apiBaseUrl;
      const data = await $fetch<any>(
        `${baseUrl}/api/v1/geocoding/reverse?latitude=${lat}&longitude=${lng}`,
        { timeout: 6_000 },
      );
      return (data as any)?.data ?? data;
    } catch {
      return null;
    }
  }

  async function applyFix(
    fix: {
      lat: number;
      long: number;
      accuracyM?: number;
    },
    opts?: { force?: boolean; skipGeocode?: boolean },
  ) {
    if (userLocation.isManualLocation && !opts?.force) {
      userLocation.updateGPSCoordinate(fix.lat, fix.long, fix.accuracyM);
      return;
    }

    userLocation.setManualLocation(false);
    userLocation.updateGPSCoordinate(fix.lat, fix.long, fix.accuracyM);

    if (opts?.skipGeocode) return;

    userLocation.setAddressLoading(true);
    try {
      const geo = await reverseGeocode(fix.long, fix.lat);
      const formatted = formatGeoAddress(geo);
      userLocation.updateFullAddress(
        formatted || `${fix.lat.toFixed(5)}, ${fix.long.toFixed(5)}`,
      );
    } finally {
      userLocation.setAddressLoading(false);
    }
  }

  /**
   * Boot: short GPS sample, then coarse fallback.
   * Locate (preferGps): fast stream + early exit, then one-shot / cache fallbacks
   * (must not hard-fail when boot already got a good fix).
   */
  async function getCurrentLocation(opts?: {
    preferGps?: boolean;
    onSample?: (fix: GeoFix) => void;
  }): Promise<GeoFix> {
    if (!navigator?.geolocation) {
      const cached = readLastGeo();
      if (cached) return { ...cached, fromGps: false, errorCode: 0 };
      return { ...DIY_CENTER, fromGps: false, errorCode: 0 };
    }

  function freshSessionFix(): GeoFix | null {
    const age = userLocation.gpsUpdatedAt
      ? Date.now() - userLocation.gpsUpdatedAt
      : Number.POSITIVE_INFINITY;
    if (age > SESSION_GPS_FRESH_MS) return null;
    const lat = userLocation.gpsLat;
    const lng = userLocation.gpsLong;
    const acc = userLocation.gpsAccuracyM;
    if (!lat || !lng || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    // Accept any accuracy — the map watch already shows the blue dot at this position,
    // so using it is always better than a false-positive "GPS denied" error.
    return {
      lat,
      long: lng,
      fromGps: true,
      accuracyM: acc > 0 ? acc : undefined,
    };
  }

  /** Last-resort: return whatever the background map watch has, even if stale. */
  function watchFallback(): GeoFix | null {
    const lat = userLocation.gpsLat;
    const lng = userLocation.gpsLong;
    if (!lat || !lng || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const acc = userLocation.gpsAccuracyM;
    return { lat, long: lng, fromGps: true, accuracyM: acc > 0 ? acc : undefined };
  }

    if (opts?.preferGps) {
      const preferGps = async (): Promise<GeoFix> => {
        // Map watch may already have a fresh fix — don't cold-start a second watch
        const live = freshSessionFix();
        if (live) {
          opts?.onSample?.(live);
          return live;
        }

        // Escape hatch — any known position beats "GPS belum dapat kunci".
        // Used when the getCurrentPosition calls below time out or fail with
        // POSITION_UNAVAILABLE (code 2) / TIMEOUT (code 3), which is common
        // after the device has been idle for hours and the GPS chip is cold.
        let lastDeniedCode: number | null = null;
        const softFallback = (): GeoFix | null => {
          const wb = watchFallback();
          if (wb) return wb;
          const cached = readLastGeo();
          if (cached) {
            return { ...cached, fromGps: false, errorCode: 0 };
          }
          return null;
        };

        try {
          const pos = await readPosition({
            enableHighAccuracy: true,
            timeout: 8_000,
            maximumAge: 30_000, // allow a lightly-cached fix so cold-start doesn't stall
          });
          const fix = toFix(pos);
          opts?.onSample?.(fix);
          return fix;
        } catch (e: any) {
          if (e?.code === 1) lastDeniedCode = 1;
          const fb = softFallback();
          if (fb) {
            opts?.onSample?.(fb);
            return fb;
          }
          // No fallback available yet — try low-accuracy pass below.
        }

        try {
          const pos = await readPosition({
            enableHighAccuracy: false,
            timeout: 5_000,
            maximumAge: 60_000,
          });
          const fix = toFix(pos);
          opts?.onSample?.(fix);
          return fix;
        } catch (e: any) {
          if (e?.code === 1) lastDeniedCode = 1;
          const fb = softFallback();
          if (fb) {
            opts?.onSample?.(fb);
            return fb;
          }
        }

        return {
          ...DIY_CENTER,
          fromGps: false,
          errorCode: lastDeniedCode ?? 3,
        };
      };

      return Promise.race([
        preferGps(),
        new Promise<GeoFix>((resolve) => {
          setTimeout(() => {
            // Deadline hit — surface any known position instead of DIY_CENTER.
            const wb = watchFallback();
            if (wb) {
              opts?.onSample?.(wb);
              resolve(wb);
              return;
            }
            const cached = readLastGeo();
            if (cached) {
              resolve({ ...cached, fromGps: false, errorCode: 0 });
              return;
            }
            resolve({ ...DIY_CENTER, fromGps: false, errorCode: 3 });
          }, PREFER_GPS_DEADLINE_MS);
        }),
      ]);
    }

    const gps = await collectHighAccuracyFixes(BOOT_MAX_MS, {
      goodEnoughM: GOOD_ENOUGH_M,
      acceptableM: ACCEPTABLE_M,
      acceptAfterMs: 1_500,
      onSample: opts?.onSample,
    });
    if (gps?.fromGps) return gps;

    try {
      const pos = await readPosition({
        enableHighAccuracy: false,
        timeout: 5_000,
        maximumAge: 0,
      });
      const fix = toFix(pos);
      if ((fix.accuracyM ?? 9999) > MAX_CACHE_ACCURACY_M) {
        return { ...fix, fromGps: true };
      }
      return fix;
    } catch (e: any) {
      const cached = readLastGeo();
      if (cached) return { ...cached, fromGps: false, errorCode: e?.code };
      return {
        ...DIY_CENTER,
        fromGps: false,
        errorCode: e?.code === 1 ? 1 : 3,
      };
    }
  }

  async function initUserLocation(): Promise<GeoFix> {
    userLocation.setManualLocation(false);
    // Paint map from cache only — address waits for the GPS attempt below
    const cached = readLastGeo();
    if (cached) {
      userLocation.seedFromCache(cached.lat, cached.long);
    }

    const fix = await getCurrentLocation({ preferGps: false });
    await applyFix(fix, { force: true });
    return fix;
  }

  return {
    getCurrentLocation,
    initUserLocation,
    reverseGeocode,
    applyFix,
    readLastGeo,
    DIY_CENTER,
  };
}
