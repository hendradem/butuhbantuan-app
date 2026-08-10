package service

import (
	"github.com/butuhbantuan/api/internal/domain"
	"github.com/butuhbantuan/api/internal/repository"
)

var _ SOSUseCase = (*NoopSOSService)(nil)

type SOSService struct {
	sosRepo      repository.SOSRepository
	orderRepo    repository.OrderRepository
	emergencyRepo repository.EmergencyRepository
}

func NewSOSService(sosRepo repository.SOSRepository, orderRepo repository.OrderRepository, emergencyRepo repository.EmergencyRepository) *SOSService {
	return &SOSService{sosRepo: sosRepo, orderRepo: orderRepo, emergencyRepo: emergencyRepo}
}

var _ SOSUseCase = (*SOSService)(nil)

// Submit finds the nearest dispatcher, creates an order ticket, and records the SOS alert.
func (s *SOSService) Submit(alert domain.SOSAlert) (*domain.SOSAlert, error) {
	dispatchers, err := s.emergencyRepo.FindDispatchers(alert.RegencyID, alert.ProvinceID)
	if err != nil {
		return nil, err
	}

	// Prefer dispatcher matching the requested type; fall back to any dispatcher.
	var target *domain.Emergency
	if alert.TypeID > 0 {
		for i := range dispatchers {
			if uint(dispatchers[i].EmergencyType.ID) == alert.TypeID {
				target = &dispatchers[i]
				break
			}
		}
	}
	if target == nil && len(dispatchers) > 0 {
		target = &dispatchers[0]
	}

	if target != nil {
		ticket, err := s.orderRepo.Create(domain.OrderTicket{
			EmergencyUUID:  target.ID,
			UnitName:       target.Name,
			RequesterName:  alert.Name,
			RequesterPhone: alert.Phone,
			Location:       alert.Address,
			Condition:      alert.Description,
			PhotoURL:       alert.PhotoURL,
			RequesterLat:   alert.Lat,
			RequesterLng:   alert.Lng,
			Source:         "sos",
		})
		if err == nil {
			alert.TicketNumber = ticket.TicketNumber
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
