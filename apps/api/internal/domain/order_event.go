package domain

import "time"

// Order event types for the per-ticket timeline.
const (
	OrderEventCreated       = "created"
	OrderEventOffered       = "offered"
	OrderEventReassigned    = "reassigned"
	OrderEventAccepted      = "accepted"
	OrderEventRejected      = "rejected"
	OrderEventInProgress    = "in_progress"
	OrderEventCompleted     = "completed"
	OrderEventCancelled     = "cancelled"
	OrderEventExhausted     = "exhausted"
	OrderEventEscalatedPSC  = "escalated_psc"
	OrderEventTrackEnabled  = "track_enabled"
	OrderEventTrackDisabled = "track_disabled"
	OrderEventArrived       = "arrived"
)

// Dispatch cascade tiers recorded on offered/reassigned events.
const (
	DispatchTierLocal         = "local"
	DispatchTierNearby        = "nearby" // trusted PSC/verified within radius, other regency
	DispatchTierKabDispatcher = "kab_dispatcher"
	DispatchTierProvince      = "province"
)

// DispatchTierOf maps an emergency unit to its cascade tier.
func DispatchTierOf(e Emergency) string {
	if e.IsProvinceDispatcher {
		return DispatchTierProvince
	}
	if e.IsDispatcher {
		return DispatchTierKabDispatcher
	}
	return DispatchTierLocal
}

// OrderEvent is one timeline entry on an emergency order.
type OrderEvent struct {
	ID           string    `json:"id"`
	OrderID      string    `json:"order_id"`
	TicketNumber string    `json:"ticket_number"`
	Type         string    `json:"type"`
	Message      string    `json:"message"`
	Actor        string    `json:"actor,omitempty"` // system | admin | unit
	FromUnit     string    `json:"from_unit,omitempty"`
	ToUnit       string    `json:"to_unit,omitempty"`
	Tier         string    `json:"dispatch_tier,omitempty"` // local | nearby | kab_dispatcher | province
	CreatedAt    time.Time `json:"created_at"`
}
