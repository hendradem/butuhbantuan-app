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
    // Called exclusively by watchPosition — always records the live GPS fix
    // regardless of manual mode, so the location button can always snap back.
    updateGPSCoordinate(lat: number, long: number) {
      this.gpsLat = lat;
      this.gpsLong = long;
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
