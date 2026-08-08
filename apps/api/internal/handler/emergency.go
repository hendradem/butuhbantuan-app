package handler

import (
	"errors"

	"github.com/butuhbantuan/api/internal/domain"
	"github.com/butuhbantuan/api/internal/repository"
	"github.com/butuhbantuan/api/internal/service"
	"github.com/butuhbantuan/api/pkg/response"
	"github.com/gofiber/fiber/v2"
)

type EmergencyHandler struct {
	emergencySvc service.EmergencyUseCase
	typeSvc      service.EmergencyTypeUseCase
}

func NewEmergencyHandler(emergencySvc service.EmergencyUseCase, typeSvc service.EmergencyTypeUseCase) *EmergencyHandler {
	return &EmergencyHandler{emergencySvc: emergencySvc, typeSvc: typeSvc}
}

func (h *EmergencyHandler) GetAll(c *fiber.Ctx) error {
	data, err := h.emergencySvc.GetAll()
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to get emergency data")
	}
	return response.OK(c, "success", data)
}

func (h *EmergencyHandler) GetByProvince(c *fiber.Ctx) error {
	data, err := h.emergencySvc.GetByProvince(c.Params("provinceID"))
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to get emergencies")
	}
	return response.OK(c, "success", data)
}

func (h *EmergencyHandler) GetByRegency(c *fiber.Ctx) error {
	data, err := h.emergencySvc.GetByRegency(c.Params("regencyID"))
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to get emergencies")
	}
	return response.OK(c, "success", data)
}

func (h *EmergencyHandler) GetDispatchers(c *fiber.Ctx) error {
	data, err := h.emergencySvc.GetDispatchers(c.Params("regencyID"), c.Params("provinceID"))
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to get dispatcher emergencies")
	}
	return response.OK(c, "success", data)
}

func (h *EmergencyHandler) GetByType(c *fiber.Ctx) error {
	data, err := h.emergencySvc.GetByType(c.Params("emergencyTypeID"))
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to get emergencies")
	}
	return response.OK(c, "success", data)
}

func (h *EmergencyHandler) Create(c *fiber.Ctx) error {
	var req domain.Emergency
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	created, err := h.emergencySvc.Create(req)
	if err != nil {
		if errors.Is(err, repository.ErrNotSupported) {
			return response.NotImplemented(c)
		}
		return response.Error(c, fiber.StatusInternalServerError, "failed to create emergency")
	}
	return response.Created(c, "success", created)
}

func (h *EmergencyHandler) GetAllTypes(c *fiber.Ctx) error {
	data, err := h.typeSvc.GetAllTypes()
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to get emergency types")
	}
	return response.OK(c, "success", data)
}

func (h *EmergencyHandler) CreateType(c *fiber.Ctx) error {
	var req domain.EmergencyType
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	created, err := h.typeSvc.CreateType(req)
	if err != nil {
		if errors.Is(err, repository.ErrNotSupported) {
			return response.NotImplemented(c)
		}
		return response.Error(c, fiber.StatusInternalServerError, "failed to create emergency type")
	}
	return response.Created(c, "success", created)
}

func (h *EmergencyHandler) Update(c *fiber.Ctx) error {
	var req domain.Emergency
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	req.ID = c.Params("id")
	updated, err := h.emergencySvc.Update(req)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return response.Error(c, fiber.StatusNotFound, "emergency not found")
		}
		return response.Error(c, fiber.StatusInternalServerError, "failed to update emergency")
	}
	return response.OK(c, "success", updated)
}

func (h *EmergencyHandler) Delete(c *fiber.Ctx) error {
	if err := h.emergencySvc.Delete(c.Params("id")); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return response.Error(c, fiber.StatusNotFound, "emergency not found")
		}
		return response.Error(c, fiber.StatusInternalServerError, "failed to delete emergency")
	}
	return response.OK(c, "success", nil)
}

func (h *EmergencyHandler) UpdateType(c *fiber.Ctx) error {
	var req domain.EmergencyType
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	req.ID = mustParseUint(c.Params("id"))
	updated, err := h.typeSvc.UpdateType(req)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return response.Error(c, fiber.StatusNotFound, "type not found")
		}
		return response.Error(c, fiber.StatusInternalServerError, "failed to update emergency type")
	}
	return response.OK(c, "success", updated)
}

func (h *EmergencyHandler) DeleteType(c *fiber.Ctx) error {
	if err := h.typeSvc.DeleteType(c.Params("id")); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return response.Error(c, fiber.StatusNotFound, "type not found")
		}
		if errors.Is(err, repository.ErrNotSupported) {
			return response.NotImplemented(c)
		}
		return response.Error(c, fiber.StatusInternalServerError, "failed to delete emergency type")
	}
	return response.OK(c, "success", nil)
}

func mustParseUint(s string) uint {
	var n uint
	for _, c := range s {
		if c < '0' || c > '9' {
			return 0
		}
		n = n*10 + uint(c-'0')
	}
	return n
}
