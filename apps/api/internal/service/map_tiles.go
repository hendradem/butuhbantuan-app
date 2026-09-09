package service

import (
	"sync"
	"time"

	"github.com/butuhbantuan/api/internal/domain"
	"github.com/butuhbantuan/api/internal/repository"
)

const (
	defaultTileLimit      int64 = 200_000 // Mapbox Static Tiles free tier
	defaultFallbackRatio        = 0.85    // switch to OSM at 85% of free tier
	maxIncrementPerRequest int64 = 200
	mapboxStreetsStyle          = "mapbox/streets-v12"
)

type MapTilesUseCase interface {
	Status() (domain.MapTileUsage, error)
	Report(count int64) (domain.MapTileUsage, error)
}

type MapTilesService struct {
	repo           repository.MapTileUsageRepository
	limit          int64
	fallbackRatio  float64
	mapboxEnabled  bool // true when public token exists on clients; we still track usage
	mu             sync.Mutex
	mem            map[string]int64 // used when repo is nil
}

func NewMapTilesService(repo repository.MapTileUsageRepository, mapboxConfigured bool) *MapTilesService {
	return &MapTilesService{
		repo:          repo,
		limit:         defaultTileLimit,
		fallbackRatio: defaultFallbackRatio,
		mapboxEnabled: mapboxConfigured,
		mem:           map[string]int64{},
	}
}

func (s *MapTilesService) Status() (domain.MapTileUsage, error) {
	month := time.Now().UTC().Format("2006-01")
	used, err := s.get(month)
	if err != nil {
		return domain.MapTileUsage{}, err
	}
	return s.build(month, used), nil
}

func (s *MapTilesService) Report(count int64) (domain.MapTileUsage, error) {
	if count < 0 {
		count = 0
	}
	if count > maxIncrementPerRequest {
		count = maxIncrementPerRequest
	}
	month := time.Now().UTC().Format("2006-01")
	used, err := s.incr(month, count)
	if err != nil {
		return domain.MapTileUsage{}, err
	}
	return s.build(month, used), nil
}

func (s *MapTilesService) get(month string) (int64, error) {
	if s.repo != nil {
		return s.repo.GetMonth(month)
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.mem[month], nil
}

func (s *MapTilesService) incr(month string, delta int64) (int64, error) {
	if s.repo != nil {
		return s.repo.Increment(month, delta)
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.mem[month] += delta
	return s.mem[month], nil
}

func (s *MapTilesService) build(month string, used int64) domain.MapTileUsage {
	limit := s.limit
	if limit <= 0 {
		limit = defaultTileLimit
	}
	threshold := int64(float64(limit) * s.fallbackRatio)
	if threshold <= 0 {
		threshold = limit
	}
	remaining := limit - used
	if remaining < 0 {
		remaining = 0
	}
	pct := 0.0
	if limit > 0 {
		pct = float64(used) / float64(limit) * 100
	}
	near := used >= threshold
	provider := "mapbox"
	style := mapboxStreetsStyle
	if !s.mapboxEnabled || near {
		provider = "osm"
		style = "osm"
	}
	return domain.MapTileUsage{
		MonthKey:  month,
		Used:      used,
		Limit:     limit,
		Threshold: threshold,
		Remaining: remaining,
		Percent:   pct,
		Provider:  provider,
		Style:     style,
		NearLimit: near,
	}
}
