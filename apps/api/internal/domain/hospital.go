package domain

import "time"

const (
	HospitalSourceSatuSehat = "satusehat"
	HospitalSourceStub      = "stub"
)

// HospitalMaster is a cached RS directory row (not a live partner unit).
type HospitalMaster struct {
	ID                  string    `json:"id"`
	Source              string    `json:"source"`
	SourceCode          string    `json:"source_code"`
	Name                string    `json:"name"`
	Address             string    `json:"address,omitempty"`
	Phone               string    `json:"phone,omitempty"`
	Class               string    `json:"class,omitempty"`
	Ownership           string    `json:"ownership,omitempty"`
	Latitude            float64   `json:"latitude,omitempty"`
	Longitude           float64   `json:"longitude,omitempty"`
	ProvinceID          string    `json:"province_id"`
	RegencyID           string    `json:"regency_id"`
	ProvinceName        string    `json:"province_name,omitempty"`
	RegencyName         string    `json:"regency_name,omitempty"`
	SyncedAt            time.Time `json:"synced_at"`
	ImportedEmergencyID string    `json:"imported_emergency_id,omitempty"`
	AlreadyImported     bool      `json:"already_imported"`
}

type HospitalSyncResult struct {
	RegencyID string           `json:"regency_id"`
	Source    string           `json:"source"`
	Fetched   int              `json:"fetched"`
	Upserted  int              `json:"upserted"`
	Items     []HospitalMaster `json:"items"`
}

type HospitalImportRequest struct {
	MasterIDs   []string `json:"master_ids"`
	PartnerTier string   `json:"partner_tier,omitempty"`
	IsActive    *bool    `json:"is_active,omitempty"`
}

type HospitalImportResult struct {
	Imported int      `json:"imported"`
	Skipped  int      `json:"skipped"`
	Failed   int      `json:"failed"`
	IDs      []string `json:"emergency_ids"`
	Errors   []string `json:"errors,omitempty"`
}

// HospitalProvider fetches RS directory rows for one kabupaten.
type HospitalProvider interface {
	Name() string
	ListByRegency(regencyID, regencyName, provinceID, provinceName string) ([]HospitalMaster, error)
}
