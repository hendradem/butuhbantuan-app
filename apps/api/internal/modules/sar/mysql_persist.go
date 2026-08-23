package sar

import (
	"encoding/json"
	"log"
	"os"
	"path/filepath"
	"strings"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// snapshotPersister stores/loads the full MemoryStore snapshot.
type snapshotPersister interface {
	Load() (storeSnapshot, bool, error)
	Save(storeSnapshot) error
}

type filePersister struct {
	path string
}

func (f filePersister) Load() (storeSnapshot, bool, error) {
	var empty storeSnapshot
	raw, err := os.ReadFile(f.path)
	if err != nil || len(raw) == 0 {
		return empty, false, nil
	}
	var snap storeSnapshot
	if err := json.Unmarshal(raw, &snap); err != nil {
		return empty, false, err
	}
	normalizeSnapshot(&snap)
	return snap, true, nil
}

func (f filePersister) Save(snap storeSnapshot) error {
	raw, err := json.MarshalIndent(snap, "", "  ")
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(f.path), 0o755); err != nil {
		return err
	}
	tmp := f.path + ".tmp"
	if err := os.WriteFile(tmp, raw, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, f.path)
}

type mysqlPersister struct {
	db *gorm.DB
}

func (p mysqlPersister) Load() (storeSnapshot, bool, error) {
	var empty storeSnapshot
	var cfg SarAppConfigRow
	err := p.db.First(&cfg, 1).Error
	if err == gorm.ErrRecordNotFound {
		return empty, false, nil
	}
	if err != nil {
		return empty, false, err
	}

	var missions []SarMissionRow
	var shifts []SarShiftRow
	var teams []SarShiftTeamRow
	var members []SarMemberRow
	var sectors []SarSectorRow
	var positions []SarPositionRow
	var markers []SarMarkerRow
	var liveTracks []SarLiveTrackRow
	if err := p.db.Find(&missions).Error; err != nil {
		return empty, false, err
	}
	if err := p.db.Find(&shifts).Error; err != nil {
		return empty, false, err
	}
	if err := p.db.Find(&teams).Error; err != nil {
		return empty, false, err
	}
	if err := p.db.Find(&members).Error; err != nil {
		return empty, false, err
	}
	if err := p.db.Find(&sectors).Error; err != nil {
		return empty, false, err
	}
	if err := p.db.Find(&positions).Error; err != nil {
		return empty, false, err
	}
	if err := p.db.Find(&markers).Error; err != nil {
		return empty, false, err
	}
	if err := p.db.Find(&liveTracks).Error; err != nil {
		return empty, false, err
	}

	snap := storeSnapshot{
		Config: AppConfig{
			Enabled:         cfg.Enabled,
			Onboarded:       cfg.Onboarded,
			ActiveMissionID: cfg.ActiveMissionID,
		},
		Missions:   map[string]Mission{},
		Shifts:     map[string][]Shift{},
		Teams:      map[string][]ShiftTeam{},
		Sectors:    map[string][]Sector{},
		Members:    map[string][]Member{},
		Positions:  map[string][]PositionReport{},
		Markers:    map[string][]MapMarker{},
		ShareIndex: map[string]string{},
		LiveTracks: map[string]LiveTrack{},
	}

	for _, m := range missions {
		snap.Missions[m.ID] = Mission{
			ID: m.ID, Name: m.Name, Area: m.Area, Status: m.Status, Kind: m.Kind,
			KMLURL: m.KMLURL, CenterLat: m.CenterLat, CenterLng: m.CenterLng,
			StartedAt: m.StartedAt, Notes: m.Notes,
			ShareToken: m.ShareToken, ShareEnabledAt: m.ShareEnabledAt, ShareExpiresAt: m.ShareExpiresAt,
		}
		if m.ShareToken != "" {
			snap.ShareIndex[m.ShareToken] = m.ID
		}
	}
	for _, sh := range shifts {
		snap.Shifts[sh.MissionID] = append(snap.Shifts[sh.MissionID], Shift{
			ID: sh.ID, MissionID: sh.MissionID, Date: sh.Date, Label: sh.Label, Status: sh.Status,
		})
	}
	for _, t := range teams {
		as := t.AssignedSectors
		if as == nil {
			as = []string{}
		}
		eq := t.Equipment
		if eq == nil {
			eq = []GearItem{}
		}
		snap.Teams[t.ShiftID] = append(snap.Teams[t.ShiftID], ShiftTeam{
			ShiftID: t.ShiftID, SRU: t.SRU, Color: t.Color,
			AssignedSectors: as, Equipment: eq, Notes: t.Notes,
		})
	}
	for _, m := range members {
		snap.Members[m.MissionID] = append(snap.Members[m.MissionID], Member{
			ID: m.ID, MissionID: m.MissionID, ShiftID: m.ShiftID,
			Callsign: m.Callsign, Name: m.Name, SRU: m.SRU, Role: m.Role, Status: m.Status,
		})
	}
	for _, sec := range sectors {
		ring := sec.Ring
		if ring == nil {
			ring = [][2]float64{}
		}
		snap.Sectors[sec.MissionID] = append(snap.Sectors[sec.MissionID], Sector{
			ID: sec.ID, Code: sec.Code, Label: sec.Label, Color: sec.Color,
			Assigned: sec.Assigned, Ring: ring,
		})
	}
	for _, p := range positions {
		snap.Positions[p.MissionID] = append(snap.Positions[p.MissionID], PositionReport{
			ID: p.ID, MissionID: p.MissionID, ShiftID: p.ShiftID, MemberID: p.MemberID,
			Callsign: p.Callsign, Lat: p.Lat, Lng: p.Lng, AltitudeM: p.AltitudeM, AccuracyM: p.AccuracyM,
			Source: p.Source, Note: p.Note, SectorHint: p.SectorHint, ReportedAt: p.ReportedAt, LoggedBy: p.LoggedBy,
		})
	}
	for _, mk := range markers {
		snap.Markers[mk.MissionID] = append(snap.Markers[mk.MissionID], MapMarker{
			ID: mk.ID, MissionID: mk.MissionID, Kind: mk.Kind, Label: mk.Label,
			Lat: mk.Lat, Lng: mk.Lng, Note: mk.Note, Color: mk.Color, Icon: mk.Icon,
			CreatedAt: mk.CreatedAt, CreatedBy: mk.CreatedBy,
		})
	}
	for _, t := range liveTracks {
		snap.LiveTracks[t.Token] = LiveTrack{
			Token: t.Token, MissionID: t.MissionID, ShiftID: t.ShiftID, SRU: t.SRU,
			MemberID: t.MemberID, Callsign: t.Callsign, Color: t.Color,
			EnabledAt: t.EnabledAt, ExpiresAt: t.ExpiresAt,
			LastLat: t.LastLat, LastLng: t.LastLng, LastAt: t.LastAt, LastAccuracyM: t.LastAccuracyM,
		}
	}

	normalizeSnapshot(&snap)
	return snap, true, nil
}

func (p mysqlPersister) Save(snap storeSnapshot) error {
	normalizeSnapshot(&snap)
	return p.db.Transaction(func(tx *gorm.DB) error {
		cfg := SarAppConfigRow{
			ID: 1, Enabled: snap.Config.Enabled, Onboarded: snap.Config.Onboarded,
			ActiveMissionID: snap.Config.ActiveMissionID,
		}
		if err := tx.Clauses(clause.OnConflict{UpdateAll: true}).Create(&cfg).Error; err != nil {
			return err
		}

		// Full replace of mission graph (SAR datasets are small).
		for _, table := range []any{
			&SarLiveTrackRow{}, &SarMarkerRow{}, &SarPositionRow{}, &SarSectorRow{}, &SarMemberRow{},
			&SarShiftTeamRow{}, &SarShiftRow{}, &SarMissionRow{},
		} {
			if err := tx.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(table).Error; err != nil {
				return err
			}
		}

		missionRows := make([]SarMissionRow, 0, len(snap.Missions))
		for _, m := range snap.Missions {
			missionRows = append(missionRows, SarMissionRow{
				ID: m.ID, Name: m.Name, Area: m.Area, Status: m.Status, Kind: m.Kind,
				KMLURL: m.KMLURL, CenterLat: m.CenterLat, CenterLng: m.CenterLng,
				StartedAt: m.StartedAt, Notes: m.Notes,
				ShareToken: m.ShareToken, ShareEnabledAt: m.ShareEnabledAt, ShareExpiresAt: m.ShareExpiresAt,
			})
		}
		if len(missionRows) > 0 {
			if err := tx.Create(&missionRows).Error; err != nil {
				return err
			}
		}

		var shiftRows []SarShiftRow
		for _, list := range snap.Shifts {
			for _, sh := range list {
				shiftRows = append(shiftRows, SarShiftRow{
					ID: sh.ID, MissionID: sh.MissionID, Date: sh.Date, Label: sh.Label, Status: sh.Status,
				})
			}
		}
		if len(shiftRows) > 0 {
			if err := tx.Create(&shiftRows).Error; err != nil {
				return err
			}
		}

		var teamRows []SarShiftTeamRow
		for _, list := range snap.Teams {
			for _, t := range list {
				as := t.AssignedSectors
				if as == nil {
					as = []string{}
				}
				eq := t.Equipment
				if eq == nil {
					eq = []GearItem{}
				}
				teamRows = append(teamRows, SarShiftTeamRow{
					ShiftID: t.ShiftID, SRU: t.SRU, Color: t.Color,
					AssignedSectors: as, Equipment: eq, Notes: t.Notes,
				})
			}
		}
		if len(teamRows) > 0 {
			if err := tx.Create(&teamRows).Error; err != nil {
				return err
			}
		}

		var memberRows []SarMemberRow
		for _, list := range snap.Members {
			for _, m := range list {
				memberRows = append(memberRows, SarMemberRow{
					ID: m.ID, MissionID: m.MissionID, ShiftID: m.ShiftID,
					Callsign: m.Callsign, Name: m.Name, SRU: m.SRU, Role: m.Role, Status: m.Status,
				})
			}
		}
		if len(memberRows) > 0 {
			if err := tx.Create(&memberRows).Error; err != nil {
				return err
			}
		}

		var sectorRows []SarSectorRow
		for mid, list := range snap.Sectors {
			for _, sec := range list {
				ring := sec.Ring
				if ring == nil {
					ring = [][2]float64{}
				}
				sectorRows = append(sectorRows, SarSectorRow{
					ID: sec.ID, MissionID: mid, Code: sec.Code, Label: sec.Label,
					Color: sec.Color, Assigned: sec.Assigned, Ring: ring,
				})
			}
		}
		if len(sectorRows) > 0 {
			if err := tx.Create(&sectorRows).Error; err != nil {
				return err
			}
		}

		var posRows []SarPositionRow
		for _, list := range snap.Positions {
			for _, pr := range list {
				posRows = append(posRows, SarPositionRow{
					ID: pr.ID, MissionID: pr.MissionID, ShiftID: pr.ShiftID, MemberID: pr.MemberID,
					Callsign: pr.Callsign, Lat: pr.Lat, Lng: pr.Lng, AltitudeM: pr.AltitudeM, AccuracyM: pr.AccuracyM,
					Source: pr.Source, Note: pr.Note, SectorHint: pr.SectorHint, ReportedAt: pr.ReportedAt, LoggedBy: pr.LoggedBy,
				})
			}
		}
		if len(posRows) > 0 {
			if err := tx.Create(&posRows).Error; err != nil {
				return err
			}
		}

		var markerRows []SarMarkerRow
		for _, list := range snap.Markers {
			for _, mk := range list {
				markerRows = append(markerRows, SarMarkerRow{
					ID: mk.ID, MissionID: mk.MissionID, Kind: mk.Kind, Label: mk.Label,
					Lat: mk.Lat, Lng: mk.Lng, Note: mk.Note, Color: mk.Color, Icon: mk.Icon,
					CreatedAt: mk.CreatedAt, CreatedBy: mk.CreatedBy,
				})
			}
		}
		if len(markerRows) > 0 {
			if err := tx.Create(&markerRows).Error; err != nil {
				return err
			}
		}

		var liveRows []SarLiveTrackRow
		for _, t := range snap.LiveTracks {
			liveRows = append(liveRows, SarLiveTrackRow{
				Token: t.Token, MissionID: t.MissionID, ShiftID: t.ShiftID, SRU: t.SRU,
				MemberID: t.MemberID, Callsign: t.Callsign, Color: t.Color,
				EnabledAt: t.EnabledAt, ExpiresAt: t.ExpiresAt,
				LastLat: t.LastLat, LastLng: t.LastLng, LastAt: t.LastAt, LastAccuracyM: t.LastAccuracyM,
			})
		}
		if len(liveRows) > 0 {
			if err := tx.Create(&liveRows).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func normalizeSnapshot(snap *storeSnapshot) {
	if snap.Missions == nil {
		snap.Missions = map[string]Mission{}
	}
	if snap.Shifts == nil {
		snap.Shifts = map[string][]Shift{}
	}
	if snap.Teams == nil {
		snap.Teams = map[string][]ShiftTeam{}
	}
	if snap.Sectors == nil {
		snap.Sectors = map[string][]Sector{}
	}
	if snap.Members == nil {
		snap.Members = map[string][]Member{}
	}
	if snap.Positions == nil {
		snap.Positions = map[string][]PositionReport{}
	}
	if snap.Markers == nil {
		snap.Markers = map[string][]MapMarker{}
	}
	if snap.ShareIndex == nil {
		snap.ShareIndex = map[string]string{}
	}
	if snap.LiveTracks == nil {
		snap.LiveTracks = map[string]LiveTrack{}
	}
}

func applySnapshotLocked(s *MemoryStore, snap storeSnapshot) {
	normalizeSnapshot(&snap)
	s.config = snap.Config
	s.missions = snap.Missions
	s.shifts = snap.Shifts
	s.teams = snap.Teams
	s.sectors = snap.Sectors
	s.members = snap.Members
	s.positions = snap.Positions
	s.markers = snap.Markers
	s.liveTracks = snap.LiveTracks
	rekeyMissionsLocked(s)
	rebuildShareIndexLocked(s)
	s.rebuildLiveTrackIndexLocked()
}

// rekeyMissionsLocked ensures map keys always equal Mission.ID (source of truth)
// and remaps mission-scoped collections that still use stale keys.
func rekeyMissionsLocked(s *MemoryStore) {
	next := make(map[string]Mission, len(s.missions))
	keyMap := map[string]string{} // oldKey → canonical ID
	for k, m := range s.missions {
		id := strings.TrimSpace(m.ID)
		if id == "" {
			id = strings.TrimSpace(k)
		}
		if id == "" {
			continue
		}
		m.ID = id
		next[id] = m
		if k != id {
			keyMap[k] = id
		}
	}
	s.missions = next
	if len(keyMap) == 0 {
		return
	}
	if s.shifts != nil {
		out := map[string][]Shift{}
		for k, v := range s.shifts {
			nk := keyMap[k]
			if nk == "" {
				nk = k
			}
			out[nk] = append(out[nk], v...)
		}
		s.shifts = out
	}
	if s.sectors != nil {
		out := map[string][]Sector{}
		for k, v := range s.sectors {
			nk := keyMap[k]
			if nk == "" {
				nk = k
			}
			out[nk] = append(out[nk], v...)
		}
		s.sectors = out
	}
	if s.members != nil {
		out := map[string][]Member{}
		for k, v := range s.members {
			nk := keyMap[k]
			if nk == "" {
				nk = k
			}
			out[nk] = append(out[nk], v...)
		}
		s.members = out
	}
	if s.positions != nil {
		out := map[string][]PositionReport{}
		for k, v := range s.positions {
			nk := keyMap[k]
			if nk == "" {
				nk = k
			}
			out[nk] = append(out[nk], v...)
		}
		s.positions = out
	}
	if s.markers != nil {
		out := map[string][]MapMarker{}
		for k, v := range s.markers {
			nk := keyMap[k]
			if nk == "" {
				nk = k
			}
			out[nk] = append(out[nk], v...)
		}
		s.markers = out
	}
}

func rebuildShareIndexLocked(s *MemoryStore) {
	idx := map[string]string{}
	for id, m := range s.missions {
		if tok := strings.TrimSpace(m.ShareToken); tok != "" {
			idx[tok] = id
		}
	}
	s.shareIndex = idx
}

// findMissionLocked resolves a mission by map key or Mission.ID value.
func (s *MemoryStore) findMissionLocked(missionID string) (Mission, bool) {
	missionID = strings.TrimSpace(missionID)
	if missionID == "" {
		return Mission{}, false
	}
	if m, ok := s.missions[missionID]; ok {
		return m, true
	}
	for _, m := range s.missions {
		if m.ID == missionID {
			return m, true
		}
	}
	return Mission{}, false
}

func currentSnapshotLocked(s *MemoryStore) storeSnapshot {
	return storeSnapshot{
		Config:     s.config,
		Missions:   s.missions,
		Shifts:     s.shifts,
		Teams:      s.teams,
		Sectors:    s.sectors,
		Members:    s.members,
		Positions:  s.positions,
		Markers:    s.markers,
		ShareIndex: s.shareIndex,
		LiveTracks: s.liveTracks,
	}
}

// MigrateSARTables creates/updates SAR tables on the given DB.
func MigrateSARTables(db *gorm.DB) error {
	return db.AutoMigrate(
		&SarAppConfigRow{},
		&SarMissionRow{},
		&SarShiftRow{},
		&SarShiftTeamRow{},
		&SarMemberRow{},
		&SarSectorRow{},
		&SarPositionRow{},
		&SarMarkerRow{},
		&SarLiveTrackRow{},
	)
}

// NewStore picks MySQL-backed store when db is set, otherwise JSON file store.
func NewStore(db *gorm.DB) Store {
	if db == nil {
		return NewMemoryStore()
	}
	if err := MigrateSARTables(db); err != nil {
		log.Printf("sar: mysql migrate failed, falling back to JSON: %v", err)
		return NewMemoryStore()
	}
	s := &MemoryStore{
		persister:  mysqlPersister{db: db},
		config:     AppConfig{Enabled: false, Onboarded: false},
		missions:   map[string]Mission{},
		shifts:     map[string][]Shift{},
		teams:      map[string][]ShiftTeam{},
		sectors:    map[string][]Sector{},
		members:    map[string][]Member{},
		positions:  map[string][]PositionReport{},
		markers:        map[string][]MapMarker{},
		shareIndex:     map[string]string{},
		liveTracks:     map[string]LiveTrack{},
		liveTrackIndex: map[string]string{},
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	snap, ok, err := s.persister.Load()
	if err != nil {
		log.Printf("sar: mysql load failed: %v", err)
	}
	if ok {
		applySnapshotLocked(s, snap)
		log.Printf("sar: loaded from MySQL (%d missions)", len(s.missions))
		return s
	}
	// First boot: import JSON snapshot if present, then persist to MySQL.
	if fileSnap, fileOK, _ := (filePersister{path: defaultPersistPath}).Load(); fileOK {
		applySnapshotLocked(s, fileSnap)
		if err := s.persister.Save(currentSnapshotLocked(s)); err != nil {
			log.Printf("sar: import JSON→MySQL failed: %v", err)
		} else {
			log.Printf("sar: imported JSON snapshot into MySQL (%d missions)", len(s.missions))
		}
		return s
	}
	log.Println("sar: MySQL empty — starting fresh")
	return s
}
