export const useReviewSheetStore = defineStore("reviewSheet", {
  state: () => ({
    isOpen: false,
    emergencyId: "",
    unitName: "",
    callType: "" as "whatsapp" | "phone" | "",
  }),
  actions: {
    open(emergencyId: string, unitName: string, callType: "whatsapp" | "phone") {
      this.emergencyId = emergencyId;
      this.unitName = unitName;
      this.callType = callType;
      this.isOpen = true;
    },
    onClose() { this.isOpen = false; },
  },
});
