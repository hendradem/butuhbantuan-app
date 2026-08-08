import { point, distance as turfDistance } from "@turf/turf";

export function getNearestDataWithEstimation(
  emergencyData: any[],
  userLocation: [number, number]
): any[] {
  const averageSpeedKmh = 40;

  return emergencyData.map((e: any) => {
    const from = point(userLocation);
    const to = point([+e.coordinates[0], +e.coordinates[1]]);
    const distanceKm = turfDistance(from, to, { units: "kilometers" });
    const durationMinutes = (distanceKm / averageSpeedKmh) * 60;
    return {
      emergencyData: e,
      trip: { distance: distanceKm * 1000, duration: durationMinutes },
    };
  });
}

export function getAllTripEstimations(
  emergencyData: any[],
  userLocation: [number, number]
): any[] {
  const averageSpeedKmh = 40;
  return emergencyData.map((e: any) => {
    const from = point(userLocation);
    const to = point([+e.coordinates[0], +e.coordinates[1]]);
    const distanceKm = turfDistance(from, to, { units: "kilometers" });
    const durationMinutes = (distanceKm / averageSpeedKmh) * 60;
    return {
      emergencyData: e,
      trip: { distance: distanceKm * 1000, duration: durationMinutes },
    };
  });
}
