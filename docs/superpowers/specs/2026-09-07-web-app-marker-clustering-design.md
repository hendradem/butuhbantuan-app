# Web-App Marker Clustering Design

**Date:** 2026-09-07  
**Scope:** `apps/web-app` — `LeafletMap.vue`  
**Goal:** Add per-category `leaflet.markercluster` to the citizen-facing map so nearby service units of the same type collapse into a numbered bubble when zoomed out.

---

## Background

The dashboard's `OpsLiveMap.vue` already uses per-category clustering (one `MarkerClusterGroup` per type: hospital, ambulance, damkar, SAR, other). The web-app's `LeafletMap.vue` renders individual markers directly onto the map with no clustering. When many units are in a dense area (e.g., many hospitals in a city centre) the map becomes cluttered at zoom-out levels.

The web-app already has:
- The same `bb-svc-pin` teardrop pin style as OpsLiveMap
- `pinMarkerModifier(typeName)` in `utils/mapAppearance.ts` that maps type name → category modifier (`ambulance`, `damkar`, `hospital`, `sar`)
- Leaflet 1.9.x as a dependency

---

## Approach: Per-category cluster groups

One `MarkerClusterGroup` per category. Markers only cluster with markers of the same type. Cluster bubbles are colored to match the category.

### Why not a single cluster group?

A single group collapses all types together — the bubble shows a count but no type info. Citizens can't tell if they're zooming into "3 hospitals" or "3 ambulances". Per-category preserves that signal.

### Why not manual Turf.js clustering?

Turf.js is already a dependency but using it for clustering is reinventing the wheel. `leaflet.markercluster` (already in the dashboard) is battle-tested, handles spiderfy, animate, chunkedLoading, and integrates with Leaflet lifecycle.

---

## Categories

```ts
type UnitCategory = "hospital" | "ambulance" | "damkar" | "sar" | "other";
```

Mapping from `pinMarkerModifier()` return value → `UnitCategory`:

| `pinMarkerModifier()` result | Category | Color |
|---|---|---|
| `hospital` | hospital | `#8b5cf6` (violet) |
| `ambulance` | ambulance | `#1e1e1e` (dark) |
| `damkar` | damkar | `#ef4444` (red) |
| `sar` | sar | `#f97316` (orange) |
| anything else | other | `#64748b` (slate) |

---

## Changes

### 1. `apps/web-app/package.json`

Add dependencies:
- `leaflet.markercluster: ^1.5.3`
- `@types/leaflet.markercluster: ^1.5.6`

### 2. `apps/web-app/components/map/LeafletMap.vue`

#### Data structure changes

Replace:
```ts
let markers: Marker[] = [];
```

With:
```ts
const CATEGORY_ORDER = ["hospital", "ambulance", "damkar", "sar", "other"] as const;
const unitClusterLayers: Partial<Record<UnitCategory, any>> = {};
```

`markersById` and `markerMetaById` are retained — they're still needed for active-marker icon management and mute state.

#### `onMounted` — cluster setup

After Leaflet and tile layer init, dynamically import `leaflet.markercluster` and its CSS, then create one `MarkerClusterGroup` per category with:

```ts
{
  maxClusterRadius: 60,       // ~60px before collapsing — not too aggressive
  disableClusteringAtZoom: 15, // at zoom 15+ always show individual pins
  animate: true,
  chunkedLoading: true,
  iconCreateFunction: (cluster) => makeCategoryClusterIcon(cat, cluster.getChildCount()),
}
```

Each group is added to the map immediately. Category order: hospital → ambulance → damkar → sar → other.

#### `categoryOf(typeName)` — new local helper

`pinMarkerModifier()` defaults unknown types to `"ambulance"`, which is wrong for clustering (unknowns should go to `"other"`). Add a local `categoryOf` in `LeafletMap.vue`:

```ts
function categoryOf(typeName: string): UnitCategory {
  switch (typeName) {
    case "Rumah Sakit": return "hospital";
    case "Ambulance":   return "ambulance";
    case "Damkar":      return "damkar";
    case "SAR":         return "sar";
    default:            return "other";
  }
}
```

`markerMetaById` is extended to also store the resolved category: `{ typeName, item, cat }` — needed by `setActiveEmergencyMarker` to look up the right cluster group without re-deriving.

#### `renderMarkers()` changes

Instead of `marker.addTo(map!)`:
1. Determine category via `categoryOf(typeName)` (not `pinMarkerModifier` — see above)
2. `unitClusterLayers[cat]?.addLayer(marker)`

Clear on re-render: `for (const cat of CATEGORY_ORDER) unitClusterLayers[cat]?.clearLayers()`

The `markersById` / `markerMetaById` maps still track each marker for selected-state management.

#### `setActiveEmergencyMarker()` — cluster-aware reveal

If a marker is selected from the list/bottom-sheet while zoom is low enough that it's inside a cluster, it must be revealed before its icon can be changed. Adapted flow:

1. Update `activeEmergencyId`
2. Get `marker` from `markersById`
3. Determine its cluster group via `unitClusterLayers[cat]`
4. Call `clusterGroup.zoomToShowLayer(marker, () => { marker.setIcon(...active icon...) })`
5. Pan to marker latLng after icon swap

When unclustering happens naturally (zoom in), `renderMarkers()` runs via the existing watcher and applies the correct active icon immediately.

#### `applyMutedMarkers()` — no change needed

This function iterates `markersById` and toggles CSS classes on marker elements. MarkerCluster does not affect how `getElement()` works on individual markers — the function works unchanged.

#### `onBeforeUnmount` cleanup

```ts
for (const cat of CATEGORY_ORDER) {
  if (unitClusterLayers[cat]) {
    map?.removeLayer(unitClusterLayers[cat]);
    unitClusterLayers[cat] = null;
  }
}
```

#### `makeCategoryClusterIcon(cat, count)` — new helper

Returns a `L.divIcon` matching the category color:

```ts
function makeCategoryClusterIcon(cat: UnitCategory, count: number) {
  const COLOR: Record<UnitCategory, string> = {
    hospital: "#8b5cf6",
    ambulance: "#1e1e1e",
    damkar: "#ef4444",
    sar: "#f97316",
    other: "#64748b",
  };
  return L.divIcon({
    className: "bb-cluster",
    html: `<div style="background:${COLOR[cat]}">${count}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}
```

The `.bb-cluster` CSS class (size, border-radius, text style, shadow) is added to the web-app's global stylesheet or `app.vue` `<style>`.

---

## Behaviour at different zoom levels

| Zoom | Behaviour |
|---|---|
| ≤ 12 (province) | Most markers clustered into category bubbles |
| 13–14 (city, default) | Some clustering for dense areas (e.g. hospital district) |
| ≥ 15 (street) | All individual markers, no clustering (`disableClusteringAtZoom: 15`) |

---

## What does NOT change

- No category filter chips — this was explicitly out of scope
- No change to `TicketLiveMap.vue` or `track/[token].vue` (those show a different set of markers)
- No change to the classic-marker fallback path (clustering applies regardless of `mapAppearance.markers` setting, since `disableClusteringAtZoom` keeps default-zoom experience unchanged)
- Route rendering, ETA bubble, user location pin — all unchanged

---

## Error handling

- If `leaflet.markercluster` fails to dynamic-import (e.g. offline), `unitClusterLayers` stays empty. `renderMarkers()` already guards with `unitClusterLayers[cat]?.addLayer(marker)` — when the cluster layer is null/undefined the marker is skipped. To ensure graceful degradation, add a `catch` in the import block that falls back to adding markers directly with `.addTo(map!)` (same as current behaviour). Flag `clusterReady` so `renderMarkers` knows which path to take.

---

## Testing

Manual verification:
1. Zoom to city level (zoom 11–13) with multiple units visible → bubbles appear per category
2. Tap a hospital cluster → zooms in / spiderfies → individual hospital pins visible
3. Tap a single pin → detail sheet opens as before
4. Select unit from list when zoomed out → map reveals and highlights the marker
5. Route mode → muted markers work correctly after cluster expand
