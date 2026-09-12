import type { EmergencyTypeLike } from "~/utils/serviceDemand";

export const useMoreSheetStore = defineStore("moreSheet", {
  state: () => ({
    isOpen: false,
    /** Emergency types not pinned on the home 4-slot menu. */
    overflowServices: [] as EmergencyTypeLike[],
  }),
  actions: {
    onOpen() {
      this.isOpen = true;
    },
    onClose() {
      this.isOpen = false;
    },
    setOverflowServices(list: EmergencyTypeLike[]) {
      this.overflowServices = Array.isArray(list) ? [...list] : [];
    },
  },
});
