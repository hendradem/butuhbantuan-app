package request

type AvailableServiceCityCreate struct {
	City      string  `json:"city" validate:"required"`
	RegencyID string  `json:"regency_id" validate:"required"` // Use string to match foreign key format like "3501"
	Latitude  float64 `json:"latitude" validate:"required"`
	Longitude float64 `json:"longitude" validate:"required"`
}
