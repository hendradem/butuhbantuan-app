package repository

import (
	"errors"
	"time"

	"github.com/butuhbantuan/api/internal/domain"
)

var (
	ErrNotFound     = errors.New("record not found")
	ErrNotSupported = errors.New("operation not supported in current storage mode")
	ErrDuplicate    = errors.New("record already exists")
	ErrConflict     = errors.New("record was modified concurrently")
)

type EmergencyRepository interface {
	FindAll() ([]domain.Emergency, error)
	FindAllActive() ([]domain.Emergency, error)
	FindByID(id string) (*domain.Emergency, error)
	FindByProvince(provinceID string) ([]domain.Emergency, error)
	FindByRegency(regencyID string) ([]domain.Emergency, error)
	FindDispatchers(regencyID, provinceID string) ([]domain.Emergency, error)
	FindByType(emergencyTypeID string) ([]domain.Emergency, error)
	FindByIDs(ids []string) ([]domain.Emergency, error)
	Create(e domain.Emergency) (*domain.Emergency, error)
	Update(e domain.Emergency) (*domain.Emergency, error)
	Delete(id string) error
	UpdateOperational(id string, status domain.OperationalStatus) error
	UpdateFleet(id string, fleet domain.FleetStatus) error
	UpdateActive(id string, isActive bool) error
	UpdateWilayah(id string, addr domain.Address) error
	UpdateCompliance(id string, profile domain.AmbulanceComplianceProfile) (*domain.Emergency, error)
	GetComplianceProfile(id string) (*domain.AmbulanceComplianceProfile, error)
	UpdateIncidentReportTemplate(id string, tpl domain.IncidentReportTemplate) (*domain.IncidentReportTemplate, error)
	GetIncidentReportTemplate(id string) (*domain.IncidentReportTemplate, error)
}

type PushRepository interface {
	Save(sub domain.PushSubscription) error
	FindByTicket(ticketNumber string) ([]domain.PushSubscription, error)
	DeleteByEndpoint(endpoint string) error
}

type SOSRepository interface {
	Create(s domain.SOSAlert) (*domain.SOSAlert, error)
	FindAll() ([]domain.SOSAlert, error)
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
	FindByID(id string) (*domain.OrderTicket, error)
	FindByTicketNumber(number string) (*domain.OrderTicket, error)
	FindByPublicToken(token string) (*domain.OrderTicket, error)
	FindAll() ([]domain.OrderTicket, error)
	FindByUnit(emergencyUUID, unitName string) ([]domain.OrderTicket, error)
	// FindByWilayahScope returns tickets in a dispatcher wilayah.
	// provinceWide=true filters by provinceID; otherwise by regencyID.
	FindByWilayahScope(regencyID, provinceID string, provinceWide bool) ([]domain.OrderTicket, error)
	UpdateStatus(id, status, handlerName, notes string) (*domain.OrderTicket, error)
	// AcceptPending atomically accepts a pending ticket. When expectedUUID is non-empty,
	// the ticket must still be assigned to that unit (prevents accept-after-reassign races).
	AcceptPending(id, expectedUUID string) (*domain.OrderTicket, error)
	FindPendingPastSLA(now time.Time) ([]domain.OrderTicket, error)
	// Reassign atomically moves a ticket. When fromUUID is non-empty, the ticket must
	// still be assigned to fromUUID (prevents double-reassign races).
	Reassign(id, fromUUID, emergencyUUID, unitName string, round int, slaDeadline *time.Time, dispatchStatus string) (*domain.OrderTicket, error)
	MarkDispatchExhausted(id string) (*domain.OrderTicket, error)
	MarkEscalated(id, hotline, label, emergencyUUID, unitName string) (*domain.OrderTicket, error)
	// FindActiveByPhone returns the newest open ticket matching phone (+ optional type).
	FindActiveByPhone(phone string, typeID uint) (*domain.OrderTicket, error)
	EnableTrack(id, token string, expiresAt time.Time) (*domain.OrderTicket, error)
	// ExtendTrackExpiry keeps the same token, only pushes track_expires_at forward.
	ExtendTrackExpiry(id string, expiresAt time.Time) error
	FindByTrackToken(token string) (*domain.OrderTicket, error)
	UpdateResponderLocation(token string, lat, lng float64) (*domain.OrderTicket, error)
	MarkArrivedByToken(token string) (*domain.OrderTicket, error)
	MarkArrived(id string) (*domain.OrderTicket, error)
	DisableTrack(id string) (*domain.OrderTicket, error)
	// ExpireTrack soft-closes live sharing: keeps token for read-only field view.
	ExpireTrack(id string) (*domain.OrderTicket, error)
	SaveIncidentReport(id, reportJSON string) (*domain.OrderTicket, error)
	SetReferralHospital(id, hospitalID, hospitalName string) error
}

type DispatchAttemptRepository interface {
	Create(a domain.DispatchAttempt) (*domain.DispatchAttempt, error)
	FindByOrderID(orderID string) ([]domain.DispatchAttempt, error)
	FindOfferedEmergencyUUIDs(orderID string) ([]string, error)
	ResolveOffered(orderID, status string) error
	RejectOffered(orderID, reason, note string) error
	MarkAccepted(orderID, emergencyUUID string) error
	CountRejectsSince(emergencyUUID string, since time.Time) (int, error)
}

type OrderEventRepository interface {
	Create(e domain.OrderEvent) (*domain.OrderEvent, error)
	FindByOrderID(orderID string) ([]domain.OrderEvent, error)
}

type UnitCredentialRepository interface {
	Set(cred domain.UnitCredential) error
	FindByToken(token string) (*domain.UnitCredential, error)
	FindByUsername(username string) (*domain.UnitCredential, error)
	FindByEmergencyUUID(emergencyUUID string) (*domain.UnitCredential, error)
	ListAll() ([]domain.UnitCredential, error)
	Delete(emergencyUUID string) error
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
func (r *NoopUnitCredentialRepository) FindByEmergencyUUID(_ string) (*domain.UnitCredential, error) {
	return nil, ErrNotFound
}
func (r *NoopUnitCredentialRepository) ListAll() ([]domain.UnitCredential, error) {
	return nil, nil
}
func (r *NoopUnitCredentialRepository) Delete(_ string) error { return ErrNotSupported }

type AnalyticsRepository interface {
	GetAnalytics(periodDays int) (domain.Analytics, error)
	GetHeatmap(periodDays int) ([]domain.HeatmapPoint, error)
	GetUnitPeriodAggregates(emergencyUUID string, periodDays int) (domain.UnitPeriodAggregates, error)
}

type RegionRepository interface {
	FindAllAvailableRegions() ([]domain.AvailableRegion, error)
	FindAvailableRegionsByName(name string) ([]domain.AvailableRegion, error)
	CreateAvailableRegion(r domain.AvailableRegion) (*domain.AvailableRegion, error)
	UpdateAvailableRegion(r domain.AvailableRegion) (*domain.AvailableRegion, error)
	DeleteAvailableRegion(id string) error
	SearchRegencies(q string) ([]domain.Regency, error)
	FindProvinces() ([]domain.Province, error)
	FindRegency(id string) (*domain.Regency, error)
	FindProvince(id string) (*domain.Province, error)
	FindRegenciesByProvince(provinceID string) ([]domain.Regency, error)
	FindCoveredProvinces() ([]domain.Province, error)
	FindCoveredRegenciesByProvince(provinceID string) ([]domain.Regency, error)
}

type MapTileUsageRepository interface {
	GetMonth(monthKey string) (int64, error)
	Increment(monthKey string, delta int64) (int64, error)
}

type AssessmentRepository interface {
	FindTemplateByCode(code string) (*domain.AssessmentTemplate, error)
	FindDefaultTemplate() (*domain.AssessmentTemplate, error)
	FindTemplateForEmergencyType(typeID uint) (*domain.AssessmentTemplate, error)
	FindTemplateForJenisPelayanan(jenis string) (*domain.AssessmentTemplate, error)
	EnsureDefaultTemplates() error
	ListTemplates() ([]domain.AssessmentTemplate, error)
	FindTemplateByID(id uint) (*domain.AssessmentTemplate, error)
	CreateTemplate(t domain.AssessmentTemplate) (*domain.AssessmentTemplate, error)
	UpdateTemplate(t domain.AssessmentTemplate) (*domain.AssessmentTemplate, error)
	DeleteTemplate(id uint) error
	ListBindings() ([]domain.AssessmentBinding, error)
	UpsertBinding(b domain.AssessmentBinding) (*domain.AssessmentBinding, error)
	DeleteBinding(emergencyTypeID uint) error
	ListJenisBindings() ([]domain.AssessmentJenisBinding, error)
	UpsertJenisBinding(b domain.AssessmentJenisBinding) (*domain.AssessmentJenisBinding, error)
	DeleteJenisBinding(jenisPelayanan string) error
}
