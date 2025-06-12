package dto

type EmergencyServiceResponse struct {
	ID               string     `json:"id"`
	Name             string     `json:"name"`
	OrganizationName string     `json:"organization"`
	OrganizationType string     `json:"organizationType"`
	EmergencyTypeID  uint       `json:"emergencyTypeID"`
	Logo             string     `json:"logo"`
	Description      string     `json:"description"`
	Coordinates      [2]float64 `json:"coordinates"`
	TypeOfService    string     `json:"typeOfService"`
	Address          struct {
		District    string `json:"district"`
		Regency     string `json:"regency"`
		Province    string `json:"province"`
		FullAddress string `json:"fullAddress"`
	} `json:"address"`
	Contact struct {
		Whatsapp string `json:"whatsapp"`
		Phone    string `json:"phone"`
	} `json:"contact"`
}
