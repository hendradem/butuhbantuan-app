package dto

type DirectionsDTO struct {
	Geometry GeometryDTO `json:"geometry"`
}

type GeometryDTO struct {
	Coordinates [][]float64 `json:"coordinates"`
}

type OSRMResponse struct {
	EmergencyData map[string]interface{} `json:"emergencyData"`
	Trip          struct {
		Distance float64 `json:"distance"`
		Duration float64 `json:"duration"`
	} `json:"trip"`
}

type EmergencyTripRequest struct {
	UserCoordinates [2]float64 `json:"userCoordinates"`
	EmergencyIDs    []string   `json:"emergencyIDs"`
}

type TripResult struct {
	Duration float64 `json:"duration"` // in seconds
	Distance float64 `json:"distance"` // in meters
}

type EmergencyWithTrip struct {
	EmergencyData interface{} `json:"emergencyData"` // replace `interface{}` with your real model
	Trip          TripResult  `json:"trip"`
}
