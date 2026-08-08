export const useSearchDataStore = defineStore("searchData", {
  state: () => ({
    lat: 0,
    lng: 0,
    isActive: false,
    isLoading: false,
    searchQuery: "",
    searchResults: [] as any[],
  }),
  actions: {
    setSearchResults(results: any[]) { this.searchResults = results; },
    setIsLoading(v: boolean) { this.isLoading = v; },
    setIsActive(v: boolean) { this.isActive = v; },
    setSearchQuery(q: string) { this.searchQuery = q; },
    updateSearchCoordinate(lat: number, lng: number) {
      this.lat = lat;
      this.lng = lng;
    },
  },
});
