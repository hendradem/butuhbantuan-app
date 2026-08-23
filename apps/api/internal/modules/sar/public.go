package sar

import "time"

// PublicMissionBundle is the stakeholder-safe, view-only share payload.
// Strips real names, equipment, ops notes, and share tokens.
type PublicMissionBundle struct {
	Mission      PublicMission             `json:"mission"`
	Shifts       []PublicShift             `json:"shifts"`
	Shift        *PublicShift              `json:"shift,omitempty"`
	Teams        []PublicTeam              `json:"teams"`
	Sectors      []Sector                  `json:"sectors"`
	Members      []PublicMember            `json:"members"`
	Positions    []PublicPosition          `json:"positions"`
	Markers      []PublicMarker            `json:"markers"`
	LastByMember map[string]PublicPosition `json:"last_by_member"`
	SRUList      []string                  `json:"sru_list"`
	ViewOnly     bool                      `json:"view_only"`
	ExpiresAt    *time.Time                `json:"expires_at,omitempty"`
}

type PublicMission struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Area      string    `json:"area"`
	Status    string    `json:"status"`
	Kind      string    `json:"kind"`
	CenterLat float64   `json:"center_lat"`
	CenterLng float64   `json:"center_lng"`
	StartedAt time.Time `json:"started_at"`
}

type PublicShift struct {
	ID     string `json:"id"`
	Date   string `json:"date"`
	Label  string `json:"label"`
	Status string `json:"status"`
}

type PublicTeam struct {
	SRU             string   `json:"sru"`
	Color           string   `json:"color"`
	AssignedSectors []string `json:"assigned_sectors,omitempty"`
}

type PublicMember struct {
	ID       string `json:"id"`
	Callsign string `json:"callsign"`
	SRU      string `json:"sru"`
	Role     string `json:"role"`
	Status   string `json:"status"`
}

type PublicPosition struct {
	ID         string    `json:"id"`
	MemberID   string    `json:"member_id"`
	Callsign   string    `json:"callsign"`
	Lat        float64   `json:"lat"`
	Lng        float64   `json:"lng"`
	Source     string    `json:"source"`
	SectorHint string    `json:"sector_hint,omitempty"`
	ReportedAt time.Time `json:"reported_at"`
}

type PublicMarker struct {
	ID    string  `json:"id"`
	Kind  string  `json:"kind"`
	Label string  `json:"label"`
	Lat   float64 `json:"lat"`
	Lng   float64 `json:"lng"`
	Color string  `json:"color,omitempty"`
	Icon  string  `json:"icon,omitempty"`
}

// ToPublicMissionBundle maps an admin bundle to a public view-only DTO.
func ToPublicMissionBundle(b *MissionBundle, expiresAt *time.Time) *PublicMissionBundle {
	if b == nil {
		return nil
	}
	out := &PublicMissionBundle{
		Mission: PublicMission{
			ID: b.Mission.ID, Name: b.Mission.Name, Area: b.Mission.Area,
			Status: b.Mission.Status, Kind: b.Mission.Kind,
			CenterLat: b.Mission.CenterLat, CenterLng: b.Mission.CenterLng,
			StartedAt: b.Mission.StartedAt,
		},
		Sectors:      append([]Sector(nil), b.Sectors...),
		SRUList:      append([]string(nil), b.SRUList...),
		LastByMember: map[string]PublicPosition{},
		ViewOnly:     true,
		ExpiresAt:    expiresAt,
	}
	for _, sh := range b.Shifts {
		out.Shifts = append(out.Shifts, PublicShift{
			ID: sh.ID, Date: sh.Date, Label: sh.Label, Status: sh.Status,
		})
	}
	if b.Shift != nil {
		ps := PublicShift{
			ID: b.Shift.ID, Date: b.Shift.Date, Label: b.Shift.Label, Status: b.Shift.Status,
		}
		out.Shift = &ps
	}
	for _, t := range b.Teams {
		out.Teams = append(out.Teams, PublicTeam{
			SRU: t.SRU, Color: t.Color, AssignedSectors: append([]string(nil), t.AssignedSectors...),
		})
	}
	for _, m := range b.Members {
		out.Members = append(out.Members, PublicMember{
			ID: m.ID, Callsign: m.Callsign, SRU: m.SRU, Role: m.Role, Status: m.Status,
		})
	}
	for _, p := range b.Positions {
		out.Positions = append(out.Positions, publicPosition(p))
	}
	for id, p := range b.LastByMember {
		out.LastByMember[id] = publicPosition(p)
	}
	for _, mk := range b.Markers {
		out.Markers = append(out.Markers, PublicMarker{
			ID: mk.ID, Kind: mk.Kind, Label: mk.Label,
			Lat: mk.Lat, Lng: mk.Lng, Color: mk.Color, Icon: mk.Icon,
		})
	}
	return out
}

func publicPosition(p PositionReport) PublicPosition {
	return PublicPosition{
		ID: p.ID, MemberID: p.MemberID, Callsign: p.Callsign,
		Lat: p.Lat, Lng: p.Lng, Source: p.Source,
		SectorHint: p.SectorHint, ReportedAt: p.ReportedAt,
	}
}

func shareInfoFromMission(m Mission) *ShareInfo {
	info := &ShareInfo{
		MissionID:      m.ID,
		ShareToken:     m.ShareToken,
		ShareEnabledAt: m.ShareEnabledAt,
		ShareExpiresAt: m.ShareExpiresAt,
	}
	info.Active = shareIsActive(m, time.Now())
	return info
}

func shareIsActive(m Mission, now time.Time) bool {
	if m.ShareToken == "" || m.ShareExpiresAt == nil {
		return false
	}
	return m.ShareExpiresAt.After(now)
}
