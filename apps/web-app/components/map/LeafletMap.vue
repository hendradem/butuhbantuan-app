<script setup lang="ts">
import type { CircleMarker, Map as LeafletMap, Marker, Polyline } from "leaflet";
import { appToast } from "~/utils/appToast";
import { formatDistance } from "~/utils/geo";
import { displayEtaMinutes } from "~/utils/rankUnits";
import {
  ROUTE_LINE_COLOR_FAR,
  ROUTE_LINE_COLOR_MID,
  ROUTE_LINE_COLOR_NEAR,
  routeAdviceFromTravel,
} from "~/utils/routeAdvice";
import {
  classicMarkerClass,
  effectiveTileStyle,
  emergencyPinIconHtml,
  pinMarkerModifier,
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
/**
 * id → the stand-in standing at the edge for an off-screen unit, with the tone
 * and bearing it was last drawn at. Panning moves these dots without changing
 * either, so holding them here keeps the per-frame pass down to the positions.
 */
type EdgeEntry = {
  marker: Marker;
  tone: string;
  angle: number;
  offset: number;
  label: string;
};
const edgeMarkers = new Map<string, EdgeEntry>();
/** Coalesces the edge pass to one run per frame while the map moves. */
let edgeUpdateFrame: number | null = null;
/** Leader routes still drawing — the arrival flourish waits for all of them. */
const pendingArrivals = new Set<string>();
/**
 * Per-unit draw generation. A route redrawn mid-reveal (the pin moved, a newer
 * fetch landed) invalidates the reveal in flight, so it can't finish by writing
 * the geometry it started with over the one that replaced it.
 */
const drawTokens = new Map<string, number>();
/** Id the selected route uses in that map — it isn't one of the list's units. */
const SELECTED_ROUTE_ID = "selected-route";
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
let routeDot: CircleMarker | null = null;
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
/**
 * Off-screen units get a stand-in on the edge of the visible strip: a dot in
 * the unit's tone with a chevron pointing the way it went. Tapping it brings
 * the real marker back into view.
 */
const EDGE_KEEP_CLEAR_PX = 28;
/** How far a stand-in is nudged along the rim looking for a free slot. */
const EDGE_SPREAD_PX = 8;
const EDGE_SPREAD_STEPS = 40;
/**
 * The shape a stand-in takes: the same icon-and-ETA a leading unit's chip
 * carries, sized here without the name. Only the units the list leads with get
 * one — a dot for every other unit out of frame was more clutter than it was
 * worth, and the list below already accounts for them.
 */
const EDGE_CHIP = { half: { w: 40, h: 16 }, chevronGap: 7 };
/**
 * How far a unit's own marker reaches from its anchor. A stand-in is only for a
 * unit the map cannot show at all: the moment any of the marker — or the chip
 * hanging over it — crosses the rim, the real thing is the better answer, and
 * keeping both is what made them overlap.
 */
const MARKER_REACH = {
  chip: { left: 40, right: 40, up: 54, down: 4 },
  pin: { left: 16, right: 16, up: 36, down: 4 },
};
/** Above pins and route lines, under the chip of the unit in focus. */
const EDGE_MARKER_Z = 700;
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
    // Leaflet's own default — and on a phone the difference is the whole drag:
    // tiles only refresh once the pan settles, instead of a grid rebuild on
    // every frame of it. `keepBuffer: 8` means the tiles already on screen
    // cover a long drag, and the service worker answers the rest from cache,
    // so the strip that appears at the end fills immediately.
    updateWhenIdle: true,
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
      updateWhenIdle: true,
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

  // Keep the stand-ins for off-screen units on the edge of what is visible.
  // `move` alone would miss a zoom, `zoom` alone would miss a pan.
  map!.on("move zoom resize", () => {
    scheduleEdgeUpdate(L);
  });

  // A pan can leave a chip hanging over the rim; picking its side again is
  // cheap, and only worth doing once the view has settled.
  map!.on("moveend", () => {
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
      scheduleEdgeUpdate(L);
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

      applyUnitChips(L);
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

  // Card/list or map select → that unit becomes the only marker in play
  watch(
    () =>
      [
        detailSheet.isOpen,
        detailSheet.detailSheetData?.emergency?.emergencyData?.id,
      ] as const,
    ([open, id]) => {
      const nextId = open && id != null ? String(id) : "";
      focusEmergencyMarker(nextId);
      applyUnitChips(L);
      applyMarkerListFilter();
      scheduleEdgeUpdate(L);
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
  edgeMarkers.clear();
  pendingArrivals.clear();
  if (edgeUpdateFrame !== null) cancelAnimationFrame(edgeUpdateFrame);
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

/**
 * Force the standard neighbourhood view after locate / map click / pin drag.
 * A moved location always gets the standard scale back — the old "keep whatever
 * zoom you were at if it was close enough" left the map looking untouched after
 * a tap or a drag, which reads as the change not having taken.
 */
function resetToDefaultView(L: any, lat: number, lng: number) {
  if (!map) return;

  // Already there: panning is the whole job, and it saves a zoom animation.
  if (map.getZoom() === DEFAULT_ZOOM) {
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
 * - Emergencies near the pin → the standard scale, whatever the map was at
 * - None nearby but some farther → zoom out just enough so markers are visible
 * - No emergency data at all → the standard scale, centered on the pin
 */
function frameLocationOverview(L: any, lat: number, lng: number) {
  if (!map) return;
  locationOverviewFramed = true;

  const nearby = nearbyEmergencyPoints(lat, lng);
  if (nearby.length > 0) {
    map.setView([lat, lng], DEFAULT_ZOOM, { animate: true });
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
      // The drawn route still points at where the pin used to be: drop it, and
      // draw the new one for whatever unit is still selected.
      refreshRouteForPin(L);
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
  opts: { enter?: boolean; delayMs?: number } = {},
) {
  if (mapAppearance.markers === "pin") {
    return buildServicePinIcon(L, typeName, opts);
  }
  return L.divIcon({
    className: `${classicMarkerClass(typeName)} bb-unit-marker`,
    iconSize: [25, 25],
    iconAnchor: [12, 12],
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

  // Every unit starts as a plain pin: whichever of them are leading the list —
  // or is the unit the detail sheet has open — get their chip from
  // applyUnitChips, which is the only thing that decides a marker's look.
  let pinIndex = 0;

  data.forEach((item: any) => {
    const e = item.emergencyData;
    if (!e?.coordinates) return;

    const id = String(e.id ?? "");
    const typeName = e.emergency_type?.name || "";

    const icon = unitPinIcon(L, typeName, {
      enter: true,
      delayMs: Math.min(pinIndex * 45, 360),
    });

    pinIndex += 1;

    const marker = L.marker([+e.coordinates[1], +e.coordinates[0]], { icon })
      .addTo(map!)
      .on("click", (ev: any) => {
        L.DomEvent.stopPropagation(ev);
        onMarkerClick(item);
      });

    markers.push(marker);
    if (id) {
      markersById.set(id, marker);
      markerMetaById.set(id, { typeName, item });
      setMarkerHidden(marker, markerHidden(id));
    }
  });

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
  applyUnitChips(L);
  applyMatrixLines(L);
  placeUnitChips();
  scheduleEdgeUpdate(L);
}

/** The unit the detail sheet has open, if any. */
function openDetailUnitId(): string {
  const id = detailSheet.detailSheetData?.emergency?.emergencyData?.id;
  return detailSheet.isOpen && id != null ? String(id) : "";
}

/**
 * True when the map should not show this unit. The detail view is about a
 * single unit and its route, so everything else steps aside; without one open,
 * it is the explore list that decides. Units without an id can't be matched
 * against either, so they stay visible.
 */
function markerHidden(id: string): boolean {
  if (!id) return false;

  const focused = openDetailUnitId();
  if (focused) return id !== focused;

  return visibleUnitIdSet !== null && !visibleUnitIdSet.has(id);
}

function setMarkerHidden(marker: Marker, hidden: boolean) {
  marker.getElement()?.classList.toggle("bb-map-marker--hidden", hidden);
}

function applyMarkerListFilter() {
  for (const [id, marker] of markersById) {
    setMarkerHidden(marker, markerHidden(id));
  }
}

/**
 * Replay a marker animation on a set of units. Removing the class, forcing one
 * reflow, then adding it back is the only way CSS offers to replay an
 * animation that is already sitting on the element.
 */
function replayMarkerAnimation(ids: Iterable<string>, className: string) {
  const els: HTMLElement[] = [];
  for (const id of ids) {
    const el = markersById.get(id)?.getElement?.();
    if (el) els.push(el as HTMLElement);
  }
  if (!els.length) return;

  for (const el of els) el.classList.remove(className);
  // One reflow for the whole batch: without it the browser coalesces the
  // remove and the add, and an animation that never left can't restart.
  void els[0]!.offsetWidth;
  for (const el of els) el.classList.add(className);
}

/**
 * Swell every unit marker once — the map's answer to a filter change, or to the
 * connectors finishing their fetch. Without it those two moments rearrange
 * things silently behind the sheet.
 */
function popUnitMarkers() {
  replayMarkerAnimation(markersById.keys(), "bb-unit-pop");
}

/**
 * The leader routes have reached the pin: let the units that drew them land,
 * the way Apple Maps settles a route under its markers. Held back until the
 * last of the three arrives, so they land together rather than in sequence.
 */
function celebrateArrival() {
  if (!topUnitIds.length) return;
  replayMarkerAnimation(topUnitIds, "bb-unit-arrive");
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
    const label = etaLabelFor(minutes);
    if (eta.textContent !== label) eta.textContent = label;
    eta.style.color = connectorColor(minutes);
  }
}

/** Units that wear a chip: the list's leaders, plus the unit a detail sheet
 *  has open — the marker the detail view is actually about. */
function chipWantedIds(): Set<string> {
  const ids = new Set(topUnitIds);
  const focused = openDetailUnitId();
  if (focused) ids.add(focused);
  return ids;
}

/**
 * Give every unit the marker its role calls for. Leading units, and the one the
 * detail sheet has open, wear a chip — icon, name and ETA on the marker itself
 * — instead of a pin with badges scattered around the map.
 *
 * The icon is swapped rather than a class toggled: a chip and a pin are
 * different shapes, not different sizes, so there is nothing to restyle.
 */
function applyUnitChips(L: any) {
  const wanted = chipWantedIds();
  const focused = openDetailUnitId();

  for (const [id, marker] of markersById) {
    const meta = markerMetaById.get(id);
    if (!meta) continue;

    const wantsChip = wanted.has(id);
    const hasChip = chipMarkerIds.has(id);
    if (wantsChip !== hasChip) {
      marker.setIcon(
        wantsChip
          ? chipIconFor(L, meta.typeName)
          : unitPinIcon(L, meta.typeName, { enter: false }),
      );
      // setIcon hands back a fresh element, so the filter's hidden state on the
      // old one has to be re-applied.
      setMarkerHidden(marker, markerHidden(id));
      if (wantsChip) chipMarkerIds.add(id);
      else chipMarkerIds.delete(id);
    }

    if (wantsChip) {
      marker.setZIndexOffset(id === focused ? 900 : TOP_MARKER_Z);
      fillChip(marker, id);
    }
  }
}

/**
 * Bring the unit the detail sheet opened into view. Its marker is applyUnitChips'
 * business — including the one it replaced, whose chip goes back to a pin.
 */
function focusEmergencyMarker(nextId: string) {
  if (!nextId) return;
  const marker = markersById.get(nextId);
  if (marker) map?.panTo(marker.getLatLng(), { animate: true });
}

/**
 * Units that get a stand-in when the map cannot show them: the ones the list
 * leads with, or the single unit a detail sheet has open. Not every unit out
 * of frame — a rim full of indicators was more noise than information, and the
 * list underneath already accounts for the rest.
 */
function trackedUnitIds(): string[] {
  const focused = openDetailUnitId();
  if (focused) return topUnitIds.includes(focused) ? topUnitIds : [focused];
  return topUnitIds;
}

/**
 * The part of the map a stand-in may sit in: the container minus whatever the
 * sheet covers, in Leaflet's own container point space — the space
 * latLngToContainerPoint speaks. Callers inset it by what they need.
 */
function visibleStrip() {
  if (!map) return null;
  const size = map.getSize();
  const left = 0;
  const top = 0;
  const right = size.x;
  const bottom = Math.max(1, size.y - measureBottomSheetInset());
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

/** Bring an off-screen unit's marker into the visible strip. */
function panToUnit(id: string) {
  if (!map) return;
  const marker = markersById.get(id);
  const strip = visibleStrip();
  if (!marker || !strip) return;

  // Pan so the unit lands in the middle of the strip, not the middle of the
  // container — the sheet covers half of that.
  const size = map.getSize();
  const point = map.latLngToContainerPoint(marker.getLatLng());
  const offset = {
    x: size.x / 2 - (strip.left + strip.width / 2),
    y: size.y / 2 - (strip.top + strip.height / 2),
  };
  map.panTo(map.containerPointToLatLng([point.x + offset.x, point.y + offset.y]));
}

/**
 * Nearest free run on one rim axis: the spot the unit itself points at, else
 * the closest one either side of it. Walking out in steps rather than shifting
 * by a fixed guess is what keeps two stand-ins from simply touching — a chip
 * is ~80px wide, wider than any single nudge would have cleared.
 */
function rimSlot(
  target: number,
  half: number,
  min: number,
  max: number,
  taken: { lo: number; hi: number }[],
): number {
  const fits = (centre: number) => {
    if (centre - half < min || centre + half > max) return false;
    return !taken.some((t) => centre + half > t.lo - CHIP_GAP && centre - half < t.hi + CHIP_GAP);
  };

  if (fits(target)) return target;
  for (let step = 1; step <= EDGE_SPREAD_STEPS; step++) {
    const out = step * EDGE_SPREAD_PX;
    if (fits(target + out)) return target + out;
    if (fits(target - out)) return target - out;
  }
  return target;
}

/** The unit's service type, for a stand-in chip's icon well. */
function unitTypeName(id: string): string {
  return markerMetaById.get(id)?.typeName || "";
}

/** ETA copy, shared with the chip a unit wears when it is on screen. */
function etaLabelFor(minutes: number | null): string {
  return minutes == null ? "" : `${minutes} min`;
}

/**
 * Stand-in icon: the same icon-and-ETA the unit's own chip carries, minus the
 * name — that lives in the card right below it, so repeating it at the rim
 * would be the only thing making the rim busy.
 */
function edgeIconFor(
  L: any,
  opts: { typeName: string; tone: string; label: string; angle: number; offset: number },
) {
  // Built with its bearing already applied, so the first paint is correct.
  const chevron = `color:${opts.tone};transform:rotate(${opts.angle}deg) translateX(${opts.offset}px)`;
  const chip =
    `<span class="bb-unit-edge-chip bb-svc-pin--${pinMarkerModifier(opts.typeName)}">` +
    `<span class="bb-unit-chip__icon bb-svc-pin__head"><span class="bb-svc-pin__icon bb-unit-chip__glyph"></span></span>` +
    `<span class="bb-unit-edge-chip__eta" style="color:${opts.tone}">${opts.label}</span></span>`;
  return L.divIcon({
    className: "bb-unit-edge-wrap",
    html: `<span class="bb-unit-edge"><span class="bb-unit-edge__chevron" style="${chevron}"></span>${chip}</span>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

/** Drop every stand-in — the list closed, or nothing is off-screen any more. */
function clearEdgeMarkers() {
  for (const entry of edgeMarkers.values()) entry.marker.remove();
  edgeMarkers.clear();
}

/**
 * Park a dot on the edge of the visible strip for every unit that is not on
 * screen, pointing the way it is. The map stops being a dead end: a clipped
 * unit is still accounted for, and tapping its stand-in fetches it back.
 *
 * Runs as the map moves (once a frame), so the stand-ins slide along the edge
 * rather than jumping when the pan ends.
 */
function updateEdgeIndicators(L: any) {
  if (!map) return;

  const wanted = new Set(trackedUnitIds().filter((id) => markersById.has(id)));
  if (!wanted.size) {
    clearEdgeMarkers();
    return;
  }

  // Measured only once there is something to place: reading the sheet's layout
  // on every frame of a pan — which is what this used to do, list or no list —
  // forces a style flush per frame for nothing.
  const strip = visibleStrip();
  if (!strip) {
    clearEdgeMarkers();
    return;
  }

  for (const [id, entry] of edgeMarkers) {
    if (wanted.has(id)) continue;
    entry.marker.remove();
    edgeMarkers.delete(id);
  }

  const centre = {
    x: strip.left + strip.width / 2,
    y: strip.top + strip.height / 2,
  };
  // What is already parked on each rim: the packer works one axis at a time,
  // which is all a rim is.
  const taken = { horizontal: [] as { lo: number; hi: number }[], vertical: [] as { lo: number; hi: number }[] };

  for (const id of wanted) {
    const target = markersById.get(id);
    const point = target ? map.latLngToContainerPoint(target.getLatLng()) : null;
    if (!point) continue;

    const dx = point.x - centre.x;
    const dy = point.y - centre.y;
    const bearing = Math.hypot(dx, dy) || 1;

    const shape = EDGE_CHIP;
    // How far the chip reaches along this bearing — one seen edge-on needs less
    // room than one seen flat.
    const reach =
      (Math.abs(dx) / bearing) * shape.half.w + (Math.abs(dy) / bearing) * shape.half.h;
    // Clear of the rim by enough that the chip *and* the chevron outside it
    // stay fully on screen.
    const pad = Math.max(EDGE_KEEP_CLEAR_PX, reach + shape.chevronGap + 6);

    // Any sliver of the real marker showing (a chip hangs above its anchor, a
    // pin sits on it) means the stand-in has nothing left to say.
    const body = chipMarkerIds.has(id) ? MARKER_REACH.chip : MARKER_REACH.pin;
    const peeking =
      point.x + body.right > strip.left + 2 &&
      point.x - body.left < strip.right - 2 &&
      point.y - body.up < strip.bottom - 2 &&
      point.y + body.down > strip.top + 2;

    const existing = edgeMarkers.get(id);
    if (peeking) {
      if (existing) {
        existing.marker.remove();
        edgeMarkers.delete(id);
      }
      continue;
    }

    // Clamp onto that padded box, along the ray from the middle of the strip.
    const tx =
      dx > 0
        ? (strip.right - pad - centre.x) / dx
        : dx < 0
          ? (strip.left + pad - centre.x) / dx
          : Infinity;
    const ty =
      dy > 0
        ? (strip.bottom - pad - centre.y) / dy
        : dy < 0
          ? (strip.top + pad - centre.y) / dy
          : Infinity;
    const t = Math.min(tx, ty);
    if (!Number.isFinite(t) || t <= 0) continue;

    const spot = { x: centre.x + dx * t, y: centre.y + dy * t };

    // Two units pointing the same way land on the same spot: give this one the
    // nearest free run along whichever rim it hit.
    if (ty <= tx) {
      spot.x = rimSlot(spot.x, shape.half.w, strip.left + pad, strip.right - pad, taken.horizontal);
      taken.horizontal.push({ lo: spot.x - shape.half.w, hi: spot.x + shape.half.w });
    } else {
      spot.y = rimSlot(spot.y, shape.half.h, strip.top + pad, strip.bottom - pad, taken.vertical);
      taken.vertical.push({ lo: spot.y - shape.half.h, hi: spot.y + shape.half.h });
    }

    const edge = map.containerPointToLatLng([spot.x, spot.y]);
    const minutes = chipEtaMinutes(id);
    const tone = connectorColor(minutes);
    const angle = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
    const label = etaLabelFor(minutes);
    const offset = reach + shape.chevronGap;

    let entry = existing;
    if (!entry) {
      const marker = (L.marker(edge, { zIndexOffset: EDGE_MARKER_Z, keyboard: false })
        .addTo(map)
        .on("click", (ev: any) => {
          L.DomEvent.stopPropagation(ev);
          panToUnit(id);
        }) as Marker);
      marker.setIcon(
        edgeIconFor(L, { typeName: unitTypeName(id), tone, label, angle, offset }),
      );
      // A fresh icon already carries this state, so nothing is written twice.
      entry = { marker, tone, angle, offset, label };
      edgeMarkers.set(id, entry);
      continue;
    }

    entry.marker.setLatLng(edge);

    // Panning shifts these stand-ins without changing tone or bearing, so only
    // the writes that actually differ happen — a pan costs one position.
    const stale =
      entry.tone !== tone ||
      entry.label !== label ||
      entry.angle !== angle ||
      entry.offset !== offset;
    if (stale) {
      const root = entry.marker.getElement();
      const chevron = root?.querySelector(".bb-unit-edge__chevron") as HTMLElement | null;
      const eta = root?.querySelector(".bb-unit-edge-chip__eta") as HTMLElement | null;

      if (eta) {
        if (entry.tone !== tone) eta.style.color = tone;
        if (entry.label !== label) eta.textContent = label;
      }
      if (chevron) {
        if (entry.tone !== tone) chevron.style.color = tone;
        if (entry.angle !== angle || entry.offset !== offset) {
          chevron.style.transform = `rotate(${angle}deg) translateX(${offset}px)`;
        }
      }
      entry.tone = tone;
      entry.label = label;
      entry.angle = angle;
      entry.offset = offset;
    }
  }
}

function scheduleEdgeUpdate(L: any) {
  if (edgeUpdateFrame !== null) return;
  edgeUpdateFrame = requestAnimationFrame(() => {
    edgeUpdateFrame = null;
    updateEdgeIndicators(L);
  });
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

/** Would this chip sit wholly inside the strip, clear of its rim? */
function boxInsideStrip(
  box: { left: number; right: number; top: number; bottom: number },
  strip: { left: number; right: number; top: number; bottom: number },
): boolean {
  const margin = 6;
  return (
    box.left >= strip.left + margin &&
    box.right <= strip.right - margin &&
    box.top >= strip.top + margin &&
    box.bottom <= strip.bottom - margin
  );
}

/**
 * Hang each chip off whichever side of its own point keeps it clear of the
 * chips already placed, in list order. Chips are wide and their units sit
 * close together, so without this the top three would sit on each other.
 *
 * On-screen comes first: a chip whose default side would run past the rim takes
 * another side instead of being clipped. Run after every draw, after a zoom
 * (which pulls the units together in pixel terms while the chips keep their
 * size) and after a pan.
 */
function placeUnitChips() {
  if (!map || !topUnitIds.length) return;

  const strip = visibleStrip();
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
      if (placed.some((other) => chipBoxesClash(box, other))) continue;
      if (strip && !boxInsideStrip(box, strip)) continue;
      chosen = side;
      chosenBox = box;
      break;
    }

    // Nowhere clear and wholly on screen: take the first side that at least
    // avoids the other chips.
    if (!chosen) {
      for (const side of CHIP_SIDES) {
        const box = chipBoxOf(centre, size, side);
        if (placed.some((other) => chipBoxesClash(box, other))) continue;
        chosen = side;
        chosenBox = box;
        break;
      }
    }

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
function animateConnectorDraw(
  line: Polyline,
  latlngs: [number, number][],
  id: string,
  onArrived?: () => void,
) {
  const token = drawTokens.get(id) ?? 0;
  if (latlngs.length < 2) {
    onArrived?.();
    return;
  }

  const DURATION_MS = 1700;
  const started = performance.now();

  const step = (now: number) => {
    // Gone — a closed list, a newer route, or a redraw took this line over.
    if (!map?.hasLayer(line) || (drawTokens.get(id) ?? 0) !== token) return;

    const t = Math.min(1, (now - started) / DURATION_MS);
    // Ease in *and* out: the line gathers pace out of the unit and settles as
    // it reaches the pin, rather than bolting and then crawling.
    const eased = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
    const upto = Math.max(2, Math.round(eased * latlngs.length));
    line.setLatLngs(latlngs.slice(0, upto));

    if (t < 1) {
      requestAnimationFrame(step);
      return;
    }
    line.setLatLngs(latlngs);
    onArrived?.();
  };

  line.setLatLngs(latlngs.slice(0, 1));
  requestAnimationFrame(step);
}

/**
 * The app's route stroke — one line, no casing, weight and tone shared by the
 * selected route and the list's connectors so the two can't drift apart.
 */
function addRouteLine(
  L: any,
  latlngs: [number, number][],
  color: string,
  className: string,
): Polyline {
  const line = L.polyline(latlngs, {
    interactive: false,
    className,
    color,
    weight: MATRIX_LINE_WEIGHT,
    opacity: 1,
    lineCap: "round",
    lineJoin: "round",
  }).addTo(map);
  // Keeps the stroke at one width while Leaflet scales its SVG through a
  // zoom; without it the line thickens mid-animation and snaps back at the end.
  line.getElement()?.setAttribute("vector-effect", "non-scaling-stroke");
  return line;
}

/** End cap where a route leaves its unit. The far end is the user's own pin. */
function addRouteDot(L: any, latlng: [number, number], color: string): CircleMarker {
  const dot = L.circleMarker(latlng, {
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
  return dot;
}

/** Draw or refresh one connector from road geometry the map now has. */
function drawConnector(L: any, id: string, route: ConnectorRoute, animate = false) {
  if (!map) return;

  // Any draw hands this unit's line a new generation, so a reveal still in
  // flight knows it has been overtaken — and drops out of the arrival batch,
  // since an overtaken reveal never reports back.
  drawTokens.set(id, (drawTokens.get(id) ?? 0) + 1);
  pendingArrivals.delete(id);

  const color = connectorColor(chipEtaMinutes(id));

  let entry = matrixLines.get(id);
  if (!entry) {
    const line = addRouteLine(L, route.latlngs, color, "bb-matrix-line");
    const dot = addRouteDot(L, route.latlngs[0]!, color);
    entry = { line, dot };
    matrixLines.set(id, entry);
    if (animate) {
      pendingArrivals.add(id);
      animateConnectorDraw(line, route.latlngs, id, () => {
        pendingArrivals.delete(id);
        if (!pendingArrivals.size) celebrateArrival();
      });
    }
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
    applyUnitChips(L);
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
    // Tokens stay: the selected route keeps its own generation across this.
    pendingArrivals.clear();
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

function buildServicePinIcon(
  L: any,
  typeName: string,
  opts: { enter?: boolean; delayMs?: number },
) {
  return L.divIcon({
    className: "bb-svc-pin-wrap bb-unit-marker",
    html: emergencyPinIconHtml(typeName, {
      enter: opts.enter,
      delayMs: opts.delayMs,
    }),
    iconSize: [28, 34],
    iconAnchor: [14, 32],
    popupAnchor: [0, -28],
  });
}

function onMarkerClick(item: any) {
  openEmergencyDetail(item);
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
  if (routeDot) {
    routeDot.remove();
    routeDot = null;
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

/**
 * The pin moved, so the drawn route is stale: drop it now rather than leaving a
 * line pointing at the old place, and redraw for whichever unit is still
 * selected. Re-drawing also re-frames the route, which is what makes a location
 * change look applied.
 */
function refreshRouteForPin(L: any) {
  clearRouteOverlays();

  const endPoint = leafletStore.routeEndPoint;
  if (endPoint?.lat && endPoint?.lng) void renderRoute(L, endPoint);
}

/**
 * Draw the selected unit's route. Deliberately the same stroke, tone and reveal
 * the list's connectors use, so opening a unit reads as the map zooming in on
 * one of them rather than switching to another visual language.
 */
function drawSelectedRoute(L: any, latlngs: [number, number][], durationSec: number) {
  const minutes = Number.isFinite(durationSec)
    ? Math.max(1, Math.round(durationSec / 60))
    : null;
  const color = connectorColor(minutes);

  // The connectors' guard, under its own id: a redraw must not fight the
  // reveal it replaced.
  drawTokens.set(SELECTED_ROUTE_ID, (drawTokens.get(SELECTED_ROUTE_ID) ?? 0) + 1);

  routeLine = addRouteLine(L, latlngs, color, "bb-route-line");
  // Same end cap the list's connectors wear, so the selected route starts on
  // its unit exactly like they do.
  routeDot = addRouteDot(L, latlngs[0]!, color);
  animateConnectorDraw(routeLine, latlngs, SELECTED_ROUTE_ID);
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

      drawSelectedRoute(L, latlngs, etaOpts.durationSec);
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

  drawSelectedRoute(L, fallback, etaOpts.durationSec);
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
