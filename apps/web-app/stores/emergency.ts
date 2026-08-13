export const useEmergencyStore = defineStore("emergency", {
  state: () => ({
    filteredEmergency: [] as any[],
    selectedEmergency: null as any,
    isLoading: false,
    isCovered: false, // grey by default; set true only when coverage is confirmed
    /** Explicit out-of-coverage vs unknown/loading */
    coverageChecked: false,
    lastRegionName: "" as string,
  }),
  actions: {
    setFilteredEmergency(data: any[]) { this.filteredEmergency = data; },
    setSelectedEmergency(data: any) { this.selectedEmergency = data; },
    setLoading(v: boolean) { this.isLoading = v; },
    setCoverage(v: boolean) {
      this.isCovered = v;
      this.coverageChecked = true;
    },
    setLastRegionName(name: string) { this.lastRegionName = name; },
  },
});
