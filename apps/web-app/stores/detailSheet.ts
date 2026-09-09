interface DetailData {
  emergencyType: any;
  emergency: any;
}

export const useDetailSheetStore = defineStore("detailSheet", {
  state: () => ({
    isOpen: false,
    isFullScreen: false,
    detailSheetData: null as DetailData | null,
    fromExploreList: false,
  }),
  actions: {
    onOpen() { this.isOpen = true; },
    onClose() { this.isOpen = false; },
    onOpenFromExplore() { this.fromExploreList = true; this.isOpen = true; },
    clearExploreReturn() { this.fromExploreList = false; },
    onFullScreen() { this.isFullScreen = true; },
    onExitFullScreen() { this.isFullScreen = false; },
    setDetailSheetData(data: DetailData) { this.detailSheetData = data; },
  },
});
