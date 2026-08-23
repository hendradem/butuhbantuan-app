package sar

import "time"

// AppConfig gates the SRU Mission Map module (off by default until activated + onboarded).
type AppConfig struct {
	Enabled         bool   `json:"enabled"`
	Onboarded       bool   `json:"onboarded"`
	ActiveMissionID string `json:"active_mission_id,omitempty"`
}

// Mission is a search operation controlled from SMC (Search Mission Control).
type Mission struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Area      string    `json:"area"`
	Status    string    `json:"status"` // planning | active | closed
	Kind      string    `json:"kind"`   // archive | live — archive = history ESAR lain (bisa dibaca sebelum onboard)
	KMLURL    string    `json:"kml_url"`
	CenterLat float64   `json:"center_lat"`
	CenterLng float64   `json:"center_lng"`
	StartedAt time.Time `json:"started_at"`
	Notes     string    `json:"notes,omitempty"`

	// Public share (view-only magic link). Token omitted from list payloads when empty.
	ShareToken     string     `json:"share_token,omitempty"`
	ShareEnabledAt *time.Time `json:"share_enabled_at,omitempty"`
	ShareExpiresAt *time.Time `json:"share_expires_at,omitempty"`
}

// ShareInfo is the admin-facing share status for a mission.
type ShareInfo struct {
	MissionID      string     `json:"mission_id"`
	ShareToken     string     `json:"share_token,omitempty"`
	ShareEnabledAt *time.Time `json:"share_enabled_at,omitempty"`
	ShareExpiresAt *time.Time `json:"share_expires_at,omitempty"`
	Active         bool       `json:"active"`
}

// Shift is one operational day. SRU roster + gear change per shift.
type Shift struct {
	ID        string `json:"id"`
	MissionID string `json:"mission_id"`
	Date      string `json:"date"` // YYYY-MM-DD (local ops day)
	Label     string `json:"label"`
	Status    string `json:"status"` // active | closed
}

// GearItem is equipment carried by an SRU on a given shift.
type GearItem struct {
	Name string `json:"name"`
	Qty  int    `json:"qty"`
	Unit string `json:"unit,omitempty"`
}

// ShiftTeam is one SRU deployment on a shift (people + gear + karvak).
type ShiftTeam struct {
	ShiftID         string     `json:"shift_id"`
	SRU             string     `json:"sru"`
	Color           string     `json:"color"`
	AssignedSectors []string   `json:"assigned_sectors,omitempty"`
	Equipment       []GearItem `json:"equipment"`
	Notes           string     `json:"notes,omitempty"`
}

// Sector is a search karvak / grid polygon (also embedded in KML).
type Sector struct {
	ID       string       `json:"id"`
	Code     string       `json:"code"`
	Label    string       `json:"label"`
	Color    string       `json:"color"`
	Assigned string       `json:"assigned_sru,omitempty"`
	Ring     [][2]float64 `json:"ring"`
}

// Member is an SRU field actor tracked by callsign (HT radio) on a shift.
type Member struct {
	ID        string `json:"id"`
	MissionID string `json:"mission_id"`
	ShiftID   string `json:"shift_id"`
	Callsign  string `json:"callsign"`
	Name      string `json:"name"`
	SRU       string `json:"sru"`
	Role      string `json:"role"`
	Status    string `json:"status"`
}

// PositionReport is a last-known / trail ping for a shift day.
type PositionReport struct {
	ID         string    `json:"id"`
	MissionID  string    `json:"mission_id"`
	ShiftID    string    `json:"shift_id"`
	MemberID   string    `json:"member_id"`
	Callsign   string    `json:"callsign"`
	Lat        float64   `json:"lat"`
	Lng        float64   `json:"lng"`
	AltitudeM  *float64  `json:"altitude_m,omitempty"`
	AccuracyM  *float64  `json:"accuracy_m,omitempty"`
	Source     string    `json:"source"`
	Note       string    `json:"note,omitempty"`
	SectorHint string    `json:"sector_hint,omitempty"`
	ReportedAt time.Time `json:"reported_at"`
	LoggedBy   string    `json:"logged_by,omitempty"`
}

// MapMarker is a custom SMC marker.
type MapMarker struct {
	ID        string    `json:"id"`
	MissionID string    `json:"mission_id"`
	Kind      string    `json:"kind"`
	Label     string    `json:"label"`
	Lat       float64   `json:"lat"`
	Lng       float64   `json:"lng"`
	Note      string    `json:"note,omitempty"`
	Color     string    `json:"color,omitempty"`
	Icon      string    `json:"icon,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	CreatedBy string    `json:"created_by,omitempty"`
}

// LiveTrack is a per-SRU magic-link session for field GPS (hybrid with HT radio log).
type LiveTrack struct {
	Token          string     `json:"token"`
	MissionID      string     `json:"mission_id"`
	ShiftID        string     `json:"shift_id"`
	SRU            string     `json:"sru"`
	MemberID       string     `json:"member_id"`
	Callsign       string     `json:"callsign"`
	Color          string     `json:"color,omitempty"`
	EnabledAt      time.Time  `json:"enabled_at"`
	ExpiresAt      time.Time  `json:"expires_at"`
	LastLat        float64    `json:"last_lat,omitempty"`
	LastLng        float64    `json:"last_lng,omitempty"`
	LastAt         *time.Time `json:"last_at,omitempty"`
	LastAccuracyM  *float64   `json:"last_accuracy_m,omitempty"`
	MissionName    string     `json:"mission_name,omitempty"` // filled for field session
	Area           string     `json:"area,omitempty"`
	Active         bool       `json:"active"`
}

// LiveTrackSession is the public field-page payload (no ops secrets).
type LiveTrackSession struct {
	Token         string     `json:"token"`
	MissionID     string     `json:"mission_id"`
	MissionName   string     `json:"mission_name"`
	Area          string     `json:"area"`
	SRU           string     `json:"sru"`
	Callsign      string     `json:"callsign"`
	Color         string     `json:"color,omitempty"`
	CanShare      bool       `json:"can_share"`
	ExpiresAt     time.Time  `json:"expires_at"`
	LastLat       float64    `json:"last_lat,omitempty"`
	LastLng       float64    `json:"last_lng,omitempty"`
	LastAt        *time.Time `json:"last_at,omitempty"`
	LastAccuracyM *float64   `json:"last_accuracy_m,omitempty"`
}

// EnableLiveTrackInput creates/refreshes a field GPS link for one SRU on the active shift.
type EnableLiveTrackInput struct {
	SRU       string `json:"sru"`
	MemberID  string `json:"member_id,omitempty"`
	ShiftID   string `json:"shift_id,omitempty"`
	TTLHours  int    `json:"ttl_hours,omitempty"`
}

// PingLiveTrackInput is a GPS ping from the field page.
type PingLiveTrackInput struct {
	Lat       float64  `json:"lat"`
	Lng       float64  `json:"lng"`
	AccuracyM *float64 `json:"accuracy_m,omitempty"`
	AltitudeM *float64 `json:"altitude_m,omitempty"`
}

// MissionBundle is the SMC map payload for one selected ops day.
type MissionBundle struct {
	Mission      Mission                   `json:"mission"`
	Shifts       []Shift                   `json:"shifts"`
	Shift        *Shift                    `json:"shift,omitempty"`
	Teams        []ShiftTeam               `json:"teams"`
	Sectors      []Sector                  `json:"sectors"`
	Members      []Member                  `json:"members"`
	Positions    []PositionReport          `json:"positions"`
	Markers      []MapMarker               `json:"markers"`
	LastByMember map[string]PositionReport `json:"last_by_member"`
	SRUList      []string                  `json:"sru_list"`
	LiveTracks   []LiveTrack               `json:"live_tracks,omitempty"`
}

type ReportPositionInput struct {
	MemberID   string   `json:"member_id"`
	Lat        float64  `json:"lat"`
	Lng        float64  `json:"lng"`
	AltitudeM  *float64 `json:"altitude_m,omitempty"`
	AccuracyM  *float64 `json:"accuracy_m,omitempty"`
	Note       string   `json:"note,omitempty"`
	SectorHint string   `json:"sector_hint,omitempty"`
	Source     string   `json:"source,omitempty"`
	LoggedBy   string   `json:"logged_by,omitempty"`
	ShiftID    string   `json:"shift_id,omitempty"`
}

type AssignSectorInput struct {
	AssignedSRU string `json:"assigned_sru"`
}

type CreateMarkerInput struct {
	Kind      string  `json:"kind"`
	Label     string  `json:"label"`
	Lat       float64 `json:"lat"`
	Lng       float64 `json:"lng"`
	Note      string  `json:"note,omitempty"`
	Color     string  `json:"color,omitempty"`
	Icon      string  `json:"icon,omitempty"`
	CreatedBy string  `json:"created_by,omitempty"`
}

type OnboardMemberInput struct {
	Callsign string `json:"callsign"`
	Name     string `json:"name"`
	Role     string `json:"role"`
}

type OnboardTeamInput struct {
	SRU             string               `json:"sru"`
	Color           string               `json:"color"`
	AssignedSectors []string             `json:"assigned_sectors,omitempty"`
	Equipment       []GearItem           `json:"equipment"`
	Members         []OnboardMemberInput `json:"members"`
	Notes           string               `json:"notes,omitempty"`
}

// OnboardInput creates the first mission + shift after app activation.
type OnboardInput struct {
	UseDemo   bool                `json:"use_demo"`
	Name      string              `json:"name"`
	Area      string              `json:"area"`
	CenterLat float64             `json:"center_lat"`
	CenterLng float64             `json:"center_lng"`
	Notes     string              `json:"notes,omitempty"`
	Teams     []OnboardTeamInput  `json:"teams"`
	Sectors   []Sector            `json:"sectors"`
	Markers   []CreateMarkerInput `json:"markers"`
}

type SetEnabledInput struct {
	Enabled bool `json:"enabled"`
}

// EnableShareInput optionally overrides default TTL (hours).
type EnableShareInput struct {
	TTLHours int `json:"ttl_hours,omitempty"`
}
