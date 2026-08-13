package domain

import (
	"encoding/json"
	"time"
)

type OrderTicket struct {
	ID             string     `json:"id"`
	TicketNumber   string     `json:"ticket_number"`
	EmergencyUUID  string     `json:"emergency_uuid"`
	UnitName       string     `json:"unit_name"`
	RequesterName  string     `json:"requester_name"`
	RequesterPhone string     `json:"requester_phone"`
	Location       string     `json:"location"`
	Condition      string     `json:"condition"`
	PhotoURL       string     `json:"photo_url,omitempty"`
	RequesterLat   float64    `json:"requester_lat"`
	RequesterLng   float64    `json:"requester_lng"`
	Status         string     `json:"status"`  // pending | accepted | in_progress | completed | cancelled
	Source         string     `json:"source"`  // call | sos | manual
	HandlerName    string     `json:"handler_name"`
	HandlingNotes  string     `json:"handling_notes"`
	// Dispatch metadata (SOS auto-dispatch). Zero values for legacy/call tickets.
	TypeID         uint       `json:"type_id,omitempty"`
	RegencyID      string     `json:"regency_id,omitempty"`
	ProvinceID     string     `json:"province_id,omitempty"`
	DispatchRound  int        `json:"dispatch_round,omitempty"`
	SlaDeadline    *time.Time `json:"sla_deadline,omitempty"`
	DispatchStatus string     `json:"dispatch_status,omitempty"` // searching | assigned | exhausted | escalated
	// Escalation (PSC hotline) — set when ops escalates an exhausted ticket.
	EscalationHotline string `json:"escalation_hotline,omitempty"`
	EscalationLabel   string `json:"escalation_label,omitempty"`
	// Live responder tracking (magic link). Token is never exposed on public ticket GET.
	TrackToken         string     `json:"track_token,omitempty"`
	TrackEnabledAt     *time.Time `json:"track_enabled_at,omitempty"`
	TrackExpiresAt     *time.Time `json:"track_expires_at,omitempty"`
	ResponderLat       float64    `json:"responder_lat,omitempty"`
	ResponderLng       float64    `json:"responder_lng,omitempty"`
	ResponderUpdatedAt *time.Time `json:"responder_updated_at,omitempty"`
	ArrivedAt          *time.Time `json:"arrived_at,omitempty"`
	// Enriched on read (not persisted) — contact/location of currently assigned unit.
	UnitPhone    string  `json:"unit_phone,omitempty"`
	UnitWhatsapp string  `json:"unit_whatsapp,omitempty"`
	UnitLat      float64 `json:"unit_lat,omitempty"`
	UnitLng      float64 `json:"unit_lng,omitempty"`
	ETAMinutes   int     `json:"eta_minutes,omitempty"`
	// CitizenPhase is derived on read for honest e-ticket status.
	CitizenPhase string     `json:"citizen_phase,omitempty"`
	AcceptedAt   *time.Time `json:"accepted_at,omitempty"`
	CompletedAt  *time.Time `json:"completed_at"`
	CreatedAt    time.Time  `json:"created_at"`
	// Incident report (ops) — shared between unit & admin dashboards.
	HasIncidentReport bool            `json:"has_incident_report"`
	IncidentReport    json.RawMessage `json:"incident_report,omitempty"`
	IncidentReportAt  *time.Time      `json:"incident_report_at,omitempty"`
	// History is enriched on read (not persisted on the ticket row).
	History []OrderEvent `json:"history,omitempty"`
}

type SOSAlert struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	Phone        string    `json:"phone"`
	Lat          float64   `json:"lat"`
	Lng          float64   `json:"lng"`
	Address      string    `json:"address"`
	Description  string    `json:"description"`
	PhotoURL     string    `json:"photo_url,omitempty"`
	TypeID       uint      `json:"type_id"`
	RegencyID    string    `json:"regency_id"`
	ProvinceID   string    `json:"province_id"`
	TicketNumber string    `json:"ticket_number"`
	// Reused is true when Submit redirected to an already-open ticket (duplicate SOS guard).
	Reused    bool      `json:"reused,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

type UnitCredential struct {
	EmergencyUUID string `json:"emergency_uuid"`
	UnitName      string `json:"unit_name"`
	Username      string `json:"username"`
	Password      string `json:"-"`
	AccessToken   string `json:"access_token"`
}
