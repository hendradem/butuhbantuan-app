export const useOrderSheetStore = defineStore("orderSheet", {
  state: () => ({
    isOpen: false,
    emergencyUUID: "",
    unitName: "",
    callType: "" as "whatsapp" | "phone" | "",
    callNumber: "",
  }),
  actions: {
    open(emergencyUUID: string, unitName: string, callType: "whatsapp" | "phone", callNumber: string) {
      this.emergencyUUID = emergencyUUID;
      this.unitName = unitName;
      this.callType = callType;
      this.callNumber = callNumber;
      this.isOpen = true;
    },
    onClose() { this.isOpen = false; },
  },
});
