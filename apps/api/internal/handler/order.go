package handler

import (
	"github.com/butuhbantuan/api/internal/domain"
	"github.com/butuhbantuan/api/internal/service"
	"github.com/butuhbantuan/api/pkg/response"
	"github.com/gofiber/fiber/v2"
)

type OrderHandler struct {
	svc service.OrderUseCase
}

func NewOrderHandler(svc service.OrderUseCase) *OrderHandler {
	return &OrderHandler{svc: svc}
}

func (h *OrderHandler) Create(c *fiber.Ctx) error {
	var body struct {
		EmergencyUUID  string  `json:"emergency_uuid"`
		UnitName       string  `json:"unit_name"`
		RequesterName  string  `json:"requester_name"`
		RequesterPhone string  `json:"requester_phone"`
		Location       string  `json:"location"`
		Condition      string  `json:"condition"`
		RequesterLat   float64 `json:"requester_lat"`
		RequesterLng   float64 `json:"requester_lng"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	if body.EmergencyUUID == "" || body.RequesterName == "" || body.RequesterPhone == "" {
		return response.Error(c, fiber.StatusBadRequest, "emergency_uuid, requester_name, and requester_phone are required")
	}

	order := domain.OrderTicket{
		EmergencyUUID:  body.EmergencyUUID,
		UnitName:       body.UnitName,
		RequesterName:  body.RequesterName,
		RequesterPhone: body.RequesterPhone,
		Location:       body.Location,
		Condition:      body.Condition,
		RequesterLat:   body.RequesterLat,
		RequesterLng:   body.RequesterLng,
	}
	result, err := h.svc.Create(order)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to create order")
	}
	return response.OK(c, "order created", result)
}

func (h *OrderHandler) GetByTicketNumber(c *fiber.Ctx) error {
	order, err := h.svc.GetByTicketNumber(c.Params("number"))
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, "order not found")
	}
	return response.OK(c, "success", order)
}
