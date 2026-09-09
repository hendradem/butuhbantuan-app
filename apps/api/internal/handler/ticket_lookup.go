package handler

import (
	"errors"
	"strings"
	"time"

	"github.com/butuhbantuan/api/internal/domain"
	"github.com/butuhbantuan/api/internal/service"
	"github.com/butuhbantuan/api/pkg/response"
	"github.com/gofiber/fiber/v2"
)

// TicketLookupHandler exposes the citizen "check my tickets by phone" flow.
type TicketLookupHandler struct {
	svc *service.TicketLookupService
}

func NewTicketLookupHandler(svc *service.TicketLookupService) *TicketLookupHandler {
	return &TicketLookupHandler{svc: svc}
}

// RequestOTP: POST /api/v1/lookup/request-otp { phone }
func (h *TicketLookupHandler) RequestOTP(c *fiber.Ctx) error {
	if h.svc == nil {
		return response.Error(c, fiber.StatusServiceUnavailable, "layanan tidak aktif")
	}
	var body struct {
		Phone string `json:"phone"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "body tidak valid")
	}
	_, ttl, err := h.svc.RequestOTP(body.Phone)
	if errors.Is(err, service.ErrLookupBadPhone) {
		return response.Error(c, fiber.StatusBadRequest, "nomor telepon tidak valid")
	}
	if errors.Is(err, service.ErrLookupRateLimited) {
		return response.Error(c, fiber.StatusTooManyRequests, "terlalu banyak permintaan, coba lagi dalam 1 jam")
	}
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "gagal mengirim kode")
	}
	return response.OK(c, "ok", fiber.Map{
		"expires_in_sec": int(ttl.Seconds()),
	})
}

// VerifyOTP: POST /api/v1/lookup/verify-otp { phone, code }
func (h *TicketLookupHandler) VerifyOTP(c *fiber.Ctx) error {
	if h.svc == nil {
		return response.Error(c, fiber.StatusServiceUnavailable, "layanan tidak aktif")
	}
	var body struct {
		Phone string `json:"phone"`
		Code  string `json:"code"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "body tidak valid")
	}
	token, ttl, err := h.svc.VerifyOTP(body.Phone, body.Code)
	if errors.Is(err, service.ErrLookupBadPhone) {
		return response.Error(c, fiber.StatusBadRequest, "nomor telepon tidak valid")
	}
	if errors.Is(err, service.ErrLookupInvalidCode) {
		return response.Error(c, fiber.StatusUnauthorized, "kode salah atau sudah kedaluwarsa")
	}
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "gagal verifikasi")
	}
	return response.OK(c, "ok", fiber.Map{
		"token":          token,
		"expires_in_sec": int(ttl.Seconds()),
	})
}

// ListMyTickets: GET /api/v1/lookup/tickets  (header: X-Lookup-Token)
func (h *TicketLookupHandler) ListMyTickets(c *fiber.Ctx) error {
	if h.svc == nil {
		return response.Error(c, fiber.StatusServiceUnavailable, "layanan tidak aktif")
	}
	token := strings.TrimSpace(c.Get("X-Lookup-Token"))
	if token == "" {
		return response.Error(c, fiber.StatusUnauthorized, "sesi tidak valid")
	}
	tickets, err := h.svc.ListTickets(token)
	if errors.Is(err, service.ErrLookupBadSession) {
		return response.Error(c, fiber.StatusUnauthorized, "sesi kedaluwarsa, mohon minta kode lagi")
	}
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "gagal memuat tiket")
	}
	return response.OK(c, "ok", sanitizeLookupTickets(tickets))
}

// EndSession: POST /api/v1/lookup/logout
func (h *TicketLookupHandler) EndSession(c *fiber.Ctx) error {
	if h.svc == nil {
		return response.Error(c, fiber.StatusServiceUnavailable, "layanan tidak aktif")
	}
	token := strings.TrimSpace(c.Get("X-Lookup-Token"))
	if token != "" {
		h.svc.EndSession(token)
	}
	return response.OK(c, "ok", nil)
}

// sanitizeLookupTickets strips PII/tokens; the citizen sees only enough info to
// recognize the ticket and jump to its public /ticket/{token} page.
type lookupTicketDTO struct {
	TicketNumber string     `json:"ticket_number"`
	PublicToken  string     `json:"public_token,omitempty"`
	UnitName     string     `json:"unit_name,omitempty"`
	Location     string     `json:"location,omitempty"`
	Condition    string     `json:"condition,omitempty"`
	Status       string     `json:"status"`
	CitizenPhase string     `json:"citizen_phase,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
	CompletedAt  *time.Time `json:"completed_at,omitempty"`
}

func sanitizeLookupTickets(in []domain.OrderTicket) []lookupTicketDTO {
	out := make([]lookupTicketDTO, len(in))
	for i, t := range in {
		out[i] = lookupTicketDTO{
			TicketNumber: t.TicketNumber,
			PublicToken:  t.PublicToken,
			UnitName:     t.UnitName,
			Location:     t.Location,
			Condition:    t.Condition,
			Status:       t.Status,
			CitizenPhase: t.CitizenPhase,
			CreatedAt:    t.CreatedAt,
			CompletedAt:  t.CompletedAt,
		}
	}
	return out
}
