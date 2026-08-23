package sar

import "testing"

func TestUpsertAndRemoveTeam(t *testing.T) {
	s := NewMemoryStore()
	s.SetEnabled(true)
	_, bundle, err := s.Onboard(OnboardInput{UseDemo: true})
	if err != nil {
		t.Fatal(err)
	}
	id := bundle.Mission.ID

	team, mem, err := s.UpsertTeam(id, UpsertTeamInput{SRU: "Bravo", Callsign: "Bravo-1"})
	if err != nil {
		t.Fatal(err)
	}
	if team.SRU != "SRU-Bravo" || mem.Callsign != "Bravo-1" {
		t.Fatalf("team=%+v mem=%+v", team, mem)
	}

	b2, err := s.GetBundle(id, "")
	if err != nil {
		t.Fatal(err)
	}
	found := false
	for _, t := range b2.Teams {
		if t.SRU == "SRU-Bravo" {
			found = true
		}
	}
	if !found {
		t.Fatal("expected SRU-Bravo in teams")
	}

	track, err := s.EnableLiveTrack(id, EnableLiveTrackInput{SRU: "SRU-Bravo"})
	if err != nil || track.Token == "" {
		t.Fatalf("live track err=%v track=%+v", err, track)
	}

	if err := s.RemoveTeam(id, "SRU-Bravo", ""); err != nil {
		t.Fatal(err)
	}
	b3, _ := s.GetBundle(id, "")
	for _, tm := range b3.Teams {
		if tm.SRU == "SRU-Bravo" {
			t.Fatal("expected removed")
		}
	}
}
