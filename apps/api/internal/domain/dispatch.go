package domain

import "time"

// DispatchAttemptStatus values for a single unit offer.
const (
	DispatchAttemptOffered    = "offered"
	DispatchAttemptAccepted   = "accepted"
	DispatchAttemptRejected   = "rejected"
	DispatchAttemptTimedOut   = "timed_out"
	DispatchAttemptSuperseded = "superseded"
)

// DefaultDispatchSLA is used when config does not override.
const DefaultDispatchSLA = 90 * time.Second

// MaxDispatchRounds caps how many times a pending SOS ticket may be reassigned.
const MaxDispatchRounds = 5

// RankedCandidate is a scored emergency unit considered for assignment.
type RankedCandidate struct {
	Emergency  Emergency `json:"emergency"`
	Score      float64   `json:"score"` // lower is better
	DistanceKm float64   `json:"distance_km"`
	TypeMatch  bool      `json:"type_match"`
	FleetOK    bool      `json:"fleet_ok"`
	OpenNow    bool      `json:"open_now"`
	IsProvince bool      `json:"is_province"`
	Tier       string    `json:"dispatch_tier,omitempty"` // local | kab_dispatcher | province
}

// DispatchAttempt is an audit row for each unit that was offered a ticket.
type DispatchAttempt struct {
	ID            string     `json:"id"`
	OrderID       string     `json:"order_id"`
	TicketNumber  string     `json:"ticket_number"`
	EmergencyUUID string     `json:"emergency_uuid"`
	UnitName      string     `json:"unit_name"`
	Round         int        `json:"round"`
	Status        string     `json:"status"` // offered | accepted | rejected | timed_out | superseded
	DistanceKm    float64    `json:"distance_km"`
	Score         float64    `json:"score"`
	RejectReason  string     `json:"reject_reason,omitempty"`
	RejectNote    string     `json:"reject_note,omitempty"`
	OfferedAt     time.Time  `json:"offered_at"`
	ResolvedAt    *time.Time `json:"resolved_at,omitempty"`
}

// DispatchResult is returned after initial SOS assignment.
type DispatchResult struct {
	Ticket   *OrderTicket      `json:"ticket"`
	Attempt  *DispatchAttempt  `json:"attempt,omitempty"`
	Candidate *RankedCandidate `json:"candidate,omitempty"`
}
