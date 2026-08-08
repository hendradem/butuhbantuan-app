export function formatGeoAddress(geoRes: any): string {
  if (!geoRes) return "";
  const a = geoRes.address;
  if (!a) return geoRes.display_name || "";

  const street = a.road || a.pedestrian || a.footway || "";
  const area = a.suburb || a.village || a.neighbourhood || a.hamlet || "";
  const region = a.county || a.city || a.town || a.municipality || "";

  return [street, area, region].filter(Boolean).join(", ") || geoRes.display_name || "";
}

export function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}
