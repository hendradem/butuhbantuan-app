export const useLeafletStore = defineStore("leaflet", {
  state: () => ({
    zoom: 14,
    fitBounds: null as any,
    mapInstance: null as any,
    routeStartPoint: { lat: 0, lng: 0 },
    routeEndPoint: { lat: 0, lng: 0 },
    /** Live OSRM (or fallback) stats for the drawn route — source of truth vs Matrix trip. */
    routeTravel: null as { durationSec: number; distanceM: number } | null,
    /** Bump to force map back to default kab/kota overview (locate / click / search). */
    overviewNonce: 0,
    /** Bump to put the user marker back in the centre (a sheet that shifted the map closed). */
    recenterNonce: 0,
  }),
  actions: {
    setMapInstance(map: any) { this.mapInstance = map; },
    setMapZoom(zoom: number) { this.zoom = zoom; },
    setFitBounds(bounds: any) { this.fitBounds = bounds; },
    resetFitBounds() { this.fitBounds = null; },
    /** Zoom in/out to the standard kab/kota view around the current pin. */
    requestDefaultView() { this.overviewNonce += 1; },
    /** Re-centre on the user pin at the standard zoom, undoing any sheet offset. */
    requestRecenter() { this.recenterNonce += 1; },
    updateLeafletRouting(data: { startPoint: { lat: number; lng: number }; routeEndPoint: { lat: number; lng: number } }) {
      this.routeStartPoint = data.startPoint;
      this.routeEndPoint = data.routeEndPoint;
      this.routeTravel = null;
    },
    setRouteTravel(travel: { durationSec: number; distanceM: number } | null) {
      this.routeTravel = travel;
    },
    resetLeafletRouting() {
      this.routeStartPoint = { lat: 0, lng: 0 };
      this.routeEndPoint = { lat: 0, lng: 0 };
      this.routeTravel = null;
    },
  },
});
