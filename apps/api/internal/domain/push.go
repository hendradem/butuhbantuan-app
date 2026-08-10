package domain

// PushSubscription holds a Web Push subscription for a specific ticket.
type PushSubscription struct {
	ID           uint
	TicketNumber string
	Endpoint     string
	P256DH       string
	Auth         string
}
