import { watchDebounced } from "@vueuse/core";
import { getSavedPlace } from "~/utils/savedPlaces";
import {
  buildMapQuery,
  parseMapUrl,
  parseServiceId,
  roundCoord,
  type MapUrlKey,
  type MapUrlState,
} from "~/utils/mapUrl";

/** Shared across every `useMapUrl()` caller (LeafletMap, index, sheets, …). */
const syncing = ref(false);
const hydrating = ref(true);
let syncBound = false;

export function useMapUrl() {
  const route = useRoute();
  const router = useRouter();

  function read(): MapUrlState {
    return parseMapUrl(route.query as Record<string, unknown>);
  }

  function onHome(): boolean {
    return route.path === "/";
  }

  async function write(
    patch: Partial<MapUrlState>,
    mode: "replace" | "push" = "replace",
    remove: MapUrlKey[] = [],
  ) {
    if (!import.meta.client || syncing.value || !onHome()) return;

    syncing.value = true;
    try {
      const query = buildMapQuery(route.query as Record<string, unknown>, patch, remove);
      if (mode === "push") await router.push({ path: "/", query });
      else await router.replace({ path: "/", query });
    } finally {
      await nextTick();
      syncing.value = false;
    }
  }

  function currentViewPatch(): Partial<MapUrlState> {
    const userLocation = useUserLocationStore();
    const leaflet = useLeafletStore();
    const cur = read();
    const patch: Partial<MapUrlState> = {};

    if (userLocation.lat && userLocation.long) {
      patch.lat = roundCoord(userLocation.lat);
      patch.lng = roundCoord(userLocation.long);
    }
    const z = Math.round(leaflet.zoom || 0);
    if (z >= 1 && z <= 20) patch.z = z;
    if (cur.service) patch.service = cur.service;
    if (cur.place) patch.place = cur.place;
    if (cur.unit) patch.unit = cur.unit;
    if (cur.toLat != null && cur.toLng != null) {
      patch.toLat = cur.toLat;
      patch.toLng = cur.toLng;
    }

    return patch;
  }

  function seedFromUrl(state: MapUrlState) {
    const userLocation = useUserLocationStore();
    const leaflet = useLeafletStore();

    if (state.lat != null && state.lng != null) {
      userLocation.setManualLocation(true);
      userLocation.updateCoordinate(state.lat, state.lng);
    }
    if (state.z != null) leaflet.setMapZoom(state.z);
  }

  function syncPin(lat: number, lng: number) {
    if (hydrating.value || !onHome()) return;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const rLat = roundCoord(lat);
    const rLng = roundCoord(lng);
    const cur = read();
    const remove: MapUrlKey[] = [];

    if (cur.place) {
      const saved = getSavedPlace(cur.place);
      if (!saved || roundCoord(saved.lat) !== rLat || roundCoord(saved.lng) !== rLng) {
        remove.push("place");
      }
    }

    if (cur.lat === rLat && cur.lng === rLng && !remove.length) return;
    void write({ ...currentViewPatch(), lat: rLat, lng: rLng }, "replace", remove);
  }

  function syncZoom(z: number) {
    if (hydrating.value || !onHome()) return;
    const zr = Math.round(z);
    if (!Number.isFinite(zr) || zr < 1 || zr > 20) return;
    if (read().z === zr) return;
    void write({ ...currentViewPatch(), z: zr });
  }

  function setUnit(unitId: string, opts?: { keepService?: boolean }) {
    const id = String(unitId || "").trim();
    if (!id || !onHome()) return;

    const cur = read();
    if (cur.unit === id) return;

    const mode = cur.unit ? "replace" : "push";
    const remove: MapUrlKey[] = opts?.keepService ? [] : ["service"];
    void write({ ...currentViewPatch(), unit: id }, mode, remove);
  }

  function clearUnit() {
    const cur = read();
    if ((!cur.unit && cur.toLat == null) || !onHome()) return;
    useLeafletStore().resetLeafletRouting();
    void write(currentViewPatch(), "replace", ["unit", "to"]);
  }

  function setTo(lat: number, lng: number) {
    if (!onHome()) return;

    const rLat = roundCoord(lat);
    const rLng = roundCoord(lng);
    const cur = read();
    if (cur.toLat === rLat && cur.toLng === rLng) return;

    void write({ ...currentViewPatch(), toLat: rLat, toLng: rLng }, "replace");
  }

  function clearTo() {
    if (read().toLat == null || !onHome()) return;
    void write(currentViewPatch(), "replace", ["to"]);
  }

  function setService(typeId: string) {
    const id = String(typeId || "").trim();
    if (!id || !onHome()) return;

    const cur = read();
    if (cur.service === id && !cur.unit) return;

    const mode = cur.service ? "replace" : "push";
    void write({ ...currentViewPatch(), service: id }, mode, ["unit"]);
  }

  function clearService() {
    if (!read().service || !onHome()) return;
    void write(currentViewPatch(), "replace", ["service"]);
  }

  function setPlace(placeId: string) {
    const id = String(placeId || "").trim();
    if (!id || !onHome()) return;

    const place = getSavedPlace(id);
    if (!place) return;

    void write(
      {
        ...currentViewPatch(),
        place: id,
        lat: roundCoord(place.lat),
        lng: roundCoord(place.lng),
      },
      "replace",
      ["unit", "service"],
    );
  }

  function clearPlace() {
    if (!read().place || !onHome()) return;
    void write(currentViewPatch(), "replace", ["place"]);
  }

  function clearMapContext() {
    const cur = read();
    const remove: MapUrlKey[] = [];
    if (cur.unit) remove.push("unit");
    if (cur.service) remove.push("service");
    if (cur.place) remove.push("place");
    if (cur.toLat != null) remove.push("to");
    if (!remove.length) return;
    useLeafletStore().resetLeafletRouting();
    void write(currentViewPatch(), "replace", remove);
  }

  /** Write pin + zoom to URL after boot (shareable link even without prior params). */
  function publishCurrentView() {
    if (hydrating.value || !onHome()) return;
    const patch = currentViewPatch();
    if (!patch.lat || !patch.lng) return;

    const cur = read();
    if (
      cur.lat === patch.lat &&
      cur.lng === patch.lng &&
      cur.z === patch.z &&
      cur.service === patch.service &&
      cur.place === patch.place &&
      !cur.unit
    ) {
      return;
    }
    void write(patch);
  }

  function finishHydration() {
    hydrating.value = false;
  }

  return {
    read,
    seedFromUrl,
    syncPin,
    syncZoom,
    setUnit,
    clearUnit,
    setTo,
    clearTo,
    setService,
    clearService,
    setPlace,
    clearPlace,
    clearMapContext,
    publishCurrentView,
    finishHydration,
    syncing,
    hydrating,
  };
}

/** URL ↔ pin / zoom / sheets — call once on home. */
export function useMapUrlSync() {
  if (!import.meta.client || syncBound) return;
  syncBound = true;

  const route = useRoute();
  const mapUrl = useMapUrl();
  const userLocation = useUserLocationStore();
  const detailSheet = useDetailSheetStore();
  const exploreSheet = useExploreSheetStore();
  const { openService, openEmergencyDetail, emergencyTypeData } = useOpenUnit();
  const { goToPlace } = usePlaceNavigation();
  const { setRouteTo, clearRoute } = useMapRouting();

  function findUnitByCoords(lat: number, lng: number) {
    const rLat = roundCoord(lat);
    const rLng = roundCoord(lng);
    return useEmergencyStore().filteredEmergency.find((row: any) => {
      const coords = row?.emergencyData?.coordinates;
      if (!coords?.length) return false;
      return (
        roundCoord(parseFloat(coords[1])) === rLat &&
        roundCoord(parseFloat(coords[0])) === rLng
      );
    });
  }

  function onTicketPage(): boolean {
    return route.path.startsWith("/ticket/");
  }

  function syncUnitFromRoute() {
    if (mapUrl.syncing.value || mapUrl.hydrating.value) return;
    if (onTicketPage()) return;

    const state = mapUrl.read();
    let unitId = String(route.query.unit || "").trim();

    if (!unitId && state.toLat != null && state.toLng != null) {
      const match = findUnitByCoords(state.toLat, state.toLng);
      if (match) unitId = String(match.emergencyData?.id || "");
    }

    const openId = detailSheet.isOpen
      ? String(detailSheet.detailSheetData?.emergency?.emergencyData?.id || "")
      : "";

    if (!unitId) {
      if (detailSheet.isOpen) detailSheet.onClose();
      if (state.toLat == null) clearRoute({ skipUrl: true });
      return;
    }

    if (unitId === openId) return;

    const item = useEmergencyStore().filteredEmergency.find(
      (row: any) => String(row?.emergencyData?.id) === unitId,
    );
    if (item) openEmergencyDetail(item, { skipUrl: true });
  }

  function syncServiceFromRoute() {
    if (mapUrl.syncing.value || mapUrl.hydrating.value) return;
    if (onTicketPage()) return;

    const serviceId = parseServiceId(
      String(route.query.service || route.query.type_id || ""),
    );
    const openId = exploreSheet.isOpen
      ? String(exploreSheet.sheetData?.emergencyType?.id ?? "")
      : "";

    if (!serviceId) {
      if (exploreSheet.isOpen) exploreSheet.onClose();
      return;
    }

    if (serviceId === openId) return;

    const service = (emergencyTypeData.value?.data ?? []).find(
      (row: any) => String(row.id) === serviceId,
    );
    if (service) openService(service, { skipUrl: true });
  }

  function syncPlaceFromRoute() {
    if (mapUrl.syncing.value || mapUrl.hydrating.value) return;

    const placeId = String(route.query.place || "").trim();
    if (!placeId) return;

    const saved = getSavedPlace(placeId);
    if (!saved) return;

    const samePin =
      roundCoord(userLocation.lat) === roundCoord(saved.lat) &&
      roundCoord(userLocation.long) === roundCoord(saved.lng);
    if (samePin) return;

    void goToPlace(saved, { skipUrl: true });
  }

  watch(() => String(route.query.unit || "").trim(), syncUnitFromRoute);

  watch(
    () => [
      parseServiceId(String(route.query.service || route.query.type_id || "")),
      emergencyTypeData.value?.data?.length ?? 0,
    ] as const,
    () => syncServiceFromRoute(),
  );

  watch(() => String(route.query.place || "").trim(), syncPlaceFromRoute);

  function syncToFromRoute() {
    if (mapUrl.syncing.value || mapUrl.hydrating.value) return;

    const state = mapUrl.read();
    if (state.toLat == null || state.toLng == null) {
      if (useLeafletStore().routeEndPoint?.lat) clearRoute({ skipUrl: true });
      return;
    }

    const end = useLeafletStore().routeEndPoint;
    const same =
      roundCoord(end?.lat || 0) === state.toLat &&
      roundCoord(end?.lng || 0) === state.toLng;
    if (!same) setRouteTo(state.toLat, state.toLng, { skipUrl: true });
  }

  watch(() => String(route.query.to || "").trim(), syncToFromRoute);

  watch(
    () => useEmergencyStore().filteredEmergency.length,
    () => syncUnitFromRoute(),
  );

  watch(mapUrl.hydrating, (isHydrating) => {
    if (!isHydrating) {
      syncPlaceFromRoute();
      syncServiceFromRoute();
      syncUnitFromRoute();
      syncToFromRoute();
      mapUrl.publishCurrentView();
    }
  });

  watchDebounced(
    () => [userLocation.lat, userLocation.long] as const,
    ([lat, lng]) => {
      if (!lat || !lng) return;
      mapUrl.syncPin(lat, lng);
    },
    { debounce: 400 },
  );
}
