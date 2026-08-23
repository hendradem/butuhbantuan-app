package sar

import (
	"math"
	"strings"
	"time"

	"github.com/google/uuid"
)

const (
	defaultLiveTrackTTL = 12 * time.Hour
	minGPSInterval      = 8 * time.Second
	minGPSMoveMeters    = 12.0
)

func liveTrackActive(t LiveTrack, now time.Time) bool {
	return t.Token != "" && t.ExpiresAt.After(now)
}

func haversineM(lat1, lng1, lat2, lng2 float64) float64 {
	const r = 6371000.0
	toRad := math.Pi / 180
	dLat := (lat2 - lat1) * toRad
	dLng := (lng2 - lng1) * toRad
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1*toRad)*math.Cos(lat2*toRad)*math.Sin(dLng/2)*math.Sin(dLng/2)
	return 2 * r * math.Asin(math.Min(1, math.Sqrt(a)))
}

func (s *MemoryStore) listLiveTracksLocked(missionID, shiftID string, now time.Time) []LiveTrack {
	out := make([]LiveTrack, 0)
	for _, t := range s.liveTracks {
		if t.MissionID != missionID {
			continue
		}
		if shiftID != "" && t.ShiftID != shiftID {
			continue
		}
		cp := t
		cp.Active = liveTrackActive(t, now)
		out = append(out, cp)
	}
	return out
}

func (s *MemoryStore) rebuildLiveTrackIndexLocked() {
	idx := map[string]string{}
	for tok, t := range s.liveTracks {
		if tok == "" {
			continue
		}
		idx[tok] = t.MissionID
	}
	s.liveTrackIndex = idx
}

// EnableLiveTrack creates or refreshes a field GPS link for one SRU.
func (s *MemoryStore) EnableLiveTrack(missionID string, in EnableLiveTrackInput) (*LiveTrack, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if err := s.assertWritableLocked(missionID); err != nil {
		return nil, err
	}
	m, ok := s.findMissionLocked(missionID)
	if !ok {
		return nil, ErrNotFound
	}
	missionID = m.ID
	sru := strings.TrimSpace(in.SRU)
	if sru == "" {
		return nil, ErrBadInput
	}

	shift := s.pickShiftLocked(missionID, in.ShiftID)
	if shift == nil {
		return nil, ErrNotFound
	}

	var member *Member
	if mid := strings.TrimSpace(in.MemberID); mid != "" {
		for i := range s.members[missionID] {
			mem := &s.members[missionID][i]
			if mem.ID == mid && mem.ShiftID == shift.ID && mem.SRU == sru {
				member = mem
				break
			}
		}
	}
	if member == nil {
		for i := range s.members[missionID] {
			mem := &s.members[missionID][i]
			if mem.ShiftID == shift.ID && mem.SRU == sru {
				member = mem
				break
			}
		}
	}
	if member == nil {
		// Team may exist without roster — create a default field member so GPS can bind.
		hasTeam := false
		for _, t := range s.teams[shift.ID] {
			if t.SRU == sru {
				hasTeam = true
				break
			}
		}
		if !hasTeam {
			return nil, ErrNotFound
		}
		short := strings.TrimPrefix(sru, "SRU-")
		nm := Member{
			ID: uuid.NewString(), MissionID: missionID, ShiftID: shift.ID,
			Callsign: short + "-1", Name: short + "-1", SRU: sru,
			Role: "searcher", Status: "standby",
		}
		s.members[missionID] = append(s.members[missionID], nm)
		member = &s.members[missionID][len(s.members[missionID])-1]
	}

	color := "#2563eb"
	for _, t := range s.teams[shift.ID] {
		if t.SRU == sru && t.Color != "" {
			color = t.Color
			break
		}
	}

	ttl := defaultLiveTrackTTL
	if in.TTLHours > 0 {
		ttl = time.Duration(in.TTLHours) * time.Hour
	}

	// Replace any existing track for same mission+shift+SRU.
	for tok, existing := range s.liveTracks {
		if existing.MissionID == missionID && existing.ShiftID == shift.ID && existing.SRU == sru {
			delete(s.liveTracks, tok)
			delete(s.liveTrackIndex, tok)
		}
	}

	now := time.Now()
	token := uuid.NewString()
	track := LiveTrack{
		Token:     token,
		MissionID: missionID,
		ShiftID:   shift.ID,
		SRU:       sru,
		MemberID:  member.ID,
		Callsign:  member.Callsign,
		Color:     color,
		EnabledAt: now,
		ExpiresAt: now.Add(ttl),
		Active:    true,
	}
	s.liveTracks[token] = track
	s.liveTrackIndex[token] = missionID
	s.persistLocked()
	return &track, nil
}

func (s *MemoryStore) DisableLiveTrack(missionID, sruOrToken string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if err := s.assertWritableLocked(missionID); err != nil {
		return err
	}
	m, ok := s.findMissionLocked(missionID)
	if !ok {
		return ErrNotFound
	}
	missionID = m.ID
	key := strings.TrimSpace(sruOrToken)
	found := false
	for tok, t := range s.liveTracks {
		if t.MissionID != missionID {
			continue
		}
		if tok == key || t.SRU == key || t.Token == key {
			delete(s.liveTracks, tok)
			delete(s.liveTrackIndex, tok)
			found = true
		}
	}
	if !found {
		return ErrNotFound
	}
	s.persistLocked()
	return nil
}

func (s *MemoryStore) ListLiveTracks(missionID, shiftID string) ([]LiveTrack, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if _, ok := s.findMissionLocked(missionID); !ok {
		return nil, ErrNotFound
	}
	return s.listLiveTracksLocked(missionID, shiftID, time.Now()), nil
}

func (s *MemoryStore) GetLiveTrackSession(token string) (*LiveTrackSession, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	token = strings.TrimSpace(token)
	t, ok := s.liveTracks[token]
	if !ok {
		return nil, ErrNotFound
	}
	now := time.Now()
	m, mok := s.missions[t.MissionID]
	sess := &LiveTrackSession{
		Token:         t.Token,
		MissionID:     t.MissionID,
		MissionName:   m.Name,
		Area:          m.Area,
		SRU:           t.SRU,
		Callsign:      t.Callsign,
		Color:         t.Color,
		CanShare:      liveTrackActive(t, now) && mok && m.Status == "active",
		ExpiresAt:     t.ExpiresAt,
		LastLat:       t.LastLat,
		LastLng:       t.LastLng,
		LastAt:        t.LastAt,
		LastAccuracyM: t.LastAccuracyM,
	}
	if !liveTrackActive(t, now) {
		sess.CanShare = false
	}
	return sess, nil
}

// PingLiveTrack records a GPS fix into the mission trail (source=gps) with light throttling.
func (s *MemoryStore) PingLiveTrack(token string, in PingLiveTrackInput) (*LiveTrackSession, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	token = strings.TrimSpace(token)
	t, ok := s.liveTracks[token]
	if !ok {
		return nil, ErrNotFound
	}
	now := time.Now()
	if !liveTrackActive(t, now) {
		return nil, ErrExpired
	}
	if in.Lat < -90 || in.Lat > 90 || in.Lng < -180 || in.Lng > 180 {
		return nil, ErrBadInput
	}
	if in.Lat == 0 && in.Lng == 0 {
		return nil, ErrBadInput
	}
	if err := s.assertWritableLocked(t.MissionID); err != nil {
		return nil, err
	}

	shouldAppend := true
	if t.LastAt != nil {
		dt := now.Sub(*t.LastAt)
		dist := haversineM(t.LastLat, t.LastLng, in.Lat, in.Lng)
		if dt < minGPSInterval && dist < minGPSMoveMeters {
			shouldAppend = false
		}
	}

	t.LastLat = in.Lat
	t.LastLng = in.Lng
	t.LastAt = &now
	t.LastAccuracyM = in.AccuracyM
	t.Active = true
	s.liveTracks[token] = t

	if shouldAppend {
		var member *Member
		for i := range s.members[t.MissionID] {
			if s.members[t.MissionID][i].ID == t.MemberID {
				member = &s.members[t.MissionID][i]
				break
			}
		}
		if member != nil {
			rep := PositionReport{
				ID:         uuid.NewString(),
				MissionID:  t.MissionID,
				ShiftID:    t.ShiftID,
				MemberID:   member.ID,
				Callsign:   member.Callsign,
				Lat:        in.Lat,
				Lng:        in.Lng,
				AltitudeM:  in.AltitudeM,
				AccuracyM:  in.AccuracyM,
				Source:     "gps",
				ReportedAt: now,
				LoggedBy:   "live-track",
			}
			if member.Status == "standby" || member.Status == "offline" {
				member.Status = "searching"
			}
			s.positions[t.MissionID] = append(s.positions[t.MissionID], rep)
		}
	}

	s.persistLocked()

	m := s.missions[t.MissionID]
	return &LiveTrackSession{
		Token:         t.Token,
		MissionID:     t.MissionID,
		MissionName:   m.Name,
		Area:          m.Area,
		SRU:           t.SRU,
		Callsign:      t.Callsign,
		Color:         t.Color,
		CanShare:      true,
		ExpiresAt:     t.ExpiresAt,
		LastLat:       t.LastLat,
		LastLng:       t.LastLng,
		LastAt:        t.LastAt,
		LastAccuracyM: t.LastAccuracyM,
	}, nil
}
