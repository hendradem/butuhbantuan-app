package domain

import "time"

type OrderTicket struct {
	ID             string     `json:"id"`
	TicketNumber   string     `json:"ticket_number"`
	EmergencyUUID  string     `json:"emergency_uuid"`
	UnitName       string     `json:"unit_name"`
	RequesterName  string     `json:"requester_name"`
	RequesterPhone string     `json:"requester_phone"`
	Location       string     `json:"location"`
	Condition      string     `json:"condition"`
	RequesterLat   float64    `json:"requester_lat"`
	RequesterLng   float64    `json:"requester_lng"`
	Status         string     `json:"status"` // pending | accepted | in_progress | completed | cancelled
	HandlerName    string     `json:"handler_name"`
	HandlingNotes  string     `json:"handling_notes"`
	CompletedAt    *time.Time `json:"completed_at"`
	CreatedAt      time.Time  `json:"created_at"`
}

type UnitCredential struct {
	EmergencyUUID string `json:"emergency_uuid"`
	UnitName      string `json:"unit_name"`
	Username      string `json:"username"`
	Password      string `json:"-"`
	AccessToken   string `json:"access_token"`
}
