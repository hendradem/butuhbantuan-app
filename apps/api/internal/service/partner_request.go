package service

import (
	"github.com/butuhbantuan/api/internal/domain"
	"github.com/butuhbantuan/api/internal/repository"
)

type PartnerRequestService struct {
	requests    repository.PartnerRequestRepository
	emergencies repository.EmergencyRepository
}

func NewPartnerRequestService(
	requests repository.PartnerRequestRepository,
	emergencies repository.EmergencyRepository,
) *PartnerRequestService {
	return &PartnerRequestService{requests: requests, emergencies: emergencies}
}

var _ PartnerRequestUseCase = (*PartnerRequestService)(nil)

// Submit validates a public submission and stores it as pending. Anything the
// caller tried to pre-set about the review or the created unit is dropped here:
// only an admin decision can move a request forward.
func (s *PartnerRequestService) Submit(p domain.PartnerRequest) (*domain.PartnerRequest, error) {
	if err := domain.ValidatePartnerRequest(p); err != nil {
		return nil, err
	}
	p.Status = domain.PartnerRequestPending
	p.ReviewNote = ""
	p.ReviewedAt = nil
	p.ReviewedBy = ""
	p.EmergencyUUID = ""
	// Never let the form pick the service id or publish itself.
	p.Payload.ID = ""
	p.Payload.Operational.IsActive = false
	return s.requests.Create(p)
}

func (s *PartnerRequestService) GetAll(status string) ([]domain.PartnerRequest, error) {
	return s.requests.FindAll(status)
}

func (s *PartnerRequestService) GetByID(id string) (*domain.PartnerRequest, error) {
	return s.requests.FindByID(id)
}

func (s *PartnerRequestService) MarkContacted(id, reviewedBy string) (*domain.PartnerRequest, error) {
	return s.review(id, domain.PartnerRequestContacted, "", reviewedBy, "")
}

func (s *PartnerRequestService) Reject(id, reviewedBy, note string) (*domain.PartnerRequest, error) {
	return s.review(id, domain.PartnerRequestRejected, note, reviewedBy, "")
}

// Approve turns a request into a real Emergency row. It stays inactive — and
// its fleet availability is seeded from the reported total, since a brand new
// partner has no daily availability to report yet — until an admin sets the
// unit's dashboard credentials and activates it.
func (s *PartnerRequestService) Approve(id, reviewedBy string) (*domain.Emergency, error) {
	req, err := s.requests.FindByID(id)
	if err != nil {
		return nil, err
	}
	if !domain.CanTransitionPartnerRequest(req.Status, domain.PartnerRequestApproved) {
		return nil, domain.ErrPartnerRequestStatus
	}

	payload := req.Payload
	payload.ID = "" // let the repo mint the unit's UUID
	payload.Operational.IsActive = false
	payload.Fleet.Available = payload.Fleet.Total

	created, err := s.emergencies.Create(payload)
	if err != nil {
		return nil, err
	}
	// `emergency.is_active` carries a DB default of 1, and GORM omits zero-valued
	// fields that have one — so a unit created inactive would silently come back
	// active. Flip it explicitly and report what the row actually says.
	if err := s.emergencies.UpdateActive(created.ID, false); err != nil {
		return nil, err
	}
	created.Operational.IsActive = false

	if _, err := s.requests.Review(id, domain.PartnerRequestApproved, "", reviewedBy, created.ID); err != nil {
		return nil, err
	}
	return created, nil
}

func (s *PartnerRequestService) review(id, status, note, reviewedBy, emergencyUUID string) (*domain.PartnerRequest, error) {
	req, err := s.requests.FindByID(id)
	if err != nil {
		return nil, err
	}
	if !domain.CanTransitionPartnerRequest(req.Status, status) {
		return nil, domain.ErrPartnerRequestStatus
	}
	return s.requests.Review(id, status, note, reviewedBy, emergencyUUID)
}

// NoopPartnerRequestService is used when running in json storage mode (no persistent DB).
type NoopPartnerRequestService struct{}

func NewNoopPartnerRequestService() *NoopPartnerRequestService { return &NoopPartnerRequestService{} }

var _ PartnerRequestUseCase = (*NoopPartnerRequestService)(nil)

func (s *NoopPartnerRequestService) Submit(_ domain.PartnerRequest) (*domain.PartnerRequest, error) {
	return nil, repository.ErrNotSupported
}
func (s *NoopPartnerRequestService) GetAll(_ string) ([]domain.PartnerRequest, error) {
	return []domain.PartnerRequest{}, nil
}
func (s *NoopPartnerRequestService) GetByID(_ string) (*domain.PartnerRequest, error) {
	return nil, repository.ErrNotFound
}
func (s *NoopPartnerRequestService) MarkContacted(_, _ string) (*domain.PartnerRequest, error) {
	return nil, repository.ErrNotSupported
}
func (s *NoopPartnerRequestService) Approve(_, _ string) (*domain.Emergency, error) {
	return nil, repository.ErrNotSupported
}
func (s *NoopPartnerRequestService) Reject(_, _, _ string) (*domain.PartnerRequest, error) {
	return nil, repository.ErrNotSupported
}
