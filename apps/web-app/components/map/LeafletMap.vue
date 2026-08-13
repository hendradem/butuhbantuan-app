<script setup lang="ts">
import type { Map as LeafletMap, Marker, Polyline } from "leaflet";
import { appToast } from "~/utils/appToast";

const leafletStore = useLeafletStore();
const emergencyStore = useEmergencyStore();
const emergencyDataStore = useEmergencyDataStore();
const userLocationStore = useUserLocationStore();
const appError = useAppErrorStore();
const detailSheet = useDetailSheetStore();
const { loadEmergencyData } = useEmergencyApi();
const toast = appToast();

const mapContainer = ref<HTMLElement | null>(null);
let map: LeafletMap | null = null;
let markers: Marker[] = [];
let currentLocationMarker: Marker | null = null;
let routeLine: Polyline | null = null;
let gpsWatchId: number | null = null;
let routeRenderToken = 0;

onMounted(async () => {
  if (!mapContainer.value) return;

  const Lmod = await import("leaflet");
  const L = (Lmod as any).default ?? Lmod;
  await import("leaflet/dist/leaflet.css");

  const indonesiaBounds = L.latLngBounds(L.latLng(-11, 95), L.latLng(6, 141));
  map = L.map(mapContainer.value, {
    center: [-2.5, 118],
    zoom: leafletStore.zoom,
    zoomControl: false,
    maxBounds: indonesiaBounds,
    maxBoundsViscosity: 1.0,
    minZoom: 5,
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
    maxZoom: 19,
  }).addTo(map);

  // Leaflet often needs a reflow when mounted inside % height containers.
  requestAnimationFrame(() => {
    map?.invalidateSize();
  });
  setTimeout(() => map?.invalidateSize(), 250);

  leafletStore.setMapInstance(map);

  let mapClickTimer: ReturnType<typeof setTimeout> | null = null;

  map.on("click", (e: any) => {
    if (mapClickTimer) clearTimeout(mapClickTimer);

    const { lat, lng } = e.latlng;
    toast.loading("Mencari layanan di area ini...");

    userLocationStore.setManualLocation(true);
    userLocationStore.updateCoordinate(lat, lng);
    userLocationStore.setAddressLoading(true);
    emergencyStore.setLoading(true);
    leafletStore.resetLeafletRouting();
    detailSheet.onClose();

    mapClickTimer = setTimeout(async () => {
      await loadEmergencyData(lat, lng, true);
    }, 1500);
  });

  if (navigator?.geolocation) {
    let isFirstFix = true;
    gpsWatchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const wasFirst = isFirstFix;
        isFirstFix = false;
        userLocationStore.updateGPSCoordinate(lat, lng);
        if (wasFirst && !userLocationStore.isManualLocation) {
          loadEmergencyData(lat, lng);
        }
      },
      (err) => {
        if (err.code === 1) {
          appError.setErrorMessage("permission_denied");
          appError.onOpenSheet();
        }
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );
  }

  watch(
    () => emergencyStore.filteredEmergency,
    (data) => renderMarkers(L, data),
    { immediate: true }
  );

  watch(
    () => emergencyStore.isCovered,
    (covered) => {
      const tilePane = map?.getPane("tilePane") as HTMLElement | undefined;
      if (tilePane) {
        tilePane.style.filter = covered ? "" : "grayscale(1) opacity(0.55)";
      }
    },
    { immediate: true }
  );

  watch(
    [() => userLocationStore.lat, () => userLocationStore.long],
    ([lat, lng], [prevLat, prevLng]) => {
      if (!lat || !lng) return;
      const jumped = Math.abs(lat - (prevLat ?? 0)) > 0.01 || Math.abs(lng - (prevLng ?? 0)) > 0.01;
      renderCurrentLocation(L, lat, lng, jumped);
      if (jumped) {
        const end = leafletStore.routeEndPoint;
        if (end.lat && end.lng) {
          leafletStore.updateLeafletRouting({
            startPoint: { lat, lng },
            routeEndPoint: { lat: end.lat, lng: end.lng },
          });
        }
      }
    },
    { immediate: true }
  );

  watch(
    () => leafletStore.routeEndPoint,
    async (endPoint) => {
      if (endPoint.lat && endPoint.lng) {
        await renderRoute(L, endPoint);
      } else if (routeLine) {
        routeLine.remove();
        routeLine = null;
      }
    }
  );
});

onUnmounted(() => {
  if (gpsWatchId !== null) navigator.geolocation.clearWatch(gpsWatchId);
});

function renderCurrentLocation(L: any, lat: number, lng: number, panMap = false) {
  if (!map) return;

  if (currentLocationMarker) {
    currentLocationMarker.setLatLng([lat, lng]);
  } else {
    const icon = L.divIcon({
      className: "current-location-marker",
      iconSize: [25, 25],
    });
    currentLocationMarker = L.marker([lat, lng], { icon }).addTo(map!);
    panMap = true;
  }

  if (panMap) map.setView([lat, lng], 13);
}

function renderMarkers(L: any, data: any[]) {
  markers.forEach((m) => m.remove());
  markers = [];
  if (!map) return;

  data.forEach((item: any) => {
    const e = item.emergencyData;
    if (!e?.coordinates) return;

    const icon = L.divIcon({
      className: getMarkerClass(e.emergency_type?.name),
      iconSize: [25, 25],
    });

    const marker = L.marker([+e.coordinates[1], +e.coordinates[0]], { icon })
      .addTo(map!)
      .on("click", () => onMarkerClick(item));

    markers.push(marker);
  });
}

function getMarkerClass(typeName: string): string {
  const typeMap: Record<string, string> = {
    Ambulance: "ambulance-marker",
    Damkar: "fire-fighter-marker",
    "Rumah Sakit": "hospital-marker",
    SAR: "sar-marker",
  };
  return typeMap[typeName] ?? "ambulance-marker";
}

function onMarkerClick(item: any) {
  emergencyDataStore.updateSelectedEmergencyData({
    selectedEmergencyData: item.emergencyData,
    selectedEmergencySource: "map",
  });
  detailSheet.setDetailSheetData({
    emergencyType: item.emergencyData.emergency_type,
    emergency: item,
  });
  detailSheet.onOpen();

  const coords = item.emergencyData?.coordinates;
  if (coords) {
    leafletStore.updateLeafletRouting({
      startPoint: { lat: userLocationStore.lat, lng: userLocationStore.long },
      routeEndPoint: { lat: parseFloat(coords[1]), lng: parseFloat(coords[0]) },
    });
  }
}

async function renderRoute(L: any, endPoint: { lat: number; lng: number }) {
  if (!map) return;

  if (routeLine) {
    routeLine.remove();
    routeLine = null;
  }

  const token = ++routeRenderToken;
  toast.loading("Mencari rute...");

  const userLat = userLocationStore.lat;
  const userLng = userLocationStore.long;

  if (!userLat || !userLng) {
    map.setView([endPoint.lat, endPoint.lng], 14);
    toast.dismiss();
    return;
  }

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${userLng},${userLat};${endPoint.lng},${endPoint.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    const coords = data?.routes?.[0]?.geometry?.coordinates as [number, number][] | undefined;

    if (token !== routeRenderToken) {
      return;
    }

    if (coords?.length) {
      const latlngs = coords.map((c) => [c[1], c[0]] as [number, number]);
      routeLine = L.polyline(latlngs, {
        color: "#3b82f6",
        weight: 4,
        opacity: 0.85,
      }).addTo(map!);
      map.fitBounds((routeLine as any).getBounds(), { padding: [60, 60] });
      toast.success("Rute ditemukan", { duration: 1500 });
      return;
    }
  } catch {
    if (token !== routeRenderToken) {
      return;
    }
  }

  routeLine = L.polyline(
    [[userLat, userLng], [endPoint.lat, endPoint.lng]],
    { color: "#3b82f6", weight: 3, dashArray: "6, 8", opacity: 0.85 }
  ).addTo(map!);
  map.fitBounds((routeLine as any).getBounds(), { padding: [60, 60] });
  toast.dismiss();
}
</script>

<template>
  <div ref="mapContainer" class="w-full h-full" />
</template>
