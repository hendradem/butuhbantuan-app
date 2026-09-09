package domain

import (
	"testing"
	"time"
)

// Locks the status matrix the unit dashboard / dispatch layer rely on.
// (Repo UpdateStatus + dispatch ReassignTo/ReassignBest share this contract.)

func TestUnitOrderStatusTransitions_matrix(t *testing.T) {
	canStart := map[string]bool{"accepted": true, "in_progress": true}
	canComplete := map[string]bool{"accepted": true, "in_progress": true}
	canReassign := map[string]bool{"pending": true, "accepted": true}
	canArrive := map[string]bool{"accepted": true, "in_progress": true}

	for _, st := range []string{"pending", "accepted", "in_progress", "completed", "cancelled"} {
		if canStart[st] != (st == "accepted" || st == "in_progress") {
			t.Fatalf("in_progress guard mismatch for %s", st)
		}
		if canComplete[st] != (st == "accepted" || st == "in_progress") {
			t.Fatalf("completed guard mismatch for %s", st)
		}
		if canReassign[st] != (st == "pending" || st == "accepted") {
			t.Fatalf("reassign guard mismatch for %s", st)
		}
		if canArrive[st] != (st == "accepted" || st == "in_progress") {
			t.Fatalf("arrive guard mismatch for %s", st)
		}
	}
}

func TestResolveCitizenPhase_onSceneRequiresArrived(t *testing.T) {
	o := OrderTicket{Status: "in_progress"}
	if ResolveCitizenPhase(o) == CitizenPhaseOnScene {
		t.Fatal("in_progress without arrived_at must not be on_scene")
	}
	now := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	o.ArrivedAt = &now
	if got := ResolveCitizenPhase(o); got != CitizenPhaseOnScene {
		t.Fatalf("got %s want on_scene", got)
	}
}
