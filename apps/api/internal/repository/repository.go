package repository

import (
	"errors"

	"github.com/butuhbantuan/api/internal/domain"
)

var (
	ErrNotFound     = errors.New("record not found")
	ErrNotSupported = errors.New("operation not supported in current storage mode")
	ErrDuplicate    = errors.New("record already exists")
)

type EmergencyRepository interface {
	FindAll() ([]domain.Emergency, error)
	FindByProvince(provinceID string) ([]domain.Emergency, error)
	FindByRegency(regencyID string) ([]domain.Emergency, error)
	FindDispatchers(regencyID, provinceID string) ([]domain.Emergency, error)
	FindByType(emergencyTypeID string) ([]domain.Emergency, error)
	FindByIDs(ids []string) ([]domain.Emergency, error)
	Create(e domain.Emergency) (*domain.Emergency, error)
	Update(e domain.Emergency) (*domain.Emergency, error)
	Delete(id string) error
}

type EmergencyTypeRepository interface {
	FindAllTypes() ([]domain.EmergencyType, error)
	CreateType(t domain.EmergencyType) (*domain.EmergencyType, error)
	UpdateType(t domain.EmergencyType) (*domain.EmergencyType, error)
	DeleteType(id string) error
}

type RegionRepository interface {
	FindAllAvailableRegions() ([]domain.AvailableRegion, error)
	FindAvailableRegionsByName(name string) ([]domain.AvailableRegion, error)
	CreateAvailableRegion(r domain.AvailableRegion) (*domain.AvailableRegion, error)
	UpdateAvailableRegion(r domain.AvailableRegion) (*domain.AvailableRegion, error)
	DeleteAvailableRegion(id string) error
}
