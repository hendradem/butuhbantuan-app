package sar

import "time"

// Store is the persistence boundary for the SAR/SMC module.
// MemoryStore + MySQL/JSON snapshot backend; swap storage without changing handlers.
type Store interface {
	GetStatus() AppConfig
	SetEnabled(enabled bool) AppConfig
	Onboard(in OnboardInput) (*AppConfig, *MissionBundle, error)

	ListMissions() []Mission
	ListShifts(missionID string) ([]Shift, error)
	GetBundle(missionID, dayOrShiftID string) (*MissionBundle, error)

	ReportPosition(missionID string, in ReportPositionInput) (*PositionReport, error)
	UpdatePosition(missionID, positionID string, in ReportPositionInput) (*PositionReport, error)
	DeletePosition(missionID, positionID string) error
	ImportLayers(missionID string, sectors []Sector, markers []CreateMarkerInput, mode string) ([]Sector, []MapMarker, error)
	AssignSector(missionID, sectorID, assignedSRU string) (*Sector, error)
	CreateMarker(missionID string, in CreateMarkerInput) (*MapMarker, error)
	UpdateMarker(missionID, markerID string, in CreateMarkerInput) (*MapMarker, error)
	DeleteMarker(missionID, markerID string) error

	EnableShare(missionID string, ttl time.Duration) (*ShareInfo, error)
	DisableShare(missionID string) (*ShareInfo, error)
	GetShare(missionID string) (*ShareInfo, error)
	GetPublicBundle(token, dayOrShiftID string) (*PublicMissionBundle, error)

	EnableLiveTrack(missionID string, in EnableLiveTrackInput) (*LiveTrack, error)
	DisableLiveTrack(missionID, sruOrToken string) error
	ListLiveTracks(missionID, shiftID string) ([]LiveTrack, error)
	GetLiveTrackSession(token string) (*LiveTrackSession, error)
	PingLiveTrack(token string, in PingLiveTrackInput) (*LiveTrackSession, error)

	UpsertTeam(missionID string, in UpsertTeamInput) (*ShiftTeam, *Member, error)
	RemoveTeam(missionID, sru, shiftID string) error
}
