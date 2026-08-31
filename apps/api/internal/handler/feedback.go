package handler

import (
	"errors"
	"strings"

	"github.com/butuhbantuan/api/internal/domain"
	"github.com/butuhbantuan/api/internal/repository"
	"github.com/butuhbantuan/api/internal/service"
	"github.com/butuhbantuan/api/pkg/response"
	"github.com/gofiber/fiber/v2"
)

type FeedbackHandler struct {
	svc     service.FeedbackUseCase
	orderSvc service.OrderUseCase
}

func NewFeedbackHandler(svc service.FeedbackUseCase) *FeedbackHandler {
	return &FeedbackHandler{svc: svc}
}

func (h *FeedbackHandler) WithOrders(orderSvc service.OrderUseCase) *FeedbackHandler {
	h.orderSvc = orderSvc
	return h
}

func (h *FeedbackHandler) Submit(c *fiber.Ctx) error {
	var body struct {
		EmergencyID     string `json:"emergency_id"`
		EmergencyUUID   string `json:"emergency_uuid"` // alias from public ticket DTO
		TicketNumber    string `json:"ticket_number"`
		RequesterPhone  string `json:"requester_phone"`
		UnitName        string `json:"unit_name"`
		UnitHelpful     bool   `json:"unit_helpful"`
		AppHelpful      *bool  `json:"app_helpful"`
		CallType        string `json:"call_type"`
		Comment         string `json:"comment"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	emergencyID := strings.TrimSpace(body.EmergencyID)
	if emergencyID == "" {
		emergencyID = strings.TrimSpace(body.EmergencyUUID)
	}
	ticketNumber := strings.TrimSpace(body.TicketNumber)
	unitName := strings.TrimSpace(body.UnitName)
	claimPhone := strings.TrimSpace(body.RequesterPhone)

	// Citizen e-ticket may only have ticket_number (or stripped emergency_uuid on older DTOs).
	if emergencyID == "" && ticketNumber != "" && h.orderSvc != nil {
		order, err := h.orderSvc.GetByTicketNumber(ticketNumber)
		if err != nil {
			if errors.Is(err, repository.ErrNotFound) {
				return response.Error(c, fiber.StatusBadRequest, "ticket not found")
			}
			return response.Error(c, fiber.StatusInternalServerError, "failed to resolve ticket")
		}
		if claimPhone == "" || !domain.PhoneMatches(order.RequesterPhone, claimPhone) {
			return response.Error(c, fiber.StatusForbidden, "verifikasi nomor HP pelapor diperlukan")
		}
		emergencyID = strings.TrimSpace(order.EmergencyUUID)
		if unitName == "" {
			unitName = order.UnitName
		}
	}

	if emergencyID == "" {
		return response.Error(c, fiber.StatusBadRequest, "emergency_id or ticket_number is required")
	}

	f := domain.Feedback{
		EmergencyID: emergencyID,
		UnitName:    unitName,
		UnitHelpful: body.UnitHelpful,
		AppHelpful:  body.AppHelpful,
		CallType:    body.CallType,
		Comment:     body.Comment,
	}
	result, err := h.svc.Submit(f)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to submit feedback")
	}
	return response.OK(c, "feedback submitted", result)
}

func (h *FeedbackHandler) GetStats(c *fiber.Ctx) error {
	stats, err := h.svc.GetStats()
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to get feedback stats")
	}
	return response.OK(c, "success", stats)
}

func (h *FeedbackHandler) GetAll(c *fiber.Ctx) error {
	data, err := h.svc.GetAll()
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to get feedback")
	}
	return response.OK(c, "success", data)
}

func (h *FeedbackHandler) GetGroupedByUnit(c *fiber.Ctx) error {
	data, err := h.svc.GetGroupedByUnit()
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to get grouped feedback")
	}
	return response.OK(c, "success", data)
}

func (h *FeedbackHandler) GetByUnit(c *fiber.Ctx) error {
	data, err := h.svc.GetByUnit(c.Params("uuid"))
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to get unit feedback")
	}
	return response.OK(c, "success", data)
}
