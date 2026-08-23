package sar

import (
	"errors"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
)

var (
	ErrNotFound  = errors.New("sar: not found")
	ErrDisabled  = errors.New("sar: app not enabled")
	ErrBadInput  = errors.New("sar: bad input")
	ErrReadOnly  = errors.New("sar: archive mission is read-only")
	ErrExpired   = errors.New("sar: share link expired")
	ErrShareOff  = errors.New("sar: share not enabled")
)

const defaultShareTTL = 72 * time.Hour

// MemoryStore is the SAR/SMC backend. Durability comes from a snapshotPersister
// (MySQL preferred) or a JSON file under ./data/sar_store.json.
type MemoryStore struct {
	mu            sync.RWMutex
	persistPath   string
	persister     snapshotPersister
	persistMu     sync.Mutex
	pendingSnap   *storeSnapshot
	persistSignal chan struct{}
	persistOnce   sync.Once
	config        AppConfig
	missions      map[string]Mission
	shifts        map[string][]Shift     // missionID → shifts
	teams         map[string][]ShiftTeam // shiftID → teams
	sectors       map[string][]Sector
	members       map[string][]Member // missionID → all members (all shifts)
	positions     map[string][]PositionReport
	markers       map[string][]MapMarker
	shareIndex    map[string]string // share_token → missionID
	liveTracks    map[string]LiveTrack // token → session
	liveTrackIndex map[string]string   // token → missionID (fast lookup aid)
}

func NewMemoryStore() *MemoryStore {
	return NewPersistedMemoryStore(defaultPersistPath)
}

// NewPersistedMemoryStore loads prior state from a JSON path when present.
func NewPersistedMemoryStore(path string) *MemoryStore {
	s := &MemoryStore{
		persistPath: path,
		config:      AppConfig{Enabled: false, Onboarded: false},
		missions:    map[string]Mission{},
		shifts:      map[string][]Shift{},
		teams:       map[string][]ShiftTeam{},
		sectors:     map[string][]Sector{},
		members:     map[string][]Member{},
		positions:   map[string][]PositionReport{},
		markers:     map[string][]MapMarker{},
		shareIndex:  map[string]string{},
		liveTracks:  map[string]LiveTrack{},
		liveTrackIndex: map[string]string{},
	}
	s.mu.Lock()
	s.loadLocked()
	s.mu.Unlock()
	return s
}

func (s *MemoryStore) GetStatus() AppConfig {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.config
}

func (s *MemoryStore) SetEnabled(enabled bool) AppConfig {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.config.Enabled = enabled
	if enabled {
		s.ensureArchiveHistoryLocked()
	}
	s.persistLocked()
	return s.config
}

func (s *MemoryStore) clearMissionDataLocked() {
	// Keep archive ESAR history; wipe only live/demo missions from onboarding.
	keepM := map[string]Mission{}
	keepShifts := map[string][]Shift{}
	keepTeams := map[string][]ShiftTeam{}
	keepSectors := map[string][]Sector{}
	keepMembers := map[string][]Member{}
	keepPos := map[string][]PositionReport{}
	keepMarkers := map[string][]MapMarker{}
	keepShare := map[string]string{}
	for id, m := range s.missions {
		if m.Kind != "archive" {
			continue
		}
		keepM[id] = m
		keepShifts[id] = s.shifts[id]
		keepSectors[id] = s.sectors[id]
		keepMembers[id] = s.members[id]
		keepPos[id] = s.positions[id]
		keepMarkers[id] = s.markers[id]
		for _, sh := range s.shifts[id] {
			keepTeams[sh.ID] = s.teams[sh.ID]
		}
		if m.ShareToken != "" {
			keepShare[m.ShareToken] = id
		}
	}
	s.missions = keepM
	s.shifts = keepShifts
	s.teams = keepTeams
	s.sectors = keepSectors
	s.members = keepMembers
	s.positions = keepPos
	s.markers = keepMarkers
	s.shareIndex = keepShare
	s.config.ActiveMissionID = ""
	s.config.Onboarded = false
}

func (s *MemoryStore) assertWritableLocked(missionID string) error {
	m, ok := s.missions[missionID]
	if !ok {
		return ErrNotFound
	}
	if m.Kind == "archive" {
		return ErrReadOnly
	}
	return nil
}

// Onboard activates master data for the first mission (or loads Merapi demo).
func (s *MemoryStore) Onboard(in OnboardInput) (*AppConfig, *MissionBundle, error) {
	s.mu.Lock()
	if !s.config.Enabled {
		s.mu.Unlock()
		return nil, nil, ErrDisabled
	}

	s.clearMissionDataLocked()
	missionID := ""

	if in.UseDemo {
		s.seedDemoMerapiLocked()
		missionID = "sar-demo-merapi-01"
	} else {
		name := strings.TrimSpace(in.Name)
		if name == "" {
			s.mu.Unlock()
			return nil, nil, ErrBadInput
		}
		if len(in.Teams) == 0 {
			s.mu.Unlock()
			return nil, nil, ErrBadInput
		}
		lat, lng := in.CenterLat, in.CenterLng
		if lat == 0 && lng == 0 {
			lat, lng = -7.5405, 110.4462
		}

		id := "sar-" + uuid.NewString()[:8]
		now := time.Now()
	s.missions[id] = Mission{
		ID: id, Name: name, Area: strings.TrimSpace(in.Area), Status: "active", Kind: "live",
		CenterLat: lat, CenterLng: lng, StartedAt: now, Notes: in.Notes,
	}

		if len(in.Sectors) > 0 {
			cleaned := make([]Sector, 0, len(in.Sectors))
			for _, sec := range in.Sectors {
				if len(sec.Ring) < 3 {
					continue
				}
				if sec.ID == "" {
					sec.ID = uuid.NewString()
				}
				if sec.Code == "" {
					sec.Code = "K" + uuid.NewString()[:4]
				}
				if sec.Label == "" {
					sec.Label = sec.Code
				}
				if sec.Color == "" {
					sec.Color = "#c62828"
				}
				cleaned = append(cleaned, sec)
			}
			s.sectors[id] = cleaned
		}
		for _, mk := range in.Markers {
			kind := mk.Kind
			if kind == "" {
				kind = "custom"
			}
			icon := mk.Icon
			if icon == "" {
				icon = "pin"
			}
			label := mk.Label
			if label == "" {
				label = kind
			}
			s.markers[id] = append(s.markers[id], MapMarker{
				ID: uuid.NewString(), MissionID: id, Kind: kind, Label: label,
				Lat: mk.Lat, Lng: mk.Lng, Note: mk.Note, Color: mk.Color, Icon: icon,
				CreatedAt: now, CreatedBy: "onboarding",
			})
		}

		shiftID := "shift-" + uuid.NewString()[:8]
		date := now.Format("2006-01-02")
		s.shifts[id] = []Shift{{
			ID: shiftID, MissionID: id, Date: date, Label: "Shift awal · " + date, Status: "active",
		}}

		palette := []string{"#2563eb", "#059669", "#d97706", "#7c3aed", "#dc2626"}
		for i, t := range in.Teams {
			sru := strings.TrimSpace(t.SRU)
			if sru == "" {
				continue
			}
			color := t.Color
			if color == "" {
				color = palette[i%len(palette)]
			}
			s.teams[shiftID] = append(s.teams[shiftID], ShiftTeam{
				ShiftID: shiftID, SRU: sru, Color: color,
				AssignedSectors: t.AssignedSectors, Equipment: t.Equipment, Notes: t.Notes,
			})
			for _, m := range t.Members {
				cs := strings.TrimSpace(m.Callsign)
				if cs == "" {
					continue
				}
				role := m.Role
				if role == "" {
					role = "member"
				}
				s.members[id] = append(s.members[id], Member{
					ID: uuid.NewString(), MissionID: id, ShiftID: shiftID,
					Callsign: cs, Name: strings.TrimSpace(m.Name), SRU: sru, Role: role, Status: "standby",
				})
			}
		}
		missionID = id
	}

	s.config.Onboarded = true
	s.config.ActiveMissionID = missionID
	cfg := s.config
	s.persistLocked()
	s.mu.Unlock()

	bundle, err := s.GetBundle(missionID, "")
	return &cfg, bundle, err
}

func (s *MemoryStore) ListMissions() []Mission {
	s.mu.Lock()
	nBefore := len(s.missions)
	if s.config.Enabled {
		s.ensureArchiveHistoryLocked()
	}
	if len(s.missions) != nBefore {
		s.persistLocked()
	}
	out := make([]Mission, 0, len(s.missions))
	for _, m := range s.missions {
		out = append(out, m)
	}
	s.mu.Unlock()
	sort.Slice(out, func(i, j int) bool {
		// Live first, then archives by recency.
		if out[i].Kind != out[j].Kind {
			if out[i].Kind == "live" {
				return true
			}
			if out[j].Kind == "live" {
				return false
			}
		}
		return out[i].StartedAt.After(out[j].StartedAt)
	})
	return out
}

func uniqueSRUs(members []Member) []string {
	seen := map[string]struct{}{}
	var out []string
	for _, m := range members {
		if m.SRU == "" {
			continue
		}
		if _, ok := seen[m.SRU]; ok {
			continue
		}
		seen[m.SRU] = struct{}{}
		out = append(out, m.SRU)
	}
	sort.Strings(out)
	return out
}

func (s *MemoryStore) listShiftsLocked(missionID string) []Shift {
	out := append([]Shift(nil), s.shifts[missionID]...)
	sort.Slice(out, func(i, j int) bool {
		return out[i].Date > out[j].Date
	})
	return out
}

func (s *MemoryStore) pickShiftLocked(missionID, dayOrShiftID string) *Shift {
	shifts := s.listShiftsLocked(missionID)
	if len(shifts) == 0 {
		return nil
	}
	key := strings.TrimSpace(dayOrShiftID)
	if key != "" {
		for i := range shifts {
			if shifts[i].ID == key || shifts[i].Date == key {
				sh := shifts[i]
				return &sh
			}
		}
	}
	// Prefer active, else newest date
	for i := range shifts {
		if shifts[i].Status == "active" {
			sh := shifts[i]
			return &sh
		}
	}
	sh := shifts[0]
	return &sh
}

func applySectorAssignments(sectors []Sector, teams []ShiftTeam) []Sector {
	out := make([]Sector, len(sectors))
	copy(out, sectors)
	assign := map[string]string{}
	for _, t := range teams {
		for _, code := range t.AssignedSectors {
			assign[code] = t.SRU
		}
	}
	for i := range out {
		if sru, ok := assign[out[i].Code]; ok {
			out[i].Assigned = sru
		} else {
			out[i].Assigned = ""
		}
	}
	return out
}

func (s *MemoryStore) ListShifts(missionID string) ([]Shift, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if _, ok := s.missions[missionID]; !ok {
		return nil, ErrNotFound
	}
	return s.listShiftsLocked(missionID), nil
}

// GetBundle returns mission payload for one ops day (day=YYYY-MM-DD or shift id).
func (s *MemoryStore) GetBundle(missionID, dayOrShiftID string) (*MissionBundle, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	m, ok := s.findMissionLocked(missionID)
	if !ok {
		return nil, ErrNotFound
	}
	missionID = m.ID
	shifts := s.listShiftsLocked(missionID)
	shift := s.pickShiftLocked(missionID, dayOrShiftID)

	var teams []ShiftTeam
	var members []Member
	var positions []PositionReport
	if shift != nil {
		teams = append([]ShiftTeam(nil), s.teams[shift.ID]...)
		for _, mem := range s.members[missionID] {
			if mem.ShiftID == shift.ID {
				members = append(members, mem)
			}
		}
		for _, p := range s.positions[missionID] {
			if p.ShiftID == shift.ID {
				positions = append(positions, p)
			}
		}
	}

	sectors := applySectorAssignments(s.sectors[missionID], teams)
	markers := append([]MapMarker(nil), s.markers[missionID]...)
	last := map[string]PositionReport{}
	for _, p := range positions {
		prev, ok := last[p.MemberID]
		if !ok || p.ReportedAt.After(prev.ReportedAt) {
			last[p.MemberID] = p
		}
	}

	sid := ""
	if shift != nil {
		sid = shift.ID
	}
	return &MissionBundle{
		Mission:      m,
		Shifts:       shifts,
		Shift:        shift,
		Teams:        teams,
		Sectors:      sectors,
		Members:      members,
		Positions:    positions,
		Markers:      markers,
		LastByMember: last,
		SRUList:      uniqueSRUs(members),
		LiveTracks:   s.listLiveTracksLocked(missionID, sid, time.Now()),
	}, nil
}

func (s *MemoryStore) ReportPosition(missionID string, in ReportPositionInput) (*PositionReport, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if err := s.assertWritableLocked(missionID); err != nil {
		return nil, err
	}
	var member *Member
	for i := range s.members[missionID] {
		if s.members[missionID][i].ID == in.MemberID {
			member = &s.members[missionID][i]
			break
		}
	}
	if member == nil {
		return nil, ErrNotFound
	}
	shiftID := in.ShiftID
	if shiftID == "" {
		shiftID = member.ShiftID
	}
	src := in.Source
	if src == "" {
		src = "ht"
	}
	rep := PositionReport{
		ID:         uuid.NewString(),
		MissionID:  missionID,
		ShiftID:    shiftID,
		MemberID:   member.ID,
		Callsign:   member.Callsign,
		Lat:        in.Lat,
		Lng:        in.Lng,
		AltitudeM:  in.AltitudeM,
		AccuracyM:  in.AccuracyM,
		Source:     src,
		Note:       in.Note,
		SectorHint: in.SectorHint,
		ReportedAt: time.Now(),
		LoggedBy:   in.LoggedBy,
	}
	if member.Status == "standby" || member.Status == "offline" {
		member.Status = "searching"
	}
	s.positions[missionID] = append(s.positions[missionID], rep)
	s.persistLocked()
	return &rep, nil
}

func (s *MemoryStore) UpdatePosition(missionID, positionID string, in ReportPositionInput) (*PositionReport, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if err := s.assertWritableLocked(missionID); err != nil {
		return nil, err
	}
	list := s.positions[missionID]
	for i := range list {
		if list[i].ID != positionID {
			continue
		}
		if in.MemberID != "" && in.MemberID != list[i].MemberID {
			var member *Member
			for j := range s.members[missionID] {
				if s.members[missionID][j].ID == in.MemberID {
					member = &s.members[missionID][j]
					break
				}
			}
			if member == nil {
				return nil, ErrNotFound
			}
			list[i].MemberID = member.ID
			list[i].Callsign = member.Callsign
			if in.ShiftID != "" {
				list[i].ShiftID = in.ShiftID
			} else {
				list[i].ShiftID = member.ShiftID
			}
		}
		list[i].Lat = in.Lat
		list[i].Lng = in.Lng
		list[i].AltitudeM = in.AltitudeM
		list[i].Note = in.Note
		list[i].SectorHint = in.SectorHint
		if in.Source != "" {
			list[i].Source = in.Source
		}
		if in.LoggedBy != "" {
			list[i].LoggedBy = in.LoggedBy
		}
		s.positions[missionID] = list
		cp := list[i]
		s.persistLocked()
		return &cp, nil
	}
	return nil, ErrNotFound
}

func (s *MemoryStore) DeletePosition(missionID, positionID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if err := s.assertWritableLocked(missionID); err != nil {
		return err
	}
	list := s.positions[missionID]
	next := make([]PositionReport, 0, len(list))
	found := false
	for _, p := range list {
		if p.ID == positionID {
			found = true
			continue
		}
		next = append(next, p)
	}
	if !found {
		return ErrNotFound
	}
	s.positions[missionID] = next
	s.persistLocked()
	return nil
}

func (s *MemoryStore) ReplaceSectors(missionID string, sectors []Sector, mode string) ([]Sector, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if err := s.assertWritableLocked(missionID); err != nil {
		return nil, err
	}
	cleaned := make([]Sector, 0, len(sectors))
	for i, sec := range sectors {
		if len(sec.Ring) < 3 {
			continue
		}
		if sec.ID == "" {
			sec.ID = uuid.NewString()
		}
		if sec.Code == "" {
			sec.Code = "K" + uuid.NewString()[:4]
		}
		if sec.Label == "" {
			sec.Label = sec.Code
		}
		if sec.Color == "" {
			palette := []string{"#2563eb", "#059669", "#d97706", "#dc2626", "#7c3aed"}
			sec.Color = palette[i%len(palette)]
		}
		cleaned = append(cleaned, sec)
	}
	if mode == "append" {
		s.sectors[missionID] = append(s.sectors[missionID], cleaned...)
	} else {
		s.sectors[missionID] = cleaned
	}
	s.persistLocked()
	return append([]Sector(nil), s.sectors[missionID]...), nil
}

func (s *MemoryStore) AssignSector(missionID, sectorID, assignedSRU string) (*Sector, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if err := s.assertWritableLocked(missionID); err != nil {
		return nil, err
	}
	secs, ok := s.sectors[missionID]
	if !ok {
		return nil, ErrNotFound
	}
	var code string
	var out *Sector
	for i := range secs {
		if secs[i].ID == sectorID {
			secs[i].Assigned = assignedSRU
			code = secs[i].Code
			cp := secs[i]
			out = &cp
			break
		}
	}
	if out == nil {
		return nil, ErrNotFound
	}
	s.sectors[missionID] = secs

	// Mirror onto active shift team assignments
	shift := s.pickShiftLocked(missionID, "")
	if shift != nil && code != "" {
		teams := s.teams[shift.ID]
		for i := range teams {
			filtered := teams[i].AssignedSectors[:0]
			for _, c := range teams[i].AssignedSectors {
				if c != code {
					filtered = append(filtered, c)
				}
			}
			teams[i].AssignedSectors = filtered
			if assignedSRU != "" && teams[i].SRU == assignedSRU {
				teams[i].AssignedSectors = append(teams[i].AssignedSectors, code)
			}
		}
		s.teams[shift.ID] = teams
	}
	s.persistLocked()
	return out, nil
}

func (s *MemoryStore) CreateMarker(missionID string, in CreateMarkerInput) (*MapMarker, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if err := s.assertWritableLocked(missionID); err != nil {
		return nil, err
	}
	kind := in.Kind
	if kind == "" {
		kind = "custom"
	}
	label := in.Label
	if label == "" {
		label = kind
	}
	color := in.Color
	if color == "" {
		switch kind {
		case "lp":
			color = "#dc2626"
		case "clue":
			color = "#ca8a04"
		case "hazard":
			color = "#ea580c"
		case "dest", "target":
			color = "#7c3aed"
		case "waypoint":
			color = "#2563eb"
		default:
			color = "#7c3aed"
		}
	}
	icon := in.Icon
	if icon == "" {
		switch kind {
		case "lp":
			icon = "flag"
		case "clue":
			icon = "search"
		case "hazard":
			icon = "alert"
		case "dest", "target":
			icon = "route"
		case "waypoint":
			icon = "pin"
		default:
			icon = "pin"
		}
	}
	m := MapMarker{
		ID: uuid.NewString(), MissionID: missionID, Kind: kind, Label: label,
		Lat: in.Lat, Lng: in.Lng, Note: in.Note, Color: color, Icon: icon,
		CreatedAt: time.Now(), CreatedBy: in.CreatedBy,
	}
	s.markers[missionID] = append(s.markers[missionID], m)
	s.persistLocked()
	return &m, nil
}

func (s *MemoryStore) UpdateMarker(missionID, markerID string, in CreateMarkerInput) (*MapMarker, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if err := s.assertWritableLocked(missionID); err != nil {
		return nil, err
	}
	list := s.markers[missionID]
	for i := range list {
		if list[i].ID != markerID {
			continue
		}
		kind := in.Kind
		if kind == "" {
			kind = list[i].Kind
		}
		label := in.Label
		if label == "" {
			label = kind
		}
		color := in.Color
		if color == "" {
			color = list[i].Color
		}
		icon := in.Icon
		if icon == "" {
			icon = list[i].Icon
		}
		list[i].Kind = kind
		list[i].Label = label
		list[i].Lat = in.Lat
		list[i].Lng = in.Lng
		list[i].Note = in.Note
		list[i].Color = color
		list[i].Icon = icon
		s.markers[missionID] = list
		cp := list[i]
		s.persistLocked()
		return &cp, nil
	}
	return nil, ErrNotFound
}

func (s *MemoryStore) ImportLayers(missionID string, sectors []Sector, markers []CreateMarkerInput, mode string) ([]Sector, []MapMarker, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if err := s.assertWritableLocked(missionID); err != nil {
		return nil, nil, err
	}
	if len(sectors) > 0 {
		cleaned := make([]Sector, 0, len(sectors))
		for i, sec := range sectors {
			if len(sec.Ring) < 3 {
				continue
			}
			if sec.ID == "" {
				sec.ID = uuid.NewString()
			}
			if sec.Code == "" {
				sec.Code = "K" + uuid.NewString()[:4]
			}
			if sec.Label == "" {
				sec.Label = sec.Code
			}
			if sec.Color == "" {
				palette := []string{"#2563eb", "#059669", "#d97706", "#dc2626", "#7c3aed"}
				sec.Color = palette[i%len(palette)]
			}
			cleaned = append(cleaned, sec)
		}
		if mode == "append" {
			s.sectors[missionID] = append(s.sectors[missionID], cleaned...)
		} else {
			s.sectors[missionID] = cleaned
		}
	}
	if len(markers) > 0 {
		built := make([]MapMarker, 0, len(markers))
		for _, in := range markers {
			if in.Lat < -90 || in.Lat > 90 || in.Lng < -180 || in.Lng > 180 {
				continue
			}
			kind := in.Kind
			if kind == "" {
				kind = "custom"
			}
			label := in.Label
			if label == "" {
				label = kind
			}
			color := in.Color
			if color == "" {
				color = "#7c3aed"
			}
			icon := in.Icon
			if icon == "" {
				icon = "pin"
			}
			built = append(built, MapMarker{
				ID: uuid.NewString(), MissionID: missionID, Kind: kind, Label: label,
				Lat: in.Lat, Lng: in.Lng, Note: in.Note, Color: color, Icon: icon,
				CreatedAt: time.Now(), CreatedBy: in.CreatedBy,
			})
		}
		if mode == "append" {
			s.markers[missionID] = append(s.markers[missionID], built...)
		} else {
			s.markers[missionID] = built
		}
	}
	s.persistLocked()
	return append([]Sector(nil), s.sectors[missionID]...), append([]MapMarker(nil), s.markers[missionID]...), nil
}

func (s *MemoryStore) DeleteMarker(missionID, markerID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if err := s.assertWritableLocked(missionID); err != nil {
		return err
	}
	list := s.markers[missionID]
	next := make([]MapMarker, 0, len(list))
	found := false
	for _, m := range list {
		if m.ID == markerID {
			found = true
			continue
		}
		next = append(next, m)
	}
	if !found {
		return ErrNotFound
	}
	s.markers[missionID] = next
	s.persistLocked()
	return nil
}

func (s *MemoryStore) EnableShare(missionID string, ttl time.Duration) (*ShareInfo, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	m, ok := s.findMissionLocked(missionID)
	if !ok {
		return nil, ErrNotFound
	}
	missionID = m.ID
	if ttl <= 0 {
		ttl = defaultShareTTL
	}
	if m.ShareToken != "" {
		delete(s.shareIndex, m.ShareToken)
	}
	token := uuid.NewString()
	now := time.Now()
	exp := now.Add(ttl)
	m.ShareToken = token
	m.ShareEnabledAt = &now
	m.ShareExpiresAt = &exp
	s.missions[missionID] = m
	s.shareIndex[token] = missionID
	s.persistLocked()
	return shareInfoFromMission(m), nil
}

func (s *MemoryStore) DisableShare(missionID string) (*ShareInfo, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	m, ok := s.findMissionLocked(missionID)
	if !ok {
		return nil, ErrNotFound
	}
	missionID = m.ID
	if m.ShareToken != "" {
		delete(s.shareIndex, m.ShareToken)
	}
	m.ShareToken = ""
	m.ShareEnabledAt = nil
	m.ShareExpiresAt = nil
	s.missions[missionID] = m
	s.persistLocked()
	return shareInfoFromMission(m), nil
}

func (s *MemoryStore) GetShare(missionID string) (*ShareInfo, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	m, ok := s.findMissionLocked(missionID)
	if !ok {
		return nil, ErrNotFound
	}
	return shareInfoFromMission(m), nil
}

func (s *MemoryStore) GetPublicBundle(token, dayOrShiftID string) (*PublicMissionBundle, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	token = strings.TrimSpace(token)
	if token == "" {
		return nil, ErrNotFound
	}
	missionID, ok := s.shareIndex[token]
	var m Mission
	if ok {
		m, ok = s.missions[missionID]
		if ok && m.ShareToken != token {
			ok = false
		}
	}
	if !ok {
		// Index can lag after reload / partial persist — scan by token.
		for id, cand := range s.missions {
			if cand.ShareToken == token {
				missionID = id
				m = cand
				ok = true
				break
			}
		}
	}
	if !ok {
		return nil, ErrNotFound
	}
	now := time.Now()
	if !shareIsActive(m, now) {
		return nil, ErrExpired
	}

	// Inline GetBundle logic while holding RLock (avoid nested lock).
	shifts := s.listShiftsLocked(missionID)
	shift := s.pickShiftLocked(missionID, dayOrShiftID)
	var teams []ShiftTeam
	var members []Member
	var positions []PositionReport
	if shift != nil {
		teams = append([]ShiftTeam(nil), s.teams[shift.ID]...)
		for _, mem := range s.members[missionID] {
			if mem.ShiftID == shift.ID {
				members = append(members, mem)
			}
		}
		for _, p := range s.positions[missionID] {
			if p.ShiftID == shift.ID {
				positions = append(positions, p)
			}
		}
	}
	sectors := applySectorAssignments(s.sectors[missionID], teams)
	markers := append([]MapMarker(nil), s.markers[missionID]...)
	last := map[string]PositionReport{}
	for _, p := range positions {
		prev, ok := last[p.MemberID]
		if !ok || p.ReportedAt.After(prev.ReportedAt) {
			last[p.MemberID] = p
		}
	}
	bundle := &MissionBundle{
		Mission: m, Shifts: shifts, Shift: shift, Teams: teams,
		Sectors: sectors, Members: members, Positions: positions,
		Markers: markers, LastByMember: last, SRUList: uniqueSRUs(members),
	}
	return ToPublicMissionBundle(bundle, m.ShareExpiresAt), nil
}
