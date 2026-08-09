package handler

import (
	"github.com/butuhbantuan/api/internal/domain"
	"github.com/butuhbantuan/api/internal/service"
	"github.com/butuhbantuan/api/pkg/response"
	"github.com/gofiber/fiber/v2"
)

type FeedbackHandler struct {
	svc service.FeedbackUseCase
}

func NewFeedbackHandler(svc service.FeedbackUseCase) *FeedbackHandler {
	return &FeedbackHandler{svc: svc}
}

func (h *FeedbackHandler) Submit(c *fiber.Ctx) error {
	var body struct {
		EmergencyID string `json:"emergency_id"`
		UnitName    string `json:"unit_name"`
		UnitHelpful bool   `json:"unit_helpful"`
		AppHelpful  *bool  `json:"app_helpful"`
		CallType    string `json:"call_type"`
		Comment     string `json:"comment"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	if body.EmergencyID == "" {
		return response.Error(c, fiber.StatusBadRequest, "emergency_id is required")
	}

	f := domain.Feedback{
		EmergencyID: body.EmergencyID,
		UnitName:    body.UnitName,
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
