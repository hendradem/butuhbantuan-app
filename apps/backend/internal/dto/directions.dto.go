package dto

type DirectionsDTO struct {
	Geometry GeometryDTO `json:"geometry"`
}

type GeometryDTO struct {
	Coordinates [][]float64 `json:"coordinates"`
}
