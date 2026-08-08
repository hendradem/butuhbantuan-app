export const useSearchSheetStore = defineStore("searchSheet", {
  state: () => ({ isOpen: false, snapPoint: 1 }),
  actions: {
    onOpen() { this.isOpen = true; },
    onClose() { this.isOpen = false; },
    onSnap(snapPoint: number) { this.snapPoint = snapPoint; },
  },
});
