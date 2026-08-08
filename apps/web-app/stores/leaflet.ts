export const useLeafletStore = defineStore("leaflet", {
  state: () => ({
    zoom: 13,
    fitBounds: null as any,
    mapInstance: null as any,
    routeStartPoint: { lat: 0, lng: 0 },
    routeEndPoint: { lat: 0, lng: 0 },
  }),
  actions: {
    setMapInstance(map: any) { this.mapInstance = map; },
    setMapZoom(zoom: number) { this.zoom = zoom; },
    setFitBounds(bounds: any) { this.fitBounds = bounds; },
    resetFitBounds() { this.fitBounds = null; },
    updateLeafletRouting(data: { startPoint: { lat: number; lng: number }; routeEndPoint: { lat: number; lng: number } }) {
      this.routeStartPoint = data.startPoint;
      this.routeEndPoint = data.routeEndPoint;
    },
    resetLeafletRouting() {
      this.routeStartPoint = { lat: 0, lng: 0 };
      this.routeEndPoint = { lat: 0, lng: 0 };
    },
  },
});
