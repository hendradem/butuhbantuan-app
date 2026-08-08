interface DetailData {
  emergencyType: any;
  emergency: any;
}

export const useDetailSheetStore = defineStore("detailSheet", {
  state: () => ({
    isOpen: false,
    isFullScreen: false,
    detailSheetData: null as DetailData | null,
  }),
  actions: {
    onOpen() { this.isOpen = true; },
    onClose() { this.isOpen = false; },
    onFullScreen() { this.isFullScreen = true; },
    onExitFullScreen() { this.isFullScreen = false; },
    setDetailSheetData(data: DetailData) { this.detailSheetData = data; },
  },
});
