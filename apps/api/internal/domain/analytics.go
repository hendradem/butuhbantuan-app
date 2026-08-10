package domain

type AnalyticsSummary struct {
	TotalOrders      int64   `json:"total_orders"`
	TotalThisMonth   int64   `json:"total_this_month"`
	CompletionRate   float64 `json:"completion_rate"`
	CancellationRate float64 `json:"cancellation_rate"`
	AvgResponseSec   float64 `json:"avg_response_sec"`
	AvgHandlingSec   float64 `json:"avg_handling_sec"`
	HelpfulRate      float64 `json:"helpful_rate"`
	ActiveUnits      int64   `json:"active_units"`
	TotalUnits       int64   `json:"total_units"`
}

type DailyStat struct {
	Date  string `json:"date"`
	Count int64  `json:"count"`
}

type StatusStat struct {
	Status string `json:"status"`
	Count  int64  `json:"count"`
}

type TypeStat struct {
	Type  string `json:"type"`
	Count int64  `json:"count"`
}

type HourStat struct {
	Hour  int   `json:"hour"`
	Count int64 `json:"count"`
}

type UnitPerformance struct {
	EmergencyUUID  string  `json:"emergency_uuid"`
	UnitName       string  `json:"unit_name"`
	EmergencyType  string  `json:"emergency_type"`
	Regency        string  `json:"regency"`
	TotalOrders    int64   `json:"total_orders"`
	Completed      int64   `json:"completed"`
	Cancelled      int64   `json:"cancelled"`
	CompletionRate float64 `json:"completion_rate"`
	AvgResponseSec float64 `json:"avg_response_sec"`
	HelpfulRate    float64 `json:"helpful_rate"`
}

type RegionStat struct {
	Regency  string `json:"regency"`
	Province string `json:"province"`
	Count    int64  `json:"count"`
}

type HeatmapPoint struct {
	Lat   float64 `json:"lat"`
	Lng   float64 `json:"lng"`
	Count int64   `json:"count"`
	Type  string  `json:"type"`
}

type Analytics struct {
	Summary         AnalyticsSummary  `json:"summary"`
	DailyTrend      []DailyStat       `json:"daily_trend"`
	StatusBreakdown []StatusStat      `json:"status_breakdown"`
	ByType          []TypeStat        `json:"by_type"`
	ByHour          []HourStat        `json:"by_hour"`
	UnitPerformance []UnitPerformance `json:"unit_performance"`
	RegionStats     []RegionStat      `json:"region_stats"`
}
