package mysqlrepo

import (
	"fmt"

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
			COALESCE(ROUND(AVG(CASE WHEN completed_at IS NOT NULL AND accepted_at IS NOT NULL
				THEN TIMESTAMPDIFF(SECOND, accepted_at, completed_at) END), 0), 0)   AS avg_handling_sec
		FROM %s
	`, tOrder)).Scan(&os)

	result.Summary.TotalOrders = os.TotalOrders
	result.Summary.TotalThisMonth = os.TotalThisMonth
	result.Summary.AvgResponseSec = os.AvgResponseSec
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
				THEN TIMESTAMPDIFF(SECOND, o.created_at, o.accepted_at) END), 0), 0) AS avg_response_sec
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

	return result, nil
}

func (r *AnalyticsRepo) GetHeatmap(periodDays int) ([]domain.HeatmapPoint, error) {
	var points []domain.HeatmapPoint
	r.db.Raw(fmt.Sprintf(`
		SELECT
			ROUND(o.requester_lat, 3)        AS lat,
			ROUND(o.requester_lng, 3)        AS lng,
			COALESCE(et.name, 'Lainnya')     AS type,
			COUNT(*)                         AS count
		FROM %s o
		LEFT JOIN %s e  ON o.emergency_uuid = e.uuid AND e.deleted_at IS NULL
		LEFT JOIN %s et ON e.emergency_type_id = et.id
		WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL %d DAY)
		  AND o.requester_lat != 0
		  AND o.requester_lng != 0
		GROUP BY ROUND(o.requester_lat, 3), ROUND(o.requester_lng, 3), et.name
		ORDER BY count DESC
		LIMIT 500
	`, tOrder, tEmerg, tType, periodDays)).Scan(&points)
	if points == nil {
		return []domain.HeatmapPoint{}, nil
	}
	return points, nil
}

func round1(v float64) float64 {
	return float64(int(v*10+0.5)) / 10
}
