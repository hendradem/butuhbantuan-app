package domain

import "math"

// EstimateETAMinutes returns an approximate driving ETA using haversine distance
// at avgSpeedKmh (defaults to 40 km/h when <= 0). Returns 0 when coords are invalid.
func EstimateETAMinutes(fromLat, fromLng, toLat, toLng, avgSpeedKmh float64) int {
	if fromLat == 0 && fromLng == 0 {
		return 0
	}
	if toLat == 0 && toLng == 0 {
		return 0
	}
	if avgSpeedKmh <= 0 {
		avgSpeedKmh = 40
	}
	km := haversineKm(fromLat, fromLng, toLat, toLng)
	mins := int(math.Ceil(km / avgSpeedKmh * 60))
	if mins < 1 {
		return 1
	}
	if mins > 180 {
		return 180
	}
	return mins
}

func haversineKm(lat1, lng1, lat2, lng2 float64) float64 {
	const earthRadiusKm = 6371.0
	toRad := func(d float64) float64 { return d * math.Pi / 180 }
	dLat := toRad(lat2 - lat1)
	dLng := toRad(lng2 - lng1)
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(toRad(lat1))*math.Cos(toRad(lat2))*math.Sin(dLng/2)*math.Sin(dLng/2)
	return 2 * earthRadiusKm * math.Asin(math.Min(1, math.Sqrt(a)))
}

// DistanceKm is the public haversine distance helper.
func DistanceKm(lat1, lng1, lat2, lng2 float64) float64 {
	return haversineKm(lat1, lng1, lat2, lng2)
}
