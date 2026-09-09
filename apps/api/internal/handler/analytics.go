package handler

import (
	"strconv"

	"github.com/butuhbantuan/api/internal/service"
	"github.com/butuhbantuan/api/pkg/response"
	"github.com/gofiber/fiber/v2"
)

type AnalyticsHandler struct {
	svc service.AnalyticsUseCase
}

func NewAnalyticsHandler(svc service.AnalyticsUseCase) *AnalyticsHandler {
	return &AnalyticsHandler{svc: svc}
}

func (h *AnalyticsHandler) Get(c *fiber.Ctx) error {
	period := 30
	if p := c.Query("period"); p != "" {
		if n, err := strconv.Atoi(p); err == nil {
			period = n
		}
	}
	data, err := h.svc.GetAnalytics(period)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to get analytics")
	}
	return response.OK(c, "success", data)
}

func (h *AnalyticsHandler) GetHeatmap(c *fiber.Ctx) error {
	period := 30
	if p := c.Query("period"); p != "" {
		if n, err := strconv.Atoi(p); err == nil {
			period = n
		}
	}
	data, err := h.svc.GetHeatmap(period)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to get heatmap")
	}
	return response.OK(c, "success", data)
}

// GetUnitScoreboard returns per-unit performance metrics for the given period.
// GET /api/v1/admin/analytics/unit-scoreboard?period=30
func (h *AnalyticsHandler) GetUnitScoreboard(c *fiber.Ctx) error {
	period := 30
	if p := c.Query("period"); p != "" {
		if n, err := strconv.Atoi(p); err == nil {
			period = n
		}
	}
	data, err := h.svc.GetUnitScoreboard(period)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to get unit scoreboard")
	}
	return response.OK(c, "success", fiber.Map{
		"period_days": period,
		"units":       data,
	})
}
