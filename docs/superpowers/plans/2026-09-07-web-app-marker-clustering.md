# Web-App Marker Clustering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-category `leaflet.markercluster` to `LeafletMap.vue` so nearby service units of the same type collapse into a colored bubble when zoomed out.

**Architecture:** One `MarkerClusterGroup` per category (hospital / ambulance / damkar / sar / other). Each group uses a colored DivIcon cluster bubble. `disableClusteringAtZoom: 15` keeps the default zoom-14 experience mostly unchanged. When a marker selected from the list is inside a cluster, `zoomToShowLayer` reveals it before icon swap.

**Tech Stack:** Leaflet 1.9.x, `leaflet.markercluster ^1.5.3`, Nuxt 3, Vue 3, TypeScript.

---

## Files

| File | Action |
|---|---|
| `apps/web-app/package.json` | Add 2 deps |
| `apps/web-app/assets/css/main.css` | Add `.bb-cluster` styles |
| `apps/web-app/components/map/LeafletMap.vue` | Main rewrite — data, helpers, onMounted, renderMarkers, setActiveEmergencyMarker, onUnmounted |

---

### Task 1: Add `leaflet.markercluster` dependency

**Files:**
- Modify: `apps/web-app/package.json`

- [ ] Add to `dependencies` in `apps/web-app/package.json`:

```json
"leaflet.markercluster": "^1.5.3"
```

Add to `devDependencies`:

```json
"@types/leaflet.markercluster": "^1.5.6"
```

The final `dependencies` block should look like:
```json
"dependencies": {
  "@butuhbantuan/api-client": "workspace:*",
  "@butuhbantuan/types": "workspace:*",
  "@butuhbantuan/ui": "workspace:*",
  "@butuhbantuan/utils": "workspace:*",
  "@iconify/vue": "^5.0.1",
  "@turf/turf": "^6.5.0",
  "@vueuse/core": "^14.4.0",
  "leaflet": "^1.9.4",
  "leaflet-routing-machine": "^3.2.12",
  "leaflet.markercluster": "^1.5.3",
  "pinia": "^2.3.0",
  "vue3-hot-toast": "^0.0.5"
}
```

- [ ] Run from repo root:
```bash
pnpm install
```
Expected: `leaflet.markercluster` appears in `pnpm-lock.yaml`.

- [ ] Commit:
```bash
git add apps/web-app/package.json pnpm-lock.yaml
git commit -m "chore(web-app): add leaflet.markercluster dependency"
```

---

### Task 2: Add cluster bubble CSS

**Files:**
- Modify: `apps/web-app/assets/css/main.css`

- [ ] Append to the end of `apps/web-app/assets/css/main.css`:

```css
/* ── Per-category cluster bubbles (leaflet.markercluster) ───────────── */
.bb-cluster {
  background: transparent !important;
  border: none !important;
}

.bb-cluster > div {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2.5px solid #fff;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.28), 0 0 0 1px rgba(15, 23, 42, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  font-family: inherit;
  letter-spacing: -0.3px;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  cursor: pointer;
}

.bb-cluster > div:hover {
  transform: scale(1.12);
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.32), 0 0 0 1.5px rgba(15, 23, 42, 0.08);
}

/* Override leaflet.markercluster default animation classes */
.leaflet-cluster-anim .leaflet-marker-icon,
.leaflet-cluster-anim .leaflet-marker-shadow {
  transition: left 0.2s ease-out, top 0.2s ease-out, opacity 0.2s ease-out;
}
```

- [ ] Commit:
```bash
git add apps/web-app/assets/css/main.css
git commit -m "style(web-app): add per-category cluster bubble CSS"
```

---

### Task 3: Replace `markers` array with cluster data structures in `LeafletMap.vue`

**Files:**
- Modify: `apps/web-app/components/map/LeafletMap.vue` (top of `<script setup>`, lines ~38–50)

- [ ] Replace the existing module-level variable declarations block. Find this section (around line 38):

```ts
let markers: Marker[] = [];
/** emergency id → leaflet marker (for select/highlight). */
const markersById = new Map<string, Marker>();
/** emergency id → type name for rebuilding icons. */
const markerMetaById = new Map<string, { typeName: string; item: any }>();
```

Replace with:

```ts
// ── Category cluster data ─────────────────────────────────────────────
const CATEGORY_ORDER = ["hospital", "ambulance", "damkar", "sar", "other"] as const;
type UnitCategory = (typeof CATEGORY_ORDER)[number];

/** One MarkerClusterGroup per service category. Populated in onMounted after markercluster loads. */
const unitClusterLayers: Partial<Record<UnitCategory, any>> = {};
/** True once leaflet.markercluster has loaded and cluster groups are attached to the map. */
let clusterReady = false;

/** emergency id → leaflet marker (for select/highlight). */
const markersById = new Map<string, Marker>();
/** emergency id → meta for icon rebuild + cluster lookup. */
const markerMetaById = new Map<string, { typeName: string; item: any; cat: UnitCategory }>();
```

- [ ] Commit:
```bash
git add apps/web-app/components/map/LeafletMap.vue
git commit -m "refactor(web-app): replace markers array with per-category cluster data structures"
```

---

### Task 4: Add `categoryOf` and `makeCategoryClusterIcon` helpers

**Files:**
- Modify: `apps/web-app/components/map/LeafletMap.vue`

- [ ] Find the `buildServicePinIcon` function (around line 664). Add the two new helpers **before** it:

```ts
/** Map emergency type name → cluster category. Unknowns go to "other" (not "ambulance"). */
function categoryOf(typeName: string): UnitCategory {
  switch (typeName) {
    case "Rumah Sakit": return "hospital";
    case "Ambulance":   return "ambulance";
    case "Damkar":      return "damkar";
    case "SAR":         return "sar";
    default:            return "other";
  }
}

const CLUSTER_COLORS: Record<UnitCategory, string> = {
  hospital:  "#8b5cf6",
  ambulance: "#1e1e1e",
  damkar:    "#ef4444",
  sar:       "#f97316",
  other:     "#64748b",
};

/** Colored cluster bubble matching the category pin color. L must be loaded. */
function makeCategoryClusterIcon(L: any, cat: UnitCategory, count: number) {
  return L.divIcon({
    className: "bb-cluster",
    html: `<div style="background:${CLUSTER_COLORS[cat]}">${count}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}
```

- [ ] Commit:
```bash
git add apps/web-app/components/map/LeafletMap.vue
git commit -m "feat(web-app): add categoryOf and makeCategoryClusterIcon helpers"
```

---

### Task 5: Init cluster groups in `onMounted`

**Files:**
- Modify: `apps/web-app/components/map/LeafletMap.vue`

- [ ] Inside `onMounted`, after the tile layer + color-mode setup (after the block ending `window.addEventListener("bb-color-mode", onColorMode)`), and **before** the `requestAnimationFrame(() => map?.invalidateSize())` call, add:

```ts
// ── MarkerCluster — async import keeps bundle lean ────────────────────
try {
  await import("leaflet.markercluster");
  await import("leaflet.markercluster/dist/MarkerCluster.css");
  await import("leaflet.markercluster/dist/MarkerCluster.Default.css");

  for (const cat of CATEGORY_ORDER) {
    const group = (L as any).markerClusterGroup({
      maxClusterRadius: 60,
      disableClusteringAtZoom: 15,
      animate: true,
      chunkedLoading: true,
      iconCreateFunction: (cluster: any) =>
        makeCategoryClusterIcon(L, cat, cluster.getChildCount()),
    });
    unitClusterLayers[cat] = group;
    map!.addLayer(group);
  }
  clusterReady = true;
} catch {
  // markercluster unavailable (offline / CSP) — renderMarkers falls back to direct addTo
  clusterReady = false;
}
```

- [ ] Commit:
```bash
git add apps/web-app/components/map/LeafletMap.vue
git commit -m "feat(web-app): init per-category MarkerClusterGroups in onMounted"
```

---

### Task 6: Rewrite `renderMarkers()` to use cluster groups

**Files:**
- Modify: `apps/web-app/components/map/LeafletMap.vue` (`renderMarkers` function ~line 567)

- [ ] Replace the entire `renderMarkers` function with:

```ts
function renderMarkers(L: any, data: any[]) {
  // Clear — cluster groups if ready, otherwise any stray direct-add markers tracked via markersById
  if (clusterReady) {
    for (const cat of CATEGORY_ORDER) unitClusterLayers[cat]?.clearLayers();
  } else {
    for (const marker of markersById.values()) marker.remove();
  }
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
    const cat = categoryOf(typeName);
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
    }).on("click", (ev: any) => {
      L.DomEvent.stopPropagation(ev);
      onMarkerClick(item);
    });

    if (clusterReady && unitClusterLayers[cat]) {
      unitClusterLayers[cat]!.addLayer(marker);
    } else {
      marker.addTo(map!);
    }

    if (id) {
      markersById.set(id, marker);
      markerMetaById.set(id, { typeName, item, cat });
    }
  });

  activeEmergencyId = selectedId;

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
```

- [ ] Commit:
```bash
git add apps/web-app/components/map/LeafletMap.vue
git commit -m "feat(web-app): renderMarkers adds to cluster groups instead of directly to map"
```

---

### Task 7: Update `setActiveEmergencyMarker()` with cluster-aware reveal

**Files:**
- Modify: `apps/web-app/components/map/LeafletMap.vue` (`setActiveEmergencyMarker` ~line 684)

- [ ] Replace the entire `setActiveEmergencyMarker` function with:

```ts
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

  const applyActiveIcon = () => {
    marker.setIcon(
      buildServicePinIcon(L, meta.typeName, { enter: true, active: true }),
    );
    marker.setZIndexOffset(900);
    const ll = marker.getLatLng();
    map?.panTo(ll, { animate: true });
  };

  if (clusterReady) {
    const clusterGroup = unitClusterLayers[meta.cat];
    if (clusterGroup) {
      // zoomToShowLayer reveals the marker if it's inside a collapsed cluster,
      // then fires the callback once the marker is individually visible.
      clusterGroup.zoomToShowLayer(marker, applyActiveIcon);
      return;
    }
  }

  applyActiveIcon();
}
```

- [ ] Commit:
```bash
git add apps/web-app/components/map/LeafletMap.vue
git commit -m "feat(web-app): setActiveEmergencyMarker uses zoomToShowLayer for clustered markers"
```

---

### Task 8: Update `onUnmounted` cleanup

**Files:**
- Modify: `apps/web-app/components/map/LeafletMap.vue` (`onUnmounted` ~line 359)

- [ ] Replace the existing `onUnmounted` block:

```ts
onUnmounted(() => {
  if (gpsWatchId !== null) navigator.geolocation.clearWatch(gpsWatchId);
  if (onColorModeChange) {
    window.removeEventListener("bb-color-mode", onColorModeChange);
    onColorModeChange = null;
  }
});
```

With:

```ts
onUnmounted(() => {
  if (gpsWatchId !== null) navigator.geolocation.clearWatch(gpsWatchId);
  if (onColorModeChange) {
    window.removeEventListener("bb-color-mode", onColorModeChange);
    onColorModeChange = null;
  }
  for (const cat of CATEGORY_ORDER) {
    if (unitClusterLayers[cat]) {
      map?.removeLayer(unitClusterLayers[cat]!);
      delete unitClusterLayers[cat];
    }
  }
});
```

- [ ] Commit:
```bash
git add apps/web-app/components/map/LeafletMap.vue
git commit -m "fix(web-app): clean up cluster groups on component unmount"
```

---

### Task 9: Manual verification

- [ ] Start web-app dev server from repo root:
```bash
cd apps/web-app && pnpm dev
```

- [ ] Open http://localhost:3000 in browser. Allow location or use the default view.

- [ ] Zoom out to city level (zoom 11–12). Verify:
  - Markers in the same area + same category collapse into colored bubbles (dark for ambulance, violet for hospital, red for damkar, orange for SAR)
  - Different categories do NOT merge into one bubble

- [ ] Tap a cluster bubble. Verify:
  - Map zooms in / spiderfies to reveal individual pins
  - Individual pins are tappable and open the detail sheet as before

- [ ] Zoom back in to zoom 15+. Verify:
  - All markers are individual (no clustering at street level)

- [ ] Tap a unit from the list/bottom sheet while zoomed out. Verify:
  - Map zooms to reveal the marker
  - Pin becomes active (larger, pulsing)

- [ ] In route mode (tap a unit → route drawn): verify other unit pins are muted after a cluster expands.

- [ ] Run typecheck:
```bash
cd apps/web-app && pnpm typecheck
```
Expected: no errors.

---

## Self-Review Notes

- Task 3 removes the `markers: Marker[]` array. Task 6 uses `markersById.values()` for the fallback clear — this is correct because `markersById` covers all markers with IDs. Markers without IDs (coordinates but no id) won't be tracked, but the cluster `clearLayers()` handles those when `clusterReady`.
- `markerMetaById` type extended with `cat: UnitCategory` in Task 3; used in Tasks 6 and 7 — consistent.
- `CATEGORY_ORDER` and `UnitCategory` defined in Task 3, used in Tasks 4, 5, 6, 7, 8 — consistent.
- `makeCategoryClusterIcon(L, cat, count)` signature defined in Task 4, used in Task 5 — consistent.
- `clusterReady` flag gates all cluster-path code; if import fails, falls back gracefully.
- `applyMutedMarkers()` iterates `markersById` and toggles CSS classes — unchanged, still works with clustered markers because `marker.getElement()` works regardless of cluster membership.
