package sar

import "time"

// GORM entities for durable SAR/SMC storage (MySQL).

type SarAppConfigRow struct {
	ID              uint   `gorm:"primaryKey"`
	Enabled         bool   `gorm:"not null;default:0"`
	Onboarded       bool   `gorm:"not null;default:0"`
	ActiveMissionID string `gorm:"size:64"`
}

func (SarAppConfigRow) TableName() string { return "sar_app_config" }

type SarMissionRow struct {
	ID             string     `gorm:"primaryKey;size:64"`
	Name           string     `gorm:"size:255;not null"`
	Area           string     `gorm:"size:255"`
	Status         string     `gorm:"size:32;not null;index"`
	Kind           string     `gorm:"size:32;not null;index"` // archive | live
	KMLURL         string     `gorm:"size:512"`
	CenterLat      float64    `gorm:"not null"`
	CenterLng      float64    `gorm:"not null"`
	StartedAt      time.Time  `gorm:"not null;index"`
	Notes          string     `gorm:"type:text"`
	ShareToken     string     `gorm:"size:64;index"`
	ShareEnabledAt *time.Time
	ShareExpiresAt *time.Time
}

func (SarMissionRow) TableName() string { return "sar_missions" }

type SarShiftRow struct {
	ID        string `gorm:"primaryKey;size:64"`
	MissionID string `gorm:"size:64;not null;index"`
	Date      string `gorm:"size:10;not null;index"`
	Label     string `gorm:"size:255"`
	Status    string `gorm:"size:32;not null"`
}

func (SarShiftRow) TableName() string { return "sar_shifts" }

type SarShiftTeamRow struct {
	ID              uint       `gorm:"primaryKey"`
	ShiftID         string     `gorm:"size:64;not null;uniqueIndex:idx_sar_team_shift_sru"`
	SRU             string     `gorm:"size:64;not null;uniqueIndex:idx_sar_team_shift_sru"`
	Color           string     `gorm:"size:32"`
	AssignedSectors []string   `gorm:"serializer:json;type:json"`
	Equipment       []GearItem `gorm:"serializer:json;type:json"`
	Notes           string     `gorm:"type:text"`
}

func (SarShiftTeamRow) TableName() string { return "sar_shift_teams" }

type SarMemberRow struct {
	ID        string `gorm:"primaryKey;size:64"`
	MissionID string `gorm:"size:64;not null;index"`
	ShiftID   string `gorm:"size:64;not null;index"`
	Callsign  string `gorm:"size:64;not null"`
	Name      string `gorm:"size:255"`
	SRU       string `gorm:"size:64;not null;index"`
	Role      string `gorm:"size:64"`
	Status    string `gorm:"size:32"`
}

func (SarMemberRow) TableName() string { return "sar_members" }

type SarSectorRow struct {
	ID        string       `gorm:"primaryKey;size:64"`
	MissionID string       `gorm:"size:64;not null;index"`
	Code      string       `gorm:"size:32;not null"`
	Label     string       `gorm:"size:255"`
	Color     string       `gorm:"size:32"`
	Assigned  string       `gorm:"size:64"`
	Ring      [][2]float64 `gorm:"serializer:json;type:json"`
}

func (SarSectorRow) TableName() string { return "sar_sectors" }

type SarPositionRow struct {
	ID         string    `gorm:"primaryKey;size:64"`
	MissionID  string    `gorm:"size:64;not null;index"`
	ShiftID    string    `gorm:"size:64;not null;index"`
	MemberID   string    `gorm:"size:64;not null;index"`
	Callsign   string    `gorm:"size:64"`
	Lat        float64   `gorm:"not null"`
	Lng        float64   `gorm:"not null"`
	AltitudeM  *float64
	AccuracyM  *float64
	Source     string    `gorm:"size:32"`
	Note       string    `gorm:"type:text"`
	SectorHint string    `gorm:"size:64"`
	ReportedAt time.Time `gorm:"not null;index"`
	LoggedBy   string    `gorm:"size:64"`
}

func (SarPositionRow) TableName() string { return "sar_positions" }

type SarMarkerRow struct {
	ID        string    `gorm:"primaryKey;size:64"`
	MissionID string    `gorm:"size:64;not null;index"`
	Kind      string    `gorm:"size:32;not null"`
	Label     string    `gorm:"size:255"`
	Lat       float64   `gorm:"not null"`
	Lng       float64   `gorm:"not null"`
	Note      string    `gorm:"type:text"`
	Color     string    `gorm:"size:32"`
	Icon      string    `gorm:"size:32"`
	CreatedAt time.Time `gorm:"not null"`
	CreatedBy string    `gorm:"size:64"`
}

func (SarMarkerRow) TableName() string { return "sar_markers" }

type SarLiveTrackRow struct {
	Token         string     `gorm:"primaryKey;size:64"`
	MissionID     string     `gorm:"size:64;not null;index"`
	ShiftID       string     `gorm:"size:64;not null;index"`
	SRU           string     `gorm:"size:64;not null;index"`
	MemberID      string     `gorm:"size:64;not null"`
	Callsign      string     `gorm:"size:64"`
	Color         string     `gorm:"size:32"`
	EnabledAt     time.Time  `gorm:"not null"`
	ExpiresAt     time.Time  `gorm:"not null;index"`
	LastLat       float64
	LastLng       float64
	LastAt        *time.Time
	LastAccuracyM *float64
}

func (SarLiveTrackRow) TableName() string { return "sar_live_tracks" }
