package handler

import (
	"strconv"
	"strings"

	"github.com/butuhbantuan/api/internal/domain"
	"github.com/butuhbantuan/api/internal/repository"
	"github.com/butuhbantuan/api/internal/service"
	"github.com/butuhbantuan/api/pkg/response"
	"github.com/gofiber/fiber/v2"
)

type AssessmentHandler struct {
	svc service.AssessmentUseCase
}

func NewAssessmentHandler(svc service.AssessmentUseCase) *AssessmentHandler {
	return &AssessmentHandler{svc: svc}
}

// GetTemplate returns the checklist for a unit (by emergency_uuid) or the default.
// GET /api/v1/assessment/template?emergency_uuid=
func (h *AssessmentHandler) GetTemplate(c *fiber.Ctx) error {
	uuid := strings.TrimSpace(c.Query("emergency_uuid"))
	jenis := strings.TrimSpace(c.Query("jenis_pelayanan"))
	var (
		tpl *domain.AssessmentTemplate
		err error
	)
	if jenis != "" || uuid != "" {
		tpl, err = h.svc.GetTemplateForOrder(uuid, jenis)
	} else {
		tpl, err = h.svc.GetDefaultTemplate()
	}
	if err != nil {
		if err == repository.ErrNotFound {
			return response.Error(c, fiber.StatusNotFound, "assessment template not found")
		}
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.OK(c, "ok", tpl)
}

func (h *AssessmentHandler) ListTriageLevels(c *fiber.Ctx) error {
	return response.OK(c, "ok", domain.DefaultTriageLevels())
}

func (h *AssessmentHandler) ListTemplates(c *fiber.Ctx) error {
	data, err := h.svc.ListTemplates()
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.OK(c, "ok", data)
}

func (h *AssessmentHandler) GetTemplateByID(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil || id == 0 {
		return response.Error(c, fiber.StatusBadRequest, "invalid id")
	}
	tpl, err := h.svc.GetTemplateByID(uint(id))
	if err != nil {
		if err == repository.ErrNotFound {
			return response.Error(c, fiber.StatusNotFound, "template not found")
		}
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.OK(c, "ok", tpl)
}

func (h *AssessmentHandler) CreateTemplate(c *fiber.Ctx) error {
	var req domain.AssessmentTemplate
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	created, err := h.svc.CreateTemplate(req)
	if err != nil {
		if err == repository.ErrDuplicate {
			return response.Error(c, fiber.StatusConflict, "template code already exists")
		}
		if err == repository.ErrConflict {
			return response.Error(c, fiber.StatusBadRequest, "code and name are required")
		}
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.Created(c, "created", created)
}

func (h *AssessmentHandler) UpdateTemplate(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil || id == 0 {
		return response.Error(c, fiber.StatusBadRequest, "invalid id")
	}
	var req domain.AssessmentTemplate
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	req.ID = uint(id)
	updated, err := h.svc.UpdateTemplate(req)
	if err != nil {
		if err == repository.ErrNotFound {
			return response.Error(c, fiber.StatusNotFound, "template not found")
		}
		if err == repository.ErrDuplicate {
			return response.Error(c, fiber.StatusConflict, "template code already exists")
		}
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.OK(c, "updated", updated)
}

func (h *AssessmentHandler) DeleteTemplate(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil || id == 0 {
		return response.Error(c, fiber.StatusBadRequest, "invalid id")
	}
	if err := h.svc.DeleteTemplate(uint(id)); err != nil {
		if err == repository.ErrNotFound {
			return response.Error(c, fiber.StatusNotFound, "template not found")
		}
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.OK(c, "deleted", nil)
}

func (h *AssessmentHandler) ListBindings(c *fiber.Ctx) error {
	data, err := h.svc.ListBindings()
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.OK(c, "ok", data)
}

func (h *AssessmentHandler) UpsertBinding(c *fiber.Ctx) error {
	var req domain.AssessmentBinding
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	if strings.TrimSpace(req.TemplateCode) == "" {
		return response.Error(c, fiber.StatusBadRequest, "template_code is required")
	}
	saved, err := h.svc.UpsertBinding(req)
	if err != nil {
		if err == repository.ErrConflict {
			return response.Error(c, fiber.StatusBadRequest, "template_code is required")
		}
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.OK(c, "saved", saved)
}

func (h *AssessmentHandler) DeleteBinding(c *fiber.Ctx) error {
	typeID, err := strconv.ParseUint(c.Params("typeId"), 10, 64)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid type id")
	}
	if err := h.svc.DeleteBinding(uint(typeID)); err != nil {
		if err == repository.ErrNotFound {
			return response.Error(c, fiber.StatusNotFound, "binding not found")
		}
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.OK(c, "deleted", nil)
}

func (h *AssessmentHandler) ListJenisBindings(c *fiber.Ctx) error {
	data, err := h.svc.ListJenisBindings()
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.OK(c, "ok", data)
}

func (h *AssessmentHandler) UpsertJenisBinding(c *fiber.Ctx) error {
	var req domain.AssessmentJenisBinding
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	if strings.TrimSpace(req.TemplateCode) == "" || strings.TrimSpace(req.JenisPelayanan) == "" {
		return response.Error(c, fiber.StatusBadRequest, "jenis_pelayanan and template_code are required")
	}
	saved, err := h.svc.UpsertJenisBinding(req)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.OK(c, "saved", saved)
}

func (h *AssessmentHandler) DeleteJenisBinding(c *fiber.Ctx) error {
	jenis := strings.TrimSpace(c.Params("jenis"))
	if jenis == "" {
		return response.Error(c, fiber.StatusBadRequest, "invalid jenis pelayanan")
	}
	if err := h.svc.DeleteJenisBinding(jenis); err != nil {
		if err == repository.ErrNotFound {
			return response.Error(c, fiber.StatusNotFound, "binding not found")
		}
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.OK(c, "deleted", nil)
}
