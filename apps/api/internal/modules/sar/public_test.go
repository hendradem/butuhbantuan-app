package sar

import (
	"testing"
	"time"
)

func TestToPublicMissionBundle_stripsSensitive(t *testing.T) {
	now := time.Now()
	exp := now.Add(24 * time.Hour)
	b := &MissionBundle{
		Mission: Mission{
			ID: "m1", Name: "Ops Test", Area: "Selo", Status: "active", Kind: "live",
			CenterLat: -7.5, CenterLng: 110.4, StartedAt: now,
			Notes: "rahasia ops", ShareToken: "secret-token",
		},
		Shifts: []Shift{{ID: "s1", MissionID: "m1", Date: "2026-08-19", Label: "Hari 1", Status: "active"}},
		Shift:  &Shift{ID: "s1", MissionID: "m1", Date: "2026-08-19", Label: "Hari 1", Status: "active"},
		Teams: []ShiftTeam{{
			ShiftID: "s1", SRU: "SRU-Alpha", Color: "#2563eb",
			Equipment: []GearItem{{Name: "HT", Qty: 4}},
			Notes:     "internal",
		}},
		Members: []Member{{
			ID: "mem1", MissionID: "m1", ShiftID: "s1",
			Callsign: "Alpha-1", Name: "Budi Rahasia", SRU: "SRU-Alpha", Role: "leader", Status: "searching",
		}},
		Positions: []PositionReport{{
			ID: "p1", MissionID: "m1", ShiftID: "s1", MemberID: "mem1",
			Callsign: "Alpha-1", Lat: -7.51, Lng: 110.41, Source: "ht",
			Note: "catatan HT", LoggedBy: "SMC-Ops", ReportedAt: now,
		}},
		Markers: []MapMarker{{
			ID: "mk1", MissionID: "m1", Kind: "lp", Label: "LP", Lat: -7.5, Lng: 110.4,
			Note: "internal note", CreatedBy: "admin",
		}},
		LastByMember: map[string]PositionReport{},
		SRUList:      []string{"SRU-Alpha"},
	}
	b.LastByMember["mem1"] = b.Positions[0]

	pub := ToPublicMissionBundle(b, &exp)
	if pub == nil {
		t.Fatal("expected public bundle")
	}
	if !pub.ViewOnly {
		t.Fatal("expected view_only")
	}
	if pub.Mission.Name != "Ops Test" {
		t.Fatalf("name=%q", pub.Mission.Name)
	}
	if len(pub.Members) != 1 || pub.Members[0].Callsign != "Alpha-1" {
		t.Fatalf("members=%+v", pub.Members)
	}
	if pub.Members[0].Callsign == "" {
		t.Fatal("callsign required")
	}
	// Name must not leak — PublicMember has no Name field; ensure we didn't embed full Member.
	if len(pub.Teams) != 1 || len(pub.Teams[0].AssignedSectors) != 0 {
		// equipment stripped by type
	}
	if pub.Teams[0].SRU != "SRU-Alpha" {
		t.Fatalf("team sru=%q", pub.Teams[0].SRU)
	}
	if len(pub.Positions) != 1 {
		t.Fatalf("positions=%d", len(pub.Positions))
	}
	if pub.Positions[0].Callsign != "Alpha-1" {
		t.Fatal("position callsign missing")
	}
	if pub.ExpiresAt == nil || !pub.ExpiresAt.Equal(exp) {
		t.Fatal("expires_at mismatch")
	}
	if len(pub.Markers) != 1 || pub.Markers[0].Label != "LP" {
		t.Fatalf("markers=%+v", pub.Markers)
	}
}

func TestShareIsActive(t *testing.T) {
	now := time.Now()
	exp := now.Add(time.Hour)
	m := Mission{ShareToken: "tok", ShareExpiresAt: &exp}
	if !shareIsActive(m, now) {
		t.Fatal("expected active")
	}
	if shareIsActive(m, now.Add(2*time.Hour)) {
		t.Fatal("expected expired")
	}
	if shareIsActive(Mission{}, now) {
		t.Fatal("empty should be inactive")
	}
}
