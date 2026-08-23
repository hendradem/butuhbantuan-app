package service

import (
	"errors"
	"strings"

	"github.com/butuhbantuan/api/internal/domain"
	"github.com/butuhbantuan/api/internal/repository"
)

var ErrPublicUnitNotFound = errors.New("unit not found")

type AnalyticsService struct {
	repo      repository.AnalyticsRepository
	emergency repository.EmergencyRepository
}

func NewAnalyticsService(repo repository.AnalyticsRepository, emergency repository.EmergencyRepository) *AnalyticsService {
	return &AnalyticsService{repo: repo, emergency: emergency}
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

func (s *AnalyticsService) GetPublicUnitStats(emergencyUUID string, periodDays int) (*domain.PublicUnitStats, error) {
	return s.buildUnitStats(emergencyUUID, periodDays, true)
}

// GetUnitOwnStats is for the authenticated unit dashboard (no public sample gate).
func (s *AnalyticsService) GetUnitOwnStats(emergencyUUID string, periodDays int) (*domain.PublicUnitStats, error) {
	return s.buildUnitStats(emergencyUUID, periodDays, false)
}

func (s *AnalyticsService) buildUnitStats(emergencyUUID string, periodDays int, publicGate bool) (*domain.PublicUnitStats, error) {
	emergencyUUID = strings.TrimSpace(emergencyUUID)
	if emergencyUUID == "" {
		return nil, ErrPublicUnitNotFound
	}
	if periodDays <= 0 || periodDays > 365 {
		periodDays = 30
	}
	if s.emergency == nil || s.repo == nil {
		return nil, ErrPublicUnitNotFound
	}

	units, err := s.emergency.FindByIDs([]string{emergencyUUID})
	if err != nil {
		return nil, err
	}
	if len(units) == 0 {
		return nil, ErrPublicUnitNotFound
	}

	agg, err := s.repo.GetUnitPeriodAggregates(emergencyUUID, periodDays)
	if err != nil {
		return nil, err
	}
	stats := domain.BuildPublicUnitStats(units[0], agg, periodDays, publicGate)
	return &stats, nil
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
		DispatchFunnel:  []domain.FunnelStage{},
		FunnelDrops:     []domain.FunnelDrop{},
		ResponseSla:     []domain.SlaBucket{},
		ArrivalSla:      []domain.SlaBucket{},
	}, nil
}

func (s *NoopAnalyticsService) GetHeatmap(_ int) ([]domain.HeatmapPoint, error) {
	return []domain.HeatmapPoint{}, nil
}

func (s *NoopAnalyticsService) GetPublicUnitStats(_ string, _ int) (*domain.PublicUnitStats, error) {
	return nil, ErrPublicUnitNotFound
}

func (s *NoopAnalyticsService) GetUnitOwnStats(_ string, _ int) (*domain.PublicUnitStats, error) {
	return nil, ErrPublicUnitNotFound
}
