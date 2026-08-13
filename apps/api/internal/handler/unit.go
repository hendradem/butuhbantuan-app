package handler

import (
	"encoding/json"
	"errors"
	"log"
	"strings"

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
	dispatchSvc  service.DispatchUseCase
}

func NewUnitHandler(authSvc service.UnitAuthUseCase, orderSvc service.OrderUseCase, emergencySvc service.EmergencyUseCase, feedbackSvc service.FeedbackUseCase) *UnitHandler {
	return &UnitHandler{authSvc: authSvc, orderSvc: orderSvc, emergencySvc: emergencySvc, feedbackSvc: feedbackSvc}
}

func (h *UnitHandler) WithDispatch(dispatchSvc service.DispatchUseCase) *UnitHandler {
	h.dispatchSvc = dispatchSvc
	return h
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
		profile["coordinates"] = u.Coordinates
		profile["is_dispatcher"] = u.IsDispatcher
		profile["is_province_dispatcher"] = u.IsProvinceDispatcher
		profile["partner_tier"] = u.PartnerTier
		profile["regency_id"] = u.Address.RegencyID
		profile["province_id"] = u.Address.ProvinceID
		if scope, ok := domain.OpsScopeFromEmergency(u); ok {
			profile["ops_scope"] = scope
		}
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

// CreateOrder lets a unit create a manual e-ticket for an off-platform report.
func (h *UnitHandler) CreateOrder(c *fiber.Ctx) error {
	emergencyUUID := c.Locals("emergency_uuid").(string)
	unitName, _ := c.Locals("unit_name").(string)

	var body struct {
		RequesterName  string  `json:"requester_name"`
		RequesterPhone string  `json:"requester_phone"`
		Location       string  `json:"location"`
		Condition      string  `json:"condition"`
		PhotoURL       string  `json:"photo_url"`
		RequesterLat   float64 `json:"requester_lat"`
		RequesterLng   float64 `json:"requester_lng"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	if body.RequesterName == "" || body.RequesterPhone == "" {
		return response.Error(c, fiber.StatusBadRequest, "requester_name and requester_phone are required")
	}

	if unitName == "" {
		if units, err := h.emergencySvc.GetByIDs([]string{emergencyUUID}); err == nil && len(units) > 0 {
			unitName = units[0].Name
		}
	}

	order := domain.OrderTicket{
		EmergencyUUID:  emergencyUUID,
		UnitName:       unitName,
		RequesterName:  body.RequesterName,
		RequesterPhone: body.RequesterPhone,
		Location:       body.Location,
		Condition:      body.Condition,
		PhotoURL:       body.PhotoURL,
		RequesterLat:   body.RequesterLat,
		RequesterLng:   body.RequesterLng,
		Source:         "manual",
		DispatchStatus: "assigned",
	}

	if h.emergencySvc != nil {
		if units, err := h.emergencySvc.GetByIDs([]string{emergencyUUID}); err == nil && len(units) > 0 {
			u := units[0]
			if order.UnitName == "" {
				order.UnitName = u.Name
			}
			order.TypeID = uint(u.EmergencyType.ID)
			order.RegencyID = u.Address.RegencyID
			order.ProvinceID = u.Address.ProvinceID
		}
	}

	result, err := h.orderSvc.Create(order)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to create order")
	}
	return response.OK(c, "order created", result)
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
	emergencyUUID, _ := c.Locals("emergency_uuid").(string)
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

	existing, err := h.orderSvc.GetByID(id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return response.Error(c, fiber.StatusNotFound, "order not found")
		}
		return response.Error(c, fiber.StatusInternalServerError, "failed to get order")
	}
	if existing.EmergencyUUID != "" && emergencyUUID != "" && existing.EmergencyUUID != emergencyUUID {
		return response.Error(c, fiber.StatusForbidden, "order is assigned to another unit")
	}

	// Prefer reject→reassign path instead of cancelling the citizen ticket.
	if body.Status == "cancelled" && h.dispatchSvc != nil {
		result, err := h.dispatchSvc.Reject(id, emergencyUUID, false, domain.RejectReasonOther, "")
		if err == nil {
			return response.OK(c, "order rejected and reassigned", result)
		}
		if errors.Is(err, service.ErrDispatchForbidden) {
			return response.Error(c, fiber.StatusForbidden, "order is assigned to another unit")
		}
		if errors.Is(err, service.ErrDispatchConflict) {
			// Fall through to plain cancel for non-pending tickets.
		} else if !errors.Is(err, repository.ErrNotSupported) {
			log.Printf("UpdateOrder reject fallback failed: %v", err)
		}
	}

	result, err := h.orderSvc.UpdateStatus(id, body.Status, body.HandlerName, body.HandlingNotes)
	if err != nil {
		if errors.Is(err, repository.ErrConflict) {
			return response.Error(c, fiber.StatusConflict, "order was updated by another action")
		}
		if errors.Is(err, repository.ErrNotFound) {
			return response.Error(c, fiber.StatusNotFound, "order not found")
		}
		return response.Error(c, fiber.StatusInternalServerError, "failed to update order")
	}
	return response.OK(c, "order updated", result)
}

func (h *UnitHandler) GetOrderHistory(c *fiber.Ctx) error {
	id := c.Params("id")
	events, err := h.orderSvc.GetHistory(id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return response.Error(c, fiber.StatusNotFound, "order not found")
		}
		return response.Error(c, fiber.StatusInternalServerError, "failed to get history")
	}
	return response.OK(c, "success", events)
}

func (h *UnitHandler) EnableTrack(c *fiber.Ctx) error {
	return h.enableTrack(c, c.Locals("emergency_uuid").(string), false)
}

func (h *UnitHandler) DisableTrack(c *fiber.Ctx) error {
	return h.disableTrack(c, c.Locals("emergency_uuid").(string), false)
}

func (h *UnitHandler) MarkArrived(c *fiber.Ctx) error {
	return h.markArrived(c, c.Locals("emergency_uuid").(string), false)
}

func (h *UnitHandler) AdminMarkArrived(c *fiber.Ctx) error {
	return h.markArrived(c, "", true)
}

func (h *UnitHandler) SaveIncidentReport(c *fiber.Ctx) error {
	return h.saveIncidentReport(c, c.Locals("emergency_uuid").(string), false)
}

func (h *UnitHandler) AdminSaveIncidentReport(c *fiber.Ctx) error {
	return h.saveIncidentReport(c, "", true)
}

func (h *UnitHandler) markArrived(c *fiber.Ctx, actorUUID string, admin bool) error {
	id := c.Params("id")
	existing, err := h.orderSvc.GetByID(id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return response.Error(c, fiber.StatusNotFound, "order not found")
		}
		return response.Error(c, fiber.StatusInternalServerError, "failed to get order")
	}
	if !admin && existing.EmergencyUUID != "" && actorUUID != "" && existing.EmergencyUUID != actorUUID {
		if !h.unitMayAccessOrder(id, actorUUID) {
			return response.Error(c, fiber.StatusForbidden, "order is assigned to another unit")
		}
	}
	result, err := h.orderSvc.MarkArrived(id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return response.Error(c, fiber.StatusNotFound, "order not found")
		}
		if errors.Is(err, repository.ErrConflict) {
			return response.Error(c, fiber.StatusConflict, "cannot mark arrived for this order")
		}
		return response.Error(c, fiber.StatusInternalServerError, "failed to mark arrived")
	}
	return response.OK(c, "arrived", result)
}

func (h *UnitHandler) saveIncidentReport(c *fiber.Ctx, actorUUID string, admin bool) error {
	id := c.Params("id")
	var body struct {
		Report any `json:"report"`
	}
	if err := c.BodyParser(&body); err != nil || body.Report == nil {
		return response.Error(c, fiber.StatusBadRequest, "report payload required")
	}
	existing, err := h.orderSvc.GetByID(id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return response.Error(c, fiber.StatusNotFound, "order not found")
		}
		return response.Error(c, fiber.StatusInternalServerError, "failed to get order")
	}
	if !admin && existing.EmergencyUUID != "" && actorUUID != "" && existing.EmergencyUUID != actorUUID {
		if !h.unitMayAccessOrder(id, actorUUID) {
			return response.Error(c, fiber.StatusForbidden, "order is assigned to another unit")
		}
	}
	raw, err := json.Marshal(body.Report)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid report payload")
	}
	result, err := h.orderSvc.SaveIncidentReport(id, string(raw))
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return response.Error(c, fiber.StatusNotFound, "order not found")
		}
		if errors.Is(err, repository.ErrConflict) {
			return response.Error(c, fiber.StatusBadRequest, "invalid report JSON")
		}
		return response.Error(c, fiber.StatusInternalServerError, "failed to save report")
	}
	return response.OK(c, "report saved", result)
}

func (h *UnitHandler) AdminEnableTrack(c *fiber.Ctx) error {
	return h.enableTrack(c, "", true)
}

func (h *UnitHandler) AdminDisableTrack(c *fiber.Ctx) error {
	return h.disableTrack(c, "", true)
}

func (h *UnitHandler) enableTrack(c *fiber.Ctx, actorUUID string, admin bool) error {
	id := c.Params("id")
	existing, err := h.orderSvc.GetByID(id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return response.Error(c, fiber.StatusNotFound, "order not found")
		}
		return response.Error(c, fiber.StatusInternalServerError, "failed to get order")
	}
	if !admin && existing.EmergencyUUID != "" && actorUUID != "" && existing.EmergencyUUID != actorUUID {
		if !h.unitMayAccessOrder(id, actorUUID) {
			return response.Error(c, fiber.StatusForbidden, "order is assigned to another unit")
		}
	}
	actor := "unit"
	if admin {
		actor = "admin"
	}
	result, err := h.orderSvc.EnableTrack(id, actor)
	if err != nil {
		if errors.Is(err, repository.ErrConflict) {
			return response.Error(c, fiber.StatusConflict, "order must be accepted or in progress to share location")
		}
		if errors.Is(err, repository.ErrNotFound) {
			return response.Error(c, fiber.StatusNotFound, "order not found")
		}
		return response.Error(c, fiber.StatusInternalServerError, "failed to enable track link")
	}
	return response.OK(c, "track link enabled", result)
}

func (h *UnitHandler) disableTrack(c *fiber.Ctx, actorUUID string, admin bool) error {
	id := c.Params("id")
	existing, err := h.orderSvc.GetByID(id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return response.Error(c, fiber.StatusNotFound, "order not found")
		}
		return response.Error(c, fiber.StatusInternalServerError, "failed to get order")
	}
	if !admin && existing.EmergencyUUID != "" && actorUUID != "" && existing.EmergencyUUID != actorUUID {
		if !h.unitMayAccessOrder(id, actorUUID) {
			return response.Error(c, fiber.StatusForbidden, "order is assigned to another unit")
		}
	}
	actor := "unit"
	if admin {
		actor = "admin"
	}
	result, err := h.orderSvc.DisableTrack(id, actor)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return response.Error(c, fiber.StatusNotFound, "order not found")
		}
		return response.Error(c, fiber.StatusInternalServerError, "failed to disable track link")
	}
	return response.OK(c, "track link disabled", result)
}

func (h *UnitHandler) AcceptOrder(c *fiber.Ctx) error {
	return h.dispatchAccept(c, c.Locals("emergency_uuid").(string), false)
}

func (h *UnitHandler) RejectOrder(c *fiber.Ctx) error {
	return h.dispatchReject(c, c.Locals("emergency_uuid").(string), false)
}

func (h *UnitHandler) ReassignOrder(c *fiber.Ctx) error {
	return h.dispatchReassign(c, c.Locals("emergency_uuid").(string), false)
}

func (h *UnitHandler) ListOrderCandidates(c *fiber.Ctx) error {
	actorUUID := c.Locals("emergency_uuid").(string)
	if h.dispatchSvc != nil {
		if err := h.dispatchSvc.AuthorizeOrder(c.Params("id"), actorUUID, false); err != nil {
			if errors.Is(err, repository.ErrNotFound) {
				return response.Error(c, fiber.StatusNotFound, "order not found")
			}
			if errors.Is(err, service.ErrDispatchForbidden) {
				return response.Error(c, fiber.StatusForbidden, "not allowed to act on this order")
			}
			return response.Error(c, fiber.StatusInternalServerError, "failed to authorize")
		}
	}
	return h.dispatchCandidates(c)
}

func (h *UnitHandler) AdminAcceptOrder(c *fiber.Ctx) error {
	return h.dispatchAccept(c, "", true)
}

func (h *UnitHandler) AdminRejectOrder(c *fiber.Ctx) error {
	return h.dispatchReject(c, "", true)
}

func (h *UnitHandler) AdminReassignOrder(c *fiber.Ctx) error {
	return h.dispatchReassign(c, "", true)
}

func (h *UnitHandler) AdminEscalateOrder(c *fiber.Ctx) error {
	if h.dispatchSvc == nil {
		return response.NotImplemented(c)
	}
	id := c.Params("id")
	result, err := h.dispatchSvc.EscalateToPSC(id, "", true)
	return h.mapDispatchErr(c, result, err, "order escalated to PSC")
}

// AdminCancelOrder closes a ticket as cancelled (supervisi). Unlike unit "cancel" on
// pending offers (which reassigns), this ends the citizen ticket.
func (h *UnitHandler) AdminCancelOrder(c *fiber.Ctx) error {
	id := c.Params("id")
	existing, err := h.orderSvc.GetByID(id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return response.Error(c, fiber.StatusNotFound, "order not found")
		}
		return response.Error(c, fiber.StatusInternalServerError, "failed to get order")
	}
	if existing.Status == "completed" || existing.Status == "cancelled" {
		return response.Error(c, fiber.StatusConflict, "order already closed")
	}
	var body struct {
		Note string `json:"note"`
	}
	_ = c.BodyParser(&body)
	result, err := h.orderSvc.UpdateStatus(id, "cancelled", "", body.Note)
	if err != nil {
		if errors.Is(err, repository.ErrConflict) {
			return response.Error(c, fiber.StatusConflict, "order was updated by another action")
		}
		if errors.Is(err, repository.ErrNotFound) {
			return response.Error(c, fiber.StatusNotFound, "order not found")
		}
		return response.Error(c, fiber.StatusInternalServerError, "failed to cancel order")
	}
	return response.OK(c, "order cancelled", result)
}

func (h *UnitHandler) AdminListOrderCandidates(c *fiber.Ctx) error {
	return h.dispatchCandidates(c)
}

func (h *UnitHandler) dispatchAccept(c *fiber.Ctx, actorUUID string, admin bool) error {
	if h.dispatchSvc == nil {
		return response.NotImplemented(c)
	}
	id := c.Params("id")
	result, err := h.dispatchSvc.Accept(id, actorUUID, admin)
	return h.mapDispatchErr(c, result, err, "order accepted")
}

func (h *UnitHandler) dispatchReject(c *fiber.Ctx, actorUUID string, admin bool) error {
	if h.dispatchSvc == nil {
		return response.NotImplemented(c)
	}
	id := c.Params("id")
	var body struct {
		Reason string `json:"reason"`
		Note   string `json:"note"`
	}
	_ = c.BodyParser(&body)
	result, err := h.dispatchSvc.Reject(id, actorUUID, admin, body.Reason, body.Note)
	return h.mapDispatchErr(c, result, err, "order rejected")
}

func (h *UnitHandler) dispatchReassign(c *fiber.Ctx, actorUUID string, admin bool) error {
	if h.dispatchSvc == nil {
		return response.NotImplemented(c)
	}
	id := c.Params("id")
	var body struct {
		Mode          string `json:"mode"` // auto | manual (default manual when emergency_uuid set)
		EmergencyUUID string `json:"emergency_uuid"`
	}
	_ = c.BodyParser(&body)

	mode := strings.ToLower(strings.TrimSpace(body.Mode))
	if mode == "" {
		if body.EmergencyUUID == "" {
			mode = "auto"
		} else {
			mode = "manual"
		}
	}

	var (
		result *domain.OrderTicket
		err    error
	)
	switch mode {
	case "auto":
		result, err = h.dispatchSvc.ReassignBest(id, actorUUID, admin)
	case "manual":
		if body.EmergencyUUID == "" {
			return response.Error(c, fiber.StatusBadRequest, "emergency_uuid is required for manual reassign")
		}
		result, err = h.dispatchSvc.ReassignTo(id, body.EmergencyUUID, actorUUID, admin)
	default:
		return response.Error(c, fiber.StatusBadRequest, "mode must be auto or manual")
	}
	return h.mapDispatchErr(c, result, err, "order reassigned")
}

func (h *UnitHandler) dispatchCandidates(c *fiber.Ctx) error {
	if h.dispatchSvc == nil {
		return response.NotImplemented(c)
	}
	id := c.Params("id")
	list, err := h.dispatchSvc.ListCandidates(id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return response.Error(c, fiber.StatusNotFound, "order not found")
		}
		if errors.Is(err, repository.ErrNotSupported) {
			return response.NotImplemented(c)
		}
		return response.Error(c, fiber.StatusInternalServerError, "failed to list candidates")
	}
	return response.OK(c, "success", list)
}

func (h *UnitHandler) mapDispatchErr(c *fiber.Ctx, result *domain.OrderTicket, err error, okMsg string) error {
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return response.Error(c, fiber.StatusNotFound, "order not found")
		}
		if errors.Is(err, service.ErrDispatchForbidden) {
			return response.Error(c, fiber.StatusForbidden, "not allowed to act on this order")
		}
		if errors.Is(err, service.ErrDispatchConflict) {
			return response.Error(c, fiber.StatusConflict, "order cannot be updated in its current state")
		}
		if errors.Is(err, repository.ErrConflict) {
			return response.Error(c, fiber.StatusConflict, "order was updated by another action")
		}
		if errors.Is(err, repository.ErrNotSupported) {
			return response.NotImplemented(c)
		}
		log.Printf("dispatch action error: %v", err)
		return response.Error(c, fiber.StatusInternalServerError, "failed to process order action")
	}
	return response.OK(c, okMsg, result)
}
