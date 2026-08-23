package handler

import (
	"errors"
	"strconv"
	"strings"

	"github.com/butuhbantuan/api/internal/domain"
	"github.com/butuhbantuan/api/internal/repository"
	"github.com/butuhbantuan/api/internal/service"
	"github.com/butuhbantuan/api/pkg/response"
	"github.com/gofiber/fiber/v2"
)

type OrderHandler struct {
	svc          service.OrderUseCase
	emergencySvc service.EmergencyUseCase
	dispatch     service.DispatchUseCase
	wilayah      *service.WilayahResolver
}

func NewOrderHandler(svc service.OrderUseCase, emergencySvc service.EmergencyUseCase) *OrderHandler {
	return &OrderHandler{svc: svc, emergencySvc: emergencySvc}
}

func (h *OrderHandler) WithDispatch(d service.DispatchUseCase) *OrderHandler {
	h.dispatch = d
	return h
}

func (h *OrderHandler) WithWilayah(w *service.WilayahResolver) *OrderHandler {
	h.wilayah = w
	return h
}

func (h *OrderHandler) Create(c *fiber.Ctx) error {
	var body struct {
		EmergencyUUID  string  `json:"emergency_uuid"`
		UnitName       string  `json:"unit_name"`
		RequesterName  string  `json:"requester_name"`
		RequesterPhone string  `json:"requester_phone"`
		Location       string  `json:"location"`
		Condition      string  `json:"condition"`
		PhotoURL       string  `json:"photo_url"`
		RequesterLat   float64 `json:"requester_lat"`
		RequesterLng   float64 `json:"requester_lng"`
		TypeID         uint    `json:"type_id"`
		RegencyID      string  `json:"regency_id"`
		ProvinceID     string  `json:"province_id"`
		Source         string  `json:"source"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	if body.EmergencyUUID == "" || body.RequesterName == "" || body.RequesterPhone == "" {
		return response.Error(c, fiber.StatusBadRequest, "emergency_uuid, requester_name, and requester_phone are required")
	}

	source := body.Source
	if source == "" {
		source = "call"
	}
	// Public endpoint: only allow call (citizen) source.
	if source != "call" {
		source = "call"
	}

	order := domain.OrderTicket{
		EmergencyUUID:  body.EmergencyUUID,
		UnitName:       body.UnitName,
		RequesterName:  body.RequesterName,
		RequesterPhone: body.RequesterPhone,
		Location:       body.Location,
		Condition:      body.Condition,
		PhotoURL:       body.PhotoURL,
		RequesterLat:   body.RequesterLat,
		RequesterLng:   body.RequesterLng,
		TypeID:         body.TypeID,
		RegencyID:      body.RegencyID,
		ProvinceID:     body.ProvinceID,
		Source:         source,
		DispatchStatus: "assigned",
	}

	return h.createEnriched(c, order)
}

// CreateManual creates an ops-entered ticket (admin dashboard).
func (h *OrderHandler) CreateManual(c *fiber.Ctx) error {
	var body struct {
		EmergencyUUID  string  `json:"emergency_uuid"`
		UnitName       string  `json:"unit_name"`
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
		PhotoURL:       body.PhotoURL,
		RequesterLat:   body.RequesterLat,
		RequesterLng:   body.RequesterLng,
		Source:         "manual",
		DispatchStatus: "assigned",
	}
	return h.createEnriched(c, order)
}

func (h *OrderHandler) createEnriched(c *fiber.Ctx, order domain.OrderTicket) error {
	preferredUUID := order.EmergencyUUID

	// Enrich type/region from the chosen unit so later reassign/dispatch works
	// even when the client only sends emergency_uuid.
	if h.emergencySvc != nil {
		if units, err := h.emergencySvc.GetByIDs([]string{order.EmergencyUUID}); err == nil && len(units) > 0 {
			u := units[0]
			if order.UnitName == "" {
				order.UnitName = u.Name
			}
			if order.TypeID == 0 {
				order.TypeID = uint(u.EmergencyType.ID)
			}
			if order.RegencyID == "" {
				order.RegencyID = u.Address.RegencyID
			}
			if order.ProvinceID == "" {
				order.ProvinceID = u.Address.ProvinceID
			}
		}
	}
	// Prefer GPS → covered region over client-supplied / unit HQ when coords exist.
	if h.wilayah != nil {
		order.RegencyID, order.ProvinceID = h.wilayah.Resolve(
			order.RequesterLat, order.RequesterLng,
			order.EmergencyUUID,
			order.RegencyID, order.ProvinceID,
		)
	}

	// Citizen call/list: same distance-first cascade as SOS (with soft prefer for tap).
	if order.Source == "call" && h.dispatch != nil &&
		order.TypeID != 0 && order.RequesterLat != 0 && order.RequesterLng != 0 {
		result, err := h.dispatch.AssignIncident(service.IncidentAssignInput{
			Source:        "call",
			Name:          order.RequesterName,
			Phone:         order.RequesterPhone,
			Address:       order.Location,
			Description:   order.Condition,
			PhotoURL:      order.PhotoURL,
			Lat:           order.RequesterLat,
			Lng:           order.RequesterLng,
			TypeID:        order.TypeID,
			RegencyID:     order.RegencyID,
			ProvinceID:    order.ProvinceID,
			PreferredUUID: preferredUUID,
		})
		if err != nil {
			return response.Error(c, fiber.StatusInternalServerError, "failed to create order")
		}
		if result != nil && result.Ticket != nil {
			return response.OK(c, "order created", result.Ticket)
		}
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
	h.enrichUnitContact(order)
	order.CitizenPhase = domain.ResolveCitizenPhase(*order)

	// Public surface: citizen-safe DTO. Full phone only when claim matches (e-ticket owner).
	claim := strings.TrimSpace(c.Get("X-Requester-Phone"))
	if claim == "" {
		claim = strings.TrimSpace(c.Query("phone"))
	}
	verified := claim != "" && domain.PhoneMatches(order.RequesterPhone, claim)
	return response.OK(c, "success", domain.ToPublicTicket(*order, verified))
}

// GetTrackSession is public — field petugas opens /track/:token without login.
func (h *OrderHandler) GetTrackSession(c *fiber.Ctx) error {
	order, err := h.svc.GetByTrackToken(c.Params("token"))
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return response.Error(c, fiber.StatusNotFound, "track link not found")
		}
		if errors.Is(err, repository.ErrConflict) {
			return response.Error(c, fiber.StatusGone, "track link expired or order inactive")
		}
		return response.Error(c, fiber.StatusInternalServerError, "failed to load track session")
	}
	// Field track page needs enough context to contact & assess the scene.
	canShare := order.Status == "accepted" || order.Status == "in_progress"
	travelSec := 0
	if order.AcceptedAt != nil && order.ArrivedAt != nil {
		travelSec = int(order.ArrivedAt.Sub(*order.AcceptedAt).Seconds())
		if travelSec < 0 {
			travelSec = 0
		}
	}
	return response.OK(c, "success", fiber.Map{
		"ticket_number":        order.TicketNumber,
		"unit_name":            order.UnitName,
		"status":               order.Status,
		"can_share":            canShare,
		"requester_name":       order.RequesterName,
		"requester_phone":      order.RequesterPhone,
		"requester_lat":        order.RequesterLat,
		"requester_lng":        order.RequesterLng,
		"location":             order.Location,
		"condition":            order.Condition,
		"photo_url":            order.PhotoURL,
		"track_expires_at":     order.TrackExpiresAt,
		"responder_lat":        order.ResponderLat,
		"responder_lng":        order.ResponderLng,
		"responder_updated_at": order.ResponderUpdatedAt,
		"arrived_at":           order.ArrivedAt,
		"accepted_at":          order.AcceptedAt,
		"travel_sec":           travelSec,
	})
}

// PingTrackLocation receives GPS pings from the field magic-link page.
func (h *OrderHandler) PingTrackLocation(c *fiber.Ctx) error {
	var body struct {
		Lat float64 `json:"lat"`
		Lng float64 `json:"lng"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	order, err := h.svc.PingTrackLocation(c.Params("token"), body.Lat, body.Lng)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return response.Error(c, fiber.StatusNotFound, "track link not found")
		}
		if errors.Is(err, repository.ErrConflict) {
			return response.Error(c, fiber.StatusGone, "track link expired or invalid coordinates")
		}
		return response.Error(c, fiber.StatusInternalServerError, "failed to update location")
	}
	return response.OK(c, "location updated", fiber.Map{
		"responder_lat":        order.ResponderLat,
		"responder_lng":        order.ResponderLng,
		"responder_updated_at": order.ResponderUpdatedAt,
	})
}

// MarkArrived records on-scene time via the magic-link token (no dashboard login).
func (h *OrderHandler) MarkArrived(c *fiber.Ctx) error {
	order, err := h.svc.MarkArrivedByToken(c.Params("token"))
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return response.Error(c, fiber.StatusNotFound, "track link not found")
		}
		if errors.Is(err, repository.ErrConflict) {
			return response.Error(c, fiber.StatusConflict, "cannot mark arrived for this order")
		}
		return response.Error(c, fiber.StatusInternalServerError, "failed to mark arrived")
	}
	travelSec := 0
	if order.AcceptedAt != nil && order.ArrivedAt != nil {
		travelSec = int(order.ArrivedAt.Sub(*order.AcceptedAt).Seconds())
		if travelSec < 0 {
			travelSec = 0
		}
	}
	return response.OK(c, "arrived", fiber.Map{
		"arrived_at":  order.ArrivedAt,
		"accepted_at": order.AcceptedAt,
		"status":      order.Status,
		"travel_sec":  travelSec,
	})
}

// CompleteByToken marks the ticket completed from the field magic-link page.
func (h *OrderHandler) CompleteByToken(c *fiber.Ctx) error {
	var body struct {
		HandlerName string `json:"handler_name"`
		Notes       string `json:"notes"`
	}
	_ = c.BodyParser(&body)
	order, err := h.svc.CompleteByToken(c.Params("token"), body.HandlerName, body.Notes)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return response.Error(c, fiber.StatusNotFound, "track link not found")
		}
		if errors.Is(err, repository.ErrConflict) {
			return response.Error(c, fiber.StatusConflict, "cannot complete this order")
		}
		return response.Error(c, fiber.StatusInternalServerError, "failed to complete order")
	}
	return response.OK(c, "completed", fiber.Map{
		"status":        order.Status,
		"ticket_number": order.TicketNumber,
		"completed_at":  order.CompletedAt,
		"can_share":     false,
	})
}

func (h *OrderHandler) enrichUnitContact(order *domain.OrderTicket) {
	if order == nil || order.EmergencyUUID == "" || h.emergencySvc == nil {
		return
	}
	units, err := h.emergencySvc.GetByIDs([]string{order.EmergencyUUID})
	if err != nil || len(units) == 0 {
		return
	}
	u := units[0]
	order.UnitPhone = u.Contact.Phone
	order.UnitWhatsapp = u.Contact.Whatsapp
	if order.UnitWhatsapp == "" {
		order.UnitWhatsapp = u.Contact.Phone
	}
	lat, lng := parseCoordPair(u.Coordinates)
	order.UnitLat = lat
	order.UnitLng = lng
	fromLat, fromLng := lat, lng
	if order.ResponderLat != 0 || order.ResponderLng != 0 {
		fromLat, fromLng = order.ResponderLat, order.ResponderLng
	}
	if order.RequesterLat != 0 || order.RequesterLng != 0 {
		order.ETAMinutes = domain.EstimateETAMinutes(fromLat, fromLng, order.RequesterLat, order.RequesterLng, 40)
	}
}

func parseCoordPair(coords [2]string) (lat, lng float64) {
	fmtLng := coords[0]
	fmtLat := coords[1]
	var err error
	lng, err = strconv.ParseFloat(fmtLng, 64)
	if err != nil {
		lng = 0
	}
	lat, err = strconv.ParseFloat(fmtLat, 64)
	if err != nil {
		lat = 0
	}
	return lat, lng
}
