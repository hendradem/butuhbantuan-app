import type { EmergencyDataType, EmergencyListItem } from "@butuhbantuan/types";

export const useEmergencyStore = defineStore("emergency", {
  state: () => ({
    filteredEmergency: [] as EmergencyListItem[],
    selectedEmergency: null as EmergencyDataType | null,
    isLoading: false,
    isCovered: false, // grey by default; set true only when coverage is confirmed
    /** Explicit out-of-coverage vs unknown/loading */
    coverageChecked: false,
    lastRegionName: "" as string,
  }),
  actions: {
    setFilteredEmergency(data: EmergencyListItem[]) { this.filteredEmergency = data; },
    setSelectedEmergency(data: EmergencyDataType | null) { this.selectedEmergency = data; },
    setLoading(v: boolean) { this.isLoading = v; },
    setCoverage(v: boolean) {
      this.isCovered = v;
      this.coverageChecked = true;
    },
    setLastRegionName(name: string) { this.lastRegionName = name; },
  },
});
