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
}

// Hub manages per-unit SSE subscriptions.
type Hub struct {
	mu      sync.RWMutex
	clients map[string]map[int]chan Event
	seq     int
}

func New() *Hub {
	return &Hub{clients: make(map[string]map[int]chan Event)}
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

// Publish sends an event to all active subscribers for uuid. Never blocks.
func (h *Hub) Publish(uuid string, event Event) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for _, ch := range h.clients[uuid] {
		select {
		case ch <- event:
		default:
		}
	}
}
