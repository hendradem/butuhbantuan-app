package handler

import (
	"bufio"
	"encoding/json"
	"fmt"
	"time"

	"github.com/butuhbantuan/api/internal/domain"
	"github.com/butuhbantuan/api/internal/service"
	"github.com/butuhbantuan/api/pkg/hub"
	"github.com/gofiber/fiber/v2"
	"github.com/valyala/fasthttp"
)

type StreamHandler struct {
	hub          *hub.Hub
	emergencySvc service.EmergencyUseCase
}

func NewStreamHandler(h *hub.Hub) *StreamHandler {
	return &StreamHandler{hub: h}
}

func (h *StreamHandler) WithEmergency(emergencySvc service.EmergencyUseCase) *StreamHandler {
	h.emergencySvc = emergencySvc
	return h
}

// Stream opens a persistent SSE connection for a unit. Dispatcher units also
// subscribe to their wilayah channel so ops dashboards get live updates.
func (h *StreamHandler) Stream(c *fiber.Ctx) error {
	uuid := c.Locals("emergency_uuid").(string)
	channels := []string{uuid}
	if h.emergencySvc != nil {
		if units, err := h.emergencySvc.GetByIDs([]string{uuid}); err == nil && len(units) > 0 {
			if scope, ok := domain.OpsScopeFromEmergency(units[0]); ok {
				if scope.ProvinceWide && scope.ProvinceID != "" {
					channels = append(channels, hub.ProvinceChannel(scope.ProvinceID))
				} else if scope.RegencyID != "" {
					channels = append(channels, hub.RegencyChannel(scope.RegencyID))
				}
			}
		}
	}
	return h.stream(c, channels...)
}

// AdminStream opens SSE for admin ops (broadcast channel).
func (h *StreamHandler) AdminStream(c *fiber.Ctx) error {
	return h.stream(c, hub.AdminChannel)
}

func (h *StreamHandler) stream(c *fiber.Ctx, channels ...string) error {
	events, unsub := h.hub.SubscribeMany(channels)

	c.Set("Content-Type", "text/event-stream")
	c.Set("Cache-Control", "no-cache")
	c.Set("Connection", "keep-alive")
	c.Set("X-Accel-Buffering", "no")

	c.Context().SetBodyStreamWriter(fasthttp.StreamWriter(func(w *bufio.Writer) {
		defer unsub()

		fmt.Fprintf(w, "event: connected\ndata: {}\n\n")
		if w.Flush() != nil {
			return
		}

		tick := time.NewTicker(25 * time.Second)
		defer tick.Stop()

		for {
			select {
			case ev, ok := <-events:
				if !ok {
					return
				}
				b, _ := json.Marshal(ev.Payload)
				fmt.Fprintf(w, "event: %s\ndata: %s\n\n", ev.Type, string(b))
				if w.Flush() != nil {
					return
				}
			case <-tick.C:
				fmt.Fprintf(w, ": ping\n\n")
				if w.Flush() != nil {
					return
				}
			}
		}
	}))

	return nil
}
