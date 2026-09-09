export const useConfirmationSheetStore = defineStore("confirmationSheet", {
  state: () => ({
    isOpen: false,
    callType: "default" as "whatsapp" | "phone" | "default",
    callNumber: "",
    emergencyId: "",
    unitName: "",
    ticketNumber: "",
    publicToken: "",
  }),
  actions: {
    onOpen() { this.isOpen = true; },
    onClose() { this.isOpen = false; },
    setCallType(type: "whatsapp" | "phone") { this.callType = type; },
    setCallNumber(number: string) { this.callNumber = number; },
    setEmergency(id: string, name: string) { this.emergencyId = id; this.unitName = name; },
    setTicketNumber(n: string) { this.ticketNumber = n; },
    setPublicToken(token: string) { this.publicToken = token; },
  },
});
