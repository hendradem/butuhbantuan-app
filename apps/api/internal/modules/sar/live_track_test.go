package sar

import (
	"errors"
	"testing"
	"time"
)

func TestEnableLiveTrackAndPing(t *testing.T) {
	s := NewMemoryStore()
	s.SetEnabled(true)
	_, bundle, err := s.Onboard(OnboardInput{UseDemo: true})
	if err != nil {
		t.Fatal(err)
	}
	id := bundle.Mission.ID
	sru := bundle.Teams[0].SRU

	track, err := s.EnableLiveTrack(id, EnableLiveTrackInput{SRU: sru, TTLHours: 2})
	if err != nil {
		t.Fatal(err)
	}
	if track.Token == "" || !track.Active {
		t.Fatalf("track=%+v", track)
	}

	sess, err := s.GetLiveTrackSession(track.Token)
	if err != nil || !sess.CanShare {
		t.Fatalf("session=%+v err=%v", sess, err)
	}

	ping, err := s.PingLiveTrack(track.Token, PingLiveTrackInput{Lat: -7.58, Lng: 110.40})
	if err != nil {
		t.Fatal(err)
	}
	if ping.LastLat == 0 {
		t.Fatal("expected last lat")
	}

	b2, err := s.GetBundle(id, "")
	if err != nil {
		t.Fatal(err)
	}
	foundGPS := false
	for _, p := range b2.Positions {
		if p.Source == "gps" {
			foundGPS = true
			break
		}
	}
	if !foundGPS {
		t.Fatal("expected gps position in trail")
	}
	if len(b2.LiveTracks) == 0 {
		t.Fatal("expected live_tracks in bundle")
	}

	if err := s.DisableLiveTrack(id, sru); err != nil {
		t.Fatal(err)
	}
	if _, err := s.GetLiveTrackSession(track.Token); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected not found, got %v", err)
	}
}

func TestPingLiveTrackExpired(t *testing.T) {
	s := NewMemoryStore()
	s.SetEnabled(true)
	_, bundle, err := s.Onboard(OnboardInput{UseDemo: true})
	if err != nil {
		t.Fatal(err)
	}
	track, err := s.EnableLiveTrack(bundle.Mission.ID, EnableLiveTrackInput{
		SRU: bundle.Teams[0].SRU, TTLHours: 1,
	})
	if err != nil {
		t.Fatal(err)
	}
	s.mu.Lock()
	tr := s.liveTracks[track.Token]
	tr.ExpiresAt = time.Now().Add(-time.Minute)
	s.liveTracks[track.Token] = tr
	s.mu.Unlock()

	if _, err := s.PingLiveTrack(track.Token, PingLiveTrackInput{Lat: -7.5, Lng: 110.4}); !errors.Is(err, ErrExpired) {
		t.Fatalf("expected expired, got %v", err)
	}
}
