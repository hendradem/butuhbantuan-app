package service

import (
	"github.com/butuhbantuan/api/internal/domain"
	"github.com/butuhbantuan/api/internal/repository"
)

// EmergencyService satisfies both EmergencyUseCase and EmergencyTypeUseCase.
type EmergencyService struct {
	repo     repository.EmergencyRepository
	typeRepo repository.EmergencyTypeRepository
	wa       *WaDispatchResolver
}

func NewEmergencyService(
	repo repository.EmergencyRepository,
	typeRepo repository.EmergencyTypeRepository,
	unitCreds repository.UnitCredentialRepository,
) *EmergencyService {
	return &EmergencyService{
		repo:     repo,
		typeRepo: typeRepo,
		wa:       NewWaDispatchResolver(unitCreds),
	}
}

// Compile-time interface checks.
var _ EmergencyUseCase = (*EmergencyService)(nil)
var _ EmergencyTypeUseCase = (*EmergencyService)(nil)

func (s *EmergencyService) GetAll() ([]domain.Emergency, error) {
	list, err := s.repo.FindAllActive()
	if err != nil {
		return nil, err
	}
	return s.wa.EnrichEmergencies(list), nil
}
func (s *EmergencyService) GetAllAdmin() ([]domain.Emergency, error) { return s.repo.FindAll() }
func (s *EmergencyService) GetByID(id string) (*domain.Emergency, error) {
	e, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	s.wa.EnrichEmergency(e)
	return e, nil
}
func (s *EmergencyService) GetByProvince(id string) ([]domain.Emergency, error) {
	list, err := s.repo.FindByProvince(id)
	if err != nil {
		return nil, err
	}
	return s.wa.EnrichEmergencies(list), nil
}
func (s *EmergencyService) GetByRegency(id string) ([]domain.Emergency, error) {
	list, err := s.repo.FindByRegency(id)
	if err != nil {
		return nil, err
	}
	return s.wa.EnrichEmergencies(list), nil
}
func (s *EmergencyService) GetDispatchers(r, p string) ([]domain.Emergency, error) {
	list, err := s.repo.FindDispatchers(r, p)
	if err != nil {
		return nil, err
	}
	return s.wa.EnrichEmergencies(list), nil
}
func (s *EmergencyService) GetByType(id string) ([]domain.Emergency, error) {
	list, err := s.repo.FindByType(id)
	if err != nil {
		return nil, err
	}
	return s.wa.EnrichEmergencies(list), nil
}
func (s *EmergencyService) GetByIDs(ids []string) ([]domain.Emergency, error) {
	list, err := s.repo.FindByIDs(ids)
	if err != nil {
		return nil, err
	}
	return s.wa.EnrichEmergencies(list), nil
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

func (s *EmergencyService) GetIncidentReportTemplate(id string) (*domain.IncidentReportTemplate, error) {
	return s.repo.GetIncidentReportTemplate(id)
}

func (s *EmergencyService) UpdateIncidentReportTemplate(id string, tpl domain.IncidentReportTemplate) (*domain.IncidentReportTemplate, error) {
	return s.repo.UpdateIncidentReportTemplate(id, tpl)
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
