import { formatGeoAddress } from "~/utils/geo";

export function useGeolocation() {
  const config = useRuntimeConfig();
  const userLocation = useUserLocationStore();

  async function reverseGeocode(lng: number, lat: number) {
    try {
      const baseUrl = config.public.apiBaseUrl;
      const data = await $fetch<any>(
        `${baseUrl}/api/v1/geocoding/reverse?latitude=${lat}&longitude=${lng}`
      );
      return (data as any)?.data ?? data;
    } catch {
      return null;
    }
  }

  async function getCurrentLocation(): Promise<{ lat: number; long: number } | null> {
    return new Promise((resolve) => {
      if (!navigator?.geolocation) {
        resolve({ lat: -7.7956, long: 110.3695 });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, long: pos.coords.longitude }),
        () => {
          // Silent fallback — watchPosition (in LeafletMap) is the authoritative source
          // for error reporting. It fires the error sheet only on true PERMISSION_DENIED.
          resolve({ lat: -7.7956, long: 110.3695 });
        },
        { timeout: 10000, enableHighAccuracy: false }
      );
    });
  }

  async function initUserLocation() {
    const coords = await getCurrentLocation();
    if (!coords) return null;

    userLocation.setManualLocation(false);
    // Seed both the display coords and the GPS-tracking field
    userLocation.updateGPSCoordinate(coords.lat, coords.long);

    const geo = await reverseGeocode(coords.long, coords.lat);
    if (geo) {
      userLocation.updateFullAddress(formatGeoAddress(geo));
    }

    return coords;
  }

  return { getCurrentLocation, initUserLocation, reverseGeocode };
}
