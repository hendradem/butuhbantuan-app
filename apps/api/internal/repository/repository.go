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

type FeedbackRepository interface {
	Create(f domain.Feedback) (*domain.Feedback, error)
	GetStats() (domain.FeedbackStats, error)
	FindAll() ([]domain.Feedback, error)
	FindGroupedByUnit() ([]domain.FeedbackGroup, error)
	FindByUnit(emergencyUUID string) ([]domain.Feedback, error)
}

type OrderRepository interface {
	Create(o domain.OrderTicket) (*domain.OrderTicket, error)
	FindByTicketNumber(number string) (*domain.OrderTicket, error)
	FindAll() ([]domain.OrderTicket, error)
	FindByUnit(emergencyUUID, unitName string) ([]domain.OrderTicket, error)
	UpdateStatus(id, status, handlerName, notes string) (*domain.OrderTicket, error)
}

type UnitCredentialRepository interface {
	Set(cred domain.UnitCredential) error
	FindByToken(token string) (*domain.UnitCredential, error)
	FindByUsername(username string) (*domain.UnitCredential, error)
}

// NoopUnitCredentialRepository satisfies UnitCredentialRepository when running in json storage mode.
type NoopUnitCredentialRepository struct{}

func (r *NoopUnitCredentialRepository) Set(_ domain.UnitCredential) error { return ErrNotSupported }
func (r *NoopUnitCredentialRepository) FindByToken(_ string) (*domain.UnitCredential, error) {
	return nil, ErrNotFound
}
func (r *NoopUnitCredentialRepository) FindByUsername(_ string) (*domain.UnitCredential, error) {
	return nil, ErrNotFound
}

type RegionRepository interface {
	FindAllAvailableRegions() ([]domain.AvailableRegion, error)
	FindAvailableRegionsByName(name string) ([]domain.AvailableRegion, error)
	CreateAvailableRegion(r domain.AvailableRegion) (*domain.AvailableRegion, error)
	UpdateAvailableRegion(r domain.AvailableRegion) (*domain.AvailableRegion, error)
	DeleteAvailableRegion(id string) error
	SearchRegencies(q string) ([]domain.Regency, error)
	FindProvinces() ([]domain.Province, error)
	FindRegenciesByProvince(provinceID string) ([]domain.Regency, error)
}
