package handler

import (
	"github.com/butuhbantuan/api/internal/domain"
	"github.com/butuhbantuan/api/internal/service"
	"github.com/butuhbantuan/api/pkg/response"
	"github.com/gofiber/fiber/v2"
)

type PushHandler struct{ svc service.PushUseCase }

func NewPushHandler(svc service.PushUseCase) *PushHandler { return &PushHandler{svc: svc} }

func (h *PushHandler) VAPIDPublicKey(c *fiber.Ctx) error {
	return response.OK(c, "success", fiber.Map{"public_key": h.svc.VAPIDPublicKey()})
}

func (h *PushHandler) Subscribe(c *fiber.Ctx) error {
	var body struct {
		TicketNumber string `json:"ticket_number"`
		Endpoint     string `json:"endpoint"`
		P256DH       string `json:"p256dh"`
		Auth         string `json:"auth"`
	}
	if err := c.BodyParser(&body); err != nil || body.Endpoint == "" || body.TicketNumber == "" {
		return response.Error(c, fiber.StatusBadRequest, "invalid subscription payload")
	}
	if err := h.svc.Subscribe(domain.PushSubscription{
		TicketNumber: body.TicketNumber,
		Endpoint:     body.Endpoint,
		P256DH:       body.P256DH,
		Auth:         body.Auth,
	}); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to save subscription")
	}
	return response.OK(c, "subscribed", nil)
}

func (h *PushHandler) Unsubscribe(c *fiber.Ctx) error {
	var body struct {
		Endpoint string `json:"endpoint"`
	}
	if err := c.BodyParser(&body); err != nil || body.Endpoint == "" {
		return response.Error(c, fiber.StatusBadRequest, "endpoint required")
	}
	_ = h.svc.Unsubscribe(body.Endpoint)
	return response.OK(c, "unsubscribed", nil)
}
