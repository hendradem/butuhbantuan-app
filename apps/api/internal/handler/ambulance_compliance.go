package handler

import (
	"errors"
	"strings"
	"time"

	"github.com/butuhbantuan/api/internal/domain"
	"github.com/butuhbantuan/api/internal/repository"
	"github.com/butuhbantuan/api/internal/service"
	"github.com/butuhbantuan/api/pkg/response"
	"github.com/gofiber/fiber/v2"
)

type AmbulanceComplianceHandler struct {
	svc service.AmbulanceComplianceUseCase
}

func NewAmbulanceComplianceHandler(svc service.AmbulanceComplianceUseCase) *AmbulanceComplianceHandler {
	return &AmbulanceComplianceHandler{svc: svc}
}

// GET /api/v1/compliance/ambulance/categories
func (h *AmbulanceComplianceHandler) ListCategories(c *fiber.Ctx) error {
	return response.OK(c, "ok", h.svc.ListCategories())
}

// GET /api/v1/compliance/ambulance/template?category=transport_darat
func (h *AmbulanceComplianceHandler) GetTemplate(c *fiber.Ctx) error {
	category := strings.TrimSpace(c.Query("category"))
	tpl, err := h.svc.GetTemplate(category)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return response.Error(c, fiber.StatusNotFound, "template not found")
		}
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.OK(c, "ok", tpl)
}

// GET /api/v1/emergency/:id/compliance
func (h *AmbulanceComplianceHandler) GetForEmergency(c *fiber.Ctx) error {
	view, err := h.svc.GetForEmergency(c.Params("id"))
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return response.Error(c, fiber.StatusNotFound, "not found")
		}
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	if view == nil {
		return response.OK(c, "ok", nil)
	}
	return response.OK(c, "ok", view)
}

type updateComplianceBody struct {
	DeclaredCategory string                           `json:"declared_category"`
	Items            []domain.AmbulanceComplianceAnswer `json:"items"`
}

// PUT /api/v1/emergency/:id/compliance
func (h *AmbulanceComplianceHandler) UpdateForEmergency(c *fiber.Ctx) error {
	var body updateComplianceBody
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	view, err := h.svc.UpdateForEmergency(c.Params("id"), body.DeclaredCategory, body.Items)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return response.Error(c, fiber.StatusNotFound, "emergency not found")
		}
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.OK(c, "ok", view)
}

type verifyComplianceBody struct {
	VerifiedCategory string `json:"verified_category"`
	ExpiresAt        string `json:"expires_at"`
	Revoke           bool   `json:"revoke"`
}

// POST /api/v1/emergency/:id/compliance/verify
func (h *AmbulanceComplianceHandler) VerifyForEmergency(c *fiber.Ctx) error {
	var body verifyComplianceBody
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	var expiresAt *time.Time
	if strings.TrimSpace(body.ExpiresAt) != "" {
		t, err := time.Parse(time.RFC3339, body.ExpiresAt)
		if err != nil {
			return response.Error(c, fiber.StatusBadRequest, "expires_at harus RFC3339")
		}
		expiresAt = &t
	}
	verifiedBy, _ := c.Locals("auth_role").(string)
	if verifiedBy == "" {
		verifiedBy = "admin"
	}
	view, err := h.svc.VerifyForEmergency(
		c.Params("id"),
		body.VerifiedCategory,
		verifiedBy,
		expiresAt,
		body.Revoke,
	)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return response.Error(c, fiber.StatusNotFound, "emergency not found")
		}
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.OK(c, "ok", view)
}

// GET /api/v1/admin/compliance/queue?within=30
func (h *AmbulanceComplianceHandler) ListVerificationQueue(c *fiber.Ctx) error {
	within := c.QueryInt("within", 30)
	items, err := h.svc.ListVerificationQueue(within)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.OK(c, "ok", items)
}

// PUT /api/v1/unit/compliance — unit updates own compliance checklist.
func (h *AmbulanceComplianceHandler) UpdateForUnit(c *fiber.Ctx) error {
	id, _ := c.Locals("emergency_uuid").(string)
	if id == "" {
		return response.Error(c, fiber.StatusUnauthorized, "unauthorized")
	}
	var body updateComplianceBody
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	view, err := h.svc.UpdateForEmergency(id, body.DeclaredCategory, body.Items)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return response.Error(c, fiber.StatusNotFound, "not found")
		}
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.OK(c, "ok", view)
}
