package domain

type AnalyticsSummary struct {
	TotalOrders      int64   `json:"total_orders"`
	TotalThisMonth   int64   `json:"total_this_month"`
	CompletionRate   float64 `json:"completion_rate"`
	CancellationRate float64 `json:"cancellation_rate"`
	AvgResponseSec   float64 `json:"avg_response_sec"` // created → accepted
	AvgArrivalSec    float64 `json:"avg_arrival_sec"`  // accepted → arrived (on-scene)
	AvgHandlingSec   float64 `json:"avg_handling_sec"` // accepted → completed
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
	AvgArrivalSec  float64 `json:"avg_arrival_sec"`
	HelpfulRate    float64 `json:"helpful_rate"`
}

type RegionStat struct {
	Regency  string `json:"regency"`
	Province string `json:"province"`
	Count    int64  `json:"count"`
}

// FunnelStage is one step in the dispatch lifecycle (order-centric).
type FunnelStage struct {
	Stage string `json:"stage"` // created | offered | accepted | arrived | completed
	Label string `json:"label"`
	Count int64  `json:"count"`
}

// FunnelDrop is a terminal / leak side-metric next to the main funnel.
type FunnelDrop struct {
	Key   string `json:"key"` // exhausted | cancelled | rejected
	Label string `json:"label"`
	Count int64  `json:"count"`
}

// SlaBucket is a response/arrival time bucket for distribution charts.
type SlaBucket struct {
	Bucket string `json:"bucket"` // lt_5m | m5_15 | m15_30 | m30_60 | gte_60
	Label  string `json:"label"`
	Count  int64  `json:"count"`
}

type HeatmapPoint struct {
	Lat           float64 `json:"lat"`
	Lng           float64 `json:"lng"`
	Count         int64   `json:"count"`
	Type          string  `json:"type"`
	TicketNumber  string  `json:"ticket_number,omitempty"`
	Status        string  `json:"status,omitempty"`
	RequesterName string  `json:"requester_name,omitempty"`
	UnitName      string  `json:"unit_name,omitempty"`
	Condition     string  `json:"condition,omitempty" gorm:"column:cond"`
	Location      string  `json:"location,omitempty"`
	CreatedAt     string  `json:"created_at,omitempty"`
	Regency       string  `json:"regency,omitempty"`
	Province      string  `json:"province,omitempty"`
}

type Analytics struct {
	Summary         AnalyticsSummary  `json:"summary"`
	DailyTrend      []DailyStat       `json:"daily_trend"`
	StatusBreakdown []StatusStat      `json:"status_breakdown"`
	ByType          []TypeStat        `json:"by_type"`
	ByHour          []HourStat        `json:"by_hour"`
	UnitPerformance []UnitPerformance `json:"unit_performance"`
	RegionStats     []RegionStat      `json:"region_stats"`
	DispatchFunnel  []FunnelStage     `json:"dispatch_funnel"`
	FunnelDrops     []FunnelDrop      `json:"funnel_drops"`
	ResponseSla     []SlaBucket       `json:"response_sla"` // created → accepted
	ArrivalSla      []SlaBucket       `json:"arrival_sla"`  // accepted → arrived
}
