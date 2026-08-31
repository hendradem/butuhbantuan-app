package domain

import "strings"

// Partner tier — quality / trust level (independent of cascade dispatcher flags).
const (
	PartnerTierPSC       = "psc"
	PartnerTierVerified  = "verified"
	PartnerTierCommunity = "community"
)

type Emergency struct {
	ID                   string            `json:"id"`
	Name                 string            `json:"name"`
	OrganizationName     string            `json:"organization_name"`
	OrganizationType     string            `json:"organization_type"`
	Logo                 string            `json:"organization_logo"`
	Description          string            `json:"description"`
	Coordinates          [2]string         `json:"coordinates"` // [longitude, latitude]
	TypeOfService        string            `json:"type_of_service"`
	TipeEmergency        []string          `json:"tipe_emergency"`
	IsDispatcher         bool              `json:"is_dispatcher"`
	IsProvinceDispatcher bool              `json:"is_province_dispatcher"`
	PartnerTier          string            `json:"partner_tier"` // psc | verified | community
	// DashboardAccess: when false, unit cannot / should not use the logged-in
	// dashboard; citizen flow uses WhatsApp + /dispatch/{token} instead.
	// Default true for existing & new units.
	DashboardAccess bool `json:"dashboard_access"`
	// WaDispatch is computed on citizen reads — unit needs WhatsApp + /dispatch link.
	WaDispatch      bool                   `json:"wa_dispatch,omitempty"`
	Compliance             *AmbulanceComplianceView   `json:"compliance,omitempty"`
	IncidentReportTemplate *IncidentReportTemplate  `json:"incident_report_template,omitempty"`
	Readiness              Readiness                  `json:"readiness"`
	EmergencyType   EmergencyType     `json:"emergency_type"`
	Address         Address           `json:"address"`
	Contact         Contact           `json:"contact"`
	Operational     OperationalStatus `json:"operational"`
	Fleet           FleetStatus       `json:"fleet"`
}

// Readiness is on-the-ground capability claimed by the partner unit.
type Readiness struct {
	TrainedDriver   bool   `json:"trained_driver"`
	HasOxygen       bool   `json:"has_oxygen"`
	HasStretcher    bool   `json:"has_stretcher"`
	EquipmentNotes  string `json:"equipment_notes,omitempty"`
}

type OperationalStatus struct {
	IsActive  bool   `json:"is_active"`
	Is24Hours bool   `json:"is_24_hours"`
	OpenTime  string `json:"open_time"`
	CloseTime string `json:"close_time"`
}

type FleetStatus struct {
	Total     int `json:"total"`
	Available int `json:"available"`
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

// IsHospitalUnit reports RS / hospital org types (phone/IGD flow, not WA dispatch).
func IsHospitalUnit(orgType string) bool {
	t := strings.ToLower(strings.TrimSpace(orgType))
	return t == "rumah_sakit" || t == "rs" || strings.Contains(t, "hospital")
}

// UsesWaDispatch reports whether citizens must reach the unit via WhatsApp magic link.
// When dashboard_access is true but no unit login exists, treat as WA-only.
func (e Emergency) UsesWaDispatch(hasUnitLogin bool) bool {
	if IsHospitalUnit(e.OrganizationType) {
		return false
	}
	if !e.DashboardAccess {
		return true
	}
	return !hasUnitLogin
}
