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
	Email            string `json:"email" validate:"required"`
	Phone            string `json:"phone" validate:"required"`
	Whatsapp         string `json:"whatsapp" validate:"required"`
	District         string `json:"district" validate:"required"`
	Regency          string `json:"regency" validate:"required"`
	Province         string `json:"province" validate:"required"`
	FullAddress      string `json:"full_address" validate:"required"`
	TypeOfService    string `json:"type_of_service" validate:"required"`
}
