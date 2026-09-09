package handler

import (
	"errors"
	"net/url"
	"strings"

	"github.com/butuhbantuan/api/internal/domain"
	"github.com/butuhbantuan/api/internal/repository"
	"github.com/butuhbantuan/api/internal/service"
	"github.com/butuhbantuan/api/pkg/response"
	"github.com/gofiber/fiber/v2"
)

type RegionHandler struct {
	svc service.RegionUseCase
}

func NewRegionHandler(svc service.RegionUseCase) *RegionHandler {
	return &RegionHandler{svc: svc}
}

func (h *RegionHandler) GetAvailableRegions(c *fiber.Ctx) error {
	data, err := h.svc.GetAllAvailableRegions()
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to get available regions")
	}
	return response.OK(c, "success", data)
}

func (h *RegionHandler) GetAvailableRegionsByName(c *fiber.Ctx) error {
	regionName, err := url.QueryUnescape(c.Params("regionName"))
	if err != nil || strings.TrimSpace(regionName) == "" {
		return response.Error(c, fiber.StatusBadRequest, "invalid or empty region name")
	}
	data, err := h.svc.GetAvailableRegionsByName(regionName)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to get available regions")
	}
	return c.JSON(fiber.Map{"data": data, "count": len(data)})
}

func (h *RegionHandler) CreateAvailableRegion(c *fiber.Ctx) error {
	var req domain.AvailableRegion
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	created, err := h.svc.CreateAvailableRegion(req)
	if err != nil {
		if errors.Is(err, repository.ErrNotSupported) {
			return response.NotImplemented(c)
		}
		return response.Error(c, fiber.StatusInternalServerError, "failed to create available region")
	}
	return response.Created(c, "success", created)
}

func (h *RegionHandler) UpdateAvailableRegion(c *fiber.Ctx) error {
	var req domain.AvailableRegion
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	req.ID = c.Params("id")
	updated, err := h.svc.UpdateAvailableRegion(req)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return response.Error(c, fiber.StatusNotFound, "region not found")
		}
		return response.Error(c, fiber.StatusInternalServerError, "failed to update available region")
	}
	return response.OK(c, "success", updated)
}

func (h *RegionHandler) DeleteAvailableRegion(c *fiber.Ctx) error {
	if err := h.svc.DeleteAvailableRegion(c.Params("id")); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return response.Error(c, fiber.StatusNotFound, "region not found")
		}
		return response.Error(c, fiber.StatusInternalServerError, "failed to delete available region")
	}
	return response.OK(c, "success", nil)
}

func (h *RegionHandler) GetProvinces(c *fiber.Ctx) error {
	var (
		data []domain.Province
		err  error
	)
	if isTruthy(c.Query("covered_only")) {
		data, err = h.svc.GetCoveredProvinces()
	} else {
		data, err = h.svc.GetProvinces()
	}
	if err != nil {
		if errors.Is(err, repository.ErrNotSupported) {
			return response.NotImplemented(c)
		}
		return response.Error(c, fiber.StatusInternalServerError, "failed to get provinces")
	}
	return response.OK(c, "success", data)
}

func (h *RegionHandler) GetRegenciesByProvince(c *fiber.Ctx) error {
	provinceID := c.Query("province_id")
	coveredOnly := isTruthy(c.Query("covered_only"))
	// covered_only may omit province_id to list all covered kab/kota
	if provinceID == "" && !coveredOnly {
		return response.Error(c, fiber.StatusBadRequest, "province_id is required")
	}
	var (
		data []domain.Regency
		err  error
	)
	if coveredOnly {
		data, err = h.svc.GetCoveredRegenciesByProvince(provinceID)
	} else {
		data, err = h.svc.GetRegenciesByProvince(provinceID)
	}
	if err != nil {
		if errors.Is(err, repository.ErrNotSupported) {
			return response.NotImplemented(c)
		}
		return response.Error(c, fiber.StatusInternalServerError, "failed to get regencies")
	}
	return response.OK(c, "success", data)
}

func (h *RegionHandler) SearchRegencies(c *fiber.Ctx) error {
	q := c.Query("q")
	if len(q) < 2 {
		return response.Error(c, fiber.StatusBadRequest, "query must be at least 2 characters")
	}
	data, err := h.svc.SearchRegencies(q)
	if err != nil {
		if errors.Is(err, repository.ErrNotSupported) {
			return response.NotImplemented(c)
		}
		return response.Error(c, fiber.StatusInternalServerError, "failed to search regencies")
	}
	return response.OK(c, "success", data)
}

func isTruthy(v string) bool {
	switch strings.ToLower(strings.TrimSpace(v)) {
	case "1", "true", "yes", "y":
		return true
	default:
		return false
	}
}
