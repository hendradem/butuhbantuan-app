package service

import (
	"errors"

	"github.com/butuhbantuan/api/internal/domain"
	"github.com/butuhbantuan/api/internal/repository"
	"github.com/butuhbantuan/api/pkg/hub"
	"golang.org/x/crypto/bcrypt"
)

// ── OrderService ──────────────────────────────────────────────────────────────

type OrderService struct {
	repo    repository.OrderRepository
	pub     hub.Publisher
	pushSvc PushUseCase
}

func NewOrderService(repo repository.OrderRepository, pub hub.Publisher, pushSvc PushUseCase) *OrderService {
	return &OrderService{repo: repo, pub: pub, pushSvc: pushSvc}
}

var _ OrderUseCase = (*OrderService)(nil)

func (s *OrderService) Create(o domain.OrderTicket) (*domain.OrderTicket, error) {
	result, err := s.repo.Create(o)
	if err != nil {
		return nil, err
	}
	s.pub.Publish(result.EmergencyUUID, hub.Event{Type: "new_order", Payload: result})
	return result, nil
}

func (s *OrderService) GetByTicketNumber(number string) (*domain.OrderTicket, error) {
	return s.repo.FindByTicketNumber(number)
}

func (s *OrderService) GetAll() ([]domain.OrderTicket, error) {
	return s.repo.FindAll()
}

func (s *OrderService) GetByUnit(emergencyUUID, unitName string) ([]domain.OrderTicket, error) {
	return s.repo.FindByUnit(emergencyUUID, unitName)
}

func (s *OrderService) UpdateStatus(id, status, handlerName, notes string) (*domain.OrderTicket, error) {
	result, err := s.repo.UpdateStatus(id, status, handlerName, notes)
	if err != nil {
		return nil, err
	}
	// Send push notification to any subscribed citizen watchers.
	if s.pushSvc != nil {
		label := map[string]string{
			"accepted":    "Diterima",
			"in_progress": "Sedang Diproses",
			"completed":   "Selesai",
			"cancelled":   "Dibatalkan",
		}[status]
		if label != "" {
			s.pushSvc.Notify(result.TicketNumber, "Update Tiket "+result.TicketNumber, "Status: "+label)
		}
	}
	return result, nil
}

// ── NoopOrderService ──────────────────────────────────────────────────────────

type NoopOrderService struct{}

func NewNoopOrderService() *NoopOrderService { return &NoopOrderService{} }

var _ OrderUseCase = (*NoopOrderService)(nil)

var errOrderNotSupported = errors.New("orders not supported in json storage mode")

func (s *NoopOrderService) Create(_ domain.OrderTicket) (*domain.OrderTicket, error) {
	return nil, errOrderNotSupported
}
func (s *NoopOrderService) GetByTicketNumber(_ string) (*domain.OrderTicket, error) {
	return nil, errOrderNotSupported
}
func (s *NoopOrderService) GetAll() ([]domain.OrderTicket, error)            { return []domain.OrderTicket{}, nil }
func (s *NoopOrderService) GetByUnit(_, _ string) ([]domain.OrderTicket, error) {
	return []domain.OrderTicket{}, nil
}
func (s *NoopOrderService) UpdateStatus(_, _, _, _ string) (*domain.OrderTicket, error) {
	return nil, errOrderNotSupported
}

// ── NoopUnitAuthService ───────────────────────────────────────────────────────

type NoopUnitAuthService struct{}

func NewNoopUnitAuthService() *NoopUnitAuthService { return &NoopUnitAuthService{} }

var _ UnitAuthUseCase = (*NoopUnitAuthService)(nil)

func (s *NoopUnitAuthService) SetCredentials(_, _, _, _ string) error {
	return repository.ErrNotSupported
}
func (s *NoopUnitAuthService) Login(_, _ string) (*domain.UnitCredential, error) {
	return nil, errOrderNotSupported
}
func (s *NoopUnitAuthService) GetByToken(_ string) (*domain.UnitCredential, error) {
	return nil, errOrderNotSupported
}

// ── UnitAuthService ───────────────────────────────────────────────────────────

type UnitAuthService struct {
	repo repository.UnitCredentialRepository
}

func NewUnitAuthService(repo repository.UnitCredentialRepository) *UnitAuthService {
	return &UnitAuthService{repo: repo}
}

var _ UnitAuthUseCase = (*UnitAuthService)(nil)

func (s *UnitAuthService) SetCredentials(emergencyUUID, unitName, username, password string) error {
	return s.repo.Set(domain.UnitCredential{
		EmergencyUUID: emergencyUUID,
		UnitName:      unitName,
		Username:      username,
		Password:      password,
	})
}

func (s *UnitAuthService) Login(username, password string) (*domain.UnitCredential, error) {
	cred, err := s.repo.FindByUsername(username)
	if err != nil {
		return nil, errors.New("invalid credentials")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(cred.Password), []byte(password)); err != nil {
		return nil, errors.New("invalid credentials")
	}
	return &domain.UnitCredential{
		EmergencyUUID: cred.EmergencyUUID,
		Username:      cred.Username,
		AccessToken:   cred.AccessToken,
	}, nil
}

func (s *UnitAuthService) GetByToken(token string) (*domain.UnitCredential, error) {
	return s.repo.FindByToken(token)
}
