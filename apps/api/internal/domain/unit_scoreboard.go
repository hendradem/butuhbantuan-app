package domain

// UnitScoreEntry is one row on the admin scoreboard: aggregated performance
// metrics for a single unit within a time window (7 / 30 / 90 days).
type UnitScoreEntry struct {
	EmergencyUUID    string  `json:"emergency_uuid"`
	Name             string  `json:"name"`
	OrganizationName string  `json:"organization_name,omitempty"`
	EmergencyType    string  `json:"emergency_type,omitempty"`
	Regency          string  `json:"regency,omitempty"`
	Province         string  `json:"province,omitempty"`
	PartnerTier      string  `json:"partner_tier,omitempty"`
	IsActive         bool    `json:"is_active"`

	TotalOrders      int64   `json:"total_orders"`
	Completed        int64   `json:"completed"`
	Cancelled        int64   `json:"cancelled"`
	Pending          int64   `json:"pending"`
	InProgress       int64   `json:"in_progress"`
	CompletionRate   float64 `json:"completion_rate"`
	CancellationRate float64 `json:"cancellation_rate"`
	AvgResponseSec   float64 `json:"avg_response_sec"`
	AvgArrivalSec    float64 `json:"avg_arrival_sec"`

	FeedbackTotal   int64   `json:"feedback_total"`
	FeedbackHelpful int64   `json:"feedback_helpful"`
	HelpfulRate     float64 `json:"helpful_rate"`
}

// UnitScoreRow is the raw aggregation output from the repo, before enrichment
// with emergency profile fields.
type UnitScoreRow struct {
	EmergencyUUID   string
	TotalOrders     int64
	Completed       int64
	Cancelled       int64
	Pending         int64
	InProgress      int64
	AvgResponseSec  float64
	AvgArrivalSec   float64
	FeedbackTotal   int64
	FeedbackHelpful int64
}

// BuildUnitScoreEntry maps a unit + its raw aggregation into the DTO the
// scoreboard renders. Rates round to 1 decimal.
func BuildUnitScoreEntry(unit Emergency, row UnitScoreRow) UnitScoreEntry {
	e := UnitScoreEntry{
		EmergencyUUID:    unit.ID,
		Name:             unit.Name,
		OrganizationName: unit.OrganizationName,
		EmergencyType:    unit.EmergencyType.Name,
		Regency:          unit.Address.Regency,
		Province:         unit.Address.Province,
		PartnerTier:      unit.PartnerTier,
		IsActive:         unit.Operational.IsActive,
		TotalOrders:      row.TotalOrders,
		Completed:        row.Completed,
		Cancelled:        row.Cancelled,
		Pending:          row.Pending,
		InProgress:       row.InProgress,
		AvgResponseSec:   row.AvgResponseSec,
		AvgArrivalSec:    row.AvgArrivalSec,
		FeedbackTotal:    row.FeedbackTotal,
		FeedbackHelpful:  row.FeedbackHelpful,
	}
	if row.TotalOrders > 0 {
		e.CompletionRate = round1f(float64(row.Completed) / float64(row.TotalOrders) * 100)
		e.CancellationRate = round1f(float64(row.Cancelled) / float64(row.TotalOrders) * 100)
	}
	if row.FeedbackTotal > 0 {
		e.HelpfulRate = round1f(float64(row.FeedbackHelpful) / float64(row.FeedbackTotal) * 100)
	}
	return e
}
