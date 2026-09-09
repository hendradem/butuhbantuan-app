package handler

import (
	"errors"
	"strconv"

	"github.com/butuhbantuan/api/internal/service"
	"github.com/butuhbantuan/api/pkg/response"
	"github.com/gofiber/fiber/v2"
)

// PublicUnitHandler serves privacy-safe unit statistics for citizen share links.
type PublicUnitHandler struct {
	analytics service.AnalyticsUseCase
}

func NewPublicUnitHandler(analytics service.AnalyticsUseCase) *PublicUnitHandler {
	return &PublicUnitHandler{analytics: analytics}
}

// GetStats GET /api/v1/public/units/:uuid/stats?period=30
func (h *PublicUnitHandler) GetStats(c *fiber.Ctx) error {
	uuid := c.Params("uuid")
	period := 30
	if p := c.Query("period"); p != "" {
		if n, err := strconv.Atoi(p); err == nil {
			period = n
		}
	}
	// Allow only common windows
	switch period {
	case 7, 30, 90:
	default:
		period = 30
	}

	data, err := h.analytics.GetPublicUnitStats(uuid, period)
	if err != nil {
		if errors.Is(err, service.ErrPublicUnitNotFound) {
			return response.Error(c, fiber.StatusNotFound, "unit tidak ditemukan")
		}
		return response.Error(c, fiber.StatusInternalServerError, "gagal memuat statistik")
	}
	return response.OK(c, "success", data)
}
