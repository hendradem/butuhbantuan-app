package sar

import (
	"strings"

	"github.com/google/uuid"
)

// UpsertTeamInput adds or updates an SRU on the active (or given) shift.
type UpsertTeamInput struct {
	SRU      string `json:"sru"`
	Color    string `json:"color,omitempty"`
	Callsign string `json:"callsign,omitempty"`
	Name     string `json:"name,omitempty"`
	Role     string `json:"role,omitempty"`
	ShiftID  string `json:"shift_id,omitempty"`
}

var defaultSRUPalette = []string{
	"#2563eb", "#059669", "#d97706", "#7c3aed", "#dc2626", "#0891b2", "#ca8a04", "#4f46e5",
}

func normalizeSRUName(raw string) string {
	s := strings.TrimSpace(raw)
	if s == "" {
		return ""
	}
	upper := strings.ToUpper(s)
	if strings.HasPrefix(upper, "SRU-") || strings.HasPrefix(upper, "SRU ") {
		// Keep user casing after prefix normalize.
		rest := strings.TrimSpace(s[4:])
		if rest == "" {
			return ""
		}
		return "SRU-" + rest
	}
	return "SRU-" + s
}

func (s *MemoryStore) nextTeamColorLocked(shiftID string) string {
	used := map[string]bool{}
	for _, t := range s.teams[shiftID] {
		used[strings.ToLower(t.Color)] = true
	}
	for _, c := range defaultSRUPalette {
		if !used[strings.ToLower(c)] {
			return c
		}
	}
	return defaultSRUPalette[len(s.teams[shiftID])%len(defaultSRUPalette)]
}

// UpsertTeam creates/updates an SRU team and ensures at least one roster member.
func (s *MemoryStore) UpsertTeam(missionID string, in UpsertTeamInput) (*ShiftTeam, *Member, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if err := s.assertWritableLocked(missionID); err != nil {
		return nil, nil, err
	}
	m, ok := s.findMissionLocked(missionID)
	if !ok {
		return nil, nil, ErrNotFound
	}
	missionID = m.ID

	sru := normalizeSRUName(in.SRU)
	if sru == "" {
		return nil, nil, ErrBadInput
	}

	shift := s.pickShiftLocked(missionID, in.ShiftID)
	if shift == nil {
		return nil, nil, ErrNotFound
	}

	color := strings.TrimSpace(in.Color)
	if color == "" {
		color = s.nextTeamColorLocked(shift.ID)
	}

	var team *ShiftTeam
	list := s.teams[shift.ID]
	for i := range list {
		if list[i].SRU == sru {
			list[i].Color = color
			s.teams[shift.ID] = list
			team = &list[i]
			break
		}
	}
	if team == nil {
		nt := ShiftTeam{
			ShiftID:         shift.ID,
			SRU:             sru,
			Color:           color,
			AssignedSectors: []string{},
			Equipment:       []GearItem{},
		}
		s.teams[shift.ID] = append(s.teams[shift.ID], nt)
		team = &s.teams[shift.ID][len(s.teams[shift.ID])-1]
	}

	var member *Member
	for i := range s.members[missionID] {
		mem := &s.members[missionID][i]
		if mem.ShiftID == shift.ID && mem.SRU == sru {
			member = mem
			break
		}
	}
	callsign := strings.TrimSpace(in.Callsign)
	if callsign == "" {
		// Alpha from SRU-Alpha
		short := strings.TrimPrefix(sru, "SRU-")
		callsign = short + "-1"
	}
	name := strings.TrimSpace(in.Name)
	if name == "" {
		name = callsign
	}
	role := strings.TrimSpace(in.Role)
	if role == "" {
		role = "searcher"
	}
	if member == nil {
		nm := Member{
			ID:        uuid.NewString(),
			MissionID: missionID,
			ShiftID:   shift.ID,
			Callsign:  callsign,
			Name:      name,
			SRU:       sru,
			Role:      role,
			Status:    "standby",
		}
		s.members[missionID] = append(s.members[missionID], nm)
		member = &s.members[missionID][len(s.members[missionID])-1]
	} else if strings.TrimSpace(in.Callsign) != "" || strings.TrimSpace(in.Name) != "" || strings.TrimSpace(in.Role) != "" {
		if strings.TrimSpace(in.Callsign) != "" {
			member.Callsign = callsign
		}
		if strings.TrimSpace(in.Name) != "" {
			member.Name = name
		}
		if strings.TrimSpace(in.Role) != "" {
			member.Role = role
		}
	}

	s.persistLocked()
	cpTeam := *team
	cpMem := *member
	return &cpTeam, &cpMem, nil
}

// RemoveTeam removes an SRU from the shift (keeps historical positions).
func (s *MemoryStore) RemoveTeam(missionID, sru, shiftID string) error {
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
	sru = normalizeSRUName(sru)
	if sru == "" {
		return ErrBadInput
	}
	shift := s.pickShiftLocked(missionID, shiftID)
	if shift == nil {
		return ErrNotFound
	}

	teams := s.teams[shift.ID]
	next := teams[:0]
	found := false
	for _, t := range teams {
		if t.SRU == sru {
			found = true
			continue
		}
		next = append(next, t)
	}
	if !found {
		return ErrNotFound
	}
	s.teams[shift.ID] = next

	members := s.members[missionID]
	kept := members[:0]
	for _, mem := range members {
		if mem.ShiftID == shift.ID && mem.SRU == sru {
			continue
		}
		kept = append(kept, mem)
	}
	s.members[missionID] = kept

	// Disable live tracks for this SRU.
	for tok, t := range s.liveTracks {
		if t.MissionID == missionID && t.ShiftID == shift.ID && t.SRU == sru {
			delete(s.liveTracks, tok)
			delete(s.liveTrackIndex, tok)
		}
	}

	s.persistLocked()
	return nil
}
