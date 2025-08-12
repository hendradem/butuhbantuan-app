package dto

// type EmergencyServiceResponse struct {
// 	ID               string     `json:"id"`
// 	Name             string     `json:"name"`
// 	OrganizationName string     `json:"organization"`
// 	OrganizationType string     `json:"organizationType"`
// 	Logo             string     `json:"logo"`
// 	Description      string     `json:"description"`
// 	Coordinates      [2]float64 `json:"coordinates"`
// 	TypeOfService    string     `json:"typeOfService"`
// 	EmergencyType    struct {
// 		ID                uint   `json:"id"`
// 		EmergencyTypeName string `json:"emergencyTypeName"`
// 		IsActive          bool   `json:"isActive"`
// 		Icon              string `json:"icon"`
// 	}
// 	Address struct {
// 		District    string `json:"district"`
// 		Regency     string `json:"regency"`
// 		Province    string `json:"province"`
// 		FullAddress string `json:"fullAddress"`
// 	} `json:"address"`
// 	Contact struct {
// 		Whatsapp string `json:"whatsapp"`
// 		Phone    string `json:"phone"`
// 	} `json:"contact"`
// }

type EmergencyServiceResponse struct {
	ID               string    `json:"id"`
	Name             string    `json:"name"`
	OrganizationName string    `json:"organization_name"`
	OrganizationType string    `json:"organization_type"`
	Logo             string    `json:"organization_logo"`
	Description      string    `json:"description"`
	Coordinates      [2]string `json:"coordinates"` // [longitude, latitude]
	TypeOfService    string    `json:"type_of_service"`
	IsDispatcher     bool      `json:"is_dispatcher"`

	EmergencyType struct {
		ID                uint   `json:"id"`
		EmergencyTypeName string `json:"name"`
		IsActive          bool   `json:"is_active"`
		Icon              string `json:"icon"`
	} `json:"emergency_type"`

	Address struct {
		DistrictID  string `json:"district_id"`
		District    string `json:"district"`
		RegencyID   string `json:"regency_id"`
		Regency     string `json:"regency"`
		ProvinceID  string `json:"province_id"`
		Province    string `json:"province"`
		FullAddress string `json:"full_address"`
	} `json:"address"`

	Contact struct {
		Email    string `json:"email"`
		Whatsapp string `json:"whatsapp"`
		Phone    string `json:"phone"`
	} `json:"contact"`
}
