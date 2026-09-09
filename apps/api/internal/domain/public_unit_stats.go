package domain

import "time"

// PublicUnitProfile is a safe subset of unit identity for public stats pages.
// No phone / WhatsApp / email / exact coordinates.
type PublicUnitProfile struct {
	ID               string `json:"id"`
	Name             string `json:"name"`
	OrganizationName string `json:"organization_name"`
	Logo             string `json:"organization_logo,omitempty"`
	EmergencyType    string `json:"emergency_type"`
	Regency          string `json:"regency"`
	Province         string `json:"province"`
	PartnerTier      string `json:"partner_tier"` // psc | verified | community
	IsActive         bool   `json:"is_active"`
	Is24Hours        bool   `json:"is_24_hours"`
}

// PublicUnitOrderStats aggregates closed-loop order metrics for a period.
type PublicUnitOrderStats struct {
	Total            int64   `json:"total"`
	Completed        int64   `json:"completed"`
	Cancelled        int64   `json:"cancelled"`
	Pending          int64   `json:"pending"`
	InProgress       int64   `json:"in_progress"` // accepted + in_progress
	CompletionRate   float64 `json:"completion_rate"`
	CancellationRate float64 `json:"cancellation_rate"`
	AvgResponseSec   float64 `json:"avg_response_sec"`
	AvgArrivalSec    float64 `json:"avg_arrival_sec"`
	ShowRates        bool    `json:"show_rates"`
}

// PublicUnitFeedbackStats aggregates citizen helpfulness signals.
type PublicUnitFeedbackStats struct {
	Total        int      `json:"total"`
	HelpfulRate  float64  `json:"helpful_rate"`
	ShowRate     bool     `json:"show_rate"`
	RecentQuotes []string `json:"recent_quotes,omitempty"`
}

// ReferralStat is a single RS referral count entry.
type ReferralStat struct {
	HospitalID   string `json:"hospital_id"`
	HospitalName string `json:"hospital_name"`
	Count        int64  `json:"count"`
}

// PublicUnitStats is the share / public page payload.
type PublicUnitStats struct {
	Unit        PublicUnitProfile       `json:"unit"`
	PeriodDays  int                     `json:"period_days"`
	Orders      PublicUnitOrderStats    `json:"orders"`
	Feedback    PublicUnitFeedbackStats `json:"feedback"`
	DailyTrend  []DailyStat             `json:"daily_trend"`
	ByHour      []HourStat              `json:"by_hour"`
	PeakHour    *HourStat               `json:"peak_hour,omitempty"`
	Referrals   []ReferralStat          `json:"referrals,omitempty"`
	ByJenisPelayanan []JenisPelayananStat `json:"by_jenis_pelayanan,omitempty"`
	GeneratedAt time.Time               `json:"generated_at"`
}

// UnitPeriodAggregates is raw period math before public gating.
type UnitPeriodAggregates struct {
	TotalOrders     int64
	Completed       int64
	Cancelled       int64
	Pending         int64
	InProgress      int64
	AvgResponseSec  float64
	AvgArrivalSec   float64
	FeedbackTotal   int64
	FeedbackHelpful int64
	RecentQuotes    []string
	DailyTrend      []DailyStat
	ByHour          []HourStat
	Referrals       []ReferralStat
	ByJenisPelayanan []JenisPelayananStat
}

// Min samples before rates are shown on the public page.
const (
	PublicStatsMinOrders   = 5
	PublicStatsMinFeedback = 3
)

func round1f(v float64) float64 {
	return float64(int(v*10+0.5)) / 10
}

// BuildPublicUnitStats maps an emergency + aggregates into a safe public DTO.
// When publicGate is true, rates stay hidden until min sample sizes are met.
func BuildPublicUnitStats(e Emergency, agg UnitPeriodAggregates, periodDays int, publicGate bool) PublicUnitStats {
	if periodDays <= 0 {
		periodDays = 30
	}
	orders := PublicUnitOrderStats{
		Total:          agg.TotalOrders,
		Completed:      agg.Completed,
		Cancelled:      agg.Cancelled,
		Pending:        agg.Pending,
		InProgress:     agg.InProgress,
		AvgResponseSec: agg.AvgResponseSec,
		AvgArrivalSec:  agg.AvgArrivalSec,
		ShowRates:      !publicGate || agg.TotalOrders >= PublicStatsMinOrders,
	}
	if closed := agg.Completed + agg.Cancelled; closed > 0 {
		orders.CompletionRate = round1f(float64(agg.Completed) * 100 / float64(closed))
	}
	if agg.TotalOrders > 0 {
		orders.CancellationRate = round1f(float64(agg.Cancelled) * 100 / float64(agg.TotalOrders))
	}
	if !orders.ShowRates {
		orders.CompletionRate = 0
		orders.CancellationRate = 0
		orders.AvgResponseSec = 0
		orders.AvgArrivalSec = 0
	}

	feedback := PublicUnitFeedbackStats{
		Total:        int(agg.FeedbackTotal),
		ShowRate:     !publicGate || agg.FeedbackTotal >= PublicStatsMinFeedback,
		RecentQuotes: agg.RecentQuotes,
	}
	if feedback.RecentQuotes == nil {
		feedback.RecentQuotes = []string{}
	}
	if agg.FeedbackTotal > 0 && feedback.ShowRate {
		feedback.HelpfulRate = round1f(float64(agg.FeedbackHelpful) * 100 / float64(agg.FeedbackTotal))
	}

	trend := agg.DailyTrend
	if trend == nil {
		trend = []DailyStat{}
	}
	hours := agg.ByHour
	if hours == nil {
		hours = []HourStat{}
	}
	var peak *HourStat
	for i := range hours {
		if peak == nil || hours[i].Count > peak.Count {
			h := hours[i]
			peak = &h
		}
	}
	if peak != nil && peak.Count == 0 {
		peak = nil
	}

	referrals := agg.Referrals
	if referrals == nil {
		referrals = []ReferralStat{}
	}
	byJenis := agg.ByJenisPelayanan
	if byJenis == nil {
		byJenis = []JenisPelayananStat{}
	}

	return PublicUnitStats{
		Unit: PublicUnitProfile{
			ID:               e.ID,
			Name:             e.Name,
			OrganizationName: e.OrganizationName,
			Logo:             e.Logo,
			EmergencyType:    e.EmergencyType.Name,
			Regency:          e.Address.Regency,
			Province:         e.Address.Province,
			PartnerTier:      e.PartnerTier,
			IsActive:         e.Operational.IsActive,
			Is24Hours:        e.Operational.Is24Hours,
		},
		PeriodDays:  periodDays,
		Orders:      orders,
		Feedback:    feedback,
		DailyTrend:  trend,
		ByHour:      hours,
		PeakHour:    peak,
		Referrals:   referrals,
		ByJenisPelayanan: byJenis,
		GeneratedAt: time.Now().UTC(),
	}
}
