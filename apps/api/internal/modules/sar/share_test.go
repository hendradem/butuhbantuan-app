package sar

import (
	"errors"
	"testing"
	"time"
)

func TestEnableShareAndPublicBundle(t *testing.T) {
	s := NewMemoryStore()
	s.SetEnabled(true)
	_, bundle, err := s.Onboard(OnboardInput{UseDemo: true})
	if err != nil {
		t.Fatal(err)
	}
	id := bundle.Mission.ID

	info, err := s.EnableShare(id, 2*time.Hour)
	if err != nil {
		t.Fatal(err)
	}
	if info.ShareToken == "" || !info.Active {
		t.Fatalf("share info=%+v", info)
	}

	pub, err := s.GetPublicBundle(info.ShareToken, "")
	if err != nil {
		t.Fatal(err)
	}
	if !pub.ViewOnly || pub.Mission.Name == "" {
		t.Fatalf("public=%+v", pub)
	}
	if len(pub.Members) == 0 {
		t.Fatal("expected members")
	}
	// Names must not appear in public JSON shape — PublicMember has Callsign only.
	if pub.Members[0].Callsign == "" {
		t.Fatal("callsign required")
	}

	if _, err := s.DisableShare(id); err != nil {
		t.Fatal(err)
	}
	if _, err := s.GetPublicBundle(info.ShareToken, ""); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected not found after disable, got %v", err)
	}
}

func TestArchiveIsReadOnly(t *testing.T) {
	s := NewMemoryStore()
	s.SetEnabled(true)
	_ = s.ListMissions() // seeds archives
	var archiveID string
	for _, m := range s.ListMissions() {
		if m.Kind == "archive" {
			archiveID = m.ID
			break
		}
	}
	if archiveID == "" {
		t.Fatal("expected archive mission")
	}
	_, err := s.ReportPosition(archiveID, ReportPositionInput{
		MemberID: "sind-m1", Lat: -7.3, Lng: 110.0,
	})
	if !errors.Is(err, ErrReadOnly) {
		t.Fatalf("expected read-only, got %v", err)
	}
}
