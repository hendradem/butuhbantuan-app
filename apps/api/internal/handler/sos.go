package handler

import (
	"github.com/butuhbantuan/api/internal/domain"
	"github.com/butuhbantuan/api/internal/service"
	"github.com/butuhbantuan/api/pkg/response"
	"github.com/gofiber/fiber/v2"
)

type SOSHandler struct {
	sosSvc service.SOSUseCase
}

func NewSOSHandler(sosSvc service.SOSUseCase) *SOSHandler {
	return &SOSHandler{sosSvc: sosSvc}
}

func (h *SOSHandler) Submit(c *fiber.Ctx) error {
	var body struct {
		Name        string  `json:"name"`
		Phone       string  `json:"phone"`
		Lat         float64 `json:"lat"`
		Lng         float64 `json:"lng"`
		Address     string  `json:"address"`
		Description string  `json:"description"`
		PhotoURL    string  `json:"photo_url"`
		TypeID      uint    `json:"type_id"`
		RegencyID   string  `json:"regency_id"`
		ProvinceID  string  `json:"province_id"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	if body.Name == "" || body.Phone == "" {
		return response.Error(c, fiber.StatusBadRequest, "name and phone are required")
	}
	if body.TypeID == 0 {
		return response.Error(c, fiber.StatusBadRequest, "type_id is required so we can route to the correct emergency unit")
	}

	alert, err := h.sosSvc.Submit(domain.SOSAlert{
		Name:        body.Name,
		Phone:       body.Phone,
		Lat:         body.Lat,
		Lng:         body.Lng,
		Address:     body.Address,
		Description: body.Description,
		PhotoURL:    body.PhotoURL,
		TypeID:      body.TypeID,
		RegencyID:   body.RegencyID,
		ProvinceID:  body.ProvinceID,
	})
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to submit SOS alert")
	}
	if alert.Reused {
		return response.OK(c, "existing open ticket reused", alert)
	}
	return response.Created(c, "SOS alert submitted", alert)
}

func (h *SOSHandler) GetAll(c *fiber.Ctx) error {
	alerts, err := h.sosSvc.GetAll()
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to get SOS alerts")
	}
	return response.OK(c, "success", alerts)
}
