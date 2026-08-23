package domain

import (
	"strings"
	"time"
)

// PublicTicket is the citizen-facing e-ticket payload.
// Omits ops internals (incident report, handler notes, track token, order UUID).
type PublicTicket struct {
	TicketNumber   string `json:"ticket_number"`
	// EmergencyUUID is required for citizen feedback + contact directory lookup.
	EmergencyUUID  string    `json:"emergency_uuid,omitempty"`
	UnitName       string    `json:"unit_name,omitempty"`
	RequesterName  string    `json:"requester_name,omitempty"`
	RequesterPhone string    `json:"requester_phone,omitempty"` // masked unless verified
	PhoneVerified  bool      `json:"phone_verified,omitempty"`
	Location       string    `json:"location,omitempty"`
	Condition      string    `json:"condition,omitempty"`
	PhotoURL       string    `json:"photo_url,omitempty"`
	RequesterLat   float64   `json:"requester_lat,omitempty"`
	RequesterLng   float64   `json:"requester_lng,omitempty"`
	Status         string    `json:"status"`
	Source         string    `json:"source,omitempty"`
	TypeID         uint      `json:"type_id,omitempty"`
	DispatchRound  int       `json:"dispatch_round,omitempty"`
	SlaDeadline    *time.Time `json:"sla_deadline,omitempty"`
	DispatchStatus string    `json:"dispatch_status,omitempty"`
	EscalationHotline string `json:"escalation_hotline,omitempty"`
	EscalationLabel   string `json:"escalation_label,omitempty"`
	UnitPhone      string    `json:"unit_phone,omitempty"`
	UnitWhatsapp   string    `json:"unit_whatsapp,omitempty"`
	UnitLat        float64   `json:"unit_lat,omitempty"`
	UnitLng        float64   `json:"unit_lng,omitempty"`
	ETAMinutes     int       `json:"eta_minutes,omitempty"`
	CitizenPhase   string    `json:"citizen_phase,omitempty"`
	ResponderLat   float64   `json:"responder_lat,omitempty"`
	ResponderLng   float64   `json:"responder_lng,omitempty"`
	ResponderUpdatedAt *time.Time `json:"responder_updated_at,omitempty"`
	TrackEnabledAt *time.Time `json:"track_enabled_at,omitempty"`
	ArrivedAt      *time.Time `json:"arrived_at,omitempty"`
	AcceptedAt     *time.Time `json:"accepted_at,omitempty"`
	CompletedAt    *time.Time `json:"completed_at,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
	History        []PublicOrderEvent `json:"history,omitempty"`
}

// PublicOrderEvent is a citizen-safe timeline entry (no actor/ops notes).
type PublicOrderEvent struct {
	Type      string    `json:"type"`
	Message   string    `json:"message,omitempty"`
	FromUnit  string    `json:"from_unit,omitempty"`
	ToUnit    string    `json:"to_unit,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

var citizenHistoryTypes = map[string]struct{}{
	OrderEventCreated:      {},
	OrderEventReassigned:   {},
	OrderEventAccepted:     {},
	OrderEventRejected:     {},
	OrderEventInProgress:   {},
	OrderEventCompleted:    {},
	OrderEventCancelled:    {},
	OrderEventExhausted:    {},
	OrderEventEscalatedPSC: {},
	OrderEventArrived:      {},
}

// PhoneMatches reports whether claim matches the stored phone (any common ID variant).
func PhoneMatches(stored, claim string) bool {
	claimNorm := NormalizePhone(claim)
	if claimNorm == "" {
		return false
	}
	for _, v := range PhoneVariants(stored) {
		if NormalizePhone(v) == claimNorm {
			return true
		}
	}
	return false
}

// MaskPhone hides the middle digits for public display (e.g. 0812****90).
func MaskPhone(phone string) string {
	digits := NormalizePhone(phone)
	if digits == "" {
		return ""
	}
	// Prefer 0-prefix display for ID mobiles.
	display := digits
	if strings.HasPrefix(digits, "62") && len(digits) > 2 {
		display = "0" + digits[2:]
	}
	runes := []rune(display)
	n := len(runes)
	if n <= 4 {
		return strings.Repeat("*", n)
	}
	if n <= 8 {
		return string(runes[:2]) + strings.Repeat("*", n-4) + string(runes[n-2:])
	}
	return string(runes[:4]) + "****" + string(runes[n-2:])
}

// ToPublicTicket builds a citizen-safe view. When phoneVerified, full phone is included.
func ToPublicTicket(o OrderTicket, phoneVerified bool) PublicTicket {
	phase := o.CitizenPhase
	if phase == "" {
		phase = ResolveCitizenPhase(o)
	}
	phone := MaskPhone(o.RequesterPhone)
	if phoneVerified {
		phone = o.RequesterPhone
	}
	pub := PublicTicket{
		TicketNumber:      o.TicketNumber,
		EmergencyUUID:     o.EmergencyUUID,
		UnitName:          o.UnitName,
		RequesterName:     o.RequesterName,
		RequesterPhone:    phone,
		PhoneVerified:     phoneVerified,
		Location:          o.Location,
		Condition:         o.Condition,
		PhotoURL:          o.PhotoURL,
		RequesterLat:      o.RequesterLat,
		RequesterLng:      o.RequesterLng,
		Status:            o.Status,
		Source:            o.Source,
		TypeID:            o.TypeID,
		DispatchRound:     o.DispatchRound,
		SlaDeadline:       o.SlaDeadline,
		DispatchStatus:    o.DispatchStatus,
		EscalationHotline: o.EscalationHotline,
		EscalationLabel:   o.EscalationLabel,
		UnitPhone:         o.UnitPhone,
		UnitWhatsapp:      o.UnitWhatsapp,
		UnitLat:           o.UnitLat,
		UnitLng:           o.UnitLng,
		ETAMinutes:        o.ETAMinutes,
		CitizenPhase:      phase,
		ResponderLat:      o.ResponderLat,
		ResponderLng:      o.ResponderLng,
		ResponderUpdatedAt: o.ResponderUpdatedAt,
		TrackEnabledAt:    o.TrackEnabledAt,
		ArrivedAt:         o.ArrivedAt,
		AcceptedAt:        o.AcceptedAt,
		CompletedAt:       o.CompletedAt,
		CreatedAt:         o.CreatedAt,
		History:           ToPublicHistory(o.History),
	}
	return pub
}

// ToPublicHistory keeps only citizen-meaningful events and strips actor/ops fields.
func ToPublicHistory(events []OrderEvent) []PublicOrderEvent {
	if len(events) == 0 {
		return nil
	}
	out := make([]PublicOrderEvent, 0, len(events))
	for _, ev := range events {
		if _, ok := citizenHistoryTypes[ev.Type]; !ok {
			continue
		}
		// Skip noisy offered/track events already filtered by type set.
		msg := CitizenHistoryMessage(ev)
		out = append(out, PublicOrderEvent{
			Type:      ev.Type,
			Message:   msg,
			FromUnit:  ev.FromUnit,
			ToUnit:    ev.ToUnit,
			CreatedAt: ev.CreatedAt,
		})
	}
	return out
}

// CitizenHistoryMessage returns a short citizen-safe label (no reject reasons / internal notes).
func CitizenHistoryMessage(ev OrderEvent) string {
	switch ev.Type {
	case OrderEventCreated:
		return "Laporan dibuat"
	case OrderEventReassigned:
		if ev.ToUnit != "" {
			return "Dialihkan ke " + ev.ToUnit
		}
		return "Dialihkan ke unit lain"
	case OrderEventAccepted:
		if ev.ToUnit != "" {
			return ev.ToUnit + " menerima"
		}
		return "Unit menerima"
	case OrderEventRejected:
		if ev.FromUnit != "" {
			return ev.FromUnit + " tidak dapat menangani — mencari unit lain"
		}
		return "Unit tidak dapat menangani — mencari unit lain"
	case OrderEventInProgress:
		return "Unit menuju lokasi"
	case OrderEventArrived:
		return "Petugas sudah sampai"
	case OrderEventCompleted:
		return "Selesai"
	case OrderEventCancelled:
		return "Dibatalkan"
	case OrderEventExhausted:
		return "Belum ada unit yang merespons"
	case OrderEventEscalatedPSC:
		return "Dieskalasi ke pusat darurat"
	default:
		return ""
	}
}
