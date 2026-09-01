package service

import "github.com/butuhbantuan/api/internal/domain"

// EmergencyUseCase is the interface handlers use for emergency data operations.
type EmergencyUseCase interface {
	GetAll() ([]domain.Emergency, error)
	GetAllAdmin() ([]domain.Emergency, error)
	GetByID(id string) (*domain.Emergency, error)
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
	UpdateWilayah(id string, addr domain.Address) error
	GetIncidentReportTemplate(id string) (*domain.IncidentReportTemplate, error)
	UpdateIncidentReportTemplate(id string, tpl domain.IncidentReportTemplate) (*domain.IncidentReportTemplate, error)
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
	GetByID(id string) (*domain.OrderTicket, error)
	GetByTicketNumber(number string) (*domain.OrderTicket, error)
	GetByPublicToken(token string) (*domain.OrderTicket, error)
	GetAll() ([]domain.OrderTicket, error)
	GetByUnit(emergencyUUID, unitName string) ([]domain.OrderTicket, error)
	GetByWilayahScope(regencyID, provinceID string, provinceWide bool) ([]domain.OrderTicket, error)
	UpdateStatus(id, status, handlerName, notes string) (*domain.OrderTicket, error)
	// AcceptPending atomically accepts while still pending; expectedUUID pins the assignee for unit actors.
	AcceptPending(id, expectedUUID string) (*domain.OrderTicket, error)
	NotifyCitizenAccept(ticket *domain.OrderTicket, etaMinutes int)
	RecordEvent(ev domain.OrderEvent) error
	GetHistory(orderID string) ([]domain.OrderEvent, error)
	EnableTrack(id string, actor string) (*domain.OrderTicket, error)
	RefreshTrackTTL(id string) (*domain.OrderTicket, error)
	DisableTrack(id string, actor string) (*domain.OrderTicket, error)
	GetByTrackToken(token string) (*domain.OrderTicket, error)
	PingTrackLocation(token string, lat, lng float64) (*domain.OrderTicket, error)
	MarkArrivedByToken(token string) (*domain.OrderTicket, error)
	// MarkArrived records on-scene from unit/admin dashboard (no track token required).
	MarkArrived(id string) (*domain.OrderTicket, error)
	// CompleteByToken marks the ticket completed from the field magic-link page and disables track.
	CompleteByToken(token, handlerName, notes string) (*domain.OrderTicket, error)
	// GetOfferByToken returns a session for the WA dispatch respond page.
	// Unlike GetByTrackToken, this also allows pending (unaccepted) orders.
	GetOfferByToken(token string) (*domain.OrderTicket, error)
	SaveIncidentReport(id, reportJSON string) (*domain.OrderTicket, error)
	SetReferralHospital(id, hospitalID, hospitalName string) error
	// RelayToCommunity mints a claim token on a pending WA-dispatch ticket and
	// returns the updated ticket. Only valid for tickets still in pending status.
	RelayToCommunity(trackToken string, windowSecs int) (*domain.OrderTicket, error)
	// RelayToCommunityByID does the same but looks up by order UUID (for admin dashboard).
	RelayToCommunityByID(orderID string, windowSecs int) (*domain.OrderTicket, error)
	// GetClaim returns sanitized (no-PII) ticket info for the public claim page.
	GetClaim(claimToken string) (*domain.OrderTicket, error)
	// ClaimOrder allows a community volunteer to accept the ticket by claim token.
	ClaimOrder(claimToken, volunteerName, volunteerPhone string) (*domain.OrderTicket, error)
}

// UnitAuthUseCase is the interface handlers use for unit authentication.
type UnitAuthUseCase interface {
	SetCredentials(emergencyUUID, unitName, username, password string) error
	Login(username, password string) (*domain.UnitCredential, error)
	GetByToken(token string) (*domain.UnitCredential, error)
	GetCredential(emergencyUUID string) (*domain.UnitCredential, error)
	ListAllCredentials() ([]domain.UnitCredential, error)
	DeleteCredentials(emergencyUUID string) error
}

// AnalyticsUseCase aggregates order/feedback/unit data for reporting.
type AnalyticsUseCase interface {
	GetAnalytics(periodDays int) (domain.Analytics, error)
	GetHeatmap(periodDays int) ([]domain.HeatmapPoint, error)
	GetPublicUnitStats(emergencyUUID string, periodDays int) (*domain.PublicUnitStats, error)
	GetUnitOwnStats(emergencyUUID string, periodDays int) (*domain.PublicUnitStats, error)
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
	GetCoveredProvinces() ([]domain.Province, error)
	GetCoveredRegenciesByProvince(provinceID string) ([]domain.Regency, error)
}

// AssessmentUseCase resolves citizen report checklists (master templates).
type AssessmentUseCase interface {
	GetTemplateForEmergency(emergencyUUID string) (*domain.AssessmentTemplate, error)
	GetTemplateForOrder(emergencyUUID, jenisPelayanan string) (*domain.AssessmentTemplate, error)
	GetDefaultTemplate() (*domain.AssessmentTemplate, error)
	ListTemplates() ([]domain.AssessmentTemplate, error)
	GetTemplateByID(id uint) (*domain.AssessmentTemplate, error)
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
