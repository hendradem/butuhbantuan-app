package mysqlrepo

import (
	"github.com/butuhbantuan/api/internal/domain"
	"gorm.io/gorm"
)

type FeedbackRepo struct{ db *gorm.DB }

func NewFeedbackRepo(db *gorm.DB) *FeedbackRepo { return &FeedbackRepo{db: db} }

func (r *FeedbackRepo) Create(f domain.Feedback) (*domain.Feedback, error) {
	row := FeedbackEntity{
		EmergencyUUID: f.EmergencyID,
		UnitName:      f.UnitName,
		UnitHelpful:   f.UnitHelpful,
		AppHelpful:    f.AppHelpful,
		CallType:      f.CallType,
		Comment:       f.Comment,
	}
	if err := r.db.Create(&row).Error; err != nil {
		return nil, err
	}
	result := mapFeedback(row)
	return &result, nil
}

func (r *FeedbackRepo) GetStats() (domain.FeedbackStats, error) {
	var total int64
	if err := r.db.Model(&FeedbackEntity{}).Count(&total).Error; err != nil {
		return domain.FeedbackStats{}, err
	}
	if total == 0 {
		return domain.FeedbackStats{}, nil
	}

	var unitHelpful, appHelpful, appRated int64
	r.db.Model(&FeedbackEntity{}).Where("unit_helpful = ?", true).Count(&unitHelpful)
	r.db.Model(&FeedbackEntity{}).Where("app_helpful IS NOT NULL").Count(&appRated)
	r.db.Model(&FeedbackEntity{}).Where("app_helpful = ?", true).Count(&appHelpful)

	appRate := 0.0
	if appRated > 0 {
		appRate = float64(appHelpful) / float64(appRated) * 100
	}

	return domain.FeedbackStats{
		Total:           int(total),
		UnitHelpfulRate: float64(unitHelpful) / float64(total) * 100,
		AppHelpfulRate:  appRate,
	}, nil
}

func (r *FeedbackRepo) FindAll() ([]domain.Feedback, error) {
	var rows []FeedbackEntity
	if err := r.db.Order("created_at desc").Limit(100).Find(&rows).Error; err != nil {
		return nil, err
	}
	return mapManyFeedback(rows), nil
}

func (r *FeedbackRepo) FindByUnit(emergencyUUID string) ([]domain.Feedback, error) {
	var rows []FeedbackEntity
	if err := r.db.
		Where("emergency_uuid = ?", emergencyUUID).
		Order("created_at desc").
		Find(&rows).Error; err != nil {
		return nil, err
	}
	return mapManyFeedback(rows), nil
}

type groupRow struct {
	EmergencyUUID    string  `gorm:"column:emergency_uuid"`
	UnitName         string  `gorm:"column:unit_name"`
	Total            int     `gorm:"column:total"`
	UnitHelpfulCount int     `gorm:"column:unit_helpful_count"`
	AppHelpfulCount  int     `gorm:"column:app_helpful_count"`
	AppRatedCount    int     `gorm:"column:app_rated_count"`
	LastFeedbackAt   string  `gorm:"column:last_feedback_at"`
}

func (r *FeedbackRepo) FindGroupedByUnit() ([]domain.FeedbackGroup, error) {
	var rows []groupRow
	err := r.db.Model(&FeedbackEntity{}).
		Select(`
			emergency_uuid,
			unit_name,
			COUNT(*) AS total,
			SUM(unit_helpful) AS unit_helpful_count,
			SUM(CASE WHEN app_helpful = 1 THEN 1 ELSE 0 END) AS app_helpful_count,
			SUM(CASE WHEN app_helpful IS NOT NULL THEN 1 ELSE 0 END) AS app_rated_count,
			MAX(created_at) AS last_feedback_at
		`).
		Group("emergency_uuid, unit_name").
		Order("total DESC").
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	groups := make([]domain.FeedbackGroup, 0, len(rows))
	for _, row := range rows {
		appRate := 0.0
		if row.AppRatedCount > 0 {
			appRate = float64(row.AppHelpfulCount) / float64(row.AppRatedCount) * 100
		}

		var comments []string
		r.db.Model(&FeedbackEntity{}).
			Where("emergency_uuid = ? AND comment != ''", row.EmergencyUUID).
			Order("created_at desc").
			Limit(5).
			Pluck("comment", &comments)

		groups = append(groups, domain.FeedbackGroup{
			EmergencyUUID:    row.EmergencyUUID,
			UnitName:         row.UnitName,
			Total:            row.Total,
			UnitHelpfulCount: row.UnitHelpfulCount,
			UnitHelpfulRate:  float64(row.UnitHelpfulCount) / float64(row.Total) * 100,
			AppHelpfulRate:   appRate,
			RecentComments:   comments,
		})
	}
	return groups, nil
}

func mapFeedback(e FeedbackEntity) domain.Feedback {
	return domain.Feedback{
		ID:          e.UUID.String(),
		EmergencyID: e.EmergencyUUID,
		UnitName:    e.UnitName,
		UnitHelpful: e.UnitHelpful,
		AppHelpful:  e.AppHelpful,
		CallType:    e.CallType,
		Comment:     e.Comment,
		CreatedAt:   e.CreatedAt,
	}
}

func mapManyFeedback(rows []FeedbackEntity) []domain.Feedback {
	result := make([]domain.Feedback, len(rows))
	for i, row := range rows {
		result[i] = mapFeedback(row)
	}
	return result
}
