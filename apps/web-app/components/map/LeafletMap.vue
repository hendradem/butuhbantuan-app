<script setup lang="ts">
import type { Map as LeafletMap, Marker, Polyline } from "leaflet";
import { appToast } from "~/utils/appToast";
import { formatDistance } from "~/utils/geo";
import {
  ROUTE_LINE_CASING_WEIGHT,
  ROUTE_LINE_COLOR,
  ROUTE_LINE_WEIGHT,
  routeAdviceFromTravel,
  routeLineCasingColor,
  routeLineColorFromTravel,
} from "~/utils/routeAdvice";
import {
  classicMarkerClass,
  effectiveTileStyle,
  emergencyPinIconHtml,
  getMapAppearance,
  tileAttribution,
  tileLayerUrl,
  tileSubdomains,
  userLocationIconHtml,
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
    maxZoom: initialTiles === "classic" ? 19 : 20,
    subdomains: tileSubdomains(initialTiles),
    crossOrigin: true,
    keepBuffer: 8,
    updateWhenIdle: false,
    updateWhenZooming: false,
  }).addTo(map);

  const onColorMode = (e: Event) => {
    const mode = (e as CustomEvent).detail?.mode === "dark" ? "dark" : "light";
    if (!map || !baseTileLayer) return;
    const next = effectiveTileStyle(mapAppearance.tiles, mode);
    map.removeLayer(baseTileLayer);
    baseTileLayer = L.tileLayer(tileLayerUrl(next), {
      attribution: tileAttribution(next),
      maxZoom: next === "classic" ? 19 : 20,
      subdomains: tileSubdomains(next),
      crossOrigin: true,
      keepBuffer: 8,
      updateWhenIdle: false,
      updateWhenZooming: false,
    }).addTo(map);
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

function renderMarkers(L: any, data: any[]) {
  markers.forEach((m) => m.remove());
  markers = [];
  markersById.clear();
  markerMetaById.clear();
  if (!map) return;

  const usePin = mapAppearance.markers === "pin";
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

    const icon = usePin
      ? buildServicePinIcon(L, typeName, {
          enter: true,
          delayMs: Math.min(pinIndex * 45, 360),
          active: isActive,
          muted,
        })
      : L.divIcon({
          className: `${classicMarkerClass(typeName)}${muted ? " bb-marker--muted" : ""}`,
          iconSize: isActive ? [32, 32] : [25, 25],
          iconAnchor: isActive ? [16, 16] : [12, 12],
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
}

function routeIsDrawn(): boolean {
  return Boolean(leafletStore.routeEndPoint?.lat && leafletStore.routeEndPoint?.lng);
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
    className: "bb-svc-pin-wrap",
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
  // CoreSheet panels are teleported to body
  const panels = document.querySelectorAll(".ui-sheet-panel");
  let tallest = 0;
  panels.forEach((el) => {
    const h = (el as HTMLElement).offsetHeight;
    if (h > tallest) tallest = h;
  });
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
  const side = 28;
  const top = 56;
  // Clear sheet + a little breathing room under markers / ETA bubble
  const bottom = measureBottomSheetInset() + 28;
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

  fitRouteInViewSoon(L, fallback);
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
  <div ref="mapContainer" class="w-full h-full" />
</template>
