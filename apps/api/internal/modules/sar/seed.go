package sar

import (
	"fmt"
	"time"

	"github.com/google/uuid"
)

func dayKey(t time.Time) string {
	return t.Format("2006-01-02")
}

// seedDemoMerapiLocked loads Merapi dummy mission with 3 ops days (different SRU + gear + trails).
// Caller must hold s.mu write lock.
func (s *MemoryStore) seedDemoMerapiLocked() {
	id := "sar-demo-merapi-01"
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 12, 0, 0, 0, now.Location())
	d0 := today
	d1 := today.AddDate(0, 0, -1)
	d2 := today.AddDate(0, 0, -2)

	s.missions[id] = Mission{
		ID:        id,
		Name:      "Pencarian Hilang — Lereng Merapi (Dummy)",
		Area:      "Sleman / kawasan hutan lereng",
		Status:    "active",
		Kind:      "live",
		KMLURL:    "/sar/sample-merapi-karvak.kml",
		CenterLat: -7.5405,
		CenterLng: 110.4462,
		StartedAt: d2.Add(-2 * time.Hour),
		Notes:     "Dummy SMC. Roster SRU & perlengkapan berubah tiap hari (shift).",
	}

	s.sectors[id] = []Sector{
		{
			ID: "sec-a", Code: "A1", Label: "Karvak A1 — Jalur Selo", Color: "#c62828",
			Ring: [][2]float64{{-7.5360, 110.4400}, {-7.5360, 110.4480}, {-7.5420, 110.4480}, {-7.5420, 110.4400}},
		},
		{
			ID: "sec-b", Code: "B1", Label: "Karvak B1 — Rimba Timur", Color: "#c62828",
			Ring: [][2]float64{{-7.5360, 110.4480}, {-7.5360, 110.4560}, {-7.5420, 110.4560}, {-7.5420, 110.4480}},
		},
		{
			ID: "sec-c", Code: "C1", Label: "Karvak C1 — Sungai / jurang", Color: "#c62828",
			Ring: [][2]float64{{-7.5420, 110.4400}, {-7.5420, 110.4480}, {-7.5480, 110.4480}, {-7.5480, 110.4400}},
		},
	}

	sh2 := Shift{ID: "shift-d2", MissionID: id, Date: dayKey(d2), Label: "H-2 · pembukaan sektor", Status: "closed"}
	sh1 := Shift{ID: "shift-d1", MissionID: id, Date: dayKey(d1), Label: "Kemarin · rotasi siang", Status: "closed"}
	sh0 := Shift{ID: "shift-d0", MissionID: id, Date: dayKey(d0), Label: "Hari ini · shift aktif", Status: "active"}
	s.shifts[id] = []Shift{sh2, sh1, sh0}

	// Day -2: Delta + Echo
	s.teams[sh2.ID] = []ShiftTeam{
		{
			ShiftID: sh2.ID, SRU: "SRU-Delta", Color: "#2563eb", AssignedSectors: []string{"A1", "B1"},
			Equipment: []GearItem{
				{Name: "HT VHF", Qty: 4, Unit: "unit"},
				{Name: "GPS handheld", Qty: 2, Unit: "unit"},
				{Name: "Tali 30m", Qty: 2, Unit: "gulung"},
				{Name: "P3K kit", Qty: 1, Unit: "set"},
			},
			Notes: "Pembukaan A1/B1",
		},
		{
			ShiftID: sh2.ID, SRU: "SRU-Echo", Color: "#059669", AssignedSectors: []string{"C1"},
			Equipment: []GearItem{
				{Name: "HT VHF", Qty: 3, Unit: "unit"},
				{Name: "Drone mini", Qty: 1, Unit: "unit"},
				{Name: "Stretchers", Qty: 1, Unit: "buah"},
			},
		},
	}
	s.members[id] = append(s.members[id],
		Member{ID: "m-d1", MissionID: id, ShiftID: sh2.ID, Callsign: "Delta-1", Name: "Eko Prasetyo", SRU: "SRU-Delta", Role: "leader", Status: "returning"},
		Member{ID: "m-d2", MissionID: id, ShiftID: sh2.ID, Callsign: "Delta-2", Name: "Maya Sari", SRU: "SRU-Delta", Role: "member", Status: "returning"},
		Member{ID: "m-e1", MissionID: id, ShiftID: sh2.ID, Callsign: "Echo-1", Name: "Fajar Nugroho", SRU: "SRU-Echo", Role: "leader", Status: "returning"},
	)

	// Day -1: Foxtrot + Alpha (different gear)
	s.teams[sh1.ID] = []ShiftTeam{
		{
			ShiftID: sh1.ID, SRU: "SRU-Foxtrot", Color: "#7c3aed", AssignedSectors: []string{"B1"},
			Equipment: []GearItem{
				{Name: "HT VHF", Qty: 5, Unit: "unit"},
				{Name: "K9 unit", Qty: 1, Unit: "tim"},
				{Name: "GPS handheld", Qty: 3, Unit: "unit"},
				{Name: "Headlamp", Qty: 6, Unit: "buah"},
			},
			Notes: "K9 di B1",
		},
		{
			ShiftID: sh1.ID, SRU: "SRU-Alpha", Color: "#2563eb", AssignedSectors: []string{"A1", "C1"},
			Equipment: []GearItem{
				{Name: "HT VHF", Qty: 4, Unit: "unit"},
				{Name: "Medic pack", Qty: 1, Unit: "set"},
				{Name: "Water 5L", Qty: 4, Unit: "galon"},
			},
		},
	}
	s.members[id] = append(s.members[id],
		Member{ID: "m-f1", MissionID: id, ShiftID: sh1.ID, Callsign: "Foxtrot-1", Name: "Gilang Putra", SRU: "SRU-Foxtrot", Role: "leader", Status: "returning"},
		Member{ID: "m-f2", MissionID: id, ShiftID: sh1.ID, Callsign: "Foxtrot-2", Name: "Hana Dewi", SRU: "SRU-Foxtrot", Role: "member", Status: "returning"},
		Member{ID: "m-a1y", MissionID: id, ShiftID: sh1.ID, Callsign: "Alpha-1", Name: "Budi Santoso", SRU: "SRU-Alpha", Role: "leader", Status: "returning"},
		Member{ID: "m-a2y", MissionID: id, ShiftID: sh1.ID, Callsign: "Alpha-2", Name: "Siti Rahma", SRU: "SRU-Alpha", Role: "medic", Status: "returning"},
	)

	// Today: Alpha + Bravo + Charlie
	s.teams[sh0.ID] = []ShiftTeam{
		{
			ShiftID: sh0.ID, SRU: "SRU-Alpha", Color: "#2563eb", AssignedSectors: []string{"A1"},
			Equipment: []GearItem{
				{Name: "HT VHF", Qty: 3, Unit: "unit"},
				{Name: "GPS handheld", Qty: 1, Unit: "unit"},
				{Name: "Parang", Qty: 2, Unit: "buah"},
			},
		},
		{
			ShiftID: sh0.ID, SRU: "SRU-Bravo", Color: "#059669", AssignedSectors: []string{"B1"},
			Equipment: []GearItem{
				{Name: "HT VHF", Qty: 4, Unit: "unit"},
				{Name: "Thermal cam", Qty: 1, Unit: "unit"},
				{Name: "P3K kit", Qty: 2, Unit: "set"},
				{Name: "Tali 50m", Qty: 1, Unit: "gulung"},
			},
			Notes: "Thermal untuk canopy dense",
		},
		{
			ShiftID: sh0.ID, SRU: "SRU-Charlie", Color: "#d97706", AssignedSectors: []string{"C1"},
			Equipment: []GearItem{
				{Name: "HT VHF", Qty: 3, Unit: "unit"},
				{Name: "Life jacket", Qty: 4, Unit: "buah"},
				{Name: "Throw bag", Qty: 2, Unit: "buah"},
			},
			Notes: "Sektor sungai",
		},
	}
	s.members[id] = append(s.members[id],
		Member{ID: "m-a1", MissionID: id, ShiftID: sh0.ID, Callsign: "Alpha-1", Name: "Budi Santoso", SRU: "SRU-Alpha", Role: "leader", Status: "searching"},
		Member{ID: "m-a2", MissionID: id, ShiftID: sh0.ID, Callsign: "Alpha-2", Name: "Siti Rahma", SRU: "SRU-Alpha", Role: "member", Status: "searching"},
		Member{ID: "m-b1", MissionID: id, ShiftID: sh0.ID, Callsign: "Bravo-1", Name: "Andi Wijaya", SRU: "SRU-Bravo", Role: "leader", Status: "searching"},
		Member{ID: "m-b2", MissionID: id, ShiftID: sh0.ID, Callsign: "Bravo-2", Name: "Dewi Lestari", SRU: "SRU-Bravo", Role: "medic", Status: "searching"},
		Member{ID: "m-c1", MissionID: id, ShiftID: sh0.ID, Callsign: "Charlie-1", Name: "Rudi Hartono", SRU: "SRU-Charlie", Role: "leader", Status: "searching"},
		Member{ID: "m-c2", MissionID: id, ShiftID: sh0.ID, Callsign: "Charlie-2", Name: "Nina Putri", SRU: "SRU-Charlie", Role: "member", Status: "standby"},
	)

	type ping struct {
		mid, shift     string
		lat, lng       float64
		at             time.Time
		note, sector   string
	}
	trail := []ping{
		// H-2
		{"m-d1", sh2.ID, -7.5370, 110.4420, d2.Add(-5 * time.Hour), "Delta buka A1", "A1"},
		{"m-d1", sh2.ID, -7.5390, 110.4440, d2.Add(-3 * time.Hour), "HT: lanjut timur", "A1"},
		{"m-d2", sh2.ID, -7.5380, 110.4500, d2.Add(-4 * time.Hour), "Masuk B1", "B1"},
		{"m-e1", sh2.ID, -7.5440, 110.4430, d2.Add(-3 * time.Hour), "Echo C1", "C1"},
		{"m-e1", sh2.ID, -7.5460, 110.4450, d2.Add(-1 * time.Hour), "HT: jurang kecil", "C1"},
		// Kemarin
		{"m-f1", sh1.ID, -7.5385, 110.4495, d1.Add(-6 * time.Hour), "K9 start B1", "B1"},
		{"m-f1", sh1.ID, -7.5400, 110.4520, d1.Add(-3 * time.Hour), "HT: scent trail", "B1"},
		{"m-f2", sh1.ID, -7.5395, 110.4510, d1.Add(-2 * time.Hour), "Support Foxtrot", "B1"},
		{"m-a1y", sh1.ID, -7.5375, 110.4415, d1.Add(-5 * time.Hour), "Alpha A1", "A1"},
		{"m-a1y", sh1.ID, -7.5405, 110.4435, d1.Add(-2 * time.Hour), "HT: batas A1/C1", "A1"},
		{"m-a2y", sh1.ID, -7.5435, 110.4420, d1.Add(-3 * time.Hour), "Medic C1", "C1"},
		// Hari ini
		{"m-a1", sh0.ID, -7.5382, 110.4415, now.Add(-90 * time.Minute), "Masuk A1 dari pos", "A1"},
		{"m-a1", sh0.ID, -7.5390, 110.4430, now.Add(-60 * time.Minute), "HT: lanjut ke timur jalur", "A1"},
		{"m-a1", sh0.ID, -7.5398, 110.4448, now.Add(-25 * time.Minute), "HT: dekat batas A1/B1", "A1"},
		{"m-a2", sh0.ID, -7.5375, 110.4422, now.Add(-80 * time.Minute), "Ikut Alpha-1", "A1"},
		{"m-a2", sh0.ID, -7.5388, 110.4440, now.Add(-35 * time.Minute), "HT: cek sisi utara", "A1"},
		{"m-b1", sh0.ID, -7.5378, 110.4505, now.Add(-70 * time.Minute), "Buka B1", "B1"},
		{"m-b1", sh0.ID, -7.5392, 110.4520, now.Add(-40 * time.Minute), "HT: dense canopy", "B1"},
		{"m-b1", sh0.ID, -7.5405, 110.4535, now.Add(-12 * time.Minute), "HT: last known Bravo-1", "B1"},
		{"m-b2", sh0.ID, -7.5385, 110.4495, now.Add(-55 * time.Minute), "Medic standby jalur", "B1"},
		{"m-c1", sh0.ID, -7.5435, 110.4425, now.Add(-65 * time.Minute), "Masuk C1", "C1"},
		{"m-c1", sh0.ID, -7.5450, 110.4440, now.Add(-20 * time.Minute), "HT: turun ke jurang kecil", "C1"},
	}

	callsign := map[string]string{}
	for _, m := range s.members[id] {
		callsign[m.ID] = m.Callsign
	}
	for i, p := range trail {
		s.positions[id] = append(s.positions[id], PositionReport{
			ID:         fmt.Sprintf("pos-demo-%02d-%s", i, uuid.NewString()[:8]),
			MissionID:  id,
			ShiftID:    p.shift,
			MemberID:   p.mid,
			Callsign:   callsign[p.mid],
			Lat:        p.lat,
			Lng:        p.lng,
			Source:     "ht",
			Note:       p.note,
			SectorHint: p.sector,
			ReportedAt: p.at,
			LoggedBy:   "SMC-Dummy",
		})
	}

	s.markers[id] = []MapMarker{
		{
			ID: "mk-lp1", MissionID: id, Kind: "lp", Label: "LP / ICP Selo",
			Lat: -7.5355, Lng: 110.4410, Color: "#1a1a1a", Icon: "flag",
			Note: "Last Point / Incident Command Post", CreatedAt: d2, CreatedBy: "SMC-Dummy",
		},
		{
			ID: "mk-clue1", MissionID: id, Kind: "clue", Label: "Clue: jejak sepatu",
			Lat: -7.5402, Lng: 110.4528, Color: "#1a1a1a", Icon: "search",
			Note: "HT Bravo-1", CreatedAt: now.Add(-2 * time.Hour), CreatedBy: "SMC-Dummy",
		},
		{
			ID: "mk-wp1", MissionID: id, Kind: "waypoint", Label: "WP jurang C1",
			Lat: -7.5455, Lng: 110.4435, Color: "#1a1a1a", Icon: "pin",
			CreatedAt: now.Add(-90 * time.Minute), CreatedBy: "SMC-Dummy",
		},
	}
}

// ensureArchiveHistoryLocked seeds read-only ESAR histories (other ops) for browsing after app enable.
func (s *MemoryStore) ensureArchiveHistoryLocked() {
	now := time.Now()

	if _, ok := s.missions["esar-hist-sindoro"]; !ok {
		id := "esar-hist-sindoro"
		shID := "shift-sindoro-1"
		day := now.AddDate(0, 0, -14).Format("2006-01-02")
		s.missions[id] = Mission{
			ID: id, Name: "ESAR Sindoro — pencarian hilang (arsip)",
			Area: "Temanggung / lereng Sindoro", Status: "closed", Kind: "archive",
			CenterLat: -7.3005, CenterLng: 110.0055,
			StartedAt: now.AddDate(0, 0, -15), Notes: "History ESAR lain — read-only.",
		}
		s.sectors[id] = []Sector{{
			ID: "sind-a", Code: "S1", Label: "Sektor S1", Color: "#c62828",
			Assigned: "SRU-Delta",
			Ring: [][2]float64{{-7.2980, 110.0020}, {-7.2980, 110.0100}, {-7.3050, 110.0100}, {-7.3050, 110.0020}},
		}}
		s.shifts[id] = []Shift{{ID: shID, MissionID: id, Date: day, Label: "Hari ops · arsip", Status: "closed"}}
		s.teams[shID] = []ShiftTeam{{
			ShiftID: shID, SRU: "SRU-Delta", Color: "#2563eb", AssignedSectors: []string{"S1"},
			Equipment: []GearItem{{Name: "HT VHF", Qty: 4, Unit: "unit"}, {Name: "GPS", Qty: 2, Unit: "unit"}},
		}}
		s.members[id] = []Member{
			{ID: "sind-m1", MissionID: id, ShiftID: shID, Callsign: "Delta-1", Name: "Agus", SRU: "SRU-Delta", Role: "leader", Status: "returning"},
			{ID: "sind-m2", MissionID: id, ShiftID: shID, Callsign: "Delta-2", Name: "Rina", SRU: "SRU-Delta", Role: "member", Status: "returning"},
		}
		s.positions[id] = []PositionReport{
			{ID: "sind-p1", MissionID: id, ShiftID: shID, MemberID: "sind-m1", Callsign: "Delta-1", Lat: -7.2995, Lng: 110.0040, Source: "ht", Note: "Masuk S1", ReportedAt: now.AddDate(0, 0, -14).Add(-3 * time.Hour), LoggedBy: "SMC"},
			{ID: "sind-p2", MissionID: id, ShiftID: shID, MemberID: "sind-m1", Callsign: "Delta-1", Lat: -7.3010, Lng: 110.0065, Source: "ht", Note: "Last known", ReportedAt: now.AddDate(0, 0, -14).Add(-1 * time.Hour), LoggedBy: "SMC"},
		}
		s.markers[id] = []MapMarker{{
			ID: "sind-mk1", MissionID: id, Kind: "lp", Label: "LP Sindoro", Lat: -7.2975, Lng: 110.0030, Icon: "flag", Color: "#1a1a1a", CreatedAt: now.AddDate(0, 0, -15),
		}}
	}

	if _, ok := s.missions["esar-hist-merbabu"]; !ok {
		id := "esar-hist-merbabu"
		shID := "shift-merbabu-1"
		day := now.AddDate(0, 0, -30).Format("2006-01-02")
		s.missions[id] = Mission{
			ID: id, Name: "ESAR Merbabu — evakuasi cedera (arsip)",
			Area: "Magelang / jalur Selo–Merbabu", Status: "closed", Kind: "archive",
			CenterLat: -7.4550, CenterLng: 110.4400,
			StartedAt: now.AddDate(0, 0, -31), Notes: "History ESAR lain — read-only.",
		}
		s.sectors[id] = []Sector{{
			ID: "mer-a", Code: "M1", Label: "Koridor M1", Color: "#c62828",
			Assigned: "SRU-Echo",
			Ring: [][2]float64{{-7.4520, 110.4360}, {-7.4520, 110.4440}, {-7.4580, 110.4440}, {-7.4580, 110.4360}},
		}}
		s.shifts[id] = []Shift{{ID: shID, MissionID: id, Date: day, Label: "Hari ops · arsip", Status: "closed"}}
		s.teams[shID] = []ShiftTeam{{
			ShiftID: shID, SRU: "SRU-Echo", Color: "#059669", AssignedSectors: []string{"M1"},
			Equipment: []GearItem{{Name: "HT VHF", Qty: 3, Unit: "unit"}, {Name: "Stretcher", Qty: 1, Unit: "buah"}},
		}}
		s.members[id] = []Member{
			{ID: "mer-m1", MissionID: id, ShiftID: shID, Callsign: "Echo-1", Name: "Tono", SRU: "SRU-Echo", Role: "leader", Status: "returning"},
		}
		s.positions[id] = []PositionReport{
			{ID: "mer-p1", MissionID: id, ShiftID: shID, MemberID: "mer-m1", Callsign: "Echo-1", Lat: -7.4540, Lng: 110.4380, Source: "ht", Note: "Evac start", ReportedAt: now.AddDate(0, 0, -30).Add(-4 * time.Hour), LoggedBy: "SMC"},
			{ID: "mer-p2", MissionID: id, ShiftID: shID, MemberID: "mer-m1", Callsign: "Echo-1", Lat: -7.4560, Lng: 110.4410, Source: "ht", Note: "Titik cedera", ReportedAt: now.AddDate(0, 0, -30).Add(-2 * time.Hour), LoggedBy: "SMC"},
		}
	}
}
