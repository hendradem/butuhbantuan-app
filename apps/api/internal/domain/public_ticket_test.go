package domain

import "testing"

func TestMaskPhone(t *testing.T) {
	got := MaskPhone("081234567890")
	if got != "0812****90" {
		t.Fatalf("got %q", got)
	}
	got = MaskPhone("+62 812-3456-7890")
	if got != "0812****90" {
		t.Fatalf("intl got %q", got)
	}
	if MaskPhone("") != "" {
		t.Fatal("empty")
	}
}

func TestPhoneMatches(t *testing.T) {
	if !PhoneMatches("081234567890", "6281234567890") {
		t.Fatal("expected match")
	}
	if PhoneMatches("081234567890", "081299999999") {
		t.Fatal("expected mismatch")
	}
}

func TestToPublicTicket_masksAndStrips(t *testing.T) {
	o := OrderTicket{
		ID:             "uuid-secret",
		TicketNumber:   "BB-20260101-0001",
		EmergencyUUID:  "unit-1",
		RequesterPhone: "081234567890",
		RequesterName:  "Ade",
		HandlerName:    "Ops",
		HandlingNotes:  "internal",
		HasIncidentReport: true,
		IncidentReport: []byte(`{"secret":true}`),
		TrackToken:     "track-secret",
		Status:         "pending",
		History: []OrderEvent{
			{Type: OrderEventAccepted, Message: "internal reason", ToUnit: "PSC", Actor: "unit"},
			{Type: OrderEventTrackEnabled, Message: "track", Actor: "admin"},
		},
	}
	pub := ToPublicTicket(o, false)
	if pub.EmergencyUUID != "unit-1" {
		t.Fatalf("emergency_uuid %q", pub.EmergencyUUID)
	}
	if pub.RequesterPhone != "0812****90" {
		t.Fatalf("phone %q", pub.RequesterPhone)
	}
	if pub.PhoneVerified {
		t.Fatal("should not be verified")
	}
	if len(pub.History) != 1 || pub.History[0].Type != OrderEventAccepted {
		t.Fatalf("history %+v", pub.History)
	}
	if pub.History[0].Message != "PSC menerima" {
		t.Fatalf("msg %q", pub.History[0].Message)
	}

	full := ToPublicTicket(o, true)
	if full.RequesterPhone != "081234567890" || !full.PhoneVerified {
		t.Fatal("verified phone expected")
	}
}
