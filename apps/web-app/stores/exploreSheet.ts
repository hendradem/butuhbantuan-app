interface SheetData {
  emergencyType: any;
  emergency: any;
}

export const useExploreSheetStore = defineStore("exploreSheet", {
  state: () => ({
    isOpen: false,
    isFullScreen: false,
    sheetData: null as SheetData | null,
    snapPoint: 1,
  }),
  actions: {
    onOpen() { this.isOpen = true; },
    onClose() { this.isOpen = false; },
    onFullScreen() { this.isFullScreen = true; },
    onExitFullScreen() { this.isFullScreen = false; },
    setSheetData(data: SheetData) { this.sheetData = data; },
    onSnap(snapPoint: number) { this.snapPoint = snapPoint; },
  },
});
