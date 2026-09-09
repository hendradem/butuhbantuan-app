package handler

import (
	"github.com/butuhbantuan/api/internal/service"
	"github.com/butuhbantuan/api/pkg/response"
	"github.com/gofiber/fiber/v2"
)

type MapTilesHandler struct {
	svc service.MapTilesUseCase
}

func NewMapTilesHandler(svc service.MapTilesUseCase) *MapTilesHandler {
	return &MapTilesHandler{svc: svc}
}

func (h *MapTilesHandler) Status(c *fiber.Ctx) error {
	st, err := h.svc.Status()
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to get map tile usage")
	}
	return response.OK(c, "success", st)
}

func (h *MapTilesHandler) Report(c *fiber.Ctx) error {
	var body struct {
		Count int64 `json:"count"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	st, err := h.svc.Report(body.Count)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to report map tile usage")
	}
	return response.OK(c, "success", st)
}
