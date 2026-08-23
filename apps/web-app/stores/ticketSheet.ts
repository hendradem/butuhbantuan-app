export type TicketSheetQuery = {
  via?: string;
  to?: string;
};

function buildTicketUrl(ticketNumber: string, via = "", to = ""): string {
  const qs = new URLSearchParams();
  if (via) qs.set("via", via);
  if (to) qs.set("to", to);
  const q = qs.toString();
  return `/ticket/${encodeURIComponent(ticketNumber)}${q ? `?${q}` : ""}`;
}

/** Sheet owns the address bar via history API (stay on home, no remount). */
let urlOwned = false;
let closingWithBack = false;
let popBound = false;

type TicketSheetPopTarget = {
  isOpen: boolean;
  ticketNumber: string;
  via: string;
  to: string;
  requestClose: () => void;
};

function bindPopstate(store: TicketSheetPopTarget) {
  if (!import.meta.client || popBound) return;
  popBound = true;
  window.addEventListener("popstate", () => {
    if (closingWithBack) {
      closingWithBack = false;
      return;
    }
    if (!store.isOpen || !urlOwned) return;

    // History already left the ticket URL — reclaim it and ask before closing.
    urlOwned = false;
    const target = buildTicketUrl(store.ticketNumber, store.via, store.to);
    urlOwned = true;
    window.history.pushState({ bbTicketSheet: true }, "", target);
    store.requestClose();
  });
}

export const useTicketSheetStore = defineStore("ticketSheet", {
  state: () => ({
    isOpen: false,
    confirmCloseOpen: false,
    ticketNumber: "",
    via: "",
    to: "",
  }),
  actions: {
    open(ticketNumber: string, query?: TicketSheetQuery) {
      const n = String(ticketNumber || "").trim();
      if (!n) return;
      this.ticketNumber = n;
      this.via = String(query?.via || "").trim();
      this.to = String(query?.to || "").trim();
      this.confirmCloseOpen = false;
      this.isOpen = true;
      this.syncUrlOpen();
    },
    /** User-initiated close (X / backdrop / back) — show confirm first. */
    requestClose() {
      if (!this.isOpen) return;
      this.confirmCloseOpen = true;
    },
    cancelCloseConfirm() {
      this.confirmCloseOpen = false;
    },
    /** Confirmed by user — dismiss ticket sheet (prefer closeAllSheets from UI for full reset). */
    confirmClose() {
      this.confirmCloseOpen = false;
      this.close();
    },
    /** Force close (no confirm). Used after confirm + programmatic resets. */
    close() {
      if (!this.isOpen) return;
      this.confirmCloseOpen = false;
      this.isOpen = false;
      this.syncUrlClose();
    },
    onClose() {
      this.requestClose();
    },
    syncUrlOpen() {
      if (!import.meta.client) return;
      bindPopstate(this);

      const target = buildTicketUrl(this.ticketNumber, this.via, this.to);
      const cur = `${window.location.pathname}${window.location.search}`;

      // Already on this ticket URL — nothing to do.
      if (cur === target) return;

      // Standalone /ticket page owns the route; don't fight the router.
      if (!urlOwned && window.location.pathname.startsWith("/ticket/")) {
        return;
      }

      // Already syncing — swap ticket URL without stacking history.
      if (urlOwned) {
        window.history.replaceState({ bbTicketSheet: true }, "", target);
        return;
      }

      urlOwned = true;
      window.history.pushState({ bbTicketSheet: true }, "", target);
    },
    syncUrlClose() {
      if (!import.meta.client || !urlOwned) return;
      urlOwned = false;
      if (!window.location.pathname.startsWith("/ticket/")) return;
      closingWithBack = true;
      window.history.back();
    },
  },
});
