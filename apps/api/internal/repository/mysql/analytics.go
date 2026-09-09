package mysqlrepo

import (
	"fmt"
	"strings"

	"github.com/butuhbantuan/api/internal/domain"
	"gorm.io/gorm"
)

// Table names — singular because NamingStrategy uses SingularTable: true.
const (
	tOrder    = "order_ticket_entity"
	tEmerg    = "emergency_entity"
	tType     = "emergency_type_entity"
	tFeedback = "feedback_entity"
	tRegency  = "regency"
	tProvince = "province"
)

type AnalyticsRepo struct {
	db *gorm.DB
}

func NewAnalyticsRepo(db *gorm.DB) *AnalyticsRepo { return &AnalyticsRepo{db: db} }

func (r *AnalyticsRepo) GetAnalytics(periodDays int) (domain.Analytics, error) {
	var result domain.Analytics

	// ── Order summary ─────────────────────────────────────────────────────────
	type orderSummary struct {
		TotalOrders    int64
		TotalThisMonth int64
		Completed      int64
		Cancelled      int64
		AvgResponseSec float64
		AvgArrivalSec  float64
		AvgHandlingSec float64
	}
	var os orderSummary
	r.db.Raw(fmt.Sprintf(`
		SELECT
			COUNT(*)                                                                   AS total_orders,
			SUM(CASE WHEN created_at >= DATE_FORMAT(NOW(),'%%Y-%%m-01') THEN 1 ELSE 0 END) AS total_this_month,
			SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)                    AS completed,
			SUM(CASE WHEN status = 'cancelled'  THEN 1 ELSE 0 END)                   AS cancelled,
			COALESCE(ROUND(AVG(CASE WHEN accepted_at IS NOT NULL
				THEN TIMESTAMPDIFF(SECOND, created_at, accepted_at) END), 0), 0)     AS avg_response_sec,
			COALESCE(ROUND(AVG(CASE WHEN arrived_at IS NOT NULL AND accepted_at IS NOT NULL
				THEN TIMESTAMPDIFF(SECOND, accepted_at, arrived_at) END), 0), 0)     AS avg_arrival_sec,
			COALESCE(ROUND(AVG(CASE WHEN completed_at IS NOT NULL AND accepted_at IS NOT NULL
				THEN TIMESTAMPDIFF(SECOND, accepted_at, completed_at) END), 0), 0)   AS avg_handling_sec
		FROM %s
	`, tOrder)).Scan(&os)

	result.Summary.TotalOrders = os.TotalOrders
	result.Summary.TotalThisMonth = os.TotalThisMonth
	result.Summary.AvgResponseSec = os.AvgResponseSec
	result.Summary.AvgArrivalSec = os.AvgArrivalSec
	result.Summary.AvgHandlingSec = os.AvgHandlingSec
	if closed := os.Completed + os.Cancelled; closed > 0 {
		result.Summary.CompletionRate = round1(float64(os.Completed) * 100 / float64(closed))
	}
	if os.TotalOrders > 0 {
		result.Summary.CancellationRate = round1(float64(os.Cancelled) * 100 / float64(os.TotalOrders))
	}

	// ── Helpful rate ──────────────────────────────────────────────────────────
	type feedSummary struct {
		Total   int64
		Helpful int64
	}
	var fs feedSummary
	r.db.Raw(fmt.Sprintf(`
		SELECT COUNT(*) AS total,
			SUM(CASE WHEN unit_helpful = 1 THEN 1 ELSE 0 END) AS helpful
		FROM %s
	`, tFeedback)).Scan(&fs)
	if fs.Total > 0 {
		result.Summary.HelpfulRate = round1(float64(fs.Helpful) * 100 / float64(fs.Total))
	}

	// ── Unit counts ───────────────────────────────────────────────────────────
	type unitSummary struct {
		ActiveUnits int64
		TotalUnits  int64
	}
	var us unitSummary
	r.db.Raw(fmt.Sprintf(`
		SELECT
			SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active_units,
			COUNT(*)                                        AS total_units
		FROM %s
		WHERE deleted_at IS NULL
	`, tEmerg)).Scan(&us)
	result.Summary.ActiveUnits = us.ActiveUnits
	result.Summary.TotalUnits = us.TotalUnits

	// ── Daily trend ───────────────────────────────────────────────────────────
	r.db.Raw(fmt.Sprintf(`
		SELECT DATE(created_at) AS date, COUNT(*) AS count
		FROM %s
		WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL %d DAY)
		GROUP BY DATE(created_at)
		ORDER BY date ASC
	`, tOrder, periodDays)).Scan(&result.DailyTrend)
	if result.DailyTrend == nil {
		result.DailyTrend = []domain.DailyStat{}
	}

	// ── Status breakdown ──────────────────────────────────────────────────────
	r.db.Raw(fmt.Sprintf(`
		SELECT status, COUNT(*) AS count
		FROM %s
		GROUP BY status
		ORDER BY count DESC
	`, tOrder)).Scan(&result.StatusBreakdown)
	if result.StatusBreakdown == nil {
		result.StatusBreakdown = []domain.StatusStat{}
	}

	// ── By emergency type ─────────────────────────────────────────────────────
	r.db.Raw(fmt.Sprintf(`
		SELECT COALESCE(et.name, 'Lainnya') AS type, COUNT(o.id) AS count
		FROM %s o
		LEFT JOIN %s e  ON o.emergency_uuid = e.uuid AND e.deleted_at IS NULL
		LEFT JOIN %s et ON e.emergency_type_id = et.id
		GROUP BY et.name
		ORDER BY count DESC
		LIMIT 10
	`, tOrder, tEmerg, tType)).Scan(&result.ByType)
	if result.ByType == nil {
		result.ByType = []domain.TypeStat{}
	}

	// ── By jenis pelayanan (darurat / transport / jenazah) ────────────────────
	r.db.Raw(fmt.Sprintf(`
		SELECT
			COALESCE(NULLIF(LOWER(TRIM(jenis_pelayanan)), ''), 'unknown') AS code,
			COUNT(*) AS count
		FROM %s
		WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL %d DAY)
		GROUP BY code
		ORDER BY count DESC
	`, tOrder, periodDays)).Scan(&result.ByJenisPelayanan)
	if result.ByJenisPelayanan == nil {
		result.ByJenisPelayanan = []domain.JenisPelayananStat{}
	}

	// ── Peak hours ────────────────────────────────────────────────────────────
	r.db.Raw(fmt.Sprintf(`
		SELECT HOUR(created_at) AS hour, COUNT(*) AS count
		FROM %s
		GROUP BY HOUR(created_at)
		ORDER BY hour ASC
	`, tOrder)).Scan(&result.ByHour)
	if result.ByHour == nil {
		result.ByHour = []domain.HourStat{}
	}

	// ── Unit performance ──────────────────────────────────────────────────────
	type unitRow struct {
		EmergencyUUID  string
		UnitName       string
		EmergencyType  string
		Regency        string
		TotalOrders    int64
		Completed      int64
		Cancelled      int64
		AvgResponseSec float64
		AvgArrivalSec  float64
	}
	var unitRows []unitRow
	r.db.Raw(fmt.Sprintf(`
		SELECT
			o.emergency_uuid,
			COALESCE(MAX(e.name), MAX(o.unit_name), '') AS unit_name,
			COALESCE(MAX(et.name), '')                  AS emergency_type,
			COALESCE(MAX(reg.name), '')                 AS regency,
			COUNT(o.id)                                 AS total_orders,
			SUM(CASE WHEN o.status = 'completed' THEN 1 ELSE 0 END) AS completed,
			SUM(CASE WHEN o.status = 'cancelled'  THEN 1 ELSE 0 END) AS cancelled,
			COALESCE(ROUND(AVG(CASE WHEN o.accepted_at IS NOT NULL
				THEN TIMESTAMPDIFF(SECOND, o.created_at, o.accepted_at) END), 0), 0) AS avg_response_sec,
			COALESCE(ROUND(AVG(CASE WHEN o.arrived_at IS NOT NULL AND o.accepted_at IS NOT NULL
				THEN TIMESTAMPDIFF(SECOND, o.accepted_at, o.arrived_at) END), 0), 0) AS avg_arrival_sec
		FROM %s o
		LEFT JOIN %s e   ON o.emergency_uuid = e.uuid AND e.deleted_at IS NULL
		LEFT JOIN %s et  ON e.emergency_type_id = et.id
		LEFT JOIN %s reg ON e.regency_id = reg.id
		GROUP BY o.emergency_uuid
		ORDER BY total_orders DESC
		LIMIT 50
	`, tOrder, tEmerg, tType, tRegency)).Scan(&unitRows)

	// Feedback per unit
	type feedRate struct {
		EmergencyUUID string
		Total         int64
		Helpful       int64
	}
	var feedRates []feedRate
	r.db.Raw(fmt.Sprintf(`
		SELECT emergency_uuid,
			COUNT(*) AS total,
			SUM(CASE WHEN unit_helpful = 1 THEN 1 ELSE 0 END) AS helpful
		FROM %s
		GROUP BY emergency_uuid
	`, tFeedback)).Scan(&feedRates)
	feedMap := make(map[string]feedRate, len(feedRates))
	for _, f := range feedRates {
		feedMap[f.EmergencyUUID] = f
	}

	result.UnitPerformance = make([]domain.UnitPerformance, 0, len(unitRows))
	for _, u := range unitRows {
		cr := 0.0
		if closed := u.Completed + u.Cancelled; closed > 0 {
			cr = round1(float64(u.Completed) * 100 / float64(closed))
		}
		hr := 0.0
		if f, ok := feedMap[u.EmergencyUUID]; ok && f.Total > 0 {
			hr = round1(float64(f.Helpful) * 100 / float64(f.Total))
		}
		result.UnitPerformance = append(result.UnitPerformance, domain.UnitPerformance{
			EmergencyUUID:  u.EmergencyUUID,
			UnitName:       u.UnitName,
			EmergencyType:  u.EmergencyType,
			Regency:        u.Regency,
			TotalOrders:    u.TotalOrders,
			Completed:      u.Completed,
			Cancelled:      u.Cancelled,
			CompletionRate: cr,
			AvgResponseSec: u.AvgResponseSec,
			AvgArrivalSec:  u.AvgArrivalSec,
			HelpfulRate:    hr,
		})
	}

	// ── Region stats ──────────────────────────────────────────────────────────
	r.db.Raw(fmt.Sprintf(`
		SELECT
			COALESCE(reg.name, 'Tidak Diketahui') AS regency,
			COALESCE(prov.name, '')               AS province,
			COUNT(o.id)                           AS count
		FROM %s o
		LEFT JOIN %s e    ON o.emergency_uuid = e.uuid AND e.deleted_at IS NULL
		LEFT JOIN %s reg  ON e.regency_id = reg.id
		LEFT JOIN %s prov ON reg.province_id = prov.id
		GROUP BY reg.id, reg.name, prov.name
		ORDER BY count DESC
		LIMIT 20
	`, tOrder, tEmerg, tRegency, tProvince)).Scan(&result.RegionStats)
	if result.RegionStats == nil {
		result.RegionStats = []domain.RegionStat{}
	}

	// ── Dispatch funnel + drops (period-scoped) ───────────────────────────────
	type funnelRow struct {
		Created   int64
		Offered   int64
		Accepted  int64
		Arrived   int64
		Completed int64
		Exhausted int64
		Cancelled int64
	}
	var fr funnelRow
	r.db.Raw(fmt.Sprintf(`
		SELECT
			COUNT(*) AS created,
			SUM(CASE WHEN (emergency_uuid IS NOT NULL AND emergency_uuid <> '')
				OR dispatch_status IN ('searching','assigned','exhausted','escalated')
				THEN 1 ELSE 0 END) AS offered,
			SUM(CASE WHEN accepted_at IS NOT NULL THEN 1 ELSE 0 END) AS accepted,
			SUM(CASE WHEN arrived_at IS NOT NULL THEN 1 ELSE 0 END) AS arrived,
			SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
			SUM(CASE WHEN dispatch_status = 'exhausted' THEN 1 ELSE 0 END) AS exhausted,
			SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled
		FROM %s
		WHERE created_at >= DATE_SUB(NOW(), INTERVAL %d DAY)
	`, tOrder, periodDays)).Scan(&fr)

	result.DispatchFunnel = []domain.FunnelStage{
		{Stage: "created", Label: "Masuk", Count: fr.Created},
		{Stage: "offered", Label: "Ditawarkan", Count: fr.Offered},
		{Stage: "accepted", Label: "Diterima", Count: fr.Accepted},
		{Stage: "arrived", Label: "Tiba", Count: fr.Arrived},
		{Stage: "completed", Label: "Selesai", Count: fr.Completed},
	}

	var rejectedAttempts int64
	r.db.Raw(fmt.Sprintf(`
		SELECT COUNT(*) FROM dispatch_attempt_entity a
		INNER JOIN %s o ON o.uuid = a.order_id
		WHERE a.status = 'rejected'
		  AND o.created_at >= DATE_SUB(NOW(), INTERVAL %d DAY)
	`, tOrder, periodDays)).Scan(&rejectedAttempts)

	result.FunnelDrops = []domain.FunnelDrop{
		{Key: "exhausted", Label: "Habis cascade", Count: fr.Exhausted},
		{Key: "cancelled", Label: "Dibatalkan", Count: fr.Cancelled},
		{Key: "rejected", Label: "Penolakan unit", Count: rejectedAttempts},
	}

	// ── Access channel mix (WA-only vs dashboard login units) ───────────────────
	type channelRow struct {
		WaOnly            int64
		Dashboard         int64
		WaAccepted        int64
		DashAccepted      int64
		WaArrived         int64
		DashArrived       int64
		WaCompleted       int64
		DashCompleted     int64
		WaAvgAccept       float64
		DashAvgAccept     float64
		WaAvgArrive       float64
		DashAvgArrive     float64
		WaAvgComplete     float64
		DashAvgComplete   float64
		WaTrackEnabled    int64
		DashTrackEnabled  int64
		WaGpsPinged       int64
		DashGpsPinged     int64
	}
	var ch channelRow
	r.db.Raw(fmt.Sprintf(`
		SELECT
			SUM(CASE WHEN COALESCE(e.dashboard_access, 1) = 0 THEN 1 ELSE 0 END) AS wa_only,
			SUM(CASE WHEN COALESCE(e.dashboard_access, 1) = 1 THEN 1 ELSE 0 END) AS dashboard,
			SUM(CASE WHEN COALESCE(e.dashboard_access, 1) = 0 AND o.accepted_at IS NOT NULL THEN 1 ELSE 0 END) AS wa_accepted,
			SUM(CASE WHEN COALESCE(e.dashboard_access, 1) = 1 AND o.accepted_at IS NOT NULL THEN 1 ELSE 0 END) AS dash_accepted,
			SUM(CASE WHEN COALESCE(e.dashboard_access, 1) = 0 AND o.arrived_at IS NOT NULL THEN 1 ELSE 0 END) AS wa_arrived,
			SUM(CASE WHEN COALESCE(e.dashboard_access, 1) = 1 AND o.arrived_at IS NOT NULL THEN 1 ELSE 0 END) AS dash_arrived,
			SUM(CASE WHEN COALESCE(e.dashboard_access, 1) = 0 AND o.status = 'completed' THEN 1 ELSE 0 END) AS wa_completed,
			SUM(CASE WHEN COALESCE(e.dashboard_access, 1) = 1 AND o.status = 'completed' THEN 1 ELSE 0 END) AS dash_completed,
			AVG(CASE WHEN COALESCE(e.dashboard_access, 1) = 0 AND o.accepted_at IS NOT NULL
				THEN TIMESTAMPDIFF(SECOND, o.created_at, o.accepted_at) END) AS wa_avg_accept,
			AVG(CASE WHEN COALESCE(e.dashboard_access, 1) = 1 AND o.accepted_at IS NOT NULL
				THEN TIMESTAMPDIFF(SECOND, o.created_at, o.accepted_at) END) AS dash_avg_accept,
			AVG(CASE WHEN COALESCE(e.dashboard_access, 1) = 0 AND o.accepted_at IS NOT NULL AND o.arrived_at IS NOT NULL
				THEN TIMESTAMPDIFF(SECOND, o.accepted_at, o.arrived_at) END) AS wa_avg_arrive,
			AVG(CASE WHEN COALESCE(e.dashboard_access, 1) = 1 AND o.accepted_at IS NOT NULL AND o.arrived_at IS NOT NULL
				THEN TIMESTAMPDIFF(SECOND, o.accepted_at, o.arrived_at) END) AS dash_avg_arrive,
			AVG(CASE WHEN COALESCE(e.dashboard_access, 1) = 0 AND o.accepted_at IS NOT NULL AND o.status = 'completed'
				THEN TIMESTAMPDIFF(SECOND, o.accepted_at, o.completed_at) END) AS wa_avg_complete,
			AVG(CASE WHEN COALESCE(e.dashboard_access, 1) = 1 AND o.accepted_at IS NOT NULL AND o.status = 'completed'
				THEN TIMESTAMPDIFF(SECOND, o.accepted_at, o.completed_at) END) AS dash_avg_complete,
			SUM(CASE WHEN COALESCE(e.dashboard_access, 1) = 0 AND o.track_enabled_at IS NOT NULL THEN 1 ELSE 0 END) AS wa_track_enabled,
			SUM(CASE WHEN COALESCE(e.dashboard_access, 1) = 1 AND o.track_enabled_at IS NOT NULL THEN 1 ELSE 0 END) AS dash_track_enabled,
			SUM(CASE WHEN COALESCE(e.dashboard_access, 1) = 0 AND o.responder_updated_at IS NOT NULL THEN 1 ELSE 0 END) AS wa_gps_pinged,
			SUM(CASE WHEN COALESCE(e.dashboard_access, 1) = 1 AND o.responder_updated_at IS NOT NULL THEN 1 ELSE 0 END) AS dash_gps_pinged
		FROM %s o
		LEFT JOIN %s e ON e.uuid = o.emergency_uuid
		WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL %d DAY)
		  AND o.emergency_uuid IS NOT NULL AND o.emergency_uuid <> ''
	`, tOrder, tEmerg, periodDays)).Scan(&ch)

	acceptRate := func(acc, total int64) float64 {
		if total <= 0 {
			return 0
		}
		return float64(acc) / float64(total) * 100
	}
	result.AccessChannels = []domain.AccessChannelStat{
		{
			Key:            "wa_only",
			Label:          "WA only (tanpa dashboard)",
			Orders:         ch.WaOnly,
			Accepted:       ch.WaAccepted,
			Arrived:        ch.WaArrived,
			Completed:      ch.WaCompleted,
			AcceptRate:     acceptRate(ch.WaAccepted, ch.WaOnly),
			AvgAcceptSec:   ch.WaAvgAccept,
			AvgArriveSec:   ch.WaAvgArrive,
			AvgCompleteSec: ch.WaAvgComplete,
			TrackEnabled:   ch.WaTrackEnabled,
			GpsPinged:      ch.WaGpsPinged,
		},
		{
			Key:            "dashboard",
			Label:          "Dashboard login",
			Orders:         ch.Dashboard,
			Accepted:       ch.DashAccepted,
			Arrived:        ch.DashArrived,
			Completed:      ch.DashCompleted,
			AcceptRate:     acceptRate(ch.DashAccepted, ch.Dashboard),
			AvgAcceptSec:   ch.DashAvgAccept,
			AvgArriveSec:   ch.DashAvgArrive,
			AvgCompleteSec: ch.DashAvgComplete,
			TrackEnabled:   ch.DashTrackEnabled,
			GpsPinged:      ch.DashGpsPinged,
		},
	}

	// ── SLA distribution: response (created→accepted) & arrival (accepted→arrived)
	type slaRow struct {
		Lt5   int64
		M515  int64
		M1530 int64
		M3060 int64
		Gte60 int64
	}
	var respSla, arrSla slaRow
	r.db.Raw(fmt.Sprintf(`
		SELECT
			SUM(CASE WHEN TIMESTAMPDIFF(SECOND, created_at, accepted_at) < 300 THEN 1 ELSE 0 END) AS lt5,
			SUM(CASE WHEN TIMESTAMPDIFF(SECOND, created_at, accepted_at) >= 300
				AND TIMESTAMPDIFF(SECOND, created_at, accepted_at) < 900 THEN 1 ELSE 0 END) AS m515,
			SUM(CASE WHEN TIMESTAMPDIFF(SECOND, created_at, accepted_at) >= 900
				AND TIMESTAMPDIFF(SECOND, created_at, accepted_at) < 1800 THEN 1 ELSE 0 END) AS m1530,
			SUM(CASE WHEN TIMESTAMPDIFF(SECOND, created_at, accepted_at) >= 1800
				AND TIMESTAMPDIFF(SECOND, created_at, accepted_at) < 3600 THEN 1 ELSE 0 END) AS m3060,
			SUM(CASE WHEN TIMESTAMPDIFF(SECOND, created_at, accepted_at) >= 3600 THEN 1 ELSE 0 END) AS gte60
		FROM %s
		WHERE created_at >= DATE_SUB(NOW(), INTERVAL %d DAY)
		  AND accepted_at IS NOT NULL
	`, tOrder, periodDays)).Scan(&respSla)

	r.db.Raw(fmt.Sprintf(`
		SELECT
			SUM(CASE WHEN TIMESTAMPDIFF(SECOND, accepted_at, arrived_at) < 300 THEN 1 ELSE 0 END) AS lt5,
			SUM(CASE WHEN TIMESTAMPDIFF(SECOND, accepted_at, arrived_at) >= 300
				AND TIMESTAMPDIFF(SECOND, accepted_at, arrived_at) < 900 THEN 1 ELSE 0 END) AS m515,
			SUM(CASE WHEN TIMESTAMPDIFF(SECOND, accepted_at, arrived_at) >= 900
				AND TIMESTAMPDIFF(SECOND, accepted_at, arrived_at) < 1800 THEN 1 ELSE 0 END) AS m1530,
			SUM(CASE WHEN TIMESTAMPDIFF(SECOND, accepted_at, arrived_at) >= 1800
				AND TIMESTAMPDIFF(SECOND, accepted_at, arrived_at) < 3600 THEN 1 ELSE 0 END) AS m3060,
			SUM(CASE WHEN TIMESTAMPDIFF(SECOND, accepted_at, arrived_at) >= 3600 THEN 1 ELSE 0 END) AS gte60
		FROM %s
		WHERE created_at >= DATE_SUB(NOW(), INTERVAL %d DAY)
		  AND accepted_at IS NOT NULL
		  AND arrived_at IS NOT NULL
	`, tOrder, periodDays)).Scan(&arrSla)

	toBuckets := func(r slaRow) []domain.SlaBucket {
		return []domain.SlaBucket{
			{Bucket: "lt_5m", Label: "< 5 mnt", Count: r.Lt5},
			{Bucket: "m5_15", Label: "5–15 mnt", Count: r.M515},
			{Bucket: "m15_30", Label: "15–30 mnt", Count: r.M1530},
			{Bucket: "m30_60", Label: "30–60 mnt", Count: r.M3060},
			{Bucket: "gte_60", Label: "> 60 mnt", Count: r.Gte60},
		}
	}
	result.ResponseSla = toBuckets(respSla)
	result.ArrivalSla = toBuckets(arrSla)

	return result, nil
}

func (r *AnalyticsRepo) GetHeatmap(periodDays int) ([]domain.HeatmapPoint, error) {
	var points []domain.HeatmapPoint
	// period=1 → kalender "hari ini" (dari 00:00); selain itu rolling window N hari.
	timeFilter := fmt.Sprintf("o.created_at >= DATE_SUB(NOW(), INTERVAL %d DAY)", periodDays)
	if periodDays <= 1 {
		timeFilter = "o.created_at >= CURDATE()"
	}
	r.db.Raw(fmt.Sprintf(`
		SELECT
			COALESCE(o.requester_lat, 0)                         AS lat,
			COALESCE(o.requester_lng, 0)                         AS lng,
			1                                                    AS count,
			COALESCE(et.name, 'Lainnya')                         AS type,
			o.ticket_number                                      AS ticket_number,
			o.status                                             AS status,
			COALESCE(NULLIF(o.requester_name, ''), 'Anonim')    AS requester_name,
			COALESCE(e.name, o.unit_name, '')                    AS unit_name,
			COALESCE(NULLIF(o.condition, ''), '')                AS cond,
			COALESCE(NULLIF(o.location, ''), '')                 AS location,
			DATE_FORMAT(o.created_at, '%%d %%M %%Y, %%H:%%i')   AS created_at,
			COALESCE(reg.name, '')                               AS regency,
			COALESCE(prov.name, '')                              AS province
		FROM %s o
		LEFT JOIN %s e    ON o.emergency_uuid = e.uuid AND e.deleted_at IS NULL
		LEFT JOIN %s et   ON e.emergency_type_id = et.id
		LEFT JOIN %s reg  ON e.regency_id = reg.id
		LEFT JOIN %s prov ON reg.province_id = prov.id
		WHERE %s
		ORDER BY o.created_at DESC
		LIMIT 1000
	`, tOrder, tEmerg, tType, tRegency, tProvince, timeFilter)).Scan(&points)
	if points == nil {
		return []domain.HeatmapPoint{}, nil
	}
	return points, nil
}

func round1(v float64) float64 {
	return float64(int(v*10+0.5)) / 10
}

// GetUnitPeriodAggregates returns order/feedback math for one unit in a period.
func (r *AnalyticsRepo) GetUnitPeriodAggregates(emergencyUUID string, periodDays int) (domain.UnitPeriodAggregates, error) {
	if periodDays <= 0 || periodDays > 365 {
		periodDays = 30
	}
	var out domain.UnitPeriodAggregates

	type orderAgg struct {
		Total          int64
		Completed      int64
		Cancelled      int64
		Pending        int64
		InProgress     int64
		AvgResponseSec float64
		AvgArrivalSec  float64
	}
	var oa orderAgg
	if err := r.db.Raw(fmt.Sprintf(`
		SELECT
			COUNT(*) AS total,
			COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) AS completed,
			COALESCE(SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END), 0) AS cancelled,
			COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) AS pending,
			COALESCE(SUM(CASE WHEN status IN ('accepted','in_progress') THEN 1 ELSE 0 END), 0) AS in_progress,
			COALESCE(ROUND(AVG(CASE WHEN accepted_at IS NOT NULL
				THEN TIMESTAMPDIFF(SECOND, created_at, accepted_at) END), 0), 0) AS avg_response_sec,
			COALESCE(ROUND(AVG(CASE WHEN arrived_at IS NOT NULL AND accepted_at IS NOT NULL
				THEN TIMESTAMPDIFF(SECOND, accepted_at, arrived_at) END), 0), 0) AS avg_arrival_sec
		FROM %s
		WHERE emergency_uuid = ?
		  AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
	`, tOrder), emergencyUUID, periodDays).Scan(&oa).Error; err != nil {
		return out, err
	}
	out.TotalOrders = oa.Total
	out.Completed = oa.Completed
	out.Cancelled = oa.Cancelled
	out.Pending = oa.Pending
	out.InProgress = oa.InProgress
	out.AvgResponseSec = oa.AvgResponseSec
	out.AvgArrivalSec = oa.AvgArrivalSec

	type feedAgg struct {
		Total   int64
		Helpful int64
	}
	var fa feedAgg
	if err := r.db.Raw(fmt.Sprintf(`
		SELECT
			COUNT(*) AS total,
			COALESCE(SUM(CASE WHEN unit_helpful = 1 THEN 1 ELSE 0 END), 0) AS helpful
		FROM %s
		WHERE emergency_uuid = ?
		  AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
	`, tFeedback), emergencyUUID, periodDays).Scan(&fa).Error; err != nil {
		return out, err
	}
	out.FeedbackTotal = fa.Total
	out.FeedbackHelpful = fa.Helpful

	var quotes []string
	_ = r.db.Raw(fmt.Sprintf(`
		SELECT comment FROM %s
		WHERE emergency_uuid = ?
		  AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
		  AND comment IS NOT NULL AND TRIM(comment) <> ''
		ORDER BY created_at DESC
		LIMIT 3
	`, tFeedback), emergencyUUID, periodDays).Scan(&quotes).Error
	if quotes == nil {
		quotes = []string{}
	}
	trimmed := make([]string, 0, len(quotes))
	for _, q := range quotes {
		q = strings.TrimSpace(q)
		if q == "" {
			continue
		}
		runes := []rune(q)
		if len(runes) > 140 {
			q = string(runes[:137]) + "…"
		}
		trimmed = append(trimmed, q)
	}
	out.RecentQuotes = trimmed

	var trend []domain.DailyStat
	_ = r.db.Raw(fmt.Sprintf(`
		SELECT DATE(created_at) AS date, COUNT(*) AS count
		FROM %s
		WHERE emergency_uuid = ?
		  AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
		GROUP BY DATE(created_at)
		ORDER BY date ASC
	`, tOrder), emergencyUUID, periodDays).Scan(&trend).Error
	if trend == nil {
		trend = []domain.DailyStat{}
	}
	out.DailyTrend = trend

	var hours []domain.HourStat
	_ = r.db.Raw(fmt.Sprintf(`
		SELECT HOUR(created_at) AS hour, COUNT(*) AS count
		FROM %s
		WHERE emergency_uuid = ?
		  AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
		GROUP BY HOUR(created_at)
		ORDER BY hour ASC
	`, tOrder), emergencyUUID, periodDays).Scan(&hours).Error
	if hours == nil {
		hours = []domain.HourStat{}
	}
	out.ByHour = hours

	var referrals []domain.ReferralStat
	_ = r.db.Raw(fmt.Sprintf(`
		SELECT referral_hospital_id AS hospital_id,
		       referral_hospital_name AS hospital_name,
		       COUNT(*) AS count
		FROM %s
		WHERE emergency_uuid = ?
		  AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
		  AND referral_hospital_name <> ''
		GROUP BY referral_hospital_id, referral_hospital_name
		ORDER BY count DESC
		LIMIT 10
	`, tOrder), emergencyUUID, periodDays).Scan(&referrals).Error
	if referrals == nil {
		referrals = []domain.ReferralStat{}
	}
	out.Referrals = referrals

	var byJenis []domain.JenisPelayananStat
	_ = r.db.Raw(fmt.Sprintf(`
		SELECT
			COALESCE(NULLIF(LOWER(TRIM(jenis_pelayanan)), ''), 'unknown') AS code,
			COUNT(*) AS count
		FROM %s
		WHERE emergency_uuid = ?
		  AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
		GROUP BY code
		ORDER BY count DESC
	`, tOrder), emergencyUUID, periodDays).Scan(&byJenis).Error
	if byJenis == nil {
		byJenis = []domain.JenisPelayananStat{}
	}
	out.ByJenisPelayanan = byJenis

	return out, nil
}

// GetAllUnitScores aggregates orders + feedback grouped by emergency_uuid so
// the admin scoreboard can render all units in two queries instead of N+1.
func (r *AnalyticsRepo) GetAllUnitScores(periodDays int) ([]domain.UnitScoreRow, error) {
	if periodDays <= 0 || periodDays > 365 {
		periodDays = 30
	}

	type orderRow struct {
		EmergencyUUID  string
		Total          int64
		Completed      int64
		Cancelled      int64
		Pending        int64
		InProgress     int64
		AvgResponseSec float64
		AvgArrivalSec  float64
	}
	var orderRows []orderRow
	if err := r.db.Raw(fmt.Sprintf(`
		SELECT
			emergency_uuid,
			COUNT(*) AS total,
			COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) AS completed,
			COALESCE(SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END), 0) AS cancelled,
			COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) AS pending,
			COALESCE(SUM(CASE WHEN status IN ('accepted','in_progress') THEN 1 ELSE 0 END), 0) AS in_progress,
			COALESCE(ROUND(AVG(CASE WHEN accepted_at IS NOT NULL
				THEN TIMESTAMPDIFF(SECOND, created_at, accepted_at) END), 0), 0) AS avg_response_sec,
			COALESCE(ROUND(AVG(CASE WHEN arrived_at IS NOT NULL AND accepted_at IS NOT NULL
				THEN TIMESTAMPDIFF(SECOND, accepted_at, arrived_at) END), 0), 0) AS avg_arrival_sec
		FROM %s
		WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
		  AND emergency_uuid <> ''
		GROUP BY emergency_uuid
	`, tOrder), periodDays).Scan(&orderRows).Error; err != nil {
		return nil, err
	}

	type fbRow struct {
		EmergencyUUID string
		Total         int64
		Helpful       int64
	}
	var fbRows []fbRow
	if err := r.db.Raw(fmt.Sprintf(`
		SELECT
			emergency_uuid,
			COUNT(*) AS total,
			COALESCE(SUM(CASE WHEN unit_helpful = 1 THEN 1 ELSE 0 END), 0) AS helpful
		FROM %s
		WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
		  AND emergency_uuid <> ''
		GROUP BY emergency_uuid
	`, tFeedback), periodDays).Scan(&fbRows).Error; err != nil {
		return nil, err
	}

	byUUID := make(map[string]*domain.UnitScoreRow, len(orderRows))
	for _, o := range orderRows {
		byUUID[o.EmergencyUUID] = &domain.UnitScoreRow{
			EmergencyUUID:  o.EmergencyUUID,
			TotalOrders:    o.Total,
			Completed:      o.Completed,
			Cancelled:      o.Cancelled,
			Pending:        o.Pending,
			InProgress:     o.InProgress,
			AvgResponseSec: o.AvgResponseSec,
			AvgArrivalSec:  o.AvgArrivalSec,
		}
	}
	for _, f := range fbRows {
		if e, ok := byUUID[f.EmergencyUUID]; ok {
			e.FeedbackTotal = f.Total
			e.FeedbackHelpful = f.Helpful
			continue
		}
		byUUID[f.EmergencyUUID] = &domain.UnitScoreRow{
			EmergencyUUID:   f.EmergencyUUID,
			FeedbackTotal:   f.Total,
			FeedbackHelpful: f.Helpful,
		}
	}
	out := make([]domain.UnitScoreRow, 0, len(byUUID))
	for _, row := range byUUID {
		out = append(out, *row)
	}
	return out, nil
}
