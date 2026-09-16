<script setup lang="ts">
import type { CircleMarker, Map as LeafletMap, Marker, Polyline } from "leaflet";
import { appToast } from "~/utils/appToast";
import { formatDistance } from "~/utils/geo";
import { displayEtaMinutes } from "~/utils/rankUnits";
import {
  ROUTE_LINE_CASING_WEIGHT,
  ROUTE_LINE_COLOR,
  ROUTE_LINE_COLOR_FAR,
  ROUTE_LINE_COLOR_MID,
  ROUTE_LINE_COLOR_NEAR,
  ROUTE_LINE_WEIGHT,
  routeAdviceFromTravel,
  routeLineCasingColor,
  routeLineColorFromTravel,
} from "~/utils/routeAdvice";
import {
  classicMarkerClass,
  effectiveTileStyle,
  emergencyPinIconHtml,
  unitChipIconHtml,
  getMapAppearance,
  tileAttribution,
  tileLayerExtraOptions,
  tileLayerUrl,
  tileSubdomains,
  userLocationIconHtml,
  watchTileQuota,
} from "~/utils/mapAppearance";
import { getColorMode } from "~/utils/colorMode";

const leafletStore = useLeafletStore();
const emergencyStore = useEmergencyStore();
const userLocationStore = useUserLocationStore();
const appError = useAppErrorStore();
const detailSheet = useDetailSheetStore();
const exploreSheet = useExploreSheetStore();
const { openEmergencyDetail } = useOpenUnit();
const mapUrl = useMapUrl();
const { clearRoute } = useMapRouting();
const { loadEmergencyData } = useEmergencyApi();
const toast = appToast();
const mapAppearance = getMapAppearance();

const mapContainer = ref<HTMLElement | null>(null);
let map: LeafletMap | null = null;
let baseTileLayer: any = null;
let markers: Marker[] = [];
/** emergency id → leaflet marker (for select/highlight). */
const markersById = new Map<string, Marker>();
/** emergency id → type name for rebuilding icons. */
const markerMetaById = new Map<string, { typeName: string; item: any }>();
let activeEmergencyId = "";
/**
 * Units the explore list is currently showing — the map keeps only these on
 * screen while it is open. null = no restriction (list closed).
 */
let visibleUnitIdSet: Set<string> | null = null;
/** The same set as an ordered list, so a change is detectable. */
let shownUnitIds: string[] = [];
/** Ids of the units the list leads with, in list order — each gets a connector. */
let topUnitIds: string[] = [];
/**
 * id → connector (route line + end cap). Entries outlive a filter change so a
 * unit that drops out of the top few fades out instead of being torn down and
 * rebuilt when it comes back; the pool dies with the open sheet.
 */
const matrixLines = new Map<string, { line: Polyline; dot: CircleMarker }>();
/** Units currently wearing a chip instead of a pin, so swaps happen once. */
const chipMarkerIds = new Set<string>();
/** A connector's road geometry, plus the drive time it stands for. */
type ConnectorRoute = { latlngs: [number, number][]; durationSec: number };
/**
 * Connector routes already fetched, keyed by unit + pin position, so shuffling
 * the list around under a filter re-uses a line instead of re-asking OSRM for
 * one it just drew. Plain data — it outlives the map instance on purpose.
 */
const connectorRoutes = new Map<string, ConnectorRoute>();
/** Bound on that cache, so panning around can't pin every route in memory. */
const CONNECTOR_CACHE_MAX = 60;
/** Pending re-frame of the leading units, held until the sheet stops moving. */
let listFitTimer: ReturnType<typeof setTimeout> | undefined;
/** A re-frame is owed; it waits for the routes and for CoreSheet to settle. */
let listFitPending = false;
let listFitNotBefore = 0;
/** Connector routes still in flight, and the pill that reports them. */
let routesInFlight = 0;
let routeLoaderTimer: ReturnType<typeof setTimeout> | undefined;
const showRouteLoader = ref(false);
/** Pin rounding for the cache key — ~110 m, well under what the eye can see. */
const CONNECTOR_KEY_DECIMALS = 3;
let currentLocationMarker: Marker | null = null;
let accuracyCircle: any = null;
let routeLine: Polyline | null = null;
let routeCasing: Polyline | null = null;
let routeEtaMarker: Marker | null = null;
let gpsWatchId: number | null = null;
let routeRenderToken = 0;
/** Best (lowest) GPS accuracy seen this session — used to decide refinements. */
let bestAccuracyM = Number.POSITIVE_INFINITY;
/** True while user is dragging the blue pin (Leaflet has no public dragging.moving()). */
let pinDragging = false;
/** Avoid re-zooming on every GPS tick once we've framed the overview. */
let locationOverviewFramed = false;
/** Framed at overview zoom before emergency pins arrived — refit once they load. */
let needsEmergencyReframe = false;
/** Listener for dark/light map tile swap. */
let onColorModeChange: ((e: Event) => void) | null = null;
/** Default map view — neighborhood scale (~4–6 km) when emergencies are nearby. */
const DEFAULT_ZOOM = 14;
/** "Already default" band — pan only when nearby markers exist. */
const OVERVIEW_MIN_ZOOM = 13;
const OVERVIEW_MAX_ZOOM = 15;
/** Half-span ≈ zoom-14 viewport (~3.3 km). Markers inside = stay at DEFAULT_ZOOM. */
const NEARBY_HALF_DEG = 0.03;
/** Cap how far we zoom out to reveal distant markers (~13 km half). */
const EXPAND_MAX_HALF_DEG = 0.12;
/** Floor when expanding to show far markers. */
const OVERVIEW_FLOOR_ZOOM = 11;
/** Below this zoom the ETA badge is hidden and service pins shrink so the route stays readable. */
const ROUTE_OVERLAY_MIN_ZOOM = 13;
/**
 * Top-list connectors — one thin blue line per leading unit, following the
 * roads it would actually drive, with its ETA on a pill. Blue is the same
 * "dekat" tone the app gives a short route, so a connector reads as a route
 * rather than a straight-line estimate.
 */
const MATRIX_LINE_COLOR = ROUTE_LINE_COLOR_NEAR;
/**
 * Connector tones by drive time, on the app's own palette: blue while a unit is
 * close, orange past this, red from the far one. A connector then reads at a
 * glance as "worth calling / slower / a long way off", and the chip's ETA takes
 * the same colour.
 */
const CONNECTOR_MID_MINUTES = 10;
const CONNECTOR_FAR_MINUTES = 15;
const MATRIX_LINE_COLOR_MID = ROUTE_LINE_COLOR_MID;
const MATRIX_LINE_COLOR_FAR = ROUTE_LINE_COLOR_FAR;
const MATRIX_LINE_WEIGHT = 4;
/** End cap where a connector leaves its unit — a dot in the line's own colour
 *  with a white ring, sized in pixels so it holds its size at any zoom. */
const MATRIX_DOT_RADIUS = 5;
const MATRIX_DOT_RING = 2;
/**
 * Sides a leading unit's chip can hang off its own point, tried in this order.
 * The chips are wide, so neighbours would otherwise sit on each other.
 */
const CHIP_SIDES = ["up", "right", "left", "down"] as const;
/** Clear space kept between two chips, in pixels. */
const CHIP_GAP = 6;
/** zIndexOffset for a leading unit's chip — above plain pins, under the active one. */
const TOP_MARKER_Z = 400;
/**
 * Padding for framing the leading units in the strip the sheet leaves visible.
 * The top carries the most: it has to clear the floating banners and leave room
 * for a chip hanging above its unit.
 */
const LIST_FIT_LEFT = 40;
const LIST_FIT_TOP = 68;
const LIST_FIT_RIGHT = 48;
const LIST_FIT_GAP = 12;
/**
 * How much to pull the framed bounds in on themselves, per side. The list is
 * what the sheet is for, so the units are shown a step closer than the exact
 * fit — the outermost one may need a small pan to reach, which is the trade
 * this buys.
 */
const LIST_FIT_TIGHTEN = 0.15;
/** Ceiling for that fit. Street level: a cluster of units inside a few blocks
 *  would otherwise land at neighbourhood scale and look tiny in the strip. */
const LIST_FIT_MAX_ZOOM = 16;
/** CoreSheet's snap runs 480 ms — wait it out before re-framing on open. */
const SHEET_SETTLE_MS = 540;
/** Don't flash the route loader for a route that lands almost immediately. */
const ROUTE_LOADER_GRACE_MS = 260;
/** Give up on a connector route rather than let a hung request stall the map. */
const CONNECTOR_FETCH_TIMEOUT_MS = 8000;

onMounted(async () => {
  if (!mapContainer.value) return;

  const Lmod = await import("leaflet");
  const L = (Lmod as any).default ?? Lmod;
  await import("leaflet/dist/leaflet.css");

  const indonesiaBounds = L.latLngBounds(L.latLng(-11, 95), L.latLng(6, 141));
  const startLat = userLocationStore.lat || userLocationStore.gpsLat || -7.715;
  const startLng = userLocationStore.long || userLocationStore.gpsLong || 110.355;
  map = L.map(mapContainer.value, {
    center: [startLat, startLng],
    zoom: leafletStore.zoom || DEFAULT_ZOOM,
    zoomControl: false,
    maxBounds: indonesiaBounds,
    maxBoundsViscosity: 1.0,
    minZoom: 5,
    zoomAnimation: true,
    markerZoomAnimation: true,
    easeLinearity: 0.2,
  });

  // Direct-CDN tiles — static build has no Nitro proxy route.
  const initialTiles = effectiveTileStyle(mapAppearance.tiles, getColorMode());
  baseTileLayer = L.tileLayer(tileLayerUrl(initialTiles), {
    attribution: tileAttribution(initialTiles),
    maxZoom: 20,
    subdomains: tileSubdomains(initialTiles),
    crossOrigin: true,
    keepBuffer: 8,
    updateWhenIdle: false,
    ...tileLayerExtraOptions(initialTiles),
  }).addTo(map);
  watchTileQuota(L, map!, baseTileLayer, initialTiles);

  const onColorMode = (e: Event) => {
    const mode = (e as CustomEvent).detail?.mode === "dark" ? "dark" : "light";
    if (!map || !baseTileLayer) return;
    const next = effectiveTileStyle(mapAppearance.tiles, mode);
    map.removeLayer(baseTileLayer);
    baseTileLayer = L.tileLayer(tileLayerUrl(next), {
      attribution: tileAttribution(next),
      maxZoom: 20,
      subdomains: tileSubdomains(next),
      crossOrigin: true,
      keepBuffer: 8,
      updateWhenIdle: false,
      ...tileLayerExtraOptions(next),
    }).addTo(map);
    watchTileQuota(L, map, baseTileLayer, next);
    baseTileLayer.bringToBack?.();
    const tilePane = map.getPane("tilePane") as HTMLElement | undefined;
    if (tilePane) {
      const uncovered =
        emergencyStore.coverageChecked && !emergencyStore.isCovered;
      tilePane.style.filter = uncovered
        ? "grayscale(1) brightness(0.9) contrast(0.92) opacity(0.7)"
        : "";
    }
  };
  onColorModeChange = onColorMode;
  window.addEventListener("bb-color-mode", onColorMode);

  // Leaflet often needs a reflow when mounted inside % height containers.
  requestAnimationFrame(() => {
    map?.invalidateSize();
  });
  setTimeout(() => map?.invalidateSize(), 250);

  leafletStore.setMapInstance(map);

  function applyStoredView(animate = false) {
    if (!map) return;
    const lat = userLocationStore.lat;
    const lng = userLocationStore.long;
    if (!lat || !lng) return;
    const z = leafletStore.zoom || DEFAULT_ZOOM;
    map.setView([lat, lng], z, { animate });
    leafletStore.setMapZoom(z);
  }

  applyStoredView(false);

  watch(mapUrl.hydrating, (isHydrating) => {
    if (!isHydrating) applyStoredView(true);
  });

  map.on("zoomend", () => {
    if (!map) return;
    const z = map.getZoom();
    leafletStore.setMapZoom(z);
    mapUrl.syncZoom(z);
    applyZoomOverlayState(z);
    // Zooming out pulls the units together in pixel terms while their chips
    // keep their size, so they may need re-hanging.
    placeUnitChips();
  });
  applyZoomOverlayState(map!.getZoom());

  // Toggle `.bb-map-interacting` on the container while the user is actively
  // zooming/panning. CSS in main.css keys transitions off this class so markers
  // snap during interaction and only transition when the map is idle.
  const setInteracting = (on: boolean) => {
    mapContainer.value?.classList.toggle("bb-map-interacting", on);
  };
  map.on("zoomstart movestart dragstart", () => setInteracting(true));
  map.on("zoomend moveend dragend", () => setInteracting(false));

  let mapClickTimer: ReturnType<typeof setTimeout> | null = null;

  map.on("click", (e: any) => {
    // Ignore click that ends a marker drag (Leaflet can emit map click after drag)
    if (pinDragging || (map as any)._bbIgnoreNextClick) return;

    if (mapClickTimer) clearTimeout(mapClickTimer);

    const { lat, lng } = e.latlng;

    // skipReset=true so the marker renders at the tap position first,
    // then we apply the view adjustment ourselves below.
    placeManualPin(L, lat, lng, true);

    // Determine if a sheet (open now, or about to reopen) needs the marker centred above it.
    const willReopenExplore = detailSheet.isOpen && detailSheet.fromExploreList;
    if (exploreSheet.isOpen || willReopenExplore) {
      // Apply sheet-aware positioning immediately — avoids animation conflict with
      // the async watcher that reopens the explore sheet.
      const H = window.innerHeight;
      const offset = Math.round(H * 0.25) + 60;
      const userPx = (map as any).project([lat, lng], DEFAULT_ZOOM);
      const centrePx = userPx.add([0, offset]);
      const centreLatLng = (map as any).unproject(centrePx, DEFAULT_ZOOM);
      (map as any).setView(centreLatLng, DEFAULT_ZOOM, { animate: true, duration: 0.45, easeLinearity: 0.2 });
    } else {
      resetToDefaultView(L, lat, lng);
    }

    toast.loading("Mencari layanan di area ini...");
    emergencyStore.setLoading(true);
    clearRoute();
    detailSheet.onClose();

    mapClickTimer = setTimeout(async () => {
      await loadEmergencyData(lat, lng, {
        keepLoadingMessage: "Mencari layanan di area ini...",
      });
    }, 400);
  });

  if (navigator?.geolocation) {
    let recovered = false;

    const startGpsWatch = () => {
      if (gpsWatchId !== null) return;
      gpsWatchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude: lat, longitude: lng, accuracy } = pos.coords;
          const acc = Number(accuracy) || 99999;

          try {
            localStorage.setItem(
              "bb-last-geo-v1",
              JSON.stringify({ lat, long: lng, accuracyM: acc, at: Date.now() }),
            );
          } catch {
            /* ignore */
          }

          if (userLocationStore.isManualLocation) return;
          if (userLocationStore.isGetCurrentLocation) return;

          const prevLat = userLocationStore.gpsLat || userLocationStore.lat;
          const prevLng = userLocationStore.gpsLong || userLocationStore.long;
          const movedFar =
            !prevLat ||
            !prevLng ||
            Math.abs(lat - prevLat) > 0.0007 ||
            Math.abs(lng - prevLng) > 0.0007;

          // Session-only — don't gate on cached accuracy from a prior visit
          const knownBest = bestAccuracyM;
          if (
            !movedFar &&
            Number.isFinite(knownBest) &&
            acc > knownBest &&
            acc > knownBest * 1.25 &&
            acc > 60
          ) {
            return;
          }

          const improved =
            acc < knownBest * 0.7 ||
            (acc < knownBest && acc <= 100) ||
            !Number.isFinite(knownBest);
          const moved =
            !prevLat ||
            !prevLng ||
            Math.abs(lat - prevLat) > 0.0003 ||
            Math.abs(lng - prevLng) > 0.0003;

          if (!improved && !moved && !movedFar && currentLocationMarker) return;
          if (!improved && !movedFar && acc > knownBest && acc > 150) return;

          if (improved || movedFar) bestAccuracyM = Math.min(knownBest, acc);

          userLocationStore.updateGPSCoordinate(lat, lng, acc);
          // Only pan/frame on first meaningful fix — later GPS ticks just move the pin
          const shouldFrame = !locationOverviewFramed && (improved || !currentLocationMarker);
          renderCurrentLocation(L, lat, lng, shouldFrame, acc);

          // Reload nearby services only on meaningful move (~80m+), not every GPS tick
          if (movedFar) {
            void loadEmergencyData(lat, lng);
          }
        },
        (err) => {
          if (err.code === 1) {
            appError.setErrorMessage("permission_denied");
            appError.onOpenSheet();
            return;
          }
          if (!recovered && !emergencyStore.coverageChecked) {
            recovered = true;
            const lat = userLocationStore.lat;
            const lng = userLocationStore.long;
            if (lat && lng) void loadEmergencyData(lat, lng);
          }
        },
        { enableHighAccuracy: true, maximumAge: 5_000, timeout: 25_000 },
      );
    };

    startGpsWatch();

    // Let background watch keep running during locate — restarting it causes slow cold GPS
    watch(
      () => userLocationStore.isGetCurrentLocation,
      (locating) => {
        if (locating) bestAccuracyM = Number.POSITIVE_INFINITY;
      },
    );
  }

  watch(
    () => emergencyStore.filteredEmergency,
    (data) => renderMarkers(L, data),
    { immediate: true }
  );

  // Explore list open → only the units that list is showing stay on the map.
  watch(
    () => exploreSheet.visibleUnitIds,
    (ids) => {
      const next = ids ?? [];
      const changed = next.join() !== shownUnitIds.join();
      shownUnitIds = next;
      visibleUnitIdSet = ids ? new Set(next) : null;
      applyMarkerListFilter();
      // Opening the list, or a new filter: say it, once. Closing doesn't —
      // the map is already handing itself back.
      if (changed && next.length) popUnitMarkers();
    },
    { immediate: true },
  );

  // …and the units it leads with get a bigger pin, their name beside it, a
  // connector to the user pin, and the map framed around all of it.
  watch(
    () => exploreSheet.topUnitIds,
    (ids) => {
      const next = ids ?? [];
      const wasEmpty = topUnitIds.length === 0;
      const changed = next.join() !== topUnitIds.join();
      topUnitIds = next;

      applyTopUnitMarkers(L);
      applyMatrixLines(L);
      placeUnitChips();

      // A closed list has nothing left to frame, and a fit still queued would
      // only fight the recentre that closing hands back to the user.
      if (!next.length) {
        listFitPending = false;
        clearTimeout(listFitTimer);
        return;
      }
      // Only a different set of leaders is worth re-framing for — re-running
      // the fit on every GPS tick would fight the user's own panning.
      if (!changed) return;
      // Opening the list means CoreSheet is mid-slide; the fit waits that out
      // to stay off the slide's animation budget and because the sheet height
      // that pads the bounds is still moving.
      requestListFit(L, wasEmpty ? SHEET_SETTLE_MS : 0);
    },
    { immediate: true },
  );

  watch(
    () => [emergencyStore.isCovered, emergencyStore.coverageChecked] as const,
    ([covered, checked]) => {
      const tilePane = map?.getPane("tilePane") as HTMLElement | undefined;
      if (!tilePane) return;
      // Out of coverage: grey map + hide emergency markers.
      tilePane.style.filter =
        checked && !covered ? "grayscale(1) brightness(0.9) contrast(0.92) opacity(0.7)" : "";
    },
    { immediate: true },
  );

  watch(
    [() => userLocationStore.lat, () => userLocationStore.long, () => userLocationStore.gpsAccuracyM],
    ([lat, lng, acc]) => {
      if (!lat || !lng) return;
      renderCurrentLocation(L, lat, lng, !currentLocationMarker, Number(acc) || undefined);
      // The pin is the far end of every connector.
      applyMatrixLines(L);
    },
    { immediate: true },
  );

  watch(
    () => leafletStore.routeEndPoint,
    async (endPoint) => {
      if (endPoint.lat && endPoint.lng) {
        await renderRoute(L, endPoint);
      } else {
        clearRouteOverlays();
      }
      applyMutedMarkers();
    },
    { immediate: true },
  );

  // Locate button / search selection → always return to default kab/kota zoom
  watch(
    () => leafletStore.overviewNonce,
    () => {
      const lat = userLocationStore.lat;
      const lng = userLocationStore.long;
      if (!lat || !lng) return;
      resetToDefaultView(L, lat, lng);
    },
  );

  // A sheet that had shifted the map closed → user pin back in the centre
  watch(
    () => leafletStore.recenterNonce,
    () => {
      const lat = userLocationStore.lat;
      const lng = userLocationStore.long;
      if (!map || !lat || !lng) return;
      map.setView([lat, lng], DEFAULT_ZOOM, {
        animate: true,
        duration: 0.45,
        easeLinearity: 0.2,
      });
      leafletStore.setMapZoom(DEFAULT_ZOOM);
    },
  );

  // Card/list or map select → enlarge + re-animate that pin
  watch(
    () =>
      [
        detailSheet.isOpen,
        detailSheet.detailSheetData?.emergency?.emergencyData?.id,
      ] as const,
    ([open, id]) => {
      const nextId = open && id != null ? String(id) : "";
      setActiveEmergencyMarker(L, nextId);
      applyMutedMarkers();
    },
  );
});

onUnmounted(() => {
  if (gpsWatchId !== null) navigator.geolocation.clearWatch(gpsWatchId);
  if (onColorModeChange) {
    window.removeEventListener("bb-color-mode", onColorModeChange);
    onColorModeChange = null;
  }
  // These overlays belong to this map instance; a remount builds its own.
  matrixLines.clear();
  chipMarkerIds.clear();
  clearTimeout(listFitTimer);
  clearTimeout(routeLoaderTimer);
});

/** Move blue pin to an explicit lat/lng (map click / drag). Stops GPS from yanking it back.
 *  skipReset=true: skip resetToDefaultView so the map stays put and the pin appears at the tap position. */
function placeManualPin(L: any, lat: number, lng: number, skipReset = false) {
  userLocationStore.setManualLocation(true);
  userLocationStore.updateCoordinate(lat, lng);
  // Drop stale GPS accuracy so the circle doesn't linger after a manual place
  userLocationStore.updateGPSCoordinate(
    userLocationStore.gpsLat || lat,
    userLocationStore.gpsLong || lng,
    0,
  );
  if (accuracyCircle) {
    accuracyCircle.remove();
    accuracyCircle = null;
  }
  renderCurrentLocation(L, lat, lng, false, 0);
  mapUrl.syncPin(lat, lng);
  if (!skipReset) {
    resetToDefaultView(L, lat, lng);
  }
}

/** Force smart default view after locate / map click / search. */
function resetToDefaultView(L: any, lat: number, lng: number) {
  if (!map) return;

  const nearby = nearbyEmergencyPoints(lat, lng);
  const z = map.getZoom();
  const inDefaultBand = z >= OVERVIEW_MIN_ZOOM && z <= OVERVIEW_MAX_ZOOM;

  // Already at default scale AND nearby services exist → just pan
  if (inDefaultBand && nearby.length > 0) {
    map.panTo([lat, lng], { animate: true });
    locationOverviewFramed = true;
    needsEmergencyReframe = true; // re-check after fresh emergency fetch
    return;
  }

  needsEmergencyReframe = true;
  frameLocationOverview(L, lat, lng);
}

function emergencyLatLngs(): [number, number][] {
  const pts: [number, number][] = [];
  for (const item of emergencyStore.filteredEmergency || []) {
    const c = item?.emergencyData?.coordinates;
    if (!c?.length) continue;
    const elat = +c[1];
    const elng = +c[0];
    if (Number.isFinite(elat) && Number.isFinite(elng)) pts.push([elat, elng]);
  }
  return pts;
}

function nearbyEmergencyPoints(lat: number, lng: number): [number, number][] {
  return emergencyLatLngs().filter(
    ([elat, elng]) =>
      Math.abs(elat - lat) <= NEARBY_HALF_DEG &&
      Math.abs(elng - lng) <= NEARBY_HALF_DEG,
  );
}

/**
 * Smart default view:
 * - Emergencies near the pin → zoom 14 (screenshot scale)
 * - None nearby but some farther → zoom out just enough so markers are visible
 * - No emergency data at all → zoom 14 centered on pin
 */
function frameLocationOverview(L: any, lat: number, lng: number) {
  if (!map) return;
  locationOverviewFramed = true;

  const nearby = nearbyEmergencyPoints(lat, lng);
  if (nearby.length > 0) {
    const z = map.getZoom();
    if (z >= OVERVIEW_MIN_ZOOM && z <= OVERVIEW_MAX_ZOOM) {
      map.panTo([lat, lng], { animate: true });
    } else {
      map.setView([lat, lng], DEFAULT_ZOOM, { animate: true });
    }
    return;
  }

  const all = emergencyLatLngs();
  if (all.length === 0) {
    map.setView([lat, lng], DEFAULT_ZOOM, { animate: true });
    return;
  }

  // Prefer markers within expand radius; else take nearest few
  const withinExpand = all.filter(
    ([elat, elng]) =>
      Math.abs(elat - lat) <= EXPAND_MAX_HALF_DEG &&
      Math.abs(elng - lng) <= EXPAND_MAX_HALF_DEG,
  );
  const ranked = [...(withinExpand.length ? withinExpand : all)].sort((a, b) => {
    const da = (a[0] - lat) ** 2 + (a[1] - lng) ** 2;
    const db = (b[0] - lat) ** 2 + (b[1] - lng) ** 2;
    return da - db;
  });
  const toShow = ranked.slice(0, 8);

  const bounds = L.latLngBounds([[lat, lng], ...toShow]);
  map.fitBounds(bounds, {
    padding: [48, 48],
    maxZoom: DEFAULT_ZOOM,
    animate: true,
  });

  if (map.getZoom() < OVERVIEW_FLOOR_ZOOM) {
    map.setView([lat, lng], OVERVIEW_FLOOR_ZOOM, { animate: true });
  }
}

function renderCurrentLocation(
  L: any,
  lat: number,
  lng: number,
  panMap = false,
  accuracyM?: number,
  opts?: { forcePan?: boolean },
) {
  if (!map) return;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return;

  if (currentLocationMarker) {
    if (!pinDragging) {
      currentLocationMarker.setLatLng([lat, lng]);
    }
  } else {
    const usePin = mapAppearance.markers === "pin";
    const icon = L.divIcon({
      className: usePin ? "bb-user-pin-wrap" : "",
      html: usePin
        ? userLocationIconHtml()
        : `<div title="Klik peta atau geser pin" style="
            width:22px;height:22px;border-radius:9999px;
            background:#2563eb;border:3px solid #fff;
            box-shadow:0 1px 6px rgba(0,0,0,.4);cursor:grab;
            transition:width 0.2s ease,height 0.2s ease;
          "></div>`,
      iconSize: usePin ? [44, 44] : [22, 22],
      iconAnchor: usePin ? [22, 22] : [11, 11],
    });
    currentLocationMarker = L.marker([lat, lng], {
      icon,
      zIndexOffset: 1000,
      draggable: true,
      autoPan: true,
    }).addTo(map!);

    currentLocationMarker.on("dragstart", () => {
      pinDragging = true;
      userLocationStore.setManualLocation(true);
    });
    currentLocationMarker.on("dragend", (e: any) => {
      pinDragging = false;
      const ll = e.target.getLatLng();
      // Prevent the trailing map "click" from re-placing after drag
      (map as any)._bbIgnoreNextClick = true;
      setTimeout(() => {
        if (map) (map as any)._bbIgnoreNextClick = false;
      }, 100);

      placeManualPin(L, ll.lat, ll.lng);
      toast.loading("Memperbarui lokasi pin...");
      void loadEmergencyData(ll.lat, ll.lng, {
        keepLoadingMessage: "Memperbarui lokasi pin...",
      });
    });

    panMap = true;
  }

  const radius = accuracyM && accuracyM > 0 && accuracyM < 2000 ? accuracyM : 0;
  if (radius > 15 && !userLocationStore.isManualLocation) {
    if (accuracyCircle) {
      accuracyCircle.setLatLng([lat, lng]);
      accuracyCircle.setRadius(radius);
    } else {
      accuracyCircle = L.circle([lat, lng], {
        radius,
        color: "#2563eb",
        weight: 1,
        opacity: 0.45,
        fillColor: "#3b82f6",
        fillOpacity: 0.12,
        interactive: false,
      }).addTo(map!);
    }
  } else if (accuracyCircle && (radius <= 15 || userLocationStore.isManualLocation)) {
    accuracyCircle.remove();
    accuracyCircle = null;
  }

  if (panMap && (!userLocationStore.isManualLocation || opts?.forcePan)) {
    frameLocationOverview(L, lat, lng);
  }
}

/**
 * Icon for a unit that is not leading the list: the teardrop pin, or the
 * legacy circle when the rollback appearance is on. One place decides, so the
 * pin a chip is swapped back to is the same pin it would have been given.
 */
function unitPinIcon(
  L: any,
  typeName: string,
  opts: { enter?: boolean; delayMs?: number; active?: boolean; muted?: boolean },
) {
  const active = !!opts.active;
  if (mapAppearance.markers === "pin") {
    return buildServicePinIcon(L, typeName, { ...opts, active });
  }
  return L.divIcon({
    className: `${classicMarkerClass(typeName)} bb-unit-marker${opts.muted && !active ? " bb-marker--muted" : ""}`,
    iconSize: active ? [32, 32] : [25, 25],
    iconAnchor: active ? [16, 16] : [12, 12],
  });
}

function renderMarkers(L: any, data: any[]) {
  markers.forEach((m) => m.remove());
  markers = [];
  markersById.clear();
  markerMetaById.clear();
  // Every marker below is built fresh, as a pin — whatever wore a chip before.
  chipMarkerIds.clear();
  if (!map) return;

  let pinIndex = 0;
  const selectedId =
    detailSheet.isOpen && detailSheet.detailSheetData?.emergency?.emergencyData?.id != null
      ? String(detailSheet.detailSheetData.emergency.emergencyData.id)
      : activeEmergencyId;
  const muteOthers = Boolean(selectedId && routeIsDrawn());

  data.forEach((item: any) => {
    const e = item.emergencyData;
    if (!e?.coordinates) return;

    const id = String(e.id ?? "");
    const typeName = e.emergency_type?.name || "";
    const isActive = !!id && id === selectedId;
    const muted = muteOthers && !isActive;

    const icon = unitPinIcon(L, typeName, {
      enter: true,
      delayMs: Math.min(pinIndex * 45, 360),
      active: isActive,
      muted,
    });

    pinIndex += 1;

    const marker = L.marker([+e.coordinates[1], +e.coordinates[0]], {
      icon,
      zIndexOffset: isActive ? 800 : muted ? -200 : 0,
    })
      .addTo(map!)
      .on("click", (ev: any) => {
        L.DomEvent.stopPropagation(ev);
        onMarkerClick(item);
      });

    markers.push(marker);
    if (id) {
      markersById.set(id, marker);
      markerMetaById.set(id, { typeName, item });
      setMarkerHidden(marker, markerHiddenByList(id));
    }
  });

  activeEmergencyId = selectedId;

  // After services load, widen once so several markers are visible with the blue pin
  if (
    needsEmergencyReframe &&
    data.length > 0 &&
    !leafletStore.routeEndPoint?.lat &&
    userLocationStore.lat &&
    userLocationStore.long
  ) {
    needsEmergencyReframe = false;
    frameLocationOverview(L, userLocationStore.lat, userLocationStore.long);
  }

  // Fresh coordinates and fresh elements — re-apply the list's lead styling,
  // then re-route the connectors onto the new pins.
  applyTopUnitMarkers(L);
  applyMatrixLines(L);
  placeUnitChips();
}

function routeIsDrawn(): boolean {
  return Boolean(leafletStore.routeEndPoint?.lat && leafletStore.routeEndPoint?.lng);
}

/** True when the explore list has ruled this unit out. Units without an id
 *  can't be matched against the list, so they stay visible. */
function markerHiddenByList(id: string): boolean {
  return Boolean(id) && visibleUnitIdSet !== null && !visibleUnitIdSet.has(id);
}

function setMarkerHidden(marker: Marker, hidden: boolean) {
  marker.getElement()?.classList.toggle("bb-map-marker--hidden", hidden);
}

function applyMarkerListFilter() {
  for (const [id, marker] of markersById) {
    setMarkerHidden(marker, markerHiddenByList(id));
  }
}

/**
 * Swell every unit marker once — the map's answer to a filter change, or to the
 * connectors finishing their fetch. Without it those two moments rearrange
 * things silently behind the sheet.
 */
function popUnitMarkers() {
  const els: HTMLElement[] = [];
  for (const marker of markersById.values()) {
    const el = marker.getElement?.();
    if (el) els.push(el as HTMLElement);
  }
  if (!els.length) return;

  for (const el of els) el.classList.remove("bb-unit-pop");
  // One reflow for the whole batch. Without it the browser coalesces the remove
  // and the add, and an animation that never left can't restart.
  void els[0]!.offsetWidth;
  for (const el of els) el.classList.add("bb-unit-pop");
}

/** Name a unit is listed under. */
function unitName(id: string): string {
  const data = markerMetaById.get(id)?.item?.emergencyData;
  return String(data?.name || data?.organization_name || "");
}

/** Marker whose whole content is one chip: icon, unit name, ETA. */
function chipIconFor(L: any, typeName: string) {
  return L.divIcon({
    className: "bb-unit-chip-wrap bb-unit-marker",
    html: unitChipIconHtml(typeName),
    // Zero-sized: the chip inside is content-sized and hangs off this point.
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

/**
 * ETA a chip shows: the list's own matrix figure, so the chip and its card can
 * never disagree, falling back to the drive time OSRM returned for its
 * connector when the matrix had nothing for that unit.
 */
function chipEtaMinutes(id: string): number | null {
  const fromMatrix = displayEtaMinutes(markerMetaById.get(id)?.item?.trip?.duration);
  if (fromMatrix != null) return fromMatrix;

  const route = connectorRoutes.get(
    connectorCacheKey(id, Number(userLocationStore.lat), Number(userLocationStore.long)),
  );
  if (!route || !Number.isFinite(route.durationSec)) return null;
  return Math.max(1, Math.round(route.durationSec / 60));
}

/**
 * Write a chip's texts. Always through textContent, so a unit name from the API
 * is never markup, and always re-measured by placeUnitChips afterwards because
 * the name decides how wide the chip is.
 */
function fillChip(marker: Marker, id: string) {
  const el = marker.getElement?.();
  if (!el) return;

  const name = el.querySelector(".bb-unit-chip__name");
  if (name && name.textContent !== unitName(id)) name.textContent = unitName(id);

  const minutes = chipEtaMinutes(id);
  const eta = el.querySelector(".bb-unit-chip__eta") as HTMLElement | null;
  if (eta) {
    const label = minutes == null ? "" : `${minutes} min`;
    if (eta.textContent !== label) eta.textContent = label;
    eta.style.color = connectorColor(minutes);
  }
}

/**
 * The units the list leads with wear a chip — icon, name and ETA on the marker
 * itself — instead of a pin with two badges scattered around it.
 *
 * The icon is swapped rather than a class toggled: a chip and a pin are
 * different shapes, not different sizes, so there is nothing to restyle.
 */
function applyTopUnitMarkers(L: any) {
  const top = new Set(topUnitIds);
  for (const [id, marker] of markersById) {
    const meta = markerMetaById.get(id);
    if (!meta) continue;

    const wantsChip = top.has(id);
    const hasChip = chipMarkerIds.has(id);
    if (wantsChip !== hasChip) {
      marker.setIcon(
        wantsChip
          ? chipIconFor(L, meta.typeName)
          : unitPinIcon(L, meta.typeName, { enter: false }),
      );
      // setIcon hands back a fresh element, so the filter's hidden state on the
      // old one has to be re-applied.
      setMarkerHidden(marker, markerHiddenByList(id));
      if (wantsChip) chipMarkerIds.add(id);
      else chipMarkerIds.delete(id);
    }

    if (!wantsChip) continue;
    // Only ever lifted, never lowered: the offsets a drawn route hands out
    // (muted/active) are none of this function's business.
    marker.setZIndexOffset(TOP_MARKER_Z);
    fillChip(marker, id);
  }
}

/** Do two chip boxes need more room than they have? Anywhere but their centres. */
function chipBoxOf(
  centre: { x: number; y: number },
  size: { w: number; h: number },
  side: (typeof CHIP_SIDES)[number],
) {
  const gap = 8 + 5; // the chip's offset from its point + its tail
  const dx = side === "right" ? gap + size.w / 2 : side === "left" ? -gap - size.w / 2 : 0;
  const dy = side === "up" ? -gap - size.h / 2 : side === "down" ? gap + size.h / 2 : 0;
  return {
    left: centre.x + dx - size.w / 2,
    right: centre.x + dx + size.w / 2,
    top: centre.y + dy - size.h / 2,
    bottom: centre.y + dy + size.h / 2,
  };
}

function chipBoxesClash(
  a: { left: number; right: number; top: number; bottom: number },
  b: { left: number; right: number; top: number; bottom: number },
): boolean {
  return (
    a.left < b.right + CHIP_GAP &&
    a.right > b.left - CHIP_GAP &&
    a.top < b.bottom + CHIP_GAP &&
    a.bottom > b.top - CHIP_GAP
  );
}

/**
 * Hang each chip off whichever side of its own point keeps it clear of the
 * chips already placed, in list order. Chips are wide and their units sit
 * close together, so without this the top three would sit on each other.
 *
 * Run after every draw and after a zoom: zooming out pulls the units together
 * in pixel terms while the chips keep their size.
 */
function placeUnitChips() {
  if (!map || !topUnitIds.length) return;

  const placed: ReturnType<typeof chipBoxOf>[] = [];
  for (const id of topUnitIds) {
    const marker = markersById.get(id);
    const el = marker?.getElement?.();
    if (!marker || !el) continue;

    const chip = el.querySelector(".bb-unit-chip") as HTMLElement | null;
    if (!chip) continue;

    const centre = map.latLngToLayerPoint(marker.getLatLng());
    const size = { w: chip.offsetWidth, h: chip.offsetHeight };
    let chosen: (typeof CHIP_SIDES)[number] | null = null;
    let chosenBox = chipBoxOf(centre, size, CHIP_SIDES[0]);

    for (const side of CHIP_SIDES) {
      const box = chipBoxOf(centre, size, side);
      if (!placed.some((other) => chipBoxesClash(box, other))) {
        chosen = side;
        chosenBox = box;
        break;
      }
    }

    // Nowhere clear: the first side is as good as any.
    for (const side of CHIP_SIDES) {
      el.classList.toggle(`bb-unit-chip-wrap--${side}`, side === (chosen ?? CHIP_SIDES[0]));
    }
    placed.push(chosenBox);
  }
}

/**
 * Frame the user pin and the units the list leads with, inside the strip the
 * sheet leaves visible.
 *
 * The pins are the frame — deliberately not the routes they came with. A
 * route's envelope is a good deal wider (it follows the roads), so framing it
 * lands the map a couple of steps further out and the units end up small. A
 * route that reaches past the edge is fine: the list is about the units, and
 * the map can be panned to follow a line.
 */
function fitListUnitsInView(L: any) {
  if (!map) return;

  const points: [number, number][] = [];
  const lat = Number(userLocationStore.lat);
  const lng = Number(userLocationStore.long);
  if (lat && lng) points.push([lat, lng]);
  for (const id of topUnitIds) {
    const coords = markerMetaById.get(id)?.item?.emergencyData?.coordinates as
      | number[]
      | undefined;
    if (coords?.length) points.push([Number(coords[1]), Number(coords[0])]);
  }
  if (!points.length) return;

  map.invalidateSize({ animate: false });

  if (points.length === 1) {
    // Pin alone — nothing to bound, so fall back to the neighbourhood scale.
    map.setView(points[0], DEFAULT_ZOOM, {
      animate: true,
      duration: 0.45,
      easeLinearity: 0.2,
    });
    return;
  }

  map.fitBounds(L.latLngBounds(points).pad(-LIST_FIT_TIGHTEN), {
    paddingTopLeft: [LIST_FIT_LEFT, LIST_FIT_TOP],
    paddingBottomRight: [LIST_FIT_RIGHT, measureBottomSheetInset() + LIST_FIT_GAP],
    maxZoom: LIST_FIT_MAX_ZOOM,
    animate: true,
  });
}

/**
 * Run the re-frame a list change asked for, once CoreSheet has stopped sliding.
 * Anything that would move the map twice — a second filter tap mid-slide — just
 * replaces what is already pending.
 */
function tryListFit(L: any) {
  if (!listFitPending) return;
  if (!topUnitIds.length) {
    listFitPending = false;
    return;
  }

  const wait = listFitNotBefore - Date.now();
  if (wait > 0) {
    clearTimeout(listFitTimer);
    listFitTimer = setTimeout(() => tryListFit(L), wait);
    return;
  }

  listFitPending = false;
  fitListUnitsInView(L);
}

/** Ask for a re-frame; `settleMs` covers the sheet slide when the list opens. */
function requestListFit(L: any, settleMs: number) {
  listFitPending = true;
  listFitNotBefore = Date.now() + settleMs;
  tryListFit(L);
}

function setConnectorHidden(
  entry: { line: Polyline; dot: CircleMarker },
  hidden: boolean,
) {
  entry.line.getElement()?.classList.toggle("bb-matrix-line--hidden", hidden);
  entry.dot.getElement()?.classList.toggle("bb-matrix-dot--hidden", hidden);
}

function connectorCacheKey(id: string, lat: number, lng: number): string {
  return `${id}:${lat.toFixed(CONNECTOR_KEY_DECIMALS)}:${lng.toFixed(CONNECTOR_KEY_DECIMALS)}`;
}

function rememberConnectorRoute(key: string, route: ConnectorRoute) {
  connectorRoutes.set(key, route);
  while (connectorRoutes.size > CONNECTOR_CACHE_MAX) {
    const oldest = connectorRoutes.keys().next().value;
    if (oldest == null) break;
    connectorRoutes.delete(oldest);
  }
}

/** Drive route unit → pin. Same public OSRM service the selected route uses. */
async function fetchConnectorRoute(
  from: [number, number],
  to: [number, number],
): Promise<ConnectorRoute | null> {
  const url =
    `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};` +
    `${to[1]},${to[0]}?overview=full&geometries=geojson`;
  try {
    // Timed out rather than left hanging: a request that never settles would
    // stall both the loading pill and the re-frame that waits on it.
    const res = await fetch(url, { signal: AbortSignal.timeout(CONNECTOR_FETCH_TIMEOUT_MS) });
    const data = await res.json();
    const route = data?.routes?.[0];
    const coords = route?.geometry?.coordinates as [number, number][] | undefined;
    if (!coords?.length) return null;
    return {
      latlngs: coords.map((c) => [c[1]!, c[0]!] as [number, number]),
      durationSec: Number(route?.duration),
    };
  } catch {
    return null;
  }
}

/** A connector's tone, from its own drive time. */
function connectorColor(minutes: number | null): string {
  if (minutes == null) return MATRIX_LINE_COLOR;
  if (minutes >= CONNECTOR_FAR_MINUTES) return MATRIX_LINE_COLOR_FAR;
  if (minutes > CONNECTOR_MID_MINUTES) return MATRIX_LINE_COLOR_MID;
  return MATRIX_LINE_COLOR;
}

/**
 * Count connector fetches so the map can say it is still working, with enough
 * grace that a route arriving straight away never flashes a loader.
 */
function trackRouteLoad(delta: number) {
  routesInFlight = Math.max(0, routesInFlight + delta);

  if (routesInFlight > 0) {
    if (routeLoaderTimer !== undefined || showRouteLoader.value) return;
    routeLoaderTimer = setTimeout(() => {
      routeLoaderTimer = undefined;
      // The list may have closed while this was pending — nothing to load for.
      if (topUnitIds.length) showRouteLoader.value = true;
    }, ROUTE_LOADER_GRACE_MS);
    return;
  }

  clearTimeout(routeLoaderTimer);
  routeLoaderTimer = undefined;
  showRouteLoader.value = false;
  // Everything the list asked for has landed — let the markers say so.
  if (topUnitIds.length) popUnitMarkers();
}

/**
 * Reveal a connector by growing it out of the unit towards the user pin — the
 * same reading as the selected route drawing itself, and the reason the matrix
 * lines announce the direction they run in.
 *
 * Reserved for a freshly fetched route: a cached one is already known, and
 * replaying this on every filter change would be noise.
 */
function animateConnectorDraw(line: Polyline, latlngs: [number, number][]) {
  if (latlngs.length < 2) return;

  const DURATION_MS = 850;
  const started = performance.now();

  const step = (now: number) => {
    // Gone — a closed list, or a newer route replaced it.
    if (!map?.hasLayer(line)) return;

    const t = Math.min(1, (now - started) / DURATION_MS);
    const eased = 1 - (1 - t) ** 3;
    const upto = Math.max(2, Math.round(eased * latlngs.length));
    line.setLatLngs(latlngs.slice(0, upto));

    if (t < 1) requestAnimationFrame(step);
    else line.setLatLngs(latlngs);
  };

  line.setLatLngs(latlngs.slice(0, 1));
  requestAnimationFrame(step);
}

/** Draw or refresh one connector from road geometry the map now has. */
function drawConnector(L: any, id: string, route: ConnectorRoute, animate = false) {
  if (!map) return;

  const color = connectorColor(chipEtaMinutes(id));

  let entry = matrixLines.get(id);
  if (!entry) {
    const line = L.polyline(route.latlngs, {
      interactive: false,
      className: "bb-matrix-line",
      color,
      weight: MATRIX_LINE_WEIGHT,
      opacity: 1,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(map);
    // Keeps the stroke at one width while Leaflet scales its SVG through a
    // zoom; without it the line thickens mid-animation and snaps back at the end.
    line.getElement()?.setAttribute("vector-effect", "non-scaling-stroke");
    // End cap, drawn where the route leaves the unit — the far end is already
    // the user's own pin.
    const dot = L.circleMarker(route.latlngs[0]!, {
      className: "bb-matrix-dot",
      radius: MATRIX_DOT_RADIUS,
      color: "#ffffff",
      weight: MATRIX_DOT_RING,
      opacity: 1,
      fillColor: color,
      fillOpacity: 1,
      interactive: false,
    }).addTo(map);
    dot.getElement()?.setAttribute("vector-effect", "non-scaling-stroke");
    entry = { line, dot };
    matrixLines.set(id, entry);
    if (animate) animateConnectorDraw(line, route.latlngs);
  } else {
    entry.line.setLatLngs(route.latlngs);
    entry.line.setStyle({ color });
    entry.dot.setLatLng(route.latlngs[0]!);
    entry.dot.setStyle({ fillColor: color });
  }
  setConnectorHidden(entry, false);
}

/**
 * Fetch a connector's road geometry and draw it — unless the list reshuffled
 * or the pin moved while it was in flight, in which case that newer pass owns
 * the id and this result is only worth caching.
 */
async function loadConnector(
  L: any,
  id: string,
  key: string,
  from: [number, number],
  to: [number, number],
) {
  trackRouteLoad(1);
  try {
    const route = await fetchConnectorRoute(from, to);
    if (!route) return;
    rememberConnectorRoute(key, route);

    if (!topUnitIds.includes(id)) return;
    const pinLat = Number(userLocationStore.lat);
    const pinLng = Number(userLocationStore.long);
    if (connectorCacheKey(id, pinLat, pinLng) !== key) return;

    // Fresh geometry: this is the one draw that reveals itself.
    drawConnector(L, id, route, true);
    // A unit the matrix had no ETA for takes its drive time from here, so the
    // chip may still have text to gain.
    applyTopUnitMarkers(L);
    placeUnitChips();
  } finally {
    trackRouteLoad(-1);
  }
}

/**
 * Keep one labelled connector per leading list unit. Called whenever the list,
 * its data or the user pin changes: units that dropped out of the top few fade
 * out, the rest are re-routed in place, and the whole pool is dropped once the
 * list closes — its geometry is only meaningful while the list is open.
 */
function applyMatrixLines(L: any) {
  if (!map) return;

  if (!topUnitIds.length) {
    for (const entry of matrixLines.values()) {
      entry.line.remove();
      entry.dot.remove();
    }
    matrixLines.clear();
    return;
  }

  const keep = new Set(topUnitIds);
  for (const [id, entry] of matrixLines) {
    if (!keep.has(id)) setConnectorHidden(entry, true);
  }

  const userLat = Number(userLocationStore.lat);
  const userLng = Number(userLocationStore.long);
  if (!userLat || !userLng) return;

  for (const id of topUnitIds) {
    const meta = markerMetaById.get(id);
    const coords = meta?.item?.emergencyData?.coordinates as number[] | undefined;
    if (!coords?.length) continue;

    const from: [number, number] = [Number(coords[1]), Number(coords[0])];
    const key = connectorCacheKey(id, userLat, userLng);
    const cached = connectorRoutes.get(key);
    if (cached) {
      drawConnector(L, id, cached);
      continue;
    }
    void loadConnector(L, id, key, from, [userLat, userLng]);
  }

  // Last, so every chip placed this pass is clear of the others.
  placeUnitChips();
}

function applyMutedMarkers() {
  const selectedId =
    detailSheet.isOpen && detailSheet.detailSheetData?.emergency?.emergencyData?.id != null
      ? String(detailSheet.detailSheetData.emergency.emergencyData.id)
      : "";
  const muteOthers = Boolean(selectedId && routeIsDrawn());
  const usePin = mapAppearance.markers === "pin";

  for (const [id, marker] of markersById) {
    const muted = muteOthers && id !== selectedId;
    const el = marker.getElement?.() ?? (marker as any)._icon;
    if (usePin) {
      const pin = el?.querySelector?.(".bb-svc-pin") as HTMLElement | null;
      pin?.classList.toggle("bb-svc-pin--muted", muted);
    } else if (el) {
      el.classList.toggle("bb-marker--muted", muted);
    }
    if (id === selectedId) marker.setZIndexOffset(900);
    else marker.setZIndexOffset(muted ? -200 : 0);
  }
}

function buildServicePinIcon(
  L: any,
  typeName: string,
  opts: { enter?: boolean; delayMs?: number; active?: boolean; muted?: boolean },
) {
  const active = !!opts.active;
  return L.divIcon({
    className: "bb-svc-pin-wrap bb-unit-marker",
    html: emergencyPinIconHtml(typeName, {
      enter: opts.enter,
      delayMs: opts.delayMs,
      active,
      muted: !!opts.muted && !active,
    }),
    iconSize: active ? [48, 58] : [28, 34],
    iconAnchor: active ? [24, 56] : [14, 32],
    popupAnchor: active ? [0, -50] : [0, -28],
  });
}

function setActiveEmergencyMarker(L: any, nextId: string) {
  if (mapAppearance.markers !== "pin") {
    activeEmergencyId = nextId;
    return;
  }

  const prevId = activeEmergencyId;
  activeEmergencyId = nextId;
  const mutePrev = Boolean(nextId && routeIsDrawn());

  if (prevId && prevId !== nextId) {
    const prev = markersById.get(prevId);
    const meta = markerMetaById.get(prevId);
    if (prev && meta) {
      prev.setIcon(
        buildServicePinIcon(L, meta.typeName, { active: false, muted: mutePrev }),
      );
      prev.setZIndexOffset(mutePrev ? -200 : 0);
    }
  }

  if (!nextId) return;

  const marker = markersById.get(nextId);
  const meta = markerMetaById.get(nextId);
  if (!marker || !meta) return;

  // Force a fresh pop animation by swapping the icon DOM
  marker.setIcon(
    buildServicePinIcon(L, meta.typeName, { enter: true, active: true }),
  );
  marker.setZIndexOffset(900);

  const ll = marker.getLatLng();
  map?.panTo(ll, { animate: true });
}

function onMarkerClick(item: any) {
  openEmergencyDetail(item);
}

/** Draw polyline progressively (unit → user), smooth distance-based. */
function animateRouteDraw(
  L: any,
  latlngs: [number, number][],
  token: number,
  lineColor = ROUTE_LINE_COLOR,
): Promise<any> {
  return new Promise((resolve) => {
    if (!map || latlngs.length < 2) {
      resolve(null);
      return;
    }

    const cum: number[] = [0];
    let pathLen = 0;
    for (let i = 1; i < latlngs.length; i++) {
      const a = latlngs[i - 1]!;
      const b = latlngs[i]!;
      pathLen += Math.hypot(b[0] - a[0], b[1] - a[1]);
      cum.push(pathLen);
    }
    if (pathLen <= 0) {
      pathLen = 1;
    }

    const shared = {
      interactive: false,
      lineCap: "round" as const,
      lineJoin: "round" as const,
      smoothFactor: 1.2,
    };

    const casing = L.polyline([latlngs[0]!], {
      ...shared,
      color: routeLineCasingColor(lineColor),
      weight: ROUTE_LINE_CASING_WEIGHT,
      opacity: 0.32,
      className: "bb-route-casing",
    }).addTo(map);

    const line = L.polyline([latlngs[0]!], {
      ...shared,
      color: lineColor,
      weight: ROUTE_LINE_WEIGHT,
      opacity: 1,
      className: "bb-route-line",
    }).addTo(map);

    routeCasing = casing;
    routeLine = line;

    // Slightly snappier than before; still readable on long routes
    const durationMs = Math.min(2000, Math.max(1050, 900 + pathLen * 4200));
    const started = performance.now();

    const easeInOutCubic = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

    const sampleAt = (dist: number): [number, number][] => {
      if (dist <= 0) return [latlngs[0]!];
      if (dist >= pathLen) return latlngs.slice();

      let i = 1;
      while (i < cum.length && cum[i]! < dist) i++;
      const i1 = Math.max(1, i);
      const i0 = i1 - 1;
      const d0 = cum[i0]!;
      const d1 = cum[i1]!;
      const seg = Math.max(1e-9, d1 - d0);
      const u = (dist - d0) / seg;
      const a = latlngs[i0]!;
      const b = latlngs[i1]!;
      const tip: [number, number] = [
        a[0] + (b[0] - a[0]) * u,
        a[1] + (b[1] - a[1]) * u,
      ];
      return latlngs.slice(0, i1).concat([tip]);
    };

    const tick = (now: number) => {
      if (token !== routeRenderToken) {
        resolve(line);
        return;
      }
      const t = Math.min(1, (now - started) / durationMs);
      const eased = easeInOutCubic(t);
      const pts = sampleAt(eased * pathLen);
      casing.setLatLngs(pts);
      line.setLatLngs(pts);
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        casing.setLatLngs(latlngs);
        line.setLatLngs(latlngs);
        resolve(line);
      }
    };
    requestAnimationFrame(tick);
  });
}

function applyZoomOverlayState(zoom: number) {
  const el = mapContainer.value;
  if (!el) return;
  el.classList.toggle("bb-map--zoomed-out", zoom < ROUTE_OVERLAY_MIN_ZOOM);
}

function clearRouteOverlays() {
  if (routeLine) {
    routeLine.remove();
    routeLine = null;
  }
  if (routeCasing) {
    routeCasing.remove();
    routeCasing = null;
  }
  if (routeEtaMarker) {
    routeEtaMarker.remove();
    routeEtaMarker = null;
  }
  leafletStore.setRouteTravel(null);
}

function formatRouteDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  const totalMin = Math.max(1, Math.round(seconds / 60));
  if (totalMin < 60) return `${totalMin} mnt`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h} jam ${m} mnt` : `${h} jam`;
}

/** Pick a route point away from unit (start) and reporter (end) markers. */
function pickRouteBubbleAnchor(latlngs: [number, number][]): [number, number] {
  const n = latlngs.length;
  if (n < 2) return latlngs[0]!;
  if (n === 2) {
    // Midpoint of straight segment
    const a = latlngs[0]!;
    const b = latlngs[1]!;
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  }

  const cum: number[] = [0];
  let pathLen = 0;
  for (let i = 1; i < n; i++) {
    const a = latlngs[i - 1]!;
    const b = latlngs[i]!;
    pathLen += Math.hypot(b[0] - a[0], b[1] - a[1]);
    cum.push(pathLen);
  }
  if (pathLen <= 0) return latlngs[Math.floor(n / 2)]!;

  const pointAt = (dist: number): [number, number] => {
    const target = Math.min(pathLen, Math.max(0, dist));
    let i = 1;
    while (i < cum.length && cum[i]! < target) i++;
    const i1 = Math.max(1, Math.min(i, cum.length - 1));
    const i0 = i1 - 1;
    const d0 = cum[i0]!;
    const d1 = cum[i1]!;
    const u = (target - d0) / Math.max(1e-9, d1 - d0);
    const a = latlngs[i0]!;
    const b = latlngs[i1]!;
    return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
  };

  // Prefer middle band of the route (avoid marker ends)
  const lo = pathLen * 0.38;
  const hi = pathLen * 0.62;
  const samples = 9;
  let best = pointAt(pathLen * 0.5);
  let bestScore = -1;

  const start = latlngs[0]!;
  const end = latlngs[n - 1]!;

  const pxDist = (p: [number, number], q: [number, number]) => {
    if (!map) return Math.hypot(p[0] - q[0], p[1] - q[1]);
    const a = map.latLngToLayerPoint(p as any);
    const b = map.latLngToLayerPoint(q as any);
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  for (let s = 0; s < samples; s++) {
    const t = samples === 1 ? 0.5 : s / (samples - 1);
    const dist = lo + (hi - lo) * t;
    const p = pointAt(dist);
    const dStart = pxDist(p, start);
    const dEnd = pxDist(p, end);
    // Maximize clearance from the nearer marker; slight preference for true mid
    const midBias = 1 - Math.abs(t - 0.5) * 0.15;
    const score = Math.min(dStart, dEnd) * midBias;
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }

  // If still too close to an end (short route), nudge toward path middle
  const minClearPx = 56;
  if (bestScore >= 0 && bestScore < minClearPx) {
    best = pointAt(pathLen * 0.5);
  }

  return best;
}

function showRouteEtaBubble(
  L: any,
  latlngs: [number, number][],
  opts: { durationSec?: number; distanceM?: number },
) {
  if (!map || latlngs.length < 2) return;

  const anchor = pickRouteBubbleAnchor(latlngs);
  const timeLabel = formatRouteDuration(opts.durationSec ?? NaN);
  const distLabel =
    opts.distanceM != null && Number.isFinite(opts.distanceM)
      ? formatDistance(opts.distanceM)
      : "—";
  const advice = routeAdviceFromTravel(opts);
  const valueHtml = `${timeLabel}<span class="bb-route-bubble__sep">·</span>${distLabel}`;

  // Reposition only — never remount (avoids double pop animation).
  if (routeEtaMarker) {
    routeEtaMarker.setLatLng(anchor);
    const root = routeEtaMarker.getElement();
    const valueEl = root?.querySelector(".bb-route-bubble__value");
    const hintEl = root?.querySelector(".bb-route-bubble__hint");
    if (valueEl) valueEl.innerHTML = valueHtml;
    if (hintEl) {
      hintEl.textContent = advice.hint;
      hintEl.setAttribute("data-level", advice.level);
    }
    return;
  }

  const icon = L.divIcon({
    className: "bb-route-bubble-wrap",
    html: `<div class="bb-route-bubble" aria-label="Estimasi rute">
      <div class="bb-route-bubble__card">
        <p class="bb-route-bubble__label">Estimasi</p>
        <p class="bb-route-bubble__value">${valueHtml}</p>
        <p class="bb-route-bubble__hint" data-level="${advice.level}">${advice.hint}</p>
      </div>
      <span class="bb-route-bubble__tail" aria-hidden="true"></span>
    </div>`,
    // Size covers card + hint + triangle; tip sits on the route polyline.
    iconSize: [176, 78],
    iconAnchor: [88, 78],
  });

  routeEtaMarker = L.marker(anchor, {
    icon,
    interactive: false,
    keyboard: false,
    zIndexOffset: 700,
  }).addTo(map);
}

/** Padding so route fits in the visible map above the bottom sheet.
 * Leaflet Point arrays are [x, y] → [horizontal, vertical].
 */
function measureBottomSheetInset(): number {
  if (typeof document === "undefined") return 280;
  // CoreSheet panels are teleported to body. A draggable sheet is always laid
  // out at its tallest snap and moved down with a transform, so offsetHeight
  // reports that full height even when most of it sits below the fold —
  // measure from the panel's top edge instead, which is what actually covers
  // the map.
  const panels = document.querySelectorAll(".ui-sheet-panel");
  let tallest = 0;
  panels.forEach((el) => {
    const top = (el as HTMLElement).getBoundingClientRect().top;
    const visible = window.innerHeight - top;
    if (visible > tallest) tallest = visible;
  });
  tallest = Math.min(tallest, window.innerHeight);
  if (tallest > 80) return tallest;

  // Fallback estimates when sheet DOM not ready yet
  let bottom = Math.round(window.innerHeight * 0.22);
  bottom = Math.max(168, Math.min(240, bottom));
  if (detailSheet.isOpen || exploreSheet.isOpen) {
    bottom = Math.max(bottom, Math.round(window.innerHeight * 0.38));
  }
  return bottom;
}

function routeFitOptions() {
  const side = 16;
  const top = 28;
  // Clear the sheet, plus a little breathing room under the markers.
  const bottom = measureBottomSheetInset() + 14;
  return {
    paddingTopLeft: [side, top] as [number, number],
    paddingBottomRight: [side, bottom] as [number, number],
    maxZoom: 16,
    animate: true,
  };
}

function fitRouteInView(L: any, latlngs: [number, number][]) {
  if (!map || latlngs.length < 2) return;
  map.invalidateSize({ animate: false });
  map.fitBounds(L.latLngBounds(latlngs), routeFitOptions());
}

/** Fit route in view once, then nudge once more after sheet layout settles. */
function fitRouteInViewSoon(L: any, latlngs: [number, number][]) {
  fitRouteInView(L, latlngs);
  window.setTimeout(() => fitRouteInView(L, latlngs), 220);
}

async function renderRoute(L: any, endPoint: { lat: number; lng: number }) {
  if (!map) return;

  clearRouteOverlays();

  const token = ++routeRenderToken;
  toast.loading("Mencari rute...");

  const userLat = userLocationStore.lat;
  const userLng = userLocationStore.long;

  if (!userLat || !userLng) {
    map.setView([endPoint.lat, endPoint.lng], 14);
    toast.dismiss();
    return;
  }

  // Route from emergency unit → user (response direction)
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${endPoint.lng},${endPoint.lat};${userLng},${userLat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    const route = data?.routes?.[0];
    const coords = route?.geometry?.coordinates as [number, number][] | undefined;

    if (token !== routeRenderToken) {
      toast.dismiss();
      return;
    }

    if (coords?.length) {
      const latlngs = coords.map((c) => [c[1], c[0]] as [number, number]);
      const etaOpts = {
        durationSec: Number(route?.duration),
        distanceM: Number(route?.distance),
      };
      const color = routeLineColorFromTravel(etaOpts);

      await animateRouteDraw(L, latlngs, token, color);
      if (token !== routeRenderToken) {
        toast.dismiss();
        return;
      }

      leafletStore.setRouteTravel(etaOpts);
      showRouteEtaBubble(L, latlngs, etaOpts);
      // Single fit after route + ETA bubble are ready — no pre-draw fit to avoid double pan.
      fitRouteInViewSoon(L, latlngs);
      toast.dismiss();
      return;
    }
  } catch {
    if (token !== routeRenderToken) {
      toast.dismiss();
      return;
    }
  }

  const fallback: [number, number][] = [
    [endPoint.lat, endPoint.lng],
    [userLat, userLng],
  ];
  // Rough straight-line estimate when OSRM fails
  const dlat = (userLat - endPoint.lat) * 111_000;
  const dlng =
    (userLng - endPoint.lng) * 111_000 * Math.cos((userLat * Math.PI) / 180);
  const approxM = Math.hypot(dlat, dlng);
  const approxSec = (approxM / 1000 / 30) * 3600; // ~30 km/h urban guess

  const etaOpts = {
    durationSec: approxSec,
    distanceM: approxM,
  };
  const color = routeLineColorFromTravel(etaOpts);

  await animateRouteDraw(L, fallback, token, color);
  if (token !== routeRenderToken) {
    toast.dismiss();
    return;
  }

  leafletStore.setRouteTravel(etaOpts);
  showRouteEtaBubble(L, fallback, etaOpts);
  fitRouteInViewSoon(L, fallback);
  window.setTimeout(() => {
    if (token !== routeRenderToken) return;
    showRouteEtaBubble(L, fallback, etaOpts);
  }, 320);
  toast.dismiss();
}
</script>

<template>
  <div class="relative w-full h-full">
    <!-- Leaflet owns this element; overlays go beside it, never inside. -->
    <div ref="mapContainer" class="w-full h-full" />
    <div v-if="showRouteLoader" class="bb-map-loader" role="status" aria-live="polite">
      <span class="bb-map-loader__spin" aria-hidden="true" />
      Menghitung rute…
    </div>
  </div>
</template>
