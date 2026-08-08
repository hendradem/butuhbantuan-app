package service

import "github.com/butuhbantuan/api/internal/domain"

// EmergencyUseCase is the interface handlers use for emergency data operations.
type EmergencyUseCase interface {
	GetAll() ([]domain.Emergency, error)
	GetByProvince(provinceID string) ([]domain.Emergency, error)
	GetByRegency(regencyID string) ([]domain.Emergency, error)
	GetDispatchers(regencyID, provinceID string) ([]domain.Emergency, error)
	GetByType(emergencyTypeID string) ([]domain.Emergency, error)
	GetByIDs(ids []string) ([]domain.Emergency, error)
	Create(e domain.Emergency) (*domain.Emergency, error)
	Update(e domain.Emergency) (*domain.Emergency, error)
	Delete(id string) error
}

// EmergencyTypeUseCase is the interface handlers use for emergency type operations.
type EmergencyTypeUseCase interface {
	GetAllTypes() ([]domain.EmergencyType, error)
	CreateType(t domain.EmergencyType) (*domain.EmergencyType, error)
	UpdateType(t domain.EmergencyType) (*domain.EmergencyType, error)
	DeleteType(id string) error
}

// RegionUseCase is the interface handlers use for available region operations.
type RegionUseCase interface {
	GetAllAvailableRegions() ([]domain.AvailableRegion, error)
	GetAvailableRegionsByName(name string) ([]domain.AvailableRegion, error)
	CreateAvailableRegion(r domain.AvailableRegion) (*domain.AvailableRegion, error)
	UpdateAvailableRegion(r domain.AvailableRegion) (*domain.AvailableRegion, error)
	DeleteAvailableRegion(id string) error
}
