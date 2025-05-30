package request

type AvailableServiceCityCreate struct {
	CityName             string `json:"city_name" validate:"required"`
	Province             string `json:"province" validate:"required"`
	ContactCenter        string `json:"contact_center" validate:"required"`
	VolunteerCoordinator string `json:"volunteer_coordinator" validate:"required"`
	IsActive             bool   `json:"is_active"`
}
