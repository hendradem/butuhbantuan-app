package handler

import (
	"errors"
	"log"

	"github.com/butuhbantuan/api/internal/domain"
	"github.com/butuhbantuan/api/internal/repository"
	"github.com/butuhbantuan/api/internal/service"
	"github.com/butuhbantuan/api/pkg/response"
	"github.com/gofiber/fiber/v2"
)

type UnitHandler struct {
	authSvc      service.UnitAuthUseCase
	orderSvc     service.OrderUseCase
	emergencySvc service.EmergencyUseCase
	feedbackSvc  service.FeedbackUseCase
}

func NewUnitHandler(authSvc service.UnitAuthUseCase, orderSvc service.OrderUseCase, emergencySvc service.EmergencyUseCase, feedbackSvc service.FeedbackUseCase) *UnitHandler {
	return &UnitHandler{authSvc: authSvc, orderSvc: orderSvc, emergencySvc: emergencySvc, feedbackSvc: feedbackSvc}
}

func (h *UnitHandler) SetCredentials(c *fiber.Ctx) error {
	uuid := c.Params("uuid")
	var body struct {
		UnitName string `json:"unit_name"`
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	if body.Username == "" || body.Password == "" {
		return response.Error(c, fiber.StatusBadRequest, "username and password are required")
	}
	if err := h.authSvc.SetCredentials(uuid, body.UnitName, body.Username, body.Password); err != nil {
		if errors.Is(err, repository.ErrNotSupported) {
			return response.NotImplemented(c)
		}
		if errors.Is(err, repository.ErrDuplicate) {
			return response.Error(c, fiber.StatusConflict, "username already taken")
		}
		log.Printf("SetCredentials error (uuid=%s): %v", uuid, err)
		return response.Error(c, fiber.StatusInternalServerError, "failed to set credentials: "+err.Error())
	}
	return response.OK(c, "credentials set", nil)
}

func (h *UnitHandler) Login(c *fiber.Ctx) error {
	var body struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	cred, err := h.authSvc.Login(body.Username, body.Password)
	if err != nil {
		return response.Error(c, fiber.StatusUnauthorized, "invalid credentials")
	}
	return response.OK(c, "login success", fiber.Map{
		"access_token":   cred.AccessToken,
		"emergency_uuid": cred.EmergencyUUID,
		"username":       cred.Username,
	})
}

func (h *UnitHandler) GetProfile(c *fiber.Ctx) error {
	emergencyUUID := c.Locals("emergency_uuid").(string)
	username := c.Locals("unit_username").(string)

	profile := fiber.Map{
		"emergency_uuid": emergencyUUID,
		"username":       username,
	}
	units, err := h.emergencySvc.GetByIDs([]string{emergencyUUID})
	if err == nil && len(units) > 0 {
		u := units[0]
		profile["unit_name"] = u.Name
		profile["emergency_type"] = u.EmergencyType.Name
		profile["address"] = u.Address
		profile["contact"] = u.Contact
		profile["operational"] = u.Operational
		profile["fleet"] = u.Fleet
	}
	return response.OK(c, "success", profile)
}

func (h *UnitHandler) GetAllOrders(c *fiber.Ctx) error {
	orders, err := h.orderSvc.GetAll()
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to get orders")
	}
	return response.OK(c, "success", orders)
}

func (h *UnitHandler) GetOrders(c *fiber.Ctx) error {
	emergencyUUID := c.Locals("emergency_uuid").(string)
	unitName, _ := c.Locals("unit_name").(string)

	// Credentials stored before unit_name was added will have an empty name.
	// Resolve it on-the-fly from the emergency entity so the OR query works.
	if unitName == "" {
		if units, err := h.emergencySvc.GetByIDs([]string{emergencyUUID}); err == nil && len(units) > 0 {
			unitName = units[0].Name
		}
	}

	orders, err := h.orderSvc.GetByUnit(emergencyUUID, unitName)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to get orders")
	}
	return response.OK(c, "success", orders)
}

func (h *UnitHandler) GetFeedback(c *fiber.Ctx) error {
	emergencyUUID := c.Locals("emergency_uuid").(string)
	data, err := h.feedbackSvc.GetByUnit(emergencyUUID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to get feedback")
	}
	return response.OK(c, "success", data)
}

func (h *UnitHandler) UpdateFleet(c *fiber.Ctx) error {
	emergencyUUID := c.Locals("emergency_uuid").(string)
	var body struct {
		Total     int `json:"total"`
		Available int `json:"available"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	if body.Available > body.Total {
		body.Available = body.Total
	}
	err := h.emergencySvc.UpdateFleet(emergencyUUID, domain.FleetStatus{
		Total:     body.Total,
		Available: body.Available,
	})
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return response.Error(c, fiber.StatusNotFound, "emergency not found")
		}
		if errors.Is(err, repository.ErrNotSupported) {
			return response.NotImplemented(c)
		}
		return response.Error(c, fiber.StatusInternalServerError, "failed to update fleet")
	}
	return response.OK(c, "fleet updated", fiber.Map{
		"total":     body.Total,
		"available": body.Available,
	})
}

func (h *UnitHandler) UpdateAvailability(c *fiber.Ctx) error {
	emergencyUUID := c.Locals("emergency_uuid").(string)
	var body struct {
		IsActive bool `json:"is_active"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	if err := h.emergencySvc.UpdateActive(emergencyUUID, body.IsActive); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return response.Error(c, fiber.StatusNotFound, "emergency not found")
		}
		if errors.Is(err, repository.ErrNotSupported) {
			return response.NotImplemented(c)
		}
		return response.Error(c, fiber.StatusInternalServerError, "failed to update availability")
	}
	return response.OK(c, "availability updated", fiber.Map{"is_active": body.IsActive})
}

func (h *UnitHandler) UpdateOrder(c *fiber.Ctx) error {
	id := c.Params("id")
	var body struct {
		Status        string `json:"status"`
		HandlerName   string `json:"handler_name"`
		HandlingNotes string `json:"handling_notes"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	if body.Status == "" {
		return response.Error(c, fiber.StatusBadRequest, "status is required")
	}
	result, err := h.orderSvc.UpdateStatus(id, body.Status, body.HandlerName, body.HandlingNotes)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to update order")
	}
	return response.OK(c, "order updated", result)
}
