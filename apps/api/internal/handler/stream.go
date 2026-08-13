package handler

import (
	"bufio"
	"encoding/json"
	"fmt"
	"time"

	"github.com/butuhbantuan/api/pkg/hub"
	"github.com/gofiber/fiber/v2"
	"github.com/valyala/fasthttp"
)

type StreamHandler struct {
	hub *hub.Hub
}

func NewStreamHandler(h *hub.Hub) *StreamHandler {
	return &StreamHandler{hub: h}
}

// Stream opens a persistent SSE connection for a unit. It streams real-time
// events (new_order) and sends a heartbeat every 25 s to keep proxies alive.
func (h *StreamHandler) Stream(c *fiber.Ctx) error {
	uuid := c.Locals("emergency_uuid").(string)
	return h.stream(c, uuid)
}

// AdminStream opens SSE for admin ops (broadcast channel).
func (h *StreamHandler) AdminStream(c *fiber.Ctx) error {
	return h.stream(c, hub.AdminChannel)
}

func (h *StreamHandler) stream(c *fiber.Ctx, channel string) error {
	events, unsub := h.hub.Subscribe(channel)

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
