package domain

import (
	"testing"
	"time"
)

func TestResolveCitizenPhase(t *testing.T) {
	now := time.Now()
	cases := []struct {
		name string
		o    OrderTicket
		want string
	}{
		{"searching empty", OrderTicket{Status: "pending", DispatchStatus: "searching"}, CitizenPhaseSearching},
		{"waiting unit", OrderTicket{Status: "pending", DispatchStatus: "searching", UnitName: "PSC"}, CitizenPhaseWaitingUnit},
		{"reassigned", OrderTicket{Status: "pending", DispatchStatus: "searching", UnitName: "B", DispatchRound: 2}, CitizenPhaseReassigned},
		{"exhausted", OrderTicket{Status: "pending", DispatchStatus: "exhausted"}, CitizenPhaseExhausted},
		{"escalated", OrderTicket{Status: "pending", DispatchStatus: "escalated"}, CitizenPhaseEscalated},
		{"accepted", OrderTicket{Status: "accepted"}, CitizenPhaseAccepted},
		{"accepted + track enabled stays accepted (WA link before GPS)", OrderTicket{Status: "accepted", TrackEnabledAt: &now}, CitizenPhaseAccepted},
		{"pending + track enabled stays waiting (WA magic link)", OrderTicket{Status: "pending", DispatchStatus: "assigned", UnitName: "PSC", TrackEnabledAt: &now}, CitizenPhaseWaitingUnit},
		{"accepted + responder lat → OTW", OrderTicket{Status: "accepted", ResponderLat: -7.79}, CitizenPhaseInProgress},
		{"accepted + arrived → on scene", OrderTicket{Status: "accepted", ArrivedAt: &now}, CitizenPhaseOnScene},
		{"on scene", OrderTicket{Status: "in_progress", ArrivedAt: &now}, CitizenPhaseOnScene},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := ResolveCitizenPhase(tc.o)
			if got != tc.want {
				t.Fatalf("got %s want %s", got, tc.want)
			}
		})
	}
}

func TestNormalizePhone(t *testing.T) {
	if got := NormalizePhone("0812-3456-7890"); got != "6281234567890" {
		t.Fatalf("got %s", got)
	}
	if got := NormalizePhone("+62 812 3456"); got != "628123456" {
		t.Fatalf("got %s", got)
	}
}

func TestValidRejectReason(t *testing.T) {
	if !ValidRejectReason("busy") || ValidRejectReason("nope") {
		t.Fatal("reject reason validation failed")
	}
}
