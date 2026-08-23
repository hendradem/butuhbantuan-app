package hub

import "sync"

// Event is broadcast to subscribed SSE clients.
type Event struct {
	Type    string `json:"type"`
	Payload any    `json:"payload"`
}

// Publisher is the narrow interface consumed by service layers.
type Publisher interface {
	Publish(uuid string, event Event)
	// PublishScoped notifies the assignee unit, wilayah dispatcher channels, and admin ops.
	PublishScoped(assigneeUUID, regencyID, provinceID string, event Event)
}

// Hub manages per-unit / per-wilayah SSE subscriptions.
type Hub struct {
	mu      sync.RWMutex
	clients map[string]map[int]chan Event
	seq     int
}

func New() *Hub {
	return &Hub{clients: make(map[string]map[int]chan Event)}
}

// AdminChannel receives fan-out ops events for admin SSE.
const AdminChannel = "__admin__"

// RegencyChannel returns the SSE channel key for kab/kota dispatchers.
func RegencyChannel(regencyID string) string {
	return "__regency__:" + regencyID
}

// ProvinceChannel returns the SSE channel key for province dispatchers.
func ProvinceChannel(provinceID string) string {
	return "__province__:" + provinceID
}

func isAdminOpsEvent(t string) bool {
	switch t {
	case "new_order", "order_arrived", "order_reassigned", "order_dispatch_exhausted", "order_updated", "responder_location":
		return true
	default:
		return false
	}
}

// Subscribe returns a receive-only channel and a cleanup func the caller must invoke on disconnect.
func (h *Hub) Subscribe(uuid string) (<-chan Event, func()) {
	h.mu.Lock()
	defer h.mu.Unlock()

	h.seq++
	id := h.seq
	ch := make(chan Event, 8)
	if h.clients[uuid] == nil {
		h.clients[uuid] = make(map[int]chan Event)
	}
	h.clients[uuid][id] = ch

	return ch, func() {
		h.mu.Lock()
		defer h.mu.Unlock()
		if m := h.clients[uuid]; m != nil {
			delete(m, id)
			close(ch)
		}
	}
}

// SubscribeMany fans multiple channels into one receive channel.
// Cleanup unsubscribes all. Duplicate deliveries are possible if the same
// event is published to more than one subscribed channel (client should be idempotent).
func (h *Hub) SubscribeMany(channels []string) (<-chan Event, func()) {
	if len(channels) == 0 {
		ch := make(chan Event)
		close(ch)
		return ch, func() {}
	}
	if len(channels) == 1 {
		return h.Subscribe(channels[0])
	}

	out := make(chan Event, 16)
	var unsubs []func()
	var wg sync.WaitGroup
	done := make(chan struct{})

	for _, c := range channels {
		ch, unsub := h.Subscribe(c)
		unsubs = append(unsubs, unsub)
		wg.Add(1)
		go func(in <-chan Event) {
			defer wg.Done()
			for {
				select {
				case <-done:
					return
				case ev, ok := <-in:
					if !ok {
						return
					}
					select {
					case out <- ev:
					case <-done:
						return
					default:
						// drop if consumer is slow
					}
				}
			}
		}(ch)
	}

	cleanup := func() {
		close(done)
		for _, u := range unsubs {
			u()
		}
		wg.Wait()
		close(out)
	}
	return out, cleanup
}

// Publish sends an event to all active subscribers for uuid. Never blocks.
// Ops-relevant events also fan out to the admin broadcast channel.
func (h *Hub) Publish(uuid string, event Event) {
	if uuid != "" {
		h.publishTo(uuid, event)
	}
	if uuid != AdminChannel && isAdminOpsEvent(event.Type) {
		h.publishTo(AdminChannel, event)
	}
}

// PublishScoped notifies assignee + wilayah dispatcher channels + admin.
func (h *Hub) PublishScoped(assigneeUUID, regencyID, provinceID string, event Event) {
	if assigneeUUID != "" {
		h.publishTo(assigneeUUID, event)
	}
	if regencyID != "" {
		h.publishTo(RegencyChannel(regencyID), event)
	}
	if provinceID != "" {
		h.publishTo(ProvinceChannel(provinceID), event)
	}
	if isAdminOpsEvent(event.Type) {
		h.publishTo(AdminChannel, event)
	}
}

func (h *Hub) publishTo(uuid string, event Event) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for _, ch := range h.clients[uuid] {
		select {
		case ch <- event:
		default:
		}
	}
}
