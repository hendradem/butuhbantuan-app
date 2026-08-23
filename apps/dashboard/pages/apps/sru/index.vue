<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { toast } from "~/utils/appToast";
import type { SarMissionBundle, SarMember, SarMarker, SarPosition } from "~/composables/useSarApi";
import { DEFAULT_UTM_NORTH, DEFAULT_UTM_ZONE, latLngToUtm, utmToLatLng } from "~/utils/utm";
import { readKmlFile } from "~/utils/kmlParse";
import { buildMissionKml, downloadKml } from "~/utils/kmlExport";
import { MAP_SCALE_PRESETS, nearestScalePreset } from "~/utils/mapScale";
import { SAR_MARKER_ICONS, defaultIconForKind, defaultLabelForKind, type SarMarkerIconId } from "~/utils/sarMarkerIcons";
import { dailyRows, upcomingHours, deriveWeatherAlerts } from "~/utils/openMeteo";
import { ageLabel, lastKnownBySru, sruFreshness, trackStats } from "~/utils/sarTrack";
import { colorForSru } from "~/utils/sruColors";
import {
  MEASURE_SPEEDS,
  etaMinutes,
  formatDistance,
  formatEta,
  pathLengthMeters,
  type MeasureSpeedId,
} from "~/utils/sarMeasure";
import { formatCoordPlain } from "~/utils/sarCoords";
import {
  buildCorridors,
  estimateSectorCoverage,
  resolvePeopleCount,
  type CoverageTrail,
} from "~/utils/sarCoverage";

definePageMeta({ title: "SRU Mission Map" });

const { settings: mapSettings, showGeo, showUtm } = useSarMapSettings();
const { coverage, setPeopleOverride } = useSarCoverageSettings();
const {
  listMissions,
  getMission,
  getStatus,
  setEnabled,
  reportPosition,
  updatePosition,
  deletePosition,
  importSectors,
  assignSector,
  createMarker,
  updateMarker,
  deleteMarker,
  upsertTeam,
  removeTeam,
} = useSarApi();

const {
  forecast,
  mapPoint: weatherPoint,
  grid: weatherGrid,
  loading: weatherLoading,
  error: weatherError,
  fetchForecast,
} = useOpenMeteoForecast();

const appStatus = ref<{ enabled: boolean; onboarded: boolean; active_mission_id?: string } | null>(null);
const statusLoading = ref(true);
const toggling = ref(false);

const showOnboarding = ref(false);
const viewingMission = ref(false);

const appPhase = computed(() => {
  if (statusLoading.value) return "loading";
  if (!appStatus.value?.enabled) return "inactive";
  if (showOnboarding.value) return "onboarding";
  if (viewingMission.value) return "ready";
  return "hub";
});

async function loadStatus() {
  statusLoading.value = true;
  try {
    appStatus.value = await Promise.race([
      getStatus(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 8000),
      ),
    ]);
  } catch {
    appStatus.value = { enabled: false, onboarded: false };
  } finally {
    statusLoading.value = false;
  }
}

async function onToggleEnabled(enabled: boolean) {
  toggling.value = true;
  try {
    appStatus.value = await setEnabled(enabled);
    showOnboarding.value = false;
    viewingMission.value = false;
    if (enabled) {
      await loadList();
    }
  } catch {
    toast.error("Gagal mengubah status aplikasi");
  } finally {
    toggling.value = false;
  }
}

async function openMissionFromHub(id: string) {
  missionId.value = id;
  selectedDay.value = "";
  viewingMission.value = true;
  showOnboarding.value = false;
  await loadBundle();
}

function goHub() {
  viewingMission.value = false;
  showOnboarding.value = false;
  void loadList();
}

function startOnboarding() {
  showOnboarding.value = true;
  viewingMission.value = false;
}

async function onOnboardDone() {
  await loadStatus();
  showOnboarding.value = false;
  viewingMission.value = true;
  missionId.value = appStatus.value?.active_mission_id || "";
  selectedDay.value = "";
  await refresh();
}

const hourlyPreview = computed(() => (forecast.value ? upcomingHours(forecast.value.hourly, 8) : []));
const dailyPreview = computed(() => (forecast.value ? dailyRows(forecast.value.daily, 5) : []));

async function refreshWeather() {
  const m = bundle.value?.mission;
  if (!m) return;
  await fetchForecast(m.center_lat, m.center_lng, true);
}

type AsidePanel = "members" | "ht" | "assign" | "marker" | "measure" | "history" | "settings" | "share" | null;
type SarBasemap = "osm" | "topo" | "imagery" | "offline";

const missions = ref<Awaited<ReturnType<typeof listMissions>>>([]);
const missionId = ref("");
const selectedDay = ref("");
const bundle = ref<SarMissionBundle | null>(null);
const loading = ref(true);
const loadError = ref("");
const focusSru = ref<string | null>(null);
const aside = ref<AsidePanel>(null);

const basemap = ref<SarBasemap>("topo");
const showGrid = ref(true);
const showContours = ref(true);
const showWeather = ref(true);
const showRadar = ref(false);
const showForecastPanel = ref(true);
/** Exclusive map-click modes. */
type MapPickMode = "idle" | "marker" | "radio" | "measure";
const mapPickMode = ref<MapPickMode>("idle");
const targetScale = ref<number | null>(null);
const currentScaleDenom = ref(0);
const activeScalePreset = computed(() => nearestScalePreset(currentScaleDenom.value));

const measurePoints = ref<Array<{ lat: number; lng: number }>>([]);
const measureSpeedId = ref<MeasureSpeedId>("hike");
const measureSpeedKmh = computed(
  () => MEASURE_SPEEDS.find((s) => s.id === measureSpeedId.value)?.speedKmh || 3,
);
const measureDistanceM = computed(() => pathLengthMeters(measurePoints.value));
const measureEtaMin = computed(() => etaMinutes(measureDistanceM.value, measureSpeedKmh.value));
const weatherAlerts = computed(() => deriveWeatherAlerts(forecast.value));

const form = reactive({
  sru: "",
  member_id: "",
  lat: null as number | null,
  lng: null as number | null,
  utm_zone: DEFAULT_UTM_ZONE,
  utm_north: DEFAULT_UTM_NORTH,
  easting: null as number | null,
  northing: null as number | null,
  note: "",
  logged_by: "SMC",
});
const coordSyncing = ref(false);
const submitting = ref(false);
const importingKml = ref(false);
const kmlInput = ref<HTMLInputElement | null>(null);
const kmlMode = ref<"replace" | "append">("replace");
const assigning = ref(false);
const newSruForm = reactive({ name: "", callsign: "" });
const sruSaving = ref(false);

const markerForm = reactive({
  kind: "dest" as string,
  icon: "route" as SarMarkerIconId,
  label: "",
  note: "",
  lat: null as number | null,
  lng: null as number | null,
  utm_zone: DEFAULT_UTM_ZONE,
  utm_north: DEFAULT_UTM_NORTH,
  easting: null as number | null,
  northing: null as number | null,
});
const markerSaving = ref(false);
const PIN_KINDS = [
  { id: "dest", short: "Tujuan", label: "Tujuan / rally" },
  { id: "waypoint", short: "WP", label: "Waypoint" },
  { id: "lp", short: "LP", label: "Landing point" },
  { id: "clue", short: "Clue", label: "Clue" },
  { id: "hazard", short: "Hazard", label: "Hazard" },
  { id: "custom", short: "Lain", label: "Custom" },
] as const;

const markerCoordSyncing = ref(false);
const editingMarkerId = ref<string | null>(null);
const editingPositionId = ref<string | null>(null);
const htAdvanced = ref(false);
const markerAdvanced = ref(false);

const draftMarker = computed(() => {
  if (mapPickMode.value !== "marker") return null;
  if (markerForm.lat == null || markerForm.lng == null) return null;
  return {
    lat: markerForm.lat,
    lng: markerForm.lng,
    label: markerForm.label || defaultLabelForKind(markerForm.kind),
  };
});

function setMapPickMode(mode: MapPickMode) {
  mapPickMode.value = mode;
}

/** Guard against pointerdown+click double-fire toggling the panel closed immediately. */
let asideToggleAt = 0;
function openAside(panel: AsidePanel) {
  const now = Date.now();
  if (now - asideToggleAt < 120) return;
  asideToggleAt = now;

  // Pin: map-first — chips on map, aside only for list/edit. Second click exits.
  if (panel === "marker") {
    if (mapPickMode.value === "marker") {
      aside.value = null;
      setMapPickMode("idle");
      return;
    }
    aside.value = null;
    setMapPickMode("marker");
    editingMarkerId.value = null;
    markerAdvanced.value = false;
    if (!markerForm.label) markerForm.label = defaultLabelForKind(markerForm.kind);
    markerForm.icon = defaultIconForKind(markerForm.kind);
    return;
  }

  if (aside.value === panel) {
    aside.value = null;
    setMapPickMode("idle");
    return;
  }
  aside.value = panel;
  if (panel === "ht") {
    setMapPickMode("radio");
    if (!form.sru && sruOptions.value[0]) {
      form.sru = sruOptions.value[0]!;
      ensureSruMember();
      focusSru.value = form.sru;
    } else if (form.sru) {
      focusSru.value = form.sru;
      ensureSruMember();
    }
  } else if (panel === "measure") {
    setMapPickMode("measure");
  } else {
    setMapPickMode("idle");
  }
}

function closeAside() {
  aside.value = null;
  setMapPickMode("idle");
}

const toolsEl = ref<HTMLElement | null>(null);

watch(
  toolsEl,
  async (el, _prev, onCleanup) => {
    if (!import.meta.client || !el) return;
    try {
      const Lmod = await import("leaflet");
      const L = (Lmod as any).default ?? Lmod;
      L.DomEvent.disableClickPropagation(el);
      L.DomEvent.disableScrollPropagation(el);
      onCleanup(() => {
        // Leaflet has no enable* pair for these helpers; listeners leave with the node.
      });
    } catch {
      /* leaflet optional at hub / loading */
    }
  },
  { flush: "post" },
);

function applyMarkerGeoToUtm() {
  if (markerForm.lat == null || markerForm.lng == null) return;
  markerCoordSyncing.value = true;
  const u = latLngToUtm(markerForm.lat, markerForm.lng, markerForm.utm_zone || undefined);
  markerForm.utm_zone = u.zone;
  markerForm.utm_north = u.north;
  markerForm.easting = u.easting;
  markerForm.northing = u.northing;
  nextTick(() => {
    markerCoordSyncing.value = false;
  });
}

function applyMarkerUtmToGeo() {
  if (markerForm.easting == null || markerForm.northing == null) return;
  markerCoordSyncing.value = true;
  const g = utmToLatLng({
    zone: markerForm.utm_zone || DEFAULT_UTM_ZONE,
    north: markerForm.utm_north,
    easting: markerForm.easting,
    northing: markerForm.northing,
  });
  markerForm.lat = Number(g.lat.toFixed(7));
  markerForm.lng = Number(g.lng.toFixed(7));
  nextTick(() => {
    markerCoordSyncing.value = false;
  });
}

function placeMarkerAt(lat: number, lng: number) {
  if (!canEditMission.value) return;
  markerForm.lat = Number(lat.toFixed(7));
  markerForm.lng = Number(lng.toFixed(7));
  applyMarkerGeoToUtm();
  if (!markerForm.label) {
    markerForm.label = defaultLabelForKind(markerForm.kind);
  }
  if (!markerForm.icon) {
    markerForm.icon = defaultIconForKind(markerForm.kind);
  }
  aside.value = "marker";
  setMapPickMode("marker");
}

/** Quick-pin: map click saves immediately (same idea as Lacak quick-log). */
async function quickPinAt(lat: number, lng: number) {
  if (!canEditMission.value) return;
  placeMarkerAt(lat, lng);
  if (editingMarkerId.value) return;
  await submitMarker({ quiet: true });
}

function fillRadioCoords(lat: number, lng: number) {
  if (!canEditMission.value) return;
  form.lat = Number(lat.toFixed(7));
  form.lng = Number(lng.toFixed(7));
  applyGeoToUtm();
  aside.value = "ht";
  setMapPickMode("radio");
}

/** Quick-log: map click in Lacak mode saves immediately when SRU is selected. */
async function quickLogAt(lat: number, lng: number) {
  if (!canEditMission.value) return;
  if (editingPositionId.value) {
    fillRadioCoords(lat, lng);
    return;
  }
  if (!form.sru) {
    toast.error("Pilih SRU di panel Lacak dulu");
    aside.value = "ht";
    setMapPickMode("radio");
    return;
  }
  ensureSruMember();
  if (!form.member_id) {
    toast.error("SRU ini belum punya roster");
    return;
  }
  fillRadioCoords(lat, lng);
  await submitHtLog({ quiet: true });
}

function ensureSruMember() {
  if (!form.sru) return;
  const list = membersOfSelectedSru.value;
  if (!list.length) {
    form.member_id = "";
    return;
  }
  if (!list.some((m) => m.id === form.member_id)) {
    form.member_id = list[0]!.id;
  }
}

function clearMarkerCoords() {
  markerForm.lat = null;
  markerForm.lng = null;
  markerForm.easting = null;
  markerForm.northing = null;
}

async function loadList() {
  try {
    missions.value = await listMissions();
    loadError.value = "";
  } catch (e: any) {
    missions.value = [];
    const status = e?.statusCode || e?.status || e?.response?.status;
    loadError.value =
      status === 404
        ? "API SAR belum aktif — restart `make dev` di apps/api."
        : "Gagal memuat daftar misi (cek login admin / API).";
  }
  const preferred = appStatus.value?.active_mission_id || missions.value[0]?.id || "";
  if (!missionId.value && preferred) {
    missionId.value = preferred;
  }
  if (!missionId.value && missions.value[0]) {
    missionId.value = missions.value[0].id;
  }
}

async function loadBundle(opts?: { silent?: boolean }) {
  if (!missionId.value) return;
  if (!opts?.silent) loading.value = true;
  try {
    const data = await getMission(missionId.value, selectedDay.value || undefined);
    bundle.value = {
      ...data,
      markers: data.markers ?? [],
      sru_list: data.sru_list ?? [],
      shifts: data.shifts ?? [],
      teams: data.teams ?? [],
      shift: data.shift ?? null,
      live_tracks: data.live_tracks ?? [],
    };
    if (data.shift?.date && !selectedDay.value) {
      selectedDay.value = data.shift.date;
    }
    loadError.value = "";
    const stillThere = bundle.value.members.some((m) => m.id === form.member_id);
    if (!stillThere) {
      form.member_id = bundle.value.members[0]?.id || "";
      form.sru = bundle.value.members[0]?.sru || "";
      focusSru.value = null;
    } else if (!form.sru && form.member_id) {
      form.sru = bundle.value.members.find((m) => m.id === form.member_id)?.sru || "";
    }
    void refreshWeather();
  } catch (e: any) {
    if (opts?.silent) return;
    const status = e?.statusCode || e?.status || e?.response?.status;
    loadError.value =
      status === 404
        ? "API SAR belum aktif — restart `make dev` di apps/api."
        : "Gagal memuat misi SAR";
    toast.error(loadError.value);
    bundle.value = null;
  } finally {
    if (!opts?.silent) loading.value = false;
  }
}

async function refresh() {
  await loadList();
  await loadBundle();
}

function applyGeoToUtm() {
  if (form.lat == null || form.lng == null) return;
  coordSyncing.value = true;
  const u = latLngToUtm(form.lat, form.lng, form.utm_zone || undefined);
  form.utm_zone = u.zone;
  form.utm_north = u.north;
  form.easting = u.easting;
  form.northing = u.northing;
  nextTick(() => {
    coordSyncing.value = false;
  });
}

function applyUtmToGeo() {
  if (form.easting == null || form.northing == null) return;
  coordSyncing.value = true;
  const g = utmToLatLng({
    zone: form.utm_zone || DEFAULT_UTM_ZONE,
    north: form.utm_north,
    easting: form.easting,
    northing: form.northing,
  });
  form.lat = g.lat;
  form.lng = g.lng;
  nextTick(() => {
    coordSyncing.value = false;
  });
}

function onMapClick(lat: number, lng: number) {
  if (mapPickMode.value === "marker") {
    void quickPinAt(lat, lng);
    return;
  }
  if (mapPickMode.value === "radio") {
    void quickLogAt(lat, lng);
    return;
  }
  if (mapPickMode.value === "measure") {
    measurePoints.value = [...measurePoints.value, { lat: Number(lat.toFixed(7)), lng: Number(lng.toFixed(7)) }];
    aside.value = "measure";
    return;
  }
}

function clearMeasure() {
  measurePoints.value = [];
}

function undoMeasurePoint() {
  measurePoints.value = measurePoints.value.slice(0, -1);
}

function onPlaceMarker(lat: number, lng: number) {
  void quickPinAt(lat, lng);
}

function selectSru(sru: string) {
  focusSru.value = sru;
  form.sru = sru;
  ensureSruMember();
  const last = lastBySru.value[sru];
  if (last && !editingPositionId.value) {
    form.lat = last.lat;
    form.lng = last.lng;
    applyGeoToUtm();
  }
  aside.value = "ht";
  setMapPickMode("radio");
}

function selectMember(m: SarMember) {
  selectSru(m.sru);
  form.member_id = m.id;
}

function clearSruFocus() {
  focusSru.value = null;
}

async function submitHtLog(opts?: { quiet?: boolean }) {
  ensureSruMember();
  if (!missionId.value || !form.member_id || form.lat == null || form.lng == null) {
    toast.error("Pilih SRU + titik di peta");
    return;
  }
  if (!canEditMission.value) {
    toast.error("Misi arsip bersifat baca saja");
    return;
  }
  const editingId = editingPositionId.value;
  submitting.value = true;
  try {
    const body = {
      member_id: form.member_id,
      lat: form.lat,
      lng: form.lng,
      note: form.note || undefined,
      source: "ht",
      logged_by: form.logged_by || "SMC",
      shift_id: bundle.value?.shift?.id,
    };
    if (editingId) {
      await updatePosition(missionId.value, editingId, body);
      toast.success("Posisi SRU diperbarui");
      editingPositionId.value = null;
    } else {
      await reportPosition(missionId.value, body);
      toast.success(opts?.quiet ? `Tercatat · ${form.sru}` : "Posisi HT tercatat");
    }
    form.note = "";
    focusSru.value = form.sru;
    await loadBundle();
  } catch (e: any) {
    toast.error(String(e?.data?.message || e?.message || (editingId ? "Gagal update posisi" : "Gagal mencatat posisi")));
  } finally {
    submitting.value = false;
  }
}

function startEditPosition(p: SarPosition) {
  if (!canEditMission.value) return;
  editingPositionId.value = p.id;
  htAdvanced.value = true;
  const member = (bundle.value?.members || []).find((m) => m.id === p.member_id);
  form.sru = member?.sru || form.sru;
  form.member_id = p.member_id;
  form.lat = p.lat;
  form.lng = p.lng;
  form.note = p.note || "";
  applyGeoToUtm();
  aside.value = "ht";
  setMapPickMode("radio");
}

function cancelEditPosition() {
  editingPositionId.value = null;
  form.note = "";
}

async function removePosition(p: SarPosition) {
  if (!missionId.value || !canEditMission.value) {
    toast.error("Misi arsip bersifat baca saja");
    return;
  }
  if (!window.confirm(`Hapus jejak ${p.callsign || "SRU"}?`)) return;
  try {
    await deletePosition(missionId.value, p.id);
    if (editingPositionId.value === p.id) cancelEditPosition();
    toast.success("Jejak posisi dihapus");
    await loadBundle();
  } catch (e: any) {
    toast.error(String(e?.data?.message || e?.message || "Gagal hapus posisi"));
  }
}

function startEditPositionFromLast(sru: string) {
  const last = lastBySru.value[sru];
  if (!last?.id) return;
  const full = (bundle.value?.positions || []).find((p) => p.id === last.id);
  if (full) startEditPosition(full);
}

async function removeLastKnown(sru: string) {
  const last = lastBySru.value[sru];
  if (!last?.id) return;
  const full = (bundle.value?.positions || []).find((p) => p.id === last.id);
  if (full) await removePosition(full);
}

async function onKmlSelected(ev: Event) {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file || !missionId.value) return;
  importingKml.value = true;
  try {
    const parsed = await readKmlFile(file);
    if (!parsed.sectors.length && !parsed.points.length) {
      toast.error("KML tidak berisi polygon/marker");
      return;
    }
    const markers = parsed.points.map((p) => ({
      kind: p.kind,
      label: p.name,
      lat: p.lat,
      lng: p.lng,
      note: p.note,
      color: p.color,
      icon: p.icon,
      created_by: "KML-import",
    }));
    await importSectors(missionId.value, {
      mode: kmlMode.value,
      sectors: parsed.sectors,
      markers,
    });
    const bits = [
      parsed.sectors.length ? `${parsed.sectors.length} karvak` : "",
      markers.length ? `${markers.length} marker` : "",
      parsed.paths.length ? `${parsed.paths.length} path` : "",
    ].filter(Boolean);
    toast.success(`KML diimpor: ${bits.join(" · ")}`);
    await loadBundle();
  } catch (e: any) {
    toast.error(e?.message || "Gagal import KML");
  } finally {
    importingKml.value = false;
  }
}

function setMapScale(denom: number) {
  targetScale.value = null;
  nextTick(() => {
    targetScale.value = denom;
  });
}

function onScaleChange(denom: number) {
  currentScaleDenom.value = denom;
}

watch(
  () => markerForm.kind,
  (kind, prev) => {
    const prevDefault = defaultIconForKind(prev || "custom");
    if (!prev || markerForm.icon === prevDefault) {
      markerForm.icon = defaultIconForKind(kind);
    }
    const prevLabel = defaultLabelForKind(prev || "custom");
    if (!markerForm.label || markerForm.label === prevLabel) {
      markerForm.label = defaultLabelForKind(kind);
    }
  },
);

watch(
  () => [markerForm.lat, markerForm.lng],
  () => {
    if (markerCoordSyncing.value) return;
    if (markerForm.lat != null && markerForm.lng != null) applyMarkerGeoToUtm();
  },
);

watch(
  () => [markerForm.easting, markerForm.northing, markerForm.utm_zone, markerForm.utm_north],
  () => {
    if (markerCoordSyncing.value) return;
    if (markerForm.easting != null && markerForm.northing != null) applyMarkerUtmToGeo();
  },
);

async function onAddSru() {
  if (!missionId.value || !canEditMission.value) return;
  const name = newSruForm.name.trim();
  if (!name) {
    toast.error("Isi nama SRU");
    return;
  }
  sruSaving.value = true;
  try {
    const res = await upsertTeam(missionId.value, {
      sru: name,
      callsign: newSruForm.callsign.trim() || undefined,
      shift_id: bundle.value?.shift?.id,
    });
    toast.success(`${res.team.sru} ditambahkan`);
    newSruForm.name = "";
    newSruForm.callsign = "";
    await loadBundle();
    form.sru = res.team.sru;
    form.member_id = res.member.id;
    focusSru.value = res.team.sru;
  } catch (e: any) {
    toast.error(e?.data?.message || "Gagal menambah SRU");
  } finally {
    sruSaving.value = false;
  }
}

async function onRemoveSru(sru: string) {
  if (!missionId.value || !canEditMission.value) return;
  if (!window.confirm(`Hapus ${sru} dari shift ini? Jejak historis tetap ada.`)) return;
  sruSaving.value = true;
  try {
    await removeTeam(missionId.value, sru, bundle.value?.shift?.id);
    toast.success(`${sru} dihapus`);
    if (form.sru === sru) {
      form.sru = "";
      form.member_id = "";
      focusSru.value = null;
    }
    await loadBundle();
  } catch (e: any) {
    toast.error(e?.data?.message || "Gagal hapus SRU");
  } finally {
    sruSaving.value = false;
  }
}

async function onAssignSector(sectorId: string, sru: string) {
  if (!missionId.value) return;
  assigning.value = true;
  try {
    await assignSector(missionId.value, sectorId, sru);
    toast.success(sru ? `Assigned ${sru}` : "Unassigned");
    await loadBundle();
  } catch {
    toast.error("Gagal assign karvak");
  } finally {
    assigning.value = false;
  }
}

async function submitMarker(opts?: { quiet?: boolean }) {
  if (!missionId.value) {
    toast.error("Pilih misi dulu");
    return;
  }
  const lat = Number(markerForm.lat);
  const lng = Number(markerForm.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    toast.error("Isi koordinat (klik peta atau input manual)");
    return;
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    toast.error("Koordinat di luar rentang");
    return;
  }
  if (!canEditMission.value) {
    toast.error("Misi arsip bersifat baca saja");
    return;
  }
  const editingId = editingMarkerId.value;
  markerSaving.value = true;
  try {
    const body = {
      kind: markerForm.kind,
      label: markerForm.label || defaultLabelForKind(markerForm.kind),
      lat,
      lng,
      note: markerForm.note || undefined,
      icon: markerForm.icon || defaultIconForKind(markerForm.kind),
      created_by: "SMC",
    };
    if (editingId) {
      await updateMarker(missionId.value, editingId, body);
      toast.success("Marker diperbarui");
      editingMarkerId.value = null;
    } else {
      await createMarker(missionId.value, body);
      toast.success(opts?.quiet ? `Pin · ${body.label}` : "Marker ditambahkan");
    }
    markerForm.note = "";
    markerForm.label = defaultLabelForKind(markerForm.kind);
    clearMarkerCoords();
    setMapPickMode("marker");
    await loadBundle();
  } catch (e: any) {
    const msg = e?.data?.message || e?.message || (editingId ? "Gagal update marker" : "Gagal menambah marker");
    toast.error(String(msg));
  } finally {
    markerSaving.value = false;
  }
}

function onPickMarkerKind(kind: string) {
  markerForm.kind = kind;
  markerForm.icon = defaultIconForKind(kind);
  markerForm.label = defaultLabelForKind(kind);
}

function startEditMarker(m: SarMarker) {
  if (!canEditMission.value) {
    toast.error("Misi arsip bersifat baca saja");
    return;
  }
  editingMarkerId.value = m.id;
  markerAdvanced.value = true;
  markerForm.kind = m.kind || "custom";
  markerForm.icon = (m.icon as SarMarkerIconId) || defaultIconForKind(m.kind);
  markerForm.label = m.label || "";
  markerForm.note = m.note || "";
  markerForm.lat = m.lat;
  markerForm.lng = m.lng;
  applyMarkerGeoToUtm();
  aside.value = "marker";
  setMapPickMode("marker");
}

function startEditMarkerById(id: string) {
  const m = (bundle.value?.markers || []).find((x) => x.id === id);
  if (m) startEditMarker(m);
}

function cancelEditMarker() {
  editingMarkerId.value = null;
  markerForm.note = "";
  markerForm.label = defaultLabelForKind(markerForm.kind);
  clearMarkerCoords();
}

async function removeMarker(m: SarMarker) {
  if (!missionId.value || !canEditMission.value) {
    toast.error("Misi arsip bersifat baca saja");
    return;
  }
  if (!window.confirm(`Hapus marker "${m.label}"?`)) return;
  try {
    await deleteMarker(missionId.value, m.id);
    if (editingMarkerId.value === m.id) cancelEditMarker();
    toast.success("Marker dihapus");
    await loadBundle();
  } catch (e: any) {
    toast.error(String(e?.data?.message || e?.message || "Gagal hapus marker"));
  }
}

async function removeMarkerById(id: string) {
  const m = (bundle.value?.markers || []).find((x) => x.id === id);
  if (!m) {
    toast.error("Marker tidak ditemukan");
    return;
  }
  await removeMarker(m);
}

function startEditPositionById(id: string) {
  const p = (bundle.value?.positions || []).find((x) => x.id === id);
  if (p) startEditPosition(p);
}

async function removePositionById(id: string) {
  const p = (bundle.value?.positions || []).find((x) => x.id === id);
  if (!p) {
    toast.error("Jejak posisi tidak ditemukan");
    return;
  }
  await removePosition(p);
}

function exportKml() {
  if (!bundle.value) return;
  const b = bundle.value;
  const trailsMap = new Map<string, { callsign: string; color?: string; points: [number, number][] }>();
  for (const p of b.positions) {
    const m = b.members.find((x) => x.id === p.member_id);
    const key = p.member_id;
    const row = trailsMap.get(key) || {
      callsign: p.callsign,
      color: m ? undefined : "#7c3aed",
      points: [] as [number, number][],
    };
    row.points.push([p.lat, p.lng]);
    trailsMap.set(key, row);
  }
  const trails = [...trailsMap.entries()].map(([mid, t]) => {
    const m = b.members.find((x) => x.id === mid);
    return {
      callsign: t.callsign,
      points: t.points,
      color: m ? colorForSru(m.sru, "#7c3aed") : "#7c3aed",
    };
  });

  const kml = buildMissionKml({
    name: b.mission.name,
    description: b.mission.notes || b.mission.area,
    sectors: b.sectors,
    lastKnown: Object.values(b.last_by_member || {}).map((p) => ({
      callsign: p.callsign,
      lat: p.lat,
      lng: p.lng,
      note: p.note,
      reported_at: p.reported_at,
    })),
    markers: (b.markers || []).map((m) => ({
      kind: m.kind,
      label: m.label,
      lat: m.lat,
      lng: m.lng,
      note: m.note,
      color: m.color,
    })),
    trails,
  });
  downloadKml(`${b.mission.id}-export.kml`, kml);
  toast.success("KML diekspor");
}

const membersSorted = computed(() => {
  const list = bundle.value?.members ?? [];
  return [...list].sort((a, b) => a.sru.localeCompare(b.sru) || a.callsign.localeCompare(b.callsign));
});

const membersOfSelectedSru = computed(() =>
  membersSorted.value.filter((m) => m.sru === form.sru),
);

const positionsOfSelectedSru = computed(() => {
  const memberIds = new Set(membersOfSelectedSru.value.map((m) => m.id));
  const list = (bundle.value?.positions || []).filter((p) => memberIds.has(p.member_id));
  return [...list].sort(
    (a, b) => new Date(b.reported_at).getTime() - new Date(a.reported_at).getTime(),
  );
});

const lastBySru = computed(() =>
  lastKnownBySru(bundle.value?.last_by_member, bundle.value?.members || []),
);

const isArchiveMission = computed(() => bundle.value?.mission.kind === "archive");
const canEditMission = computed(() => !!bundle.value && !isArchiveMission.value);
const canSaveMarker = computed(() => {
  const lat = Number(markerForm.lat);
  const lng = Number(markerForm.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) && canEditMission.value;
});

const sruOptions = computed(() => {
  const fromTeams = (bundle.value?.teams || []).map((t) => t.sru);
  if (fromTeams.length) return [...new Set(fromTeams)].sort();
  const fromApi = bundle.value?.sru_list ?? [];
  if (fromApi.length) return fromApi;
  return [...new Set(membersSorted.value.map((m) => m.sru))].filter(Boolean).sort();
});

const sruFleet = computed(() =>
  sruOptions.value.map((sru) => {
    const last = lastBySru.value[sru];
    const live = (bundle.value?.live_tracks || []).find((t) => t.sru === sru && t.active) || null;
    const memberIds = new Set(
      (bundle.value?.members || []).filter((m) => m.sru === sru).map((m) => m.id),
    );
    const pts = (bundle.value?.positions || []).filter((p) => memberIds.has(p.member_id));
    const stats = trackStats(pts.length ? pts : last ? [{ lat: last.lat, lng: last.lng, reported_at: last.reported_at }] : []);
    const pingAt = live?.last_at || last?.reported_at;
    const source = last?.source || (live?.last_at ? "gps" : undefined);
    return {
      sru,
      short: sru.replace(/^SRU-/, ""),
      color: colorForSru(sru),
      last,
      live,
      freshness: sruFreshness(pingAt, Date.now(), source),
      source,
      stats,
      focused: focusSru.value === sru,
    };
  }),
);

const hasActiveLiveTracks = computed(() =>
  (bundle.value?.live_tracks || []).some((t) => t.active),
);

/** Trails for coverage: one path per SRU; people = override || roster. */
const coverageTrails = computed((): CoverageTrail[] => {
  const b = bundle.value;
  if (!b || !coverage.enabled) return [];
  const memberSru = new Map(b.members.map((m) => [m.id, m.sru]));
  const bySru = new Map<string, { lat: number; lng: number; t: number }[]>();
  for (const p of b.positions) {
    const sru = memberSru.get(p.member_id);
    if (!sru) continue;
    const lat = Number(p.lat);
    const lng = Number(p.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const list = bySru.get(sru) || [];
    list.push({ lat, lng, t: new Date(p.reported_at).getTime() });
    bySru.set(sru, list);
  }
  const out: CoverageTrail[] = [];
  for (const [sru, pts] of bySru) {
    if (!pts.length) continue;
    pts.sort((a, b) => a.t - b.t);
    const roster = b.members.filter((m) => m.sru === sru).length;
    out.push({
      sru,
      path: pts.map((p) => ({ lat: p.lat, lng: p.lng })),
      people: resolvePeopleCount(sru, roster, coverage.peopleBySru),
      color: colorForSru(sru),
    });
  }
  return out;
});

const coverageSruPeople = computed(() => {
  const b = bundle.value;
  if (!b) return [];
  const seen = new Set<string>();
  const rows: Array<{ sru: string; short: string; roster: number; color: string }> = [];
  for (const t of b.teams || []) {
    if (seen.has(t.sru)) continue;
    seen.add(t.sru);
    const roster = Math.max(1, b.members.filter((m) => m.sru === t.sru).length);
    rows.push({
      sru: t.sru,
      short: t.sru.replace(/^SRU-/, ""),
      roster,
      color: t.color || colorForSru(t.sru),
    });
  }
  for (const sru of sruOptions.value) {
    if (seen.has(sru)) continue;
    seen.add(sru);
    const roster = Math.max(1, b.members.filter((m) => m.sru === sru).length);
    rows.push({
      sru,
      short: sru.replace(/^SRU-/, ""),
      roster,
      color: colorForSru(sru),
    });
  }
  return rows;
});

const coverageCorridors = computed(() => {
  if (!coverage.enabled) return [];
  return buildCorridors(coverageTrails.value, coverage.pattern, coverage.spacingM);
});

const sectorCoverage = computed(() => {
  if (!coverage.enabled) return [];
  const sectors = (bundle.value?.sectors || []).map((s) => ({
    id: s.id,
    code: s.code || s.label || s.id,
    ring: (s.ring || []) as [number, number][],
    assigned_sru: s.assigned_sru,
  }));
  return estimateSectorCoverage(
    sectors,
    coverageTrails.value,
    coverage.pattern,
    coverage.spacingM,
  );
});

const focusedFleet = computed(() => sruFleet.value.find((f) => f.sru === form.sru) || null);

watch(
  () => form.sru,
  (sru) => {
    if (!sru) return;
    const list = membersSorted.value.filter((m) => m.sru === sru);
    if (!list.some((m) => m.id === form.member_id)) {
      form.member_id = list[0]?.id || "";
    }
  },
);

const asideTitle = computed(() => {
  if (aside.value === "members") return "Roster SRU";
  if (aside.value === "ht") return "Lacak SRU · log radio";
  if (aside.value === "assign") return "Assign SRU ↔ Karvak";
  if (aside.value === "marker") return "Tandai marker";
  if (aside.value === "measure") return "Ukur jarak & ETA";
  if (aside.value === "history") return "Hari / roster & gear";
  if (aside.value === "settings") return "Pengaturan peta";
  if (aside.value === "share") return "Share publik";
  return "";
});

function onWeatherVisibility(v: boolean) {
  showWeather.value = v;
}

const isHistoryDay = computed(() => bundle.value?.shift?.status === "closed");

const shiftLabel = computed(() => {
  const sh = bundle.value?.shift;
  if (!sh) return "";
  return `${sh.date} · ${sh.label}`;
});

function formatDayOption(sh: { date: string; label: string; status: string }) {
  const tag = sh.status === "active" ? "hari ini" : "arsip";
  return `${sh.date} (${tag}) — ${sh.label}`;
}

watch(missionId, () => {
  selectedDay.value = "";
  void loadBundle();
});

watch(selectedDay, (day, prev) => {
  if (!day || day === prev) return;
  void loadBundle();
});

/** Soft-poll while any SRU has live GPS — keeps map trails fresh without SSE yet. */
let livePollTimer: ReturnType<typeof setInterval> | null = null;
watch(
  hasActiveLiveTracks,
  (on) => {
    if (livePollTimer) {
      clearInterval(livePollTimer);
      livePollTimer = null;
    }
    if (!on || !import.meta.client) return;
    livePollTimer = setInterval(() => {
      if (document.visibilityState === "hidden") return;
      void loadBundle({ silent: true });
    }, 8000);
  },
  { immediate: true },
);
onBeforeUnmount(() => {
  if (livePollTimer) clearInterval(livePollTimer);
});

watch(
  () => [form.lat, form.lng],
  () => {
    if (coordSyncing.value) return;
    if (form.lat != null && form.lng != null) applyGeoToUtm();
  },
);

watch(
  () => [form.easting, form.northing, form.utm_zone, form.utm_north],
  () => {
    if (coordSyncing.value) return;
    if (form.easting != null && form.northing != null) applyUtmToGeo();
  },
);

onMounted(async () => {
  await loadStatus();
  if (appStatus.value?.enabled) {
    await loadList();
    // Stay on hub so user can browse ESAR history first.
    // Auto-open active mission only if already onboarded and they prefer — keep hub.
    loading.value = false;
  } else {
    loading.value = false;
  }
});
</script>

<template>
  <div class="px-4 sm:px-6 pb-6 space-y-3">
    <div v-if="appPhase === 'loading'" class="pt-16 text-center text-sm text-neutral-500">
      Memuat status aplikasi…
    </div>

    <SarAppInactive
      v-else-if="appPhase === 'inactive'"
      :toggling="toggling"
      @enable="onToggleEnabled(true)"
    />

    <SarHistoryHub
      v-else-if="appPhase === 'hub'"
      :app-status="appStatus"
      :missions="missions"
      :toggling="toggling"
      @disable="onToggleEnabled(false)"
      @onboard="startOnboarding"
      @open="openMissionFromHub"
      @open-active="appStatus?.active_mission_id && openMissionFromHub(appStatus.active_mission_id)"
    />

    <div v-else-if="appPhase === 'onboarding'" class="pt-4 space-y-4">
      <div class="flex items-center justify-between gap-3">
        <button type="button" class="text-sm text-neutral-600 hover:text-neutral-900 inline-flex items-center gap-1" @click="goHub">
          <Icon icon="lucide:arrow-left" class="text-base" />
          Kembali ke history
        </button>
        <button
          type="button"
          class="text-xs text-neutral-500 hover:text-neutral-800 underline"
          :disabled="toggling"
          @click="onToggleEnabled(false)"
        >
          Nonaktifkan
        </button>
      </div>
      <SarOnboardingWizard @done="onOnboardDone" />
    </div>

    <template v-else-if="appPhase === 'ready'">
    <div class="flex flex-wrap items-center gap-2 justify-between pt-1">
      <div class="min-w-0">
        <button type="button" class="text-[11px] font-semibold uppercase tracking-wide text-violet-700 hover:underline" @click="goHub">
          ← History ESAR · SMC
        </button>
        <h1 class="text-base sm:text-lg font-semibold text-neutral-900 truncate">
          {{ bundle?.mission.name }}
        </h1>
        <p v-if="isArchiveMission" class="text-[11px] text-amber-700 mt-0.5">
          Arsip ESAR · view-only (tidak bisa edit)
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <label class="inline-flex items-center gap-2 text-xs text-neutral-600 border border-neutral-200 rounded-lg px-2.5 py-2 bg-white">
          <span>App</span>
          <button
            type="button"
            class="relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors"
            :class="appStatus?.enabled ? 'bg-emerald-500' : 'bg-neutral-300'"
            :disabled="toggling"
            @click="onToggleEnabled(!appStatus?.enabled)"
          >
            <span
              class="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
              :class="appStatus?.enabled ? 'left-4' : 'left-0.5'"
            />
          </button>
        </label>
        <select
          v-model="missionId"
          class="text-sm border border-neutral-200 rounded-lg px-3 py-2 bg-white max-w-[220px]"
        >
          <option disabled value="">Pilih misi…</option>
          <option v-for="m in missions" :key="m.id" :value="m.id">{{ m.name }}</option>
        </select>
        <select
          v-model="selectedDay"
          class="text-sm border border-neutral-200 rounded-lg px-3 py-2 bg-white max-w-[280px]"
          :disabled="!(bundle?.shifts || []).length"
        >
          <option v-for="sh in bundle?.shifts || []" :key="sh.id" :value="sh.date">
            {{ formatDayOption(sh) }}
          </option>
        </select>
        <UiButton variant="secondary" size="sm" @click="refresh">
          <Icon icon="lucide:refresh-cw" class="text-sm" />
        </UiButton>
      </div>
    </div>

    <div
      v-if="loadError"
      class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
    >
      {{ loadError }}
    </div>

    <div class="relative w-full rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100 shadow-sm">
      <div class="relative z-0">
        <SruMissionMap
          v-if="bundle"
          :mission="bundle.mission"
          :sectors="bundle.sectors"
          :members="bundle.members"
          :positions="bundle.positions"
          :markers="bundle.markers || []"
          :last-by-sru="lastBySru"
          :focus-sru="focusSru"
          :basemap="basemap"
          :show-grid="showGrid"
          :show-contours="showContours"
          :show-weather="showWeather"
          :show-radar="showRadar"
          :weather-point="weatherPoint"
          :weather-grid="weatherGrid"
          :weather-alerts="weatherAlerts"
          :pick-mode="canEditMission || mapPickMode === 'measure' ? mapPickMode : 'idle'"
          :measure-points="measurePoints"
          :readonly="!canEditMission && mapPickMode !== 'measure'"
          :draft-marker="draftMarker"
          :target-scale="targetScale"
          :coord-mode="mapSettings.coordMode"
          :show-coverage="coverage.enabled"
          :coverage-corridors="coverageCorridors"
          :sector-coverage="sectorCoverage"
          @map-click="onMapClick"
          @place-marker="onPlaceMarker"
          @edit-marker="startEditMarkerById"
          @delete-marker="removeMarkerById"
          @edit-position="startEditPositionById"
          @delete-position="removePositionById"
          @select-sru="selectSru"
          @scale-change="onScaleChange"
          @weather-visibility="onWeatherVisibility"
        />
        <div
          v-else-if="loading"
          class="w-full h-[min(720px,calc(100vh-11rem))] min-h-[480px] animate-pulse bg-neutral-100"
        />
        <div
          v-else
          class="w-full h-[min(720px,calc(100vh-11rem))] min-h-[480px] flex items-center justify-center text-sm text-neutral-500 px-6 text-center"
        >
          Belum ada data misi. Pastikan API SAR aktif lalu Refresh.
        </div>
      </div>

      <!-- UI chrome above Leaflet (pointer-events island pattern) -->
      <div
        v-if="bundle"
        class="absolute inset-0 z-[5000] pointer-events-none"
      >
      <div
        v-if="!mapSettings.toolbarHidden"
        ref="toolsEl"
        class="absolute top-3 left-3 flex flex-col gap-1 w-[7.25rem] max-h-[calc(100%-5rem)] overflow-y-auto overflow-x-hidden pr-0.5 pointer-events-auto isolate"
      >
        <div class="flex items-center gap-0.5">
            <button
              type="button"
              class="flex-1 inline-flex items-center justify-between rounded-md bg-white/95 border border-neutral-200 shadow-sm px-1.5 py-1 text-[11px] font-semibold text-neutral-800"
              @click.stop="mapSettings.toolbarOpen = !mapSettings.toolbarOpen"
            >
              Tools
              <Icon :icon="mapSettings.toolbarOpen ? 'lucide:chevron-up' : 'lucide:chevron-down'" class="text-xs pointer-events-none" />
            </button>
            <button
              type="button"
              class="rounded-md bg-white/95 border border-neutral-200 shadow-sm w-7 h-7 inline-flex items-center justify-center text-neutral-500"
              title="Sembunyikan toolbar"
              @click.stop="mapSettings.toolbarHidden = true"
            >
              <Icon icon="lucide:eye-off" class="text-xs pointer-events-none" />
            </button>
          </div>
          <template v-if="mapSettings.toolbarOpen">
            <template v-if="canEditMission">
              <p class="text-[9px] font-semibold uppercase tracking-wide text-neutral-400 px-0.5 pt-0.5">Ops</p>
              <button
                type="button"
                class="sar-tool-btn"
                title="Lacak SRU"
                :class="mapPickMode === 'radio' ? 'ring-2 ring-sky-500 bg-sky-50' : ''"
                @click.stop="openAside('ht')"
              >
                <Icon icon="lucide:radio" class="pointer-events-none" /> Lacak
              </button>
              <button
                type="button"
                class="sar-tool-btn"
                title="Tandai marker"
                :class="mapPickMode === 'marker' ? 'ring-2 ring-violet-500 bg-violet-50' : ''"
                @click.stop="openAside('marker')"
              >
                <Icon icon="lucide:map-pin-plus" class="pointer-events-none" /> Pin
              </button>
              <button
                type="button"
                class="sar-tool-btn"
                title="Assign karvak"
                :class="aside === 'assign' ? 'ring-2 ring-violet-500' : ''"
                @click.stop="openAside('assign')"
              >
                <Icon icon="lucide:link" class="pointer-events-none" /> Assign
              </button>
            </template>
            <p v-else class="text-[9px] text-amber-700 px-0.5 pt-0.5 leading-snug">
              Arsip · baca saja
            </p>
            <p class="text-[9px] font-semibold uppercase tracking-wide text-neutral-400 px-0.5 pt-0.5">Alat</p>
            <button
              type="button"
              class="sar-tool-btn"
              title="Ukur jarak"
              :class="mapPickMode === 'measure' ? 'ring-2 ring-teal-500 bg-teal-50' : ''"
              @click.stop="openAside('measure')"
            >
              <Icon icon="lucide:ruler" class="pointer-events-none" /> Ukur
            </button>
            <p class="text-[9px] font-semibold uppercase tracking-wide text-neutral-400 px-0.5 pt-0.5">Data</p>
            <button type="button" class="sar-tool-btn" title="Hari / Gear" :class="aside === 'history' ? 'ring-2 ring-violet-500' : ''" @click.stop="openAside('history')">
              <Icon icon="lucide:calendar-days" class="pointer-events-none" /> Hari
            </button>
            <button type="button" class="sar-tool-btn" title="Roster" :class="aside === 'members' ? 'ring-2 ring-violet-500' : ''" @click.stop="openAside('members')">
              <Icon icon="lucide:users" class="pointer-events-none" /> Roster
            </button>
            <button type="button" class="sar-tool-btn" title="Share" :class="aside === 'share' ? 'ring-2 ring-violet-500' : ''" @click.stop="openAside('share')">
              <Icon icon="lucide:share-2" class="pointer-events-none" /> Share
            </button>
            <p class="text-[9px] font-semibold uppercase tracking-wide text-neutral-400 px-0.5 pt-0.5">Peta</p>
            <button type="button" class="sar-tool-btn" title="Settings" :class="aside === 'settings' ? 'ring-2 ring-violet-500' : ''" @click.stop="openAside('settings')">
              <Icon icon="lucide:settings" class="pointer-events-none" /> Set
            </button>
          </template>
      </div>
      <button
        v-if="mapSettings.toolbarHidden"
        type="button"
        class="absolute top-3 left-3 rounded-lg bg-white/95 border border-neutral-200 shadow-sm px-2.5 py-2 text-xs font-medium text-neutral-700 pointer-events-auto"
        @click.stop="mapSettings.toolbarHidden = false"
      >
        <Icon icon="lucide:panel-left" class="inline text-sm mr-1 pointer-events-none" /> Tools
      </button>

      <div
        class="absolute bottom-3 left-3 max-w-[min(100%,24rem)] rounded-lg bg-black/55 text-white text-xs px-3 py-2 backdrop-blur-sm"
      >
        <span v-if="shiftLabel">{{ shiftLabel }} · </span>
        {{ isHistoryDay ? "Arsip jejak" : "Live" }} ·
        SRU {{ (bundle.teams || []).length }} ·
        Karvak {{ bundle.sectors.length }} · Marker {{ (bundle.markers || []).length }}
      </div>

      <!-- Pin kind chips (map-surface, like Lacak fleet) -->
      <div
        v-if="mapPickMode === 'marker' && canEditMission && !editingMarkerId"
        class="absolute bottom-14 left-1/2 -translate-x-1/2 flex flex-wrap justify-center gap-1.5 max-w-[min(92%,28rem)] pointer-events-auto"
      >
        <button
          v-for="k in PIN_KINDS"
          :key="`pin-kind-${k.id}`"
          type="button"
          class="inline-flex items-center gap-1 rounded-full bg-white/95 border shadow-sm px-2.5 py-1 text-[11px] font-semibold transition-colors"
          :class="markerForm.kind === k.id
            ? 'border-violet-500 ring-1 ring-violet-300 text-violet-900 bg-violet-50'
            : 'border-neutral-200 text-neutral-700 hover:bg-white'"
          :title="k.label"
          @click.stop="onPickMarkerKind(k.id)"
        >
          <span class="text-sm leading-none">{{ SAR_MARKER_ICONS.find((i) => i.id === defaultIconForKind(k.id))?.glyph || "📍" }}</span>
          {{ k.short }}
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-full bg-violet-700 text-white shadow-sm px-2.5 py-1 text-[11px] font-semibold hover:bg-violet-800"
          title="Daftar & edit pin"
          @click.stop="aside = aside === 'marker' ? null : 'marker'"
        >
          <Icon icon="lucide:list" class="text-xs pointer-events-none" />
          {{ (bundle.markers || []).length }}
        </button>
      </div>

      <!-- Fleet status chips -->
      <div
        v-else-if="sruFleet.length"
        class="absolute bottom-14 left-1/2 -translate-x-1/2 flex flex-wrap justify-center gap-1.5 max-w-[min(92%,28rem)] pointer-events-auto"
      >
        <button
          v-for="f in sruFleet"
          :key="`fleet-${f.sru}`"
          type="button"
          class="inline-flex items-center gap-1.5 rounded-full bg-white/95 border shadow-sm pl-1.5 pr-2.5 py-1 text-[11px] font-semibold text-neutral-800 hover:bg-white"
          :class="f.focused ? 'border-sky-400 ring-1 ring-sky-300' : 'border-neutral-200'"
          :title="f.last ? `${f.sru} · ${ageLabel(f.last.reported_at)} · ${f.stats.distanceLabel}` : `${f.sru} · belum ada jejak`"
          @click.stop="selectSru(f.sru)"
        >
          <span class="w-2 h-2 rounded-full" :style="{ background: f.color }" />
          {{ f.short }}
          <span
            v-if="f.live"
            class="text-[8px] font-bold uppercase text-emerald-700"
          >GPS</span>
          <span
            class="text-[9px] font-medium"
            :class="f.freshness === 'fresh' ? 'text-emerald-600' : f.freshness === 'aging' ? 'text-amber-600' : 'text-neutral-400'"
          >
            {{ f.last ? ageLabel(f.last.reported_at) : "—" }}
          </span>
        </button>
      </div>

      <!-- Compact forecast chip on map -->
      <div
        v-if="showForecastPanel && weatherPoint"
        class="absolute top-3 right-14 max-w-[15rem] rounded-lg bg-white/95 border border-neutral-200 shadow-sm px-3 py-2 text-xs text-neutral-700 pointer-events-auto"
      >
        <div class="flex items-start justify-between gap-2">
          <div>
            <p class="font-semibold text-neutral-900">
              {{ weatherPoint.glyph }} {{ Math.round(weatherPoint.tempC) }}° · {{ weatherPoint.label }}
            </p>
            <p class="text-neutral-500 mt-0.5">
              Angin {{ Math.round(weatherPoint.windKmh) }} km/j · gust {{ Math.round(weatherPoint.gustKmh) }}
            </p>
            <p class="text-[10px] text-neutral-400 mt-1">Open-Meteo forecast</p>
          </div>
          <button
            type="button"
            class="text-neutral-400 hover:text-neutral-700"
            title="Buka Settings cuaca"
            @click.stop="openAside('settings')"
          >
            <Icon icon="lucide:chevron-right" class="text-base pointer-events-none" />
          </button>
        </div>
        <div v-if="hourlyPreview.length" class="mt-2 flex gap-1 overflow-x-auto">
          <div
            v-for="h in hourlyPreview.slice(0, 4)"
            :key="h.time"
            class="shrink-0 text-center px-1"
          >
            <p class="text-[9px] text-neutral-400">{{ new Date(h.time).getHours() }}j</p>
            <p>{{ h.glyph }}</p>
            <p class="font-medium">{{ Math.round(h.tempC) }}°</p>
          </div>
        </div>
      </div>
      <div
        v-else-if="showForecastPanel && weatherLoading"
        class="absolute top-3 right-14 rounded-lg bg-white/95 border border-neutral-200 shadow-sm px-3 py-2 text-xs text-neutral-500"
      >
        Memuat cuaca…
      </div>

      <Transition name="aside-slide">
        <aside
          v-if="aside"
          class="absolute inset-y-0 right-0 w-full max-w-md bg-white border-l border-neutral-200 shadow-xl flex flex-col pointer-events-auto"
        >
          <div class="flex items-center justify-between gap-2 px-4 py-3 border-b border-neutral-200">
            <h2 class="text-sm font-semibold text-neutral-900">{{ asideTitle }}</h2>
            <button
              type="button"
              class="w-8 h-8 rounded-lg hover:bg-neutral-100 inline-flex items-center justify-center text-neutral-500"
              @click.stop="closeAside"
            >
              <Icon icon="lucide:x" class="text-lg pointer-events-none" />
            </button>
          </div>

          <div class="flex-1 overflow-y-auto p-4 space-y-4">
            <template v-if="aside === 'history'">
              <p class="text-xs text-neutral-500 leading-snug">
                Tiap hari = 1 shift: roster SRU, assign karvak, perlengkapan, dan jejak HT terpisah.
                Pilih tanggal di toolbar untuk melihat history perjalanan.
              </p>
              <div class="rounded-lg border border-neutral-200 p-3 text-sm space-y-1">
                <p class="font-semibold text-neutral-900">{{ bundle?.shift?.label || "—" }}</p>
                <p class="text-xs text-neutral-500">
                  {{ bundle?.shift?.date }} ·
                  <span :class="isHistoryDay ? 'text-amber-700' : 'text-emerald-700'">
                    {{ isHistoryDay ? "arsip (closed)" : "aktif" }}
                  </span>
                </p>
              </div>
              <ul class="space-y-3">
                <li
                  v-for="t in bundle?.teams || []"
                  :key="t.sru"
                  class="rounded-lg border border-neutral-200 p-3 space-y-2"
                >
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full" :style="{ background: t.color }" />
                    <p class="text-sm font-semibold text-neutral-900">{{ t.sru }}</p>
                  </div>
                  <p class="text-xs text-neutral-500">
                    Karvak: {{ (t.assigned_sectors || []).join(", ") || "—" }}
                  </p>
                  <p v-if="t.notes" class="text-xs text-neutral-600 italic">{{ t.notes }}</p>
                  <div>
                    <p class="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 mb-1">
                      Perlengkapan
                    </p>
                    <ul class="text-xs text-neutral-700 space-y-0.5">
                      <li v-for="(g, gi) in t.equipment || []" :key="gi">
                        {{ g.name }} — {{ g.qty }}{{ g.unit ? ` ${g.unit}` : "" }}
                      </li>
                      <li v-if="!(t.equipment || []).length" class="text-neutral-400">Tidak ada data gear</li>
                    </ul>
                  </div>
                  <div>
                    <p class="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 mb-1">
                      Personil
                    </p>
                    <ul class="text-xs text-neutral-700 space-y-0.5">
                      <li
                        v-for="m in membersSorted.filter((x) => x.sru === t.sru)"
                        :key="m.id"
                      >
                        {{ m.callsign }} · {{ m.name }} · {{ m.role }}
                      </li>
                    </ul>
                  </div>
                </li>
              </ul>
              <p v-if="!(bundle?.teams || []).length" class="text-sm text-neutral-500">
                Belum ada roster untuk hari ini.
              </p>
            </template>

            <template v-else-if="aside === 'members'">
              <p class="text-xs text-neutral-500">Klik SRU untuk buka log radio & fokusasi last known unit.</p>
              <ul class="space-y-2">
                <li
                  v-for="sru in sruOptions"
                  :key="sru"
                  class="rounded-xl border border-neutral-200 overflow-hidden"
                  :class="focusSru === sru ? 'ring-2 ring-violet-400' : ''"
                >
                  <button
                    type="button"
                    class="w-full text-left px-3 py-2.5 hover:bg-neutral-50"
                    @click="selectSru(sru)"
                  >
                    <p class="text-sm font-semibold text-neutral-900">{{ sru }}</p>
                    <p class="text-xs text-neutral-500 mt-0.5">
                      <template v-if="lastBySru[sru]">
                        Last: {{ ageLabel(lastBySru[sru].reported_at) }}
                        <span v-if="lastBySru[sru].callsign"> · radio {{ lastBySru[sru].callsign }}</span>
                        <span class="block font-mono text-[10px] text-neutral-400 mt-0.5">
                          {{ formatCoordPlain(lastBySru[sru].lat, lastBySru[sru].lng, mapSettings.coordMode) }}
                        </span>
                      </template>
                      <span v-else class="text-amber-700">Belum ada laporan</span>
                    </p>
                  </button>
                  <div
                    v-if="canEditMission && lastBySru[sru]?.id"
                    class="flex gap-2 px-3 py-1.5 border-t border-neutral-100 bg-white text-[11px]"
                  >
                    <button
                      type="button"
                      class="text-violet-700 hover:underline"
                      @click="startEditPositionFromLast(sru)"
                    >
                      Edit last
                    </button>
                    <button
                      type="button"
                      class="text-red-600 hover:underline"
                      @click="removeLastKnown(sru)"
                    >
                      Hapus last
                    </button>
                  </div>
                  <ul class="border-t border-neutral-100 divide-y divide-neutral-50 bg-neutral-50/50">
                    <li
                      v-for="m in membersSorted.filter((x) => x.sru === sru)"
                      :key="m.id"
                      class="px-3 py-1.5 text-xs text-neutral-600 flex justify-between gap-2"
                    >
                      <span>{{ m.callsign }} · {{ m.role }}</span>
                      <span class="text-neutral-400">{{ m.status }}</span>
                    </li>
                  </ul>
                </li>
              </ul>
            </template>

            <template v-else-if="aside === 'ht'">
              <p v-if="isHistoryDay" class="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2">
                Mode arsip: jejak hari {{ bundle?.shift?.date }} hanya untuk review.
              </p>

              <div class="rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-2 text-xs text-sky-950 leading-snug">
                <p class="font-semibold">Quick-log jejak SRU</p>
                <p class="mt-0.5 opacity-90">
                  Pilih unit → klik peta → otomatis tercatat. Jejak tampil sebagai track di peta.
                </p>
              </div>

              <div>
                <div class="flex items-center justify-between gap-2 mb-1.5">
                  <p class="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">SRU</p>
                  <button
                    v-if="focusSru"
                    type="button"
                    class="text-[11px] text-neutral-500 hover:text-neutral-800 underline"
                    @click="clearSruFocus"
                  >
                    Tampilkan semua
                  </button>
                </div>
                <div class="flex flex-wrap gap-1.5">
                  <button
                    v-for="f in sruFleet"
                    :key="f.sru"
                    type="button"
                    class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors"
                    :class="form.sru === f.sru
                      ? 'border-sky-500 bg-sky-50 text-sky-900 ring-1 ring-sky-400'
                      : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'"
                    @click="selectSru(f.sru)"
                  >
                    <span class="w-2 h-2 rounded-full shrink-0" :style="{ background: f.color }" />
                    {{ f.short }}
                    <span
                      v-if="f.live"
                      class="text-[9px] font-bold uppercase tracking-wide text-emerald-700"
                      title="Live GPS aktif"
                    >GPS</span>
                    <span
                      class="w-1.5 h-1.5 rounded-full shrink-0"
                      :class="f.freshness === 'fresh' ? 'bg-emerald-500' : f.freshness === 'aging' ? 'bg-amber-400' : 'bg-neutral-300'"
                      :title="f.last ? ageLabel(f.last.reported_at) : 'Belum ada jejak'"
                    />
                  </button>
                </div>
              </div>

              <SarLiveTrackPanel
                v-if="form.sru && canEditMission"
                :mission-id="missionId"
                :sru="form.sru"
                :shift-id="bundle?.shift?.id"
                :member-id="form.member_id || undefined"
                :members="bundle?.members || []"
                :tracks="bundle?.live_tracks || []"
                :can-edit="canEditMission"
                @refreshed="loadBundle"
              />

              <SarCoveragePanel
                :coverage="coverage"
                :sector-stats="sectorCoverage"
                :sru-people="coverageSruPeople"
                @set-people="setPeopleOverride"
              />

              <div
                v-if="form.sru && canEditMission && !editingPositionId"
                class="rounded-lg bg-neutral-50 border border-neutral-200 px-2.5 py-2 text-xs text-neutral-600"
              >
                <p class="font-medium text-neutral-900">
                  Siap log · {{ form.sru }}
                </p>
                <p class="mt-0.5">
                  {{ submitting ? "Menyimpan…" : "Klik peta untuk catat posisi sekarang." }}
                </p>
                <p v-if="focusedFleet?.stats.pointCount" class="mt-1 text-neutral-500">
                  Jejak {{ focusedFleet.stats.distanceLabel }} · {{ focusedFleet.stats.pointCount }} titik
                  <span v-if="focusedFleet.last"> · {{ ageLabel(focusedFleet.last.reported_at) }}</span>
                </p>
              </div>

              <div
                v-if="editingPositionId"
                class="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-900 flex items-center justify-between gap-2"
              >
                <span>Mengedit jejak — klik peta atau isi koordinat, lalu simpan</span>
                <button type="button" class="underline shrink-0" @click="cancelEditPosition">Batal</button>
              </div>

              <div v-if="form.sru" class="space-y-2">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                  Timeline {{ form.sru }}
                </p>
                <ul class="divide-y divide-neutral-100 rounded-lg border border-neutral-200 overflow-hidden max-h-52 overflow-y-auto">
                  <li
                    v-for="(p, idx) in positionsOfSelectedSru"
                    :key="p.id"
                    class="px-3 py-2 text-sm"
                    :class="editingPositionId === p.id ? 'bg-amber-50' : ''"
                  >
                    <div class="flex items-start justify-between gap-2">
                      <div class="min-w-0">
                        <p class="font-medium text-neutral-900 truncate">
                          #{{ positionsOfSelectedSru.length - idx }}
                          <span class="text-neutral-400 font-normal">· {{ ageLabel(p.reported_at) }}</span>
                          <span
                            v-if="p.source === 'gps'"
                            class="ml-1 text-[9px] font-bold uppercase text-emerald-700"
                          >GPS</span>
                          <span
                            v-else-if="p.source === 'ht'"
                            class="ml-1 text-[9px] font-bold uppercase text-sky-700"
                          >HT</span>
                        </p>
                        <p class="text-[10px] text-neutral-400 font-mono truncate">
                          {{ formatCoordPlain(p.lat, p.lng, mapSettings.coordMode) }}
                        </p>
                        <p v-if="p.note" class="text-xs text-neutral-500 truncate italic">{{ p.note }}</p>
                      </div>
                      <div v-if="canEditMission" class="flex flex-col gap-1 shrink-0 text-xs">
                        <button type="button" class="text-violet-700 hover:underline" @click="startEditPosition(p)">
                          Edit
                        </button>
                        <button type="button" class="text-red-600 hover:underline" @click="removePosition(p)">
                          Hapus
                        </button>
                      </div>
                    </div>
                  </li>
                  <li v-if="!positionsOfSelectedSru.length" class="px-3 py-3 text-xs text-neutral-500">
                    Belum ada jejak — klik peta untuk titik pertama
                  </li>
                </ul>
              </div>

              <details
                class="rounded-lg border border-neutral-200 open:bg-neutral-50/60"
                :open="htAdvanced || !!editingPositionId"
                @toggle="htAdvanced = ($event.target as HTMLDetailsElement).open"
              >
                <summary class="cursor-pointer select-none px-3 py-2 text-xs font-semibold text-neutral-700">
                  Advanced · callsign, koordinat, catatan
                </summary>
                <div class="px-3 pb-3 space-y-3 border-t border-neutral-100 pt-3">
                  <label class="block text-xs font-medium text-neutral-600">
                    Radio / callsign
                    <select
                      v-model="form.member_id"
                      class="mt-1 w-full text-sm border border-neutral-200 rounded-lg px-2.5 py-2 bg-white"
                      :disabled="!form.sru"
                    >
                      <option v-for="m in membersOfSelectedSru" :key="m.id" :value="m.id">
                        {{ m.callsign }} — {{ m.role }}
                      </option>
                    </select>
                  </label>

                  <div v-if="showGeo" class="rounded-lg border border-neutral-200 p-2.5 space-y-2 bg-white">
                    <p class="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Geografis</p>
                    <div class="grid grid-cols-2 gap-2">
                      <label class="block text-xs font-medium text-neutral-600">
                        Lat
                        <input
                          v-model.number="form.lat"
                          type="number"
                          step="0.0000001"
                          class="mt-1 w-full text-sm border border-neutral-200 rounded-lg px-2.5 py-2"
                          placeholder="-7.54"
                        >
                      </label>
                      <label class="block text-xs font-medium text-neutral-600">
                        Lng
                        <input
                          v-model.number="form.lng"
                          type="number"
                          step="0.0000001"
                          class="mt-1 w-full text-sm border border-neutral-200 rounded-lg px-2.5 py-2"
                          placeholder="110.44"
                        >
                      </label>
                    </div>
                  </div>

                  <div v-if="showUtm" class="rounded-lg border border-neutral-200 p-2.5 space-y-2 bg-white">
                    <p class="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">UTM</p>
                    <div class="grid grid-cols-3 gap-2">
                      <label class="block text-xs font-medium text-neutral-600">
                        Zone
                        <input
                          v-model.number="form.utm_zone"
                          type="number"
                          min="1"
                          max="60"
                          class="mt-1 w-full text-sm border border-neutral-200 rounded-lg px-2.5 py-2"
                        >
                      </label>
                      <label class="block text-xs font-medium text-neutral-600 col-span-2">
                        Hemisphere
                        <select
                          class="mt-1 w-full text-sm border border-neutral-200 rounded-lg px-2.5 py-2 bg-white"
                          :value="form.utm_north ? 'N' : 'S'"
                          @change="form.utm_north = ($event.target as HTMLSelectElement).value === 'N'"
                        >
                          <option value="S">South (S)</option>
                          <option value="N">North (N)</option>
                        </select>
                      </label>
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                      <label class="block text-xs font-medium text-neutral-600">
                        Easting
                        <input
                          v-model.number="form.easting"
                          type="number"
                          step="0.001"
                          class="mt-1 w-full text-sm border border-neutral-200 rounded-lg px-2.5 py-2"
                          placeholder="438000"
                        >
                      </label>
                      <label class="block text-xs font-medium text-neutral-600">
                        Northing
                        <input
                          v-model.number="form.northing"
                          type="number"
                          step="0.001"
                          class="mt-1 w-full text-sm border border-neutral-200 rounded-lg px-2.5 py-2"
                          placeholder="9165000"
                        >
                      </label>
                    </div>
                  </div>

                  <label class="block text-xs font-medium text-neutral-600">
                    Catatan radio
                    <input
                      v-model="form.note"
                      type="text"
                      class="mt-1 w-full text-sm border border-neutral-200 rounded-lg px-2.5 py-2"
                      placeholder="HT: Alpha dekat batas A1/B1"
                    >
                  </label>

                  <UiButton
                    class="w-full"
                    :loading="submitting"
                    :disabled="submitting || !missionId || !form.sru || !canEditMission"
                    @click="submitHtLog()"
                  >
                    <Icon :icon="editingPositionId ? 'lucide:save' : 'lucide:radio'" class="text-sm" />
                    {{ editingPositionId ? "Simpan perubahan" : "Catat posisi (manual)" }}
                  </UiButton>
                </div>
              </details>
            </template>

            <template v-else-if="aside === 'assign'">
              <p class="text-xs text-neutral-500 leading-snug">
                Pasangkan setiap karvak ke SRU yang bertanggung jawab di sektor itu.
              </p>
              <ul class="space-y-2">
                <li
                  v-for="s in bundle?.sectors || []"
                  :key="s.id"
                  class="rounded-lg border border-neutral-200 p-3 space-y-2"
                >
                  <div class="flex items-start gap-2">
                    <span
                      class="mt-1 w-2.5 h-2.5 rounded-full shrink-0"
                      :style="{ background: s.color }"
                    />
                    <div class="min-w-0">
                      <p class="text-sm font-semibold text-neutral-900">{{ s.code }} · {{ s.label }}</p>
                      <p class="text-xs text-neutral-500">
                        Saat ini: {{ s.assigned_sru || "— belum di-assign" }}
                      </p>
                    </div>
                  </div>
                  <select
                    class="w-full text-sm border border-neutral-200 rounded-lg px-2.5 py-2 bg-white"
                    :value="s.assigned_sru || ''"
                    :disabled="assigning"
                    @change="onAssignSector(s.id, ($event.target as HTMLSelectElement).value)"
                  >
                    <option value="">— Unassign —</option>
                    <option v-for="sru in sruOptions" :key="sru" :value="sru">{{ sru }}</option>
                  </select>
                </li>
              </ul>
              <p v-if="!(bundle?.sectors || []).length" class="text-sm text-neutral-500">
                Belum ada karvak. Import KML dulu.
              </p>
            </template>

            <template v-else-if="aside === 'marker'">
              <div class="rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-2 text-xs text-violet-950 leading-snug">
                <p class="font-semibold">Daftar pin</p>
                <p class="mt-0.5 opacity-90">
                  Jenis dipilih di chip bawah peta. Klik lokasi untuk auto-simpan; edit dari daftar ini.
                </p>
              </div>

              <div
                v-if="editingMarkerId"
                class="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-900 flex items-center justify-between gap-2"
              >
                <span>Mengedit — klik peta atau Advanced, lalu simpan</span>
                <button type="button" class="underline shrink-0" @click="cancelEditMarker">Batal</button>
              </div>

              <div class="space-y-2">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Marker aktif</p>
                <ul class="divide-y divide-neutral-100 rounded-lg border border-neutral-200 overflow-hidden max-h-56 overflow-y-auto">
                  <li
                    v-for="m in bundle?.markers || []"
                    :key="m.id"
                    class="px-3 py-2 flex items-center justify-between gap-2 text-sm"
                    :class="editingMarkerId === m.id ? 'bg-amber-50' : ''"
                  >
                    <div class="min-w-0">
                      <p class="font-medium text-neutral-900 truncate">
                        {{ SAR_MARKER_ICONS.find((i) => i.id === m.icon)?.glyph || "📍" }}
                        {{ m.label }}
                      </p>
                      <p class="text-[10px] text-neutral-400 font-mono truncate">
                        {{ formatCoordPlain(m.lat, m.lng, mapSettings.coordMode) }}
                      </p>
                    </div>
                    <div v-if="canEditMission" class="flex flex-col gap-1 shrink-0 text-xs">
                      <button type="button" class="text-violet-700 hover:underline" @click="startEditMarker(m)">
                        Edit
                      </button>
                      <button type="button" class="text-red-600 hover:underline" @click="removeMarker(m)">
                        Hapus
                      </button>
                    </div>
                  </li>
                  <li v-if="!(bundle?.markers || []).length" class="px-3 py-3 text-xs text-neutral-500">
                    Belum ada marker — pilih jenis di chip, lalu klik peta
                  </li>
                </ul>
              </div>

              <details
                class="rounded-lg border border-neutral-200 open:bg-neutral-50/60"
                :open="markerAdvanced || !!editingMarkerId"
                @toggle="markerAdvanced = ($event.target as HTMLDetailsElement).open"
              >
                <summary class="cursor-pointer select-none px-3 py-2 text-xs font-semibold text-neutral-700">
                  Advanced · icon, label, koordinat, catatan
                </summary>
                <div class="px-3 pb-3 space-y-3 border-t border-neutral-100 pt-3">
                  <div>
                    <p class="text-xs font-medium text-neutral-600 mb-1.5">Jenis</p>
                    <div class="flex flex-wrap gap-1.5">
                      <button
                        v-for="k in PIN_KINDS"
                        :key="k.id"
                        type="button"
                        class="rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors"
                        :class="markerForm.kind === k.id
                          ? 'border-violet-500 bg-violet-50 text-violet-900 ring-1 ring-violet-400'
                          : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'"
                        @click="onPickMarkerKind(k.id)"
                      >
                        {{ k.short }}
                      </button>
                    </div>
                  </div>
                  <div>
                    <p class="text-xs font-medium text-neutral-600 mb-1.5">Icon</p>
                    <div class="grid grid-cols-4 gap-1.5">
                      <button
                        v-for="ic in SAR_MARKER_ICONS"
                        :key="ic.id"
                        type="button"
                        class="rounded-lg border px-1.5 py-2 text-center hover:bg-neutral-50 bg-white"
                        :class="markerForm.icon === ic.id ? 'border-violet-500 ring-2 ring-violet-400 bg-violet-50' : 'border-neutral-200'"
                        :title="ic.label"
                        @click="markerForm.icon = ic.id"
                      >
                        <span class="block text-base leading-none">{{ ic.glyph }}</span>
                        <span class="block text-[10px] text-neutral-500 mt-1 truncate">{{ ic.label }}</span>
                      </button>
                    </div>
                  </div>
                  <label class="block text-xs font-medium text-neutral-600">
                    Label
                    <input
                      v-model="markerForm.label"
                      type="text"
                      class="mt-1 w-full text-sm border border-neutral-200 rounded-lg px-2.5 py-2 bg-white"
                      placeholder="Tujuan: rally point"
                    >
                  </label>
                  <div v-if="showGeo" class="rounded-lg border border-neutral-200 p-2.5 space-y-2 bg-white">
                    <p class="text-[11px] font-semibold text-neutral-500">Geografis</p>
                    <div class="grid grid-cols-2 gap-2">
                      <label class="block text-xs text-neutral-600">
                        Lat
                        <input v-model.number="markerForm.lat" type="number" step="any" class="mt-1 w-full text-sm border border-neutral-200 rounded-lg px-2.5 py-2" placeholder="-7.5405">
                      </label>
                      <label class="block text-xs text-neutral-600">
                        Lng
                        <input v-model.number="markerForm.lng" type="number" step="any" class="mt-1 w-full text-sm border border-neutral-200 rounded-lg px-2.5 py-2" placeholder="110.4462">
                      </label>
                    </div>
                  </div>
                  <div v-if="showUtm" class="rounded-lg border border-neutral-200 p-2.5 space-y-2 bg-white">
                    <p class="text-[11px] font-semibold text-neutral-500">UTM</p>
                    <div class="grid grid-cols-2 gap-2">
                      <label class="block text-xs text-neutral-600">
                        Zone
                        <input v-model.number="markerForm.utm_zone" type="number" class="mt-1 w-full text-sm border border-neutral-200 rounded-lg px-2.5 py-2">
                      </label>
                      <label class="block text-xs text-neutral-600">
                        Hemisfer
                        <select v-model="markerForm.utm_north" class="mt-1 w-full text-sm border border-neutral-200 rounded-lg px-2.5 py-2 bg-white">
                          <option :value="true">North</option>
                          <option :value="false">South</option>
                        </select>
                      </label>
                      <label class="block text-xs text-neutral-600">
                        Easting
                        <input v-model.number="markerForm.easting" type="number" step="any" class="mt-1 w-full text-sm border border-neutral-200 rounded-lg px-2.5 py-2" placeholder="438000">
                      </label>
                      <label class="block text-xs text-neutral-600">
                        Northing
                        <input v-model.number="markerForm.northing" type="number" step="any" class="mt-1 w-full text-sm border border-neutral-200 rounded-lg px-2.5 py-2" placeholder="9165000">
                      </label>
                    </div>
                  </div>
                  <label class="block text-xs font-medium text-neutral-600">
                    Catatan
                    <input
                      v-model="markerForm.note"
                      type="text"
                      class="mt-1 w-full text-sm border border-neutral-200 rounded-lg px-2.5 py-2 bg-white"
                      placeholder="Opsional"
                    >
                  </label>
                  <UiButton
                    class="w-full"
                    :loading="markerSaving"
                    :disabled="markerSaving || !canSaveMarker"
                    @click="submitMarker()"
                  >
                    <Icon :icon="editingMarkerId ? 'lucide:save' : 'lucide:map-pin-plus'" class="text-sm" />
                    {{ editingMarkerId ? "Simpan perubahan" : "Catat pin (manual)" }}
                  </UiButton>
                </div>
              </details>
            </template>

            <template v-else-if="aside === 'measure'">
              <div class="rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-2 text-xs text-teal-900 leading-snug">
                <p class="font-semibold">Mode: Ukur jarak</p>
                <p class="mt-0.5 opacity-90">
                  Klik peta untuk titik A → B (bisa lebih dari 2). Estimasi waktu dari kecepatan medan.
                </p>
              </div>
              <label class="block text-xs font-medium text-neutral-600">
                Kecepatan acuan
                <select
                  v-model="measureSpeedId"
                  class="mt-1 w-full text-sm border border-neutral-200 rounded-lg px-2.5 py-2 bg-white"
                >
                  <option v-for="s in MEASURE_SPEEDS" :key="s.id" :value="s.id">
                    {{ s.label }} ({{ s.speedKmh }} km/j)
                  </option>
                </select>
              </label>
              <div class="rounded-xl border border-neutral-200 bg-white px-3 py-3 space-y-1.5">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Hasil</p>
                <p class="text-lg font-semibold text-neutral-900 tabular-nums">
                  {{ formatDistance(measureDistanceM) }}
                </p>
                <p class="text-sm text-neutral-700">
                  ETA ≈ <span class="font-semibold">{{ formatEta(measureEtaMin) }}</span>
                  <span class="text-neutral-400"> · {{ measureSpeedKmh }} km/j</span>
                </p>
                <p class="text-[11px] text-neutral-400">
                  {{ measurePoints.length }} titik · jarak garis lurus (haversine), bukan jalur jalan.
                </p>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <UiButton variant="secondary" size="sm" :disabled="!measurePoints.length" @click="undoMeasurePoint">
                  Undo titik
                </UiButton>
                <UiButton variant="secondary" size="sm" :disabled="!measurePoints.length" @click="clearMeasure">
                  Reset
                </UiButton>
              </div>
              <ul v-if="measurePoints.length" class="text-[11px] text-neutral-500 space-y-1 max-h-40 overflow-y-auto">
                <li v-for="(p, i) in measurePoints" :key="i" class="font-mono">
                  {{ i === 0 ? "A" : i === measurePoints.length - 1 ? "B" : i + 1 }}:
                  {{ formatCoordPlain(p.lat, p.lng, mapSettings.coordMode) }}
                </li>
              </ul>
            </template>

            <template v-else-if="aside === 'share'">
              <SarShareLink :mission="bundle?.mission || null" @refreshed="refresh" />
            </template>

            <template v-else-if="aside === 'settings'">
              <p class="text-xs text-neutral-500 leading-snug">
                Roster SRU, layers, KML, cuaca, dan preferensi koordinat.
              </p>

              <div v-if="canEditMission" class="space-y-2">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">SRU shift ini</p>
                <ul class="rounded-lg border border-neutral-200 divide-y divide-neutral-100 overflow-hidden">
                  <li
                    v-for="t in bundle?.teams || []"
                    :key="t.sru"
                    class="px-3 py-2 flex items-center justify-between gap-2 text-sm"
                  >
                    <div class="min-w-0 flex items-center gap-2">
                      <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ background: t.color || colorForSru(t.sru) }" />
                      <div class="min-w-0">
                        <p class="font-semibold text-neutral-900 truncate">{{ t.sru }}</p>
                        <p class="text-[10px] text-neutral-400 truncate">
                          {{ (bundle?.members || []).filter((m) => m.sru === t.sru).map((m) => m.callsign).join(", ") || "tanpa roster" }}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      class="text-xs text-red-600 hover:underline shrink-0 disabled:opacity-40"
                      :disabled="sruSaving"
                      @click="onRemoveSru(t.sru)"
                    >
                      Hapus
                    </button>
                  </li>
                  <li v-if="!(bundle?.teams || []).length" class="px-3 py-3 text-xs text-neutral-500">
                    Belum ada SRU — tambah di bawah.
                  </li>
                </ul>
                <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-2.5 space-y-2">
                  <label class="block text-xs font-medium text-neutral-600">
                    Nama SRU
                    <input
                      v-model="newSruForm.name"
                      type="text"
                      class="mt-1 w-full text-sm border border-neutral-200 rounded-lg px-2.5 py-2 bg-white"
                      placeholder="Bravo atau SRU-Bravo"
                      @keydown.enter.prevent="onAddSru"
                    >
                  </label>
                  <label class="block text-xs font-medium text-neutral-600">
                    Callsign awal (opsional)
                    <input
                      v-model="newSruForm.callsign"
                      type="text"
                      class="mt-1 w-full text-sm border border-neutral-200 rounded-lg px-2.5 py-2 bg-white"
                      placeholder="Bravo-1"
                    >
                  </label>
                  <UiButton
                    class="w-full"
                    size="sm"
                    :loading="sruSaving"
                    :disabled="sruSaving || !newSruForm.name.trim()"
                    @click="onAddSru"
                  >
                    <Icon icon="lucide:plus" class="text-sm" />
                    Tambah SRU
                  </UiButton>
                </div>
              </div>

              <div class="space-y-2 border-t border-neutral-100 pt-3">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Koordinat & UI</p>
                <label class="block text-xs font-medium text-neutral-600">
                  Satuan / tipe koordinat
                  <select
                    v-model="mapSettings.coordMode"
                    class="mt-1 w-full text-sm border border-neutral-200 rounded-lg px-2.5 py-2 bg-white"
                  >
                    <option value="geo">Geografis saja (WGS84 lat/lng)</option>
                    <option value="utm">UTM saja</option>
                    <option value="both">Geo + UTM (sinkron)</option>
                  </select>
                </label>
                <label class="flex items-center gap-2 text-sm text-neutral-800">
                  <input v-model="mapSettings.toolbarOpen" type="checkbox" class="rounded border-neutral-300">
                  Toolbar tools terbuka
                </label>
                <label class="flex items-center gap-2 text-sm text-neutral-800">
                  <input v-model="mapSettings.toolbarHidden" type="checkbox" class="rounded border-neutral-300">
                  Sembunyikan toolbar
                </label>
              </div>

              <div class="border-t border-neutral-100 pt-3 space-y-2">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Layers peta</p>
                <div>
                  <p class="text-xs font-medium text-neutral-600 mb-1.5">Skala acuan</p>
                  <div class="grid grid-cols-2 gap-1.5">
                    <button
                      v-for="p in MAP_SCALE_PRESETS"
                      :key="p.denom"
                      type="button"
                      class="rounded-lg border px-2 py-2 text-sm font-medium tabular-nums"
                      :class="activeScalePreset === p.denom ? 'border-violet-500 bg-violet-50 text-violet-800 ring-2 ring-violet-400' : 'border-neutral-200 text-neutral-800 hover:bg-neutral-50'"
                      @click="setMapScale(p.denom)"
                    >
                      {{ p.label }}
                    </button>
                  </div>
                </div>
                <label class="block text-xs font-medium text-neutral-600">
                  Basemap
                  <select
                    v-model="basemap"
                    class="mt-1 w-full text-sm border border-neutral-200 rounded-lg px-2.5 py-2 bg-white"
                  >
                    <option value="topo">Topo OpenTopoMap</option>
                    <option value="osm">OpenStreetMap</option>
                    <option value="imagery">Satelit (Esri)</option>
                    <option value="offline">Offline lokal</option>
                  </select>
                </label>
                <label class="flex items-center gap-2 text-sm text-neutral-800">
                  <input v-model="showGrid" type="checkbox" class="rounded border-neutral-300">
                  Grid UTM
                </label>
                <label class="flex items-center gap-2 text-sm text-neutral-800">
                  <input v-model="showContours" type="checkbox" class="rounded border-neutral-300">
                  Garis kontur
                </label>
              </div>

              <div class="border-t border-neutral-100 pt-3 space-y-2">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Cuaca</p>
                <label class="flex items-center gap-2 text-sm text-neutral-800">
                  <input v-model="showWeather" type="checkbox" class="rounded border-neutral-300">
                  Heatmap hujan / angin (Open-Meteo)
                </label>
                <label class="flex items-center gap-2 text-sm text-neutral-800">
                  <input v-model="showRadar" type="checkbox" class="rounded border-neutral-300">
                  Radar hujan live (RainViewer)
                </label>
                <label class="flex items-center gap-2 text-sm text-neutral-800">
                  <input v-model="showForecastPanel" type="checkbox" class="rounded border-neutral-300">
                  Panel forecast di peta
                </label>
                <UiButton
                  class="w-full"
                  variant="secondary"
                  size="sm"
                  :loading="weatherLoading"
                  :disabled="!bundle || weatherLoading"
                  @click="refreshWeather"
                >
                  <Icon icon="lucide:cloud-sun" class="text-sm" />
                  Refresh cuaca
                </UiButton>
                <p v-if="weatherError" class="text-xs text-red-600">{{ weatherError }}</p>
                <p v-else-if="forecast" class="text-[11px] text-neutral-400 leading-snug">
                  {{ forecast.provider }} · {{ weatherAlerts.length }} alert aktif
                </p>
                <div v-if="forecast?.current" class="rounded-lg border border-neutral-200 p-2.5 text-xs text-neutral-700 space-y-1">
                  <p class="font-semibold text-neutral-900">
                    Sekarang · {{ weatherPoint?.glyph }} {{ weatherPoint?.label }}
                  </p>
                  <p>{{ forecast.current.temperature_2m.toFixed(1) }}°C · angin {{ forecast.current.wind_speed_10m.toFixed(0) }} km/j</p>
                  <p>Hujan {{ forecast.current.precipitation.toFixed(1) }} mm · RH {{ forecast.current.relative_humidity_2m }}%</p>
                </div>
              </div>

              <div v-if="canEditMission" class="border-t border-neutral-100 pt-3 space-y-3">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">KML</p>
                <p class="text-xs text-neutral-500 leading-snug">
                  Import polygon → karvak, Point → marker.
                </p>
                <UiButton class="w-full" variant="secondary" :disabled="!bundle" @click="exportKml">
                  <Icon icon="lucide:download" class="text-sm" />
                  Export KML misi
                </UiButton>
                <label class="block text-xs font-medium text-neutral-600">
                  Mode import
                  <select
                    v-model="kmlMode"
                    class="mt-1 w-full text-sm border border-neutral-200 rounded-lg px-2.5 py-2 bg-white"
                  >
                    <option value="replace">Ganti semua karvak</option>
                    <option value="append">Tambah ke existing</option>
                  </select>
                </label>
                <input
                  ref="kmlInput"
                  type="file"
                  accept=".kml,application/vnd.google-earth.kml+xml,text/xml"
                  class="hidden"
                  @change="onKmlSelected"
                >
                <UiButton
                  class="w-full"
                  :loading="importingKml"
                  :disabled="!missionId || importingKml"
                  @click="kmlInput?.click()"
                >
                  <Icon icon="lucide:upload" class="text-sm" />
                  Import file KML
                </UiButton>
                <p v-if="bundle" class="text-[11px] text-neutral-400">
                  Saat ini {{ bundle.sectors.length }} karvak di peta
                </p>
              </div>
            </template>
          </div>
        </aside>
      </Transition>
      </div>
    </div>
    </template>
  </div>
</template>

<style scoped>
.aside-slide-enter-active,
.aside-slide-leave-active {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.aside-slide-enter-from,
.aside-slide-leave-to {
  transform: translateX(100%);
  opacity: 0.6;
}
.sar-tool-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  width: 100%;
  border-radius: 0.375rem;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #e5e5e5;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  padding: 0.3rem 0.4rem;
  font-size: 0.6875rem;
  font-weight: 500;
  color: #262626;
  line-height: 1.2;
  cursor: pointer;
  pointer-events: auto;
  position: relative;
  z-index: 1;
}
.sar-tool-btn:hover {
  background: #fff;
}
</style>
