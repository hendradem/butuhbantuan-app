package service

import (
	"github.com/butuhbantuan/api/internal/domain"
	"github.com/butuhbantuan/api/internal/repository"
)

type AnalyticsService struct {
	repo repository.AnalyticsRepository
}

func NewAnalyticsService(repo repository.AnalyticsRepository) *AnalyticsService {
	return &AnalyticsService{repo: repo}
}

func (s *AnalyticsService) GetAnalytics(periodDays int) (domain.Analytics, error) {
	if periodDays <= 0 || periodDays > 365 {
		periodDays = 30
	}
	return s.repo.GetAnalytics(periodDays)
}

func (s *AnalyticsService) GetHeatmap(periodDays int) ([]domain.HeatmapPoint, error) {
	if periodDays <= 0 || periodDays > 365 {
		periodDays = 30
	}
	return s.repo.GetHeatmap(periodDays)
}

// NoopAnalyticsService is used when MySQL is unavailable (json storage mode).
type NoopAnalyticsService struct{}

func (s *NoopAnalyticsService) GetAnalytics(_ int) (domain.Analytics, error) {
	return domain.Analytics{
		DailyTrend:      []domain.DailyStat{},
		StatusBreakdown: []domain.StatusStat{},
		ByType:          []domain.TypeStat{},
		ByHour:          []domain.HourStat{},
		UnitPerformance: []domain.UnitPerformance{},
		RegionStats:     []domain.RegionStat{},
	}, nil
}

func (s *NoopAnalyticsService) GetHeatmap(_ int) ([]domain.HeatmapPoint, error) {
	return []domain.HeatmapPoint{}, nil
}
