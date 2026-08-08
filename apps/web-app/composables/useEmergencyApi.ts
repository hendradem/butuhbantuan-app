import { getNearestDataWithEstimation } from "~/utils/turf";
import { formatGeoAddress } from "~/utils/geo";
import { toast } from "vue-sonner";

const MAX_MATRIX_BATCH = 24; // Mapbox Matrix: max 25 coords total (1 origin + 24 destinations)
const MAX_TRAVEL_MINUTES = 15;

// Module-level counter — shared across all composable instances.
// Incremented on every loadEmergencyData call; stale calls check this before mutating state.
let fetchEpoch = 0;

export function useEmergencyApi() {
  const config = useRuntimeConfig();
  const emergencyStore = useEmergencyStore();
  const userLocation = useUserLocationStore();

  const baseUrl = config.public.apiBaseUrl;

  async function fetchEmergencyTypes() {
    return $fetch<{ data: any[] }>(`${baseUrl}/api/v1/emergency/type`);
  }

  async function fetchEmergencyByProvince(provinceId: string) {
    return $fetch<{ data: any[] }>(`${baseUrl}/api/v1/emergency/province/${provinceId}`);
  }

  // Calls Mapbox Distance Matrix for accurate road-based durations/distances.
  // Returns an array parallel to `emergencies`; null entries mean the call failed
  // for that batch and the caller should fall back to turf estimation.
  async function fetchDistanceMatrix(
    userLat: number,
    userLng: number,
    emergencies: any[]
  ): Promise<Array<{ duration: number; distance: number } | null>> {
    const results: Array<{ duration: number; distance: number } | null> = new Array(emergencies.length).fill(null);

    for (let i = 0; i < emergencies.length; i += MAX_MATRIX_BATCH) {
      const batch = emergencies.slice(i, i + MAX_MATRIX_BATCH);
      const coords = [
        `${userLng},${userLat}`,
        ...batch.map((e: any) => `${e.coordinates[0]},${e.coordinates[1]}`),
      ].join(";");

      try {
        const res = await $fetch<any>(
          `${baseUrl}/api/v1/directions/matrix?coordinates=${encodeURIComponent(coords)}`
        );
        const durations: (number | null)[] = res?.data?.durations?.[0] ?? [];
        const distances: (number | null)[] = res?.data?.distances?.[0] ?? [];

        batch.forEach((_: any, j: number) => {
          const dur = durations[j + 1]; // index 0 = user→user = 0
          const dist = distances[j + 1];
          if (dur !== null && dur !== undefined) {
            results[i + j] = { duration: dur / 60, distance: dist ?? 0 }; // seconds → minutes
          }
        });
      } catch {
        // batch failed — null entries trigger turf fallback below
      }
    }

    return results;
  }

  async function loadEmergencyData(lat: number, lng: number) {
    const myEpoch = ++fetchEpoch;

    userLocation.setAddressLoading(true);
    emergencyStore.setLoading(true);
    try {
      const toastId = toast.loading("Mencari layanan...");

      const geoWrapper = await $fetch<any>(
        `${baseUrl}/api/v1/geocoding/reverse?latitude=${lat}&longitude=${lng}`
      );

      // Bail out if a newer call superseded this one while we were awaiting
      if (myEpoch !== fetchEpoch) return;

      const geoRes = geoWrapper?.data ?? geoWrapper;

      const formattedAddress = formatGeoAddress(geoRes);
      userLocation.updateFullAddress(formattedAddress || userLocation.fullAddress);
      userLocation.setAddressLoading(false);

      const regionName = geoRes?.address?.county || geoRes?.address?.city;

      if (!regionName) {
        emergencyStore.setCoverage(false);
        toast.error("Layanan belum tersedia di area ini", { id: toastId });
        emergencyStore.setFilteredEmergency([]);
        return;
      }

      const cityRes = await $fetch<{ data: any[] }>(
        `${baseUrl}/api/v1/service/available-region/${encodeURIComponent(regionName)}`
      );

      if (myEpoch !== fetchEpoch) return;

      const city = cityRes?.data?.[0];
      if (!city) {
        emergencyStore.setCoverage(false);
        toast.error(`Layanan belum tersedia di ${regionName}`, { id: toastId });
        emergencyStore.setFilteredEmergency([]);
        return;
      }

      emergencyStore.setCoverage(true);
      userLocation.setCurrentRegion({
        regency: { id: city?.regency_id ?? "", name: regionName },
        province: { id: city?.regency_id?.slice(0, 2) ?? "", name: "" },
      });

      const regencyId = city?.regency_id;
      const provinceId = regencyId?.slice(0, 2);
      const res = await fetchEmergencyByProvince(provinceId);
      const emergencyList: any[] = res.data;

      const userLoc: [number, number] = [lng, lat];

      // Fetch real road-based durations from Mapbox Matrix
      const matrix = await fetchDistanceMatrix(lat, lng, emergencyList);

      if (myEpoch !== fetchEpoch) return;

      const calculated = emergencyList.map((e: any, idx: number) => {
        const trip = matrix[idx];
        if (trip) return { emergencyData: e, trip };
        return getNearestDataWithEstimation([e], userLoc)[0];
      });

      // Keep services within 15 min; always include dispatchers from the current regency
      const withinRange = calculated.filter((item: any) => {
        if (item.trip.duration <= MAX_TRAVEL_MINUTES) return true;
        const isLocalDispatcher =
          item.emergencyData?.is_dispatcher &&
          item.emergencyData?.address?.regency_id === regencyId;
        return isLocalDispatcher;
      });
      const toShow = withinRange.length > 0 ? withinRange : calculated.slice(0, 5);
      toShow.sort((a: any, b: any) => a.trip.duration - b.trip.duration);

      emergencyStore.setFilteredEmergency(toShow);
      toast.success(`Layanan tersedia di ${regionName}`, { id: toastId });
    } catch (err) {
      if (myEpoch !== fetchEpoch) return;
      console.error(err);
      toast.error("Gagal mengambil data");
    } finally {
      // Only release loading state if this is still the active call
      if (myEpoch === fetchEpoch) {
        userLocation.setAddressLoading(false);
        emergencyStore.setLoading(false);
      }
    }
  }

  return { fetchEmergencyTypes, loadEmergencyData };
}
