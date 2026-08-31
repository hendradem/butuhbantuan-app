type RouteOpts = {
  /** When hydrating from URL — do not write back to the address bar. */
  skipUrl?: boolean;
};

/** Draw / clear unit→user route and keep `to` in sync with the URL. */
export function useMapRouting() {
  const leaflet = useLeafletStore();
  const userLocation = useUserLocationStore();
  const mapUrl = useMapUrl();

  function setRouteTo(lat: number, lng: number, opts?: RouteOpts) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    leaflet.updateLeafletRouting({
      startPoint: { lat: userLocation.lat, lng: userLocation.long },
      routeEndPoint: { lat, lng },
    });

    if (!opts?.skipUrl) mapUrl.setTo(lat, lng);
  }

  function clearRoute(opts?: RouteOpts) {
    leaflet.resetLeafletRouting();
    if (!opts?.skipUrl) mapUrl.clearTo();
  }

  return { setRouteTo, clearRoute };
}
