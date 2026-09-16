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
    /**
     * Emergency ids the list is currently showing. The map hides every unit
     * outside this set, so an open (and possibly filtered) list is never
     * contradicted by pins it has already excluded. null = list closed, the
     * map shows everything.
     */
    visibleUnitIds: null as string[] | null,
    /**
     * The units the list leads with, in list order. The map draws a labelled
     * connector from each of these to the user pin — only the top few get one,
     * or the map turns into spaghetti. null = list closed.
     */
    topUnitIds: null as string[] | null,
  }),
  actions: {
    onOpen() { this.isOpen = true; },
    onClose() { this.isOpen = false; },
    onFullScreen() { this.isFullScreen = true; },
    onExitFullScreen() { this.isFullScreen = false; },
    setSheetData(data: SheetData) { this.sheetData = data; },
    setVisibleUnitIds(ids: string[] | null) { this.visibleUnitIds = ids; },
    setTopUnitIds(ids: string[] | null) { this.topUnitIds = ids; },
    onSnap(snapPoint: number) { this.snapPoint = snapPoint; },
  },
});
