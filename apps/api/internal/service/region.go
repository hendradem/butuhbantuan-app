package service

import (
	"github.com/butuhbantuan/api/internal/domain"
	"github.com/butuhbantuan/api/internal/repository"
)

type RegionService struct {
	repo repository.RegionRepository
}

func NewRegionService(repo repository.RegionRepository) *RegionService {
	return &RegionService{repo: repo}
}

var _ RegionUseCase = (*RegionService)(nil)

func (s *RegionService) GetAllAvailableRegions() ([]domain.AvailableRegion, error) {
	return s.repo.FindAllAvailableRegions()
}

func (s *RegionService) GetAvailableRegionsByName(name string) ([]domain.AvailableRegion, error) {
	return s.repo.FindAvailableRegionsByName(name)
}

func (s *RegionService) CreateAvailableRegion(r domain.AvailableRegion) (*domain.AvailableRegion, error) {
	return s.repo.CreateAvailableRegion(r)
}

func (s *RegionService) UpdateAvailableRegion(r domain.AvailableRegion) (*domain.AvailableRegion, error) {
	return s.repo.UpdateAvailableRegion(r)
}

func (s *RegionService) DeleteAvailableRegion(id string) error {
	return s.repo.DeleteAvailableRegion(id)
}

func (s *RegionService) SearchRegencies(q string) ([]domain.Regency, error) {
	return s.repo.SearchRegencies(q)
}

func (s *RegionService) GetProvinces() ([]domain.Province, error) {
	return s.repo.FindProvinces()
}

func (s *RegionService) GetRegenciesByProvince(provinceID string) ([]domain.Regency, error) {
	return s.repo.FindRegenciesByProvince(provinceID)
}

func (s *RegionService) GetCoveredProvinces() ([]domain.Province, error) {
	return s.repo.FindCoveredProvinces()
}

func (s *RegionService) GetCoveredRegenciesByProvince(provinceID string) ([]domain.Regency, error) {
	return s.repo.FindCoveredRegenciesByProvince(provinceID)
}
