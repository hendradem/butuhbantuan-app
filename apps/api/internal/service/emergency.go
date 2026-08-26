package service

import (
	"github.com/butuhbantuan/api/internal/domain"
	"github.com/butuhbantuan/api/internal/repository"
)

// EmergencyService satisfies both EmergencyUseCase and EmergencyTypeUseCase.
type EmergencyService struct {
	repo     repository.EmergencyRepository
	typeRepo repository.EmergencyTypeRepository
}

func NewEmergencyService(repo repository.EmergencyRepository, typeRepo repository.EmergencyTypeRepository) *EmergencyService {
	return &EmergencyService{repo: repo, typeRepo: typeRepo}
}

// Compile-time interface checks.
var _ EmergencyUseCase = (*EmergencyService)(nil)
var _ EmergencyTypeUseCase = (*EmergencyService)(nil)

func (s *EmergencyService) GetAll() ([]domain.Emergency, error)      { return s.repo.FindAllActive() }
func (s *EmergencyService) GetAllAdmin() ([]domain.Emergency, error) { return s.repo.FindAll() }
func (s *EmergencyService) GetByID(id string) (*domain.Emergency, error) {
	return s.repo.FindByID(id)
}
func (s *EmergencyService) GetByProvince(id string) ([]domain.Emergency, error) {
	return s.repo.FindByProvince(id)
}
func (s *EmergencyService) GetByRegency(id string) ([]domain.Emergency, error) {
	return s.repo.FindByRegency(id)
}
func (s *EmergencyService) GetDispatchers(r, p string) ([]domain.Emergency, error) {
	return s.repo.FindDispatchers(r, p)
}
func (s *EmergencyService) GetByType(id string) ([]domain.Emergency, error) {
	return s.repo.FindByType(id)
}
func (s *EmergencyService) GetByIDs(ids []string) ([]domain.Emergency, error) {
	return s.repo.FindByIDs(ids)
}
func (s *EmergencyService) Create(e domain.Emergency) (*domain.Emergency, error) {
	return s.repo.Create(e)
}
func (s *EmergencyService) Update(e domain.Emergency) (*domain.Emergency, error) {
	return s.repo.Update(e)
}
func (s *EmergencyService) Delete(id string) error { return s.repo.Delete(id) }
func (s *EmergencyService) UpdateOperational(id string, st domain.OperationalStatus) error {
	return s.repo.UpdateOperational(id, st)
}
func (s *EmergencyService) UpdateFleet(id string, fleet domain.FleetStatus) error {
	return s.repo.UpdateFleet(id, fleet)
}
func (s *EmergencyService) UpdateActive(id string, isActive bool) error {
	return s.repo.UpdateActive(id, isActive)
}
func (s *EmergencyService) UpdateWilayah(id string, addr domain.Address) error {
	return s.repo.UpdateWilayah(id, addr)
}

func (s *EmergencyService) GetAllTypes() ([]domain.EmergencyType, error) {
	return s.typeRepo.FindAllTypes()
}
func (s *EmergencyService) CreateType(t domain.EmergencyType) (*domain.EmergencyType, error) {
	return s.typeRepo.CreateType(t)
}
func (s *EmergencyService) UpdateType(t domain.EmergencyType) (*domain.EmergencyType, error) {
	return s.typeRepo.UpdateType(t)
}
func (s *EmergencyService) DeleteType(id string) error { return s.typeRepo.DeleteType(id) }
