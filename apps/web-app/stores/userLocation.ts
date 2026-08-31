interface Region {
  id: string;
  name: string;
}

export const useUserLocationStore = defineStore("userLocation", {
  state: () => ({
    lat: 0,
    long: 0,
    gpsLat: 0,   // last GPS fix from watchPosition — never overwritten by manual clicks
    gpsLong: 0,
    gpsAccuracyM: 0,
    /** When the last live GPS fix was applied (map watch / locate). */
    gpsUpdatedAt: 0,
    fullAddress: "",
    isRefetchMatrix: false,
    isGetCurrentLocation: false,
    isManualLocation: false,
    isAddressLoading: false,
    currentRegion: {
      regency: { id: "", name: "" } as Region,
      province: { id: "", name: "" } as Region,
    },
  }),
  actions: {
    updateCoordinate(lat: number, long: number) {
      this.lat = lat;
      this.long = long;
    },
    /** Interim map paint from cache — not a live GPS fix. */
    seedFromCache(lat: number, long: number) {
      if (!this.isManualLocation) {
        this.lat = lat;
        this.long = long;
      }
    },
    // Called by GPS / locate — always records the live fix.
    // accuracyM optional: used to refine pin + accuracy circle.
    updateGPSCoordinate(lat: number, long: number, accuracyM?: number) {
      this.gpsLat = lat;
      this.gpsLong = long;
      if (accuracyM != null && Number.isFinite(accuracyM)) {
        this.gpsAccuracyM = accuracyM;
      }
      this.gpsUpdatedAt = Date.now();
      if (!this.isManualLocation) {
        this.lat = lat;
        this.long = long;
      }
    },
    updateFullAddress(address: string) { this.fullAddress = address; },
    updateRefetchMatrix() { this.isRefetchMatrix = !this.isRefetchMatrix; },
    updateIsGetCurrentLocation(v: boolean) { this.isGetCurrentLocation = v; },
    setManualLocation(v: boolean) { this.isManualLocation = v; },
    setAddressLoading(v: boolean) { this.isAddressLoading = v; },
    setCurrentRegion(region: { regency: Region; province: Region }) {
      this.currentRegion = region;
    },
  },
});
