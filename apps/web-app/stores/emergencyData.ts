interface SelectedEmergencyData {
  selectedEmergencyData: any;
  selectedEmergencyType?: any;
  selectedEmergencySource: "map" | "detail";
}

export const useEmergencyDataStore = defineStore("emergencyData", {
  state: () => ({
    emergencyData: [] as any[],
    dispatcherData: [] as any[],
    selectedEmergencyData: {
      selectedEmergencyData: null,
      selectedEmergencyType: null,
      selectedEmergencySource: "map",
    } as SelectedEmergencyData,
  }),
  actions: {
    updateEmergencyData(data: any[]) { this.emergencyData = data; },
    updateDispatcherData(data: any[]) { this.dispatcherData = data; },
    updateSelectedEmergencyData(data: SelectedEmergencyData) {
      this.selectedEmergencyData = data;
    },
  },
});
