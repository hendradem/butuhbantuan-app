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
	UpdateOperational(id string, status domain.OperationalStatus) error
	UpdateFleet(id string, fleet domain.FleetStatus) error
	UpdateActive(id string, isActive bool) error
}

// PushUseCase handles Web Push subscriptions and notification delivery.
type PushUseCase interface {
	VAPIDPublicKey() string
	Subscribe(sub domain.PushSubscription) error
	Unsubscribe(endpoint string) error
	Notify(ticketNumber, title, body string)
}

// SOSUseCase is the interface handlers use for SOS alert operations.
type SOSUseCase interface {
	Submit(s domain.SOSAlert) (*domain.SOSAlert, error)
	GetAll() ([]domain.SOSAlert, error)
}

// EmergencyTypeUseCase is the interface handlers use for emergency type operations.
type EmergencyTypeUseCase interface {
	GetAllTypes() ([]domain.EmergencyType, error)
	CreateType(t domain.EmergencyType) (*domain.EmergencyType, error)
	UpdateType(t domain.EmergencyType) (*domain.EmergencyType, error)
	DeleteType(id string) error
}

// FeedbackUseCase is the interface handlers use for user feedback operations.
type FeedbackUseCase interface {
	Submit(f domain.Feedback) (*domain.Feedback, error)
	GetStats() (domain.FeedbackStats, error)
	GetAll() ([]domain.Feedback, error)
	GetGroupedByUnit() ([]domain.FeedbackGroup, error)
	GetByUnit(emergencyUUID string) ([]domain.Feedback, error)
}

// OrderUseCase is the interface handlers use for order/ticket operations.
type OrderUseCase interface {
	Create(o domain.OrderTicket) (*domain.OrderTicket, error)
	GetByTicketNumber(number string) (*domain.OrderTicket, error)
	GetAll() ([]domain.OrderTicket, error)
	GetByUnit(emergencyUUID, unitName string) ([]domain.OrderTicket, error)
	UpdateStatus(id, status, handlerName, notes string) (*domain.OrderTicket, error)
}

// UnitAuthUseCase is the interface handlers use for unit authentication.
type UnitAuthUseCase interface {
	SetCredentials(emergencyUUID, unitName, username, password string) error
	Login(username, password string) (*domain.UnitCredential, error)
	GetByToken(token string) (*domain.UnitCredential, error)
}

// AnalyticsUseCase aggregates order/feedback/unit data for reporting.
type AnalyticsUseCase interface {
	GetAnalytics(periodDays int) (domain.Analytics, error)
	GetHeatmap(periodDays int) ([]domain.HeatmapPoint, error)
}

// RegionUseCase is the interface handlers use for available region operations.
type RegionUseCase interface {
	GetAllAvailableRegions() ([]domain.AvailableRegion, error)
	GetAvailableRegionsByName(name string) ([]domain.AvailableRegion, error)
	CreateAvailableRegion(r domain.AvailableRegion) (*domain.AvailableRegion, error)
	UpdateAvailableRegion(r domain.AvailableRegion) (*domain.AvailableRegion, error)
	DeleteAvailableRegion(id string) error
	SearchRegencies(q string) ([]domain.Regency, error)
	GetProvinces() ([]domain.Province, error)
	GetRegenciesByProvince(provinceID string) ([]domain.Regency, error)
}
