package request

type EmergencyCreate struct {
	Name             string `json:"name" validate:"required"`
	OrganizationName string `json:"organization_name" validate:"required"`
	OrganizationType string `json:"organization_type" validate:"required"`
	Description      string `json:"description" validate:"required"`
	IsVerified       bool   `json:"is_verified" validate:"required"`
	OrganizationLogo string `json:"organization_logo" validate:"required"`
	Latitude         string `json:"latitude" validate:"required"`
	Longitude        string `json:"longitude" validate:"required"`
	Email            string `json:"email" validate:"required,email"`
	Phone            string `json:"phone" validate:"required"`
	Whatsapp         string `json:"whatsapp" validate:"required"`
	DistrictID       string `json:"district_id" validate:"required"`
	RegencyID        string `json:"regency_id" validate:"required"`
	ProvinceID       string `json:"province_id" validate:"required"`
	EmergencyTypeID  uint   `json:"emergency_type_id" validate:"required"`
	FullAddress      string `json:"full_address" validate:"required"`
	TypeOfService    string `json:"type_of_service" validate:"required"`
	IsDispatcher     bool   `json:"is_dispatcher"` // Optional, add `validate:"required"` if needed
}

type EmergencyTypeCreate struct {
	Name        string `json:"name" validate:"required"`
	Description string `json:"description" validate:"required"`
	Icon        string `json:"icon" validate:"required"`
}
