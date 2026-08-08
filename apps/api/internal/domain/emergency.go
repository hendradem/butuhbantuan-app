package domain

type Emergency struct {
	ID                   string        `json:"id"`
	Name                 string        `json:"name"`
	OrganizationName     string        `json:"organization_name"`
	OrganizationType     string        `json:"organization_type"`
	Logo                 string        `json:"organization_logo"`
	Description          string        `json:"description"`
	Coordinates          [2]string     `json:"coordinates"` // [longitude, latitude]
	TypeOfService        string        `json:"type_of_service"`
	IsDispatcher         bool          `json:"is_dispatcher"`
	IsProvinceDispatcher bool          `json:"is_province_dispatcher"`
	EmergencyType        EmergencyType `json:"emergency_type"`
	Address              Address       `json:"address"`
	Contact              Contact       `json:"contact"`
}

type EmergencyType struct {
	ID          uint   `json:"id"`
	Name        string `json:"name"`
	Icon        string `json:"icon"`
	Description string `json:"description,omitempty"`
}

type Address struct {
	DistrictID  string `json:"district_id"`
	District    string `json:"district"`
	RegencyID   string `json:"regency_id"`
	Regency     string `json:"regency"`
	ProvinceID  string `json:"province_id"`
	Province    string `json:"province"`
	FullAddress string `json:"full_address"`
}

type Contact struct {
	Email    string `json:"email"`
	Phone    string `json:"phone"`
	Whatsapp string `json:"whatsapp"`
}
