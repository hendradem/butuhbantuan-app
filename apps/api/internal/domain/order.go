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
	PhotoURL       string     `json:"photo_url,omitempty"`
	RequesterLat   float64    `json:"requester_lat"`
	RequesterLng   float64    `json:"requester_lng"`
	Status         string     `json:"status"`  // pending | accepted | in_progress | completed | cancelled
	Source         string     `json:"source"`  // call | sos
	HandlerName    string     `json:"handler_name"`
	HandlingNotes  string     `json:"handling_notes"`
	CompletedAt    *time.Time `json:"completed_at"`
	CreatedAt      time.Time  `json:"created_at"`
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
	CreatedAt    time.Time `json:"created_at"`
}

type UnitCredential struct {
	EmergencyUUID string `json:"emergency_uuid"`
	UnitName      string `json:"unit_name"`
	Username      string `json:"username"`
	Password      string `json:"-"`
	AccessToken   string `json:"access_token"`
}
