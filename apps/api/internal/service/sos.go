package service

import (
	"errors"

	"github.com/butuhbantuan/api/internal/domain"
	"github.com/butuhbantuan/api/internal/repository"
)

var _ SOSUseCase = (*NoopSOSService)(nil)

type SOSService struct {
	sosRepo   repository.SOSRepository
	orderRepo repository.OrderRepository // optional — enables duplicate SOS guard
	dispatch  DispatchUseCase
}

func NewSOSService(sosRepo repository.SOSRepository, dispatch DispatchUseCase) *SOSService {
	return &SOSService{sosRepo: sosRepo, dispatch: dispatch}
}

// WithOrderRepo enables redirecting duplicate SOS to an already-open ticket.
func (s *SOSService) WithOrderRepo(repo repository.OrderRepository) *SOSService {
	s.orderRepo = repo
	return s
}

var _ SOSUseCase = (*SOSService)(nil)

// Submit ranks the best dispatcher, creates an order ticket (with SSE + SLA),
// and persists the SOS alert linked to the ticket number.
// If the same phone already has an open ticket (same type), the existing ticket is reused.
func (s *SOSService) Submit(alert domain.SOSAlert) (*domain.SOSAlert, error) {
	if s.orderRepo != nil {
		existing, err := s.orderRepo.FindActiveByPhone(alert.Phone, alert.TypeID)
		if err == nil && existing != nil {
			alert.TicketNumber = existing.TicketNumber
			alert.Reused = true
			// Still persist a breadcrumb SOS row pointing at the live ticket.
			created, cerr := s.sosRepo.Create(alert)
			if cerr != nil {
				alert.ID = existing.ID
				return &alert, nil
			}
			created.Reused = true
			created.TicketNumber = existing.TicketNumber
			return created, nil
		}
		if err != nil && !errors.Is(err, repository.ErrNotFound) {
			return nil, err
		}
	}

	if s.dispatch != nil {
		result, err := s.dispatch.AssignSOS(alert)
		if err != nil {
			return nil, err
		}
		if result != nil && result.Ticket != nil {
			alert.TicketNumber = result.Ticket.TicketNumber
		}
	}

	return s.sosRepo.Create(alert)
}

func (s *SOSService) GetAll() ([]domain.SOSAlert, error) {
	return s.sosRepo.FindAll()
}

// NoopSOSService satisfies SOSUseCase when running in json storage mode.
type NoopSOSService struct{}

func NewNoopSOSService() *NoopSOSService { return &NoopSOSService{} }

func (s *NoopSOSService) Submit(_ domain.SOSAlert) (*domain.SOSAlert, error) {
	return nil, repository.ErrNotSupported
}

func (s *NoopSOSService) GetAll() ([]domain.SOSAlert, error) {
	return nil, repository.ErrNotSupported
}
