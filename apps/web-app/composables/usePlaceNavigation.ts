import { getSavedPlace, type SavedPlace } from "~/utils/savedPlaces";

type GoToPlaceOpts = {
  /** When hydrating from URL — do not write back to the address bar. */
  skipUrl?: boolean;
};

/** Move the map pin to a saved place and refresh nearby services. */
export function usePlaceNavigation() {
  const mapUrl = useMapUrl();
  const userLocation = useUserLocationStore();
  const leaflet = useLeafletStore();
  const detailSheet = useDetailSheetStore();
  const exploreSheet = useExploreSheetStore();
  const { clearRoute } = useMapRouting();
  const { loadEmergencyData } = useEmergencyApi();

  async function goToPlace(target: SavedPlace | string, opts?: GoToPlaceOpts) {
    const place =
      typeof target === "string" ? getSavedPlace(target) : target;
    if (!place) return false;

    userLocation.setManualLocation(true);
    userLocation.updateCoordinate(place.lat, place.lng);
    userLocation.updateFullAddress(place.address);
    clearRoute({ skipUrl: opts?.skipUrl });
    leaflet.requestDefaultView();
    detailSheet.clearExploreReturn();
    detailSheet.onClose();
    exploreSheet.onClose();

    await loadEmergencyData(place.lat, place.lng);

    if (!opts?.skipUrl) mapUrl.setPlace(place.id);
    return true;
  }

  return { goToPlace };
}
