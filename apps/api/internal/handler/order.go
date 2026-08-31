package handler

import (
	"errors"
	"log"
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
	assessment   service.AssessmentUseCase
	waDispatch   *service.WaDispatchResolver
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

func (h *OrderHandler) WithAssessment(a service.AssessmentUseCase) *OrderHandler {
	h.assessment = a
	return h
}

func (h *OrderHandler) WithWaDispatch(w *service.WaDispatchResolver) *OrderHandler {
	h.waDispatch = w
	return h
}

func (h *OrderHandler) Create(c *fiber.Ctx) error {
	var body struct {
		EmergencyUUID  string                 `json:"emergency_uuid"`
		UnitName       string                 `json:"unit_name"`
		RequesterName  string                 `json:"requester_name"`
		RequesterPhone string                 `json:"requester_phone"`
		JenisPelayanan string                 `json:"jenis_pelayanan"`
		Location       string                 `json:"location"`
		Condition      string                 `json:"condition"`
		PhotoURL       string                 `json:"photo_url"`
		RequesterLat   float64                `json:"requester_lat"`
		RequesterLng   float64                `json:"requester_lng"`
		TypeID         uint                   `json:"type_id"`
		RegencyID      string                 `json:"regency_id"`
		ProvinceID     string                 `json:"province_id"`
		Source         string                 `json:"source"`
		Assessment     *domain.OrderAssessment `json:"assessment"`
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
		JenisPelayanan: body.JenisPelayanan,
		Location:       body.Location,
		Condition:      body.Condition,
		Assessment:     body.Assessment,
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
		EmergencyUUID  string                  `json:"emergency_uuid"`
		UnitName       string                  `json:"unit_name"`
		RequesterName  string                  `json:"requester_name"`
		RequesterPhone string                  `json:"requester_phone"`
		Location       string                  `json:"location"`
		Condition      string                  `json:"condition"`
		PhotoURL       string                  `json:"photo_url"`
		RequesterLat   float64                 `json:"requester_lat"`
		RequesterLng   float64                 `json:"requester_lng"`
		JenisPelayanan string                  `json:"jenis_pelayanan"`
		Assessment     *domain.OrderAssessment `json:"assessment"`
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
		JenisPelayanan: body.JenisPelayanan,
		Location:       body.Location,
		Condition:      body.Condition,
		Assessment:     body.Assessment,
		PhotoURL:       body.PhotoURL,
		RequesterLat:   body.RequesterLat,
		RequesterLng:   body.RequesterLng,
		Source:         "manual",
		DispatchStatus: "assigned",
	}
	return h.createEnriched(c, order)
}

func (h *OrderHandler) createEnriched(c *fiber.Ctx, order domain.OrderTicket) error {
	// Enrich type/region from the chosen unit so later reassign/dispatch works
	// even when the client only sends emergency_uuid.
	var unit *domain.Emergency
	if h.emergencySvc != nil {
		if units, err := h.emergencySvc.GetByIDs([]string{order.EmergencyUUID}); err == nil && len(units) > 0 {
			u := units[0]
			unit = &u
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
	if unit != nil {
		resolved, err := domain.ResolveJenisPelayanan(order.JenisPelayanan, *unit)
		if err != nil {
			return response.Error(c, fiber.StatusBadRequest, err.Error())
		}
		order.JenisPelayanan = resolved
	}
	// Prefer GPS → covered region over client-supplied / unit HQ when coords exist.
	if h.wilayah != nil {
		order.RegencyID, order.ProvinceID = h.wilayah.Resolve(
			order.RequesterLat, order.RequesterLng,
			order.EmergencyUUID,
			order.RegencyID, order.ProvinceID,
		)
	}

	// Structured initial assessment (master checklist) → acuity + condition summary.
	if order.Assessment != nil && h.assessment != nil {
		if tpl, err := h.assessment.GetTemplateForOrder(order.EmergencyUUID, order.JenisPelayanan); err == nil && tpl != nil {
			service.EnrichOrderAssessment(&order, tpl)
		}
	}

	// Citizen picked a specific unit from the list — assign directly to that unit.
	// Distance-first cascade (AssignIncident) is for SOS auto-dispatch only.
	result, err := h.svc.Create(order)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to create order")
	}
	ticket := maybeEnableWaDispatch(h.svc, h.emergencySvc, h.waDispatch, result)
	h.enrichUnitContact(ticket)
	return response.OK(c, "order created", ticket)
}

// maybeEnableWaDispatch mints /dispatch/{token} when the assigned unit has no dashboard access.
// Used by admin/public create and unit manual create so WA-only units get a magic link.
func maybeEnableWaDispatch(
	orderSvc service.OrderUseCase,
	emergencySvc service.EmergencyUseCase,
	wa *service.WaDispatchResolver,
	ticket *domain.OrderTicket,
) *domain.OrderTicket {
	if ticket == nil || ticket.EmergencyUUID == "" || orderSvc == nil || emergencySvc == nil {
		return ticket
	}
	units, err := emergencySvc.GetByIDs([]string{ticket.EmergencyUUID})
	if err != nil || len(units) == 0 {
		return ticket
	}
	usesWa := units[0].WaDispatch
	if wa != nil {
		usesWa = wa.UsesWaDispatch(units[0])
	} else {
		usesWa = units[0].UsesWaDispatch(false)
	}
	if !usesWa {
		return ticket
	}
	updated, err := orderSvc.EnableTrack(ticket.ID, "system")
	if err != nil {
		log.Printf("wa-dispatch: EnableTrack failed ticket=%s unit=%s: %v", ticket.TicketNumber, ticket.UnitName, err)
		return ticket
	}
	return updated
}

func (h *OrderHandler) GetByTicketNumber(c *fiber.Ctx) error {
	return response.Error(c, fiber.StatusNotFound, "gunakan link bagikan dari e-tiket")
}

func ticketClaimPhone(c *fiber.Ctx) string {
	claim := strings.TrimSpace(c.Get("X-Requester-Phone"))
	if claim == "" {
		claim = strings.TrimSpace(c.Query("phone"))
	}
	return claim
}

func (h *OrderHandler) respondPublicTicket(c *fiber.Ctx, order *domain.OrderTicket) error {
	h.enrichUnitContact(order)
	order.CitizenPhase = domain.ResolveCitizenPhase(*order)
	claim := ticketClaimPhone(c)
	verified := claim != "" && domain.PhoneMatches(order.RequesterPhone, claim)
	return response.OK(c, "success", domain.ToPublicTicket(*order, verified))
}

// GetByViewToken serves the citizen e-ticket via unguessable public_token.
func (h *OrderHandler) GetByViewToken(c *fiber.Ctx) error {
	order, err := h.svc.GetByPublicToken(c.Params("token"))
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, "order not found")
	}
	return h.respondPublicTicket(c, order)
}

// VerifyViewTokenPhone lets a viewer claim an e-ticket by confirming pelapor phone.
func (h *OrderHandler) VerifyViewTokenPhone(c *fiber.Ctx) error {
	var body struct {
		Phone string `json:"phone"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	claim := strings.TrimSpace(body.Phone)
	if claim == "" {
		return response.Error(c, fiber.StatusBadRequest, "phone is required")
	}

	order, err := h.svc.GetByPublicToken(c.Params("token"))
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, "order not found")
	}
	if !domain.PhoneMatches(order.RequesterPhone, claim) {
		return response.Error(c, fiber.StatusForbidden, "nomor HP tidak cocok dengan data pelapor")
	}
	h.enrichUnitContact(order)
	order.CitizenPhase = domain.ResolveCitizenPhase(*order)
	return response.OK(c, "phone verified", domain.ToPublicTicket(*order, true))
}

// VerifyTicketPhone is deprecated — use VerifyViewTokenPhone with the share link token.
func (h *OrderHandler) VerifyTicketPhone(c *fiber.Ctx) error {
	return response.Error(c, fiber.StatusNotFound, "gunakan link bagikan dari e-tiket")
}

// GetTrackSession is public — field petugas opens /track/:token without login.
func (h *OrderHandler) GetTrackSession(c *fiber.Ctx) error {
	token := strings.TrimSpace(c.Params("token"))
	order, err := h.svc.GetByTrackToken(token)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return response.Error(c, fiber.StatusNotFound, "track link not found")
		}
		if errors.Is(err, repository.ErrConflict) {
			// Pending WA-dispatch offer tokens are valid until trackOfferTTL but
			// GetByTrackToken only serves accepted/in_progress GPS sessions.
			if offer, oerr := h.svc.GetOfferByToken(token); oerr == nil && offer != nil && offer.Status == "pending" {
				return response.OK(c, "success", fiber.Map{
					"ticket_number":    offer.TicketNumber,
					"unit_name":        offer.UnitName,
					"status":           offer.Status,
					"is_offer":         true,
					"can_share":        false,
					"requester_name":   offer.RequesterName,
					"requester_phone":  offer.RequesterPhone,
					"requester_lat":    offer.RequesterLat,
					"requester_lng":    offer.RequesterLng,
					"location":         offer.Location,
					"condition":        offer.Condition,
					"photo_url":        offer.PhotoURL,
					"track_expires_at": offer.TrackExpiresAt,
					"arrived_at":       offer.ArrivedAt,
					"accepted_at":      offer.AcceptedAt,
				})
			}
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

// GetOfferSession returns order info for the WA dispatch respond page (no auth — token only).
// Unlike GetTrackSession, this also allows pending (unaccepted) orders so the unit can
// see the offer and tap Accept / Reject without opening the dashboard.
func (h *OrderHandler) GetOfferSession(c *fiber.Ctx) error {
	order, err := h.svc.GetOfferByToken(strings.TrimSpace(c.Params("token")))
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return response.Error(c, fiber.StatusNotFound, "link tidak ditemukan atau sudah tidak aktif")
		}
		return response.Error(c, fiber.StatusGone, "link sudah kedaluwarsa")
	}
	travelSec := 0
	if order.AcceptedAt != nil && order.ArrivedAt != nil {
		travelSec = int(order.ArrivedAt.Sub(*order.AcceptedAt).Seconds())
		if travelSec < 0 {
			travelSec = 0
		}
	}
	return response.OK(c, "offer session", fiber.Map{
		"ticket_number":    order.TicketNumber,
		"unit_name":        order.UnitName,
		"status":           order.Status,
		"dispatch_status":  order.DispatchStatus,
		"is_offer":         order.Status == "pending",
		"can_share":        order.Status == "accepted" || order.Status == "in_progress",
		"requester_name":   order.RequesterName,
		"requester_phone":  order.RequesterPhone,
		"location":         order.Location,
		"condition":        order.Condition,
		"photo_url":        order.PhotoURL,
		"requester_lat":    order.RequesterLat,
		"requester_lng":    order.RequesterLng,
		"arrived_at":       order.ArrivedAt,
		"accepted_at":      order.AcceptedAt,
		"travel_sec":       travelSec,
		"track_expires_at": order.TrackExpiresAt,
	})
}

// AcceptByToken accepts a dispatch offer via the WA magic-link page (no dashboard login).
func (h *OrderHandler) AcceptByToken(c *fiber.Ctx) error {
	offer, err := h.svc.GetOfferByToken(strings.TrimSpace(c.Params("token")))
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return response.Error(c, fiber.StatusNotFound, "link tidak ditemukan")
		}
		return response.Error(c, fiber.StatusGone, "link sudah tidak aktif")
	}
	if offer.Status != "pending" {
		return response.Error(c, fiber.StatusConflict, "pesanan sudah diproses sebelumnya")
	}
	if h.dispatch == nil {
		return response.Error(c, fiber.StatusServiceUnavailable, "dispatch service tidak aktif")
	}
	updated, err := h.dispatch.Accept(offer.ID, offer.EmergencyUUID, false)
	if err != nil {
		if errors.Is(err, repository.ErrConflict) {
			return response.Error(c, fiber.StatusConflict, "tidak dapat menerima pesanan ini")
		}
		return response.Error(c, fiber.StatusInternalServerError, "gagal menerima pesanan")
	}
	return response.OK(c, "diterima", fiber.Map{
		"status":        updated.Status,
		"ticket_number": updated.TicketNumber,
		"can_share":     true,
	})
}

// RejectByToken rejects a dispatch offer via the WA magic-link page.
func (h *OrderHandler) RejectByToken(c *fiber.Ctx) error {
	offer, err := h.svc.GetOfferByToken(strings.TrimSpace(c.Params("token")))
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return response.Error(c, fiber.StatusNotFound, "link tidak ditemukan")
		}
		return response.Error(c, fiber.StatusGone, "link sudah tidak aktif")
	}
	if offer.Status != "pending" {
		return response.Error(c, fiber.StatusConflict, "pesanan sudah diproses sebelumnya")
	}
	if h.dispatch == nil {
		return response.Error(c, fiber.StatusServiceUnavailable, "dispatch service tidak aktif")
	}
	var body struct {
		Reason string `json:"reason"`
		Note   string `json:"note"`
	}
	_ = c.BodyParser(&body)
	if body.Reason == "" {
		body.Reason = "tidak_tersedia"
	}
	_, err = h.dispatch.Reject(offer.ID, offer.EmergencyUUID, false, body.Reason, body.Note)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "gagal menolak pesanan")
	}
	return response.OK(c, "ditolak", nil)
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
	order.WaDispatch = u.WaDispatch
	if h.waDispatch != nil {
		order.WaDispatch = h.waDispatch.UsesWaDispatch(u)
	} else {
		order.WaDispatch = u.UsesWaDispatch(false)
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
