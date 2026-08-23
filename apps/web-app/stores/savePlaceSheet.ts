import type { PlaceSlot } from "~/utils/savedPlaces";

export type SavePlaceMode = "save" | "remove";

export const useSavePlaceSheetStore = defineStore("savePlaceSheet", {
  state: () => ({
    isOpen: false,
    mode: "save" as SavePlaceMode,
    slot: "home" as PlaceSlot,
  }),
  actions: {
    openSave(slot: PlaceSlot) {
      this.mode = "save";
      this.slot = slot;
      this.isOpen = true;
    },
    openRemove(slot: PlaceSlot) {
      this.mode = "remove";
      this.slot = slot;
      this.isOpen = true;
    },
    onClose() {
      this.isOpen = false;
    },
  },
});
