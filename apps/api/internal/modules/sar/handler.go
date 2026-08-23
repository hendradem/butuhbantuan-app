package sar

import (
	"errors"
	"strings"
	"time"

	"github.com/butuhbantuan/api/pkg/response"
	"github.com/gofiber/fiber/v2"
)

// Handler exposes SAR/SMC HTTP API (admin + public share).
type Handler struct {
	store Store
}

func NewHandler(store Store) *Handler {
	if store == nil {
		store = NewMemoryStore()
	}
	return &Handler{store: store}
}

func (h *Handler) GetStatus(c *fiber.Ctx) error {
	return response.OK(c, "success", h.store.GetStatus())
}

func (h *Handler) SetEnabled(c *fiber.Ctx) error {
	var body SetEnabledInput
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	return response.OK(c, "updated", h.store.SetEnabled(body.Enabled))
}

func (h *Handler) Onboard(c *fiber.Ctx) error {
	var body OnboardInput
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	cfg, bundle, err := h.store.Onboard(body)
	if err != nil {
		if errors.Is(err, ErrDisabled) {
			return response.Error(c, fiber.StatusConflict, "aktifkan aplikasi dulu")
		}
		if errors.Is(err, ErrBadInput) {
			return response.Error(c, fiber.StatusBadRequest, "nama misi dan minimal 1 SRU wajib")
		}
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.OK(c, "onboarded", fiber.Map{
		"status": cfg,
		"bundle": bundle,
	})
}

func (h *Handler) ListMissions(c *fiber.Ctx) error {
	return response.OK(c, "success", h.store.ListMissions())
}

func (h *Handler) GetMission(c *fiber.Ctx) error {
	day := c.Query("day")
	if day == "" {
		day = c.Query("shift")
	}
	bundle, err := h.store.GetBundle(c.Params("id"), day)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return response.Error(c, fiber.StatusNotFound, "mission not found")
		}
		return response.Error(c, fiber.StatusInternalServerError, "failed to load mission")
	}
	return response.OK(c, "success", bundle)
}

func (h *Handler) ListShifts(c *fiber.Ctx) error {
	list, err := h.store.ListShifts(c.Params("id"))
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return response.Error(c, fiber.StatusNotFound, "mission not found")
		}
		return response.Error(c, fiber.StatusInternalServerError, "failed to list shifts")
	}
	return response.OK(c, "success", list)
}

func (h *Handler) ReportPosition(c *fiber.Ctx) error {
	var body ReportPositionInput
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	if body.MemberID == "" {
		return response.Error(c, fiber.StatusBadRequest, "member_id is required")
	}
	if body.Lat < -90 || body.Lat > 90 || body.Lng < -180 || body.Lng > 180 {
		return response.Error(c, fiber.StatusBadRequest, "lat/lng out of range")
	}
	rep, err := h.store.ReportPosition(c.Params("id"), body)
	if err != nil {
		return mapStoreErr(c, err, "failed to log position")
	}
	return response.OK(c, "position logged", rep)
}

func (h *Handler) UpdatePosition(c *fiber.Ctx) error {
	var body ReportPositionInput
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	if body.Lat < -90 || body.Lat > 90 || body.Lng < -180 || body.Lng > 180 {
		return response.Error(c, fiber.StatusBadRequest, "lat/lng out of range")
	}
	rep, err := h.store.UpdatePosition(c.Params("id"), c.Params("positionId"), body)
	if err != nil {
		return mapStoreErr(c, err, "failed to update position")
	}
	return response.OK(c, "position updated", rep)
}

func (h *Handler) DeletePosition(c *fiber.Ctx) error {
	if err := h.store.DeletePosition(c.Params("id"), c.Params("positionId")); err != nil {
		return mapStoreErr(c, err, "failed to delete position")
	}
	return response.OK(c, "position deleted", nil)
}

type importSectorsBody struct {
	Mode    string              `json:"mode"` // replace | append
	Sectors []Sector            `json:"sectors"`
	Markers []CreateMarkerInput `json:"markers"`
}

func (h *Handler) ImportSectors(c *fiber.Ctx) error {
	var body importSectorsBody
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	mode := strings.ToLower(strings.TrimSpace(body.Mode))
	if mode == "" {
		mode = "replace"
	}
	if mode != "replace" && mode != "append" {
		return response.Error(c, fiber.StatusBadRequest, "mode must be replace or append")
	}
	if len(body.Sectors) == 0 && len(body.Markers) == 0 {
		return response.Error(c, fiber.StatusBadRequest, "sectors or markers required")
	}
	secs, mks, err := h.store.ImportLayers(c.Params("id"), body.Sectors, body.Markers, mode)
	if err != nil {
		return mapStoreErr(c, err, "failed to import layers")
	}
	return response.OK(c, "layers imported", fiber.Map{
		"sectors": secs,
		"markers": mks,
	})
}

func (h *Handler) AssignSector(c *fiber.Ctx) error {
	var body AssignSectorInput
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	out, err := h.store.AssignSector(c.Params("id"), c.Params("sectorId"), strings.TrimSpace(body.AssignedSRU))
	if err != nil {
		return mapStoreErr(c, err, "failed to assign sector")
	}
	return response.OK(c, "sector assigned", out)
}

func (h *Handler) CreateMarker(c *fiber.Ctx) error {
	var body CreateMarkerInput
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	if body.Lat < -90 || body.Lat > 90 || body.Lng < -180 || body.Lng > 180 {
		return response.Error(c, fiber.StatusBadRequest, "lat/lng out of range")
	}
	out, err := h.store.CreateMarker(c.Params("id"), body)
	if err != nil {
		return mapStoreErr(c, err, "failed to create marker")
	}
	return response.OK(c, "marker created", out)
}

func (h *Handler) UpdateMarker(c *fiber.Ctx) error {
	var body CreateMarkerInput
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	if body.Lat < -90 || body.Lat > 90 || body.Lng < -180 || body.Lng > 180 {
		return response.Error(c, fiber.StatusBadRequest, "lat/lng out of range")
	}
	out, err := h.store.UpdateMarker(c.Params("id"), c.Params("markerId"), body)
	if err != nil {
		return mapStoreErr(c, err, "failed to update marker")
	}
	return response.OK(c, "marker updated", out)
}

func (h *Handler) DeleteMarker(c *fiber.Ctx) error {
	if err := h.store.DeleteMarker(c.Params("id"), c.Params("markerId")); err != nil {
		return mapStoreErr(c, err, "failed to delete marker")
	}
	return response.OK(c, "marker deleted", nil)
}

func (h *Handler) GetShare(c *fiber.Ctx) error {
	info, err := h.store.GetShare(c.Params("id"))
	if err != nil {
		return mapStoreErr(c, err, "failed to get share")
	}
	return response.OK(c, "success", info)
}

func (h *Handler) EnableShare(c *fiber.Ctx) error {
	var body EnableShareInput
	_ = c.BodyParser(&body)
	ttl := defaultShareTTL
	if body.TTLHours > 0 {
		ttl = time.Duration(body.TTLHours) * time.Hour
	}
	info, err := h.store.EnableShare(c.Params("id"), ttl)
	if err != nil {
		return mapStoreErr(c, err, "failed to enable share")
	}
	return response.OK(c, "share enabled", info)
}

func (h *Handler) DisableShare(c *fiber.Ctx) error {
	info, err := h.store.DisableShare(c.Params("id"))
	if err != nil {
		return mapStoreErr(c, err, "failed to disable share")
	}
	return response.OK(c, "share disabled", info)
}

func (h *Handler) EnableLiveTrack(c *fiber.Ctx) error {
	var in EnableLiveTrackInput
	_ = c.BodyParser(&in)
	track, err := h.store.EnableLiveTrack(c.Params("id"), in)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return response.Error(c, fiber.StatusNotFound, "SRU belum punya roster — tambah SRU di Settings dulu")
		}
		if errors.Is(err, ErrBadInput) {
			return response.Error(c, fiber.StatusBadRequest, "pilih SRU dulu")
		}
		return mapStoreErr(c, err, "failed to enable live track")
	}
	return response.OK(c, "live track enabled", track)
}

func (h *Handler) DisableLiveTrack(c *fiber.Ctx) error {
	var body struct {
		SRU   string `json:"sru"`
		Token string `json:"token"`
	}
	_ = c.BodyParser(&body)
	key := body.Token
	if key == "" {
		key = body.SRU
	}
	if key == "" {
		key = c.Query("sru")
	}
	if key == "" {
		return response.Error(c, fiber.StatusBadRequest, "sru or token required")
	}
	if err := h.store.DisableLiveTrack(c.Params("id"), key); err != nil {
		return mapStoreErr(c, err, "failed to disable live track")
	}
	return response.OK(c, "live track disabled", nil)
}

func (h *Handler) ListLiveTracks(c *fiber.Ctx) error {
	list, err := h.store.ListLiveTracks(c.Params("id"), c.Query("shift"))
	if err != nil {
		return mapStoreErr(c, err, "failed to list live tracks")
	}
	return response.OK(c, "success", list)
}

func (h *Handler) GetLiveTrackSession(c *fiber.Ctx) error {
	sess, err := h.store.GetLiveTrackSession(c.Params("token"))
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return response.Error(c, fiber.StatusNotFound, "track not found")
		}
		return response.Error(c, fiber.StatusInternalServerError, "failed to load track")
	}
	return response.OK(c, "success", sess)
}

func (h *Handler) PingLiveTrack(c *fiber.Ctx) error {
	var in PingLiveTrackInput
	if err := c.BodyParser(&in); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid body")
	}
	sess, err := h.store.PingLiveTrack(c.Params("token"), in)
	if err != nil {
		if errors.Is(err, ErrExpired) {
			return response.Error(c, fiber.StatusGone, "track link expired")
		}
		if errors.Is(err, ErrNotFound) {
			return response.Error(c, fiber.StatusNotFound, "track not found")
		}
		if errors.Is(err, ErrBadInput) {
			return response.Error(c, fiber.StatusBadRequest, "invalid coordinates")
		}
		if errors.Is(err, ErrReadOnly) {
			return response.Error(c, fiber.StatusForbidden, "arsip ESAR bersifat view-only")
		}
		return response.Error(c, fiber.StatusInternalServerError, "failed to ping")
	}
	return response.OK(c, "ok", sess)
}

// GetPublicShare is unauthenticated view-only access via share token.
func (h *Handler) GetPublicShare(c *fiber.Ctx) error {
	day := c.Query("day")
	if day == "" {
		day = c.Query("shift")
	}
	bundle, err := h.store.GetPublicBundle(c.Params("token"), day)
	if err != nil {
		if errors.Is(err, ErrExpired) {
			return response.Error(c, fiber.StatusGone, "share link expired")
		}
		if errors.Is(err, ErrNotFound) || errors.Is(err, ErrShareOff) {
			return response.Error(c, fiber.StatusNotFound, "share not found")
		}
		return response.Error(c, fiber.StatusInternalServerError, "failed to load share")
	}
	return response.OK(c, "success", bundle)
}

func mapStoreErr(c *fiber.Ctx, err error, fallback string) error {
	if errors.Is(err, ErrNotFound) {
		return response.Error(c, fiber.StatusNotFound, "not found")
	}
	if errors.Is(err, ErrBadInput) {
		return response.Error(c, fiber.StatusBadRequest, "invalid input")
	}
	if errors.Is(err, ErrReadOnly) {
		return response.Error(c, fiber.StatusForbidden, "arsip ESAR bersifat view-only")
	}
	return response.Error(c, fiber.StatusInternalServerError, fallback)
}

func (h *Handler) UpsertTeam(c *fiber.Ctx) error {
	var in UpsertTeamInput
	if err := c.BodyParser(&in); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid body")
	}
	team, member, err := h.store.UpsertTeam(c.Params("id"), in)
	if err != nil {
		if errors.Is(err, ErrBadInput) {
			return response.Error(c, fiber.StatusBadRequest, "nama SRU wajib diisi")
		}
		return mapStoreErr(c, err, "failed to save SRU")
	}
	return response.OK(c, "sru saved", fiber.Map{
		"team":   team,
		"member": member,
	})
}

func (h *Handler) RemoveTeam(c *fiber.Ctx) error {
	sru := c.Params("sru")
	if sru == "" {
		sru = c.Query("sru")
	}
	if err := h.store.RemoveTeam(c.Params("id"), sru, c.Query("shift")); err != nil {
		return mapStoreErr(c, err, "failed to remove SRU")
	}
	return response.OK(c, "sru removed", nil)
}

// Mount registers admin routes on the given group (already prefixed /apps/sar + adminAuth).
func Mount(g fiber.Router, h *Handler) {
	g.Get("/status", h.GetStatus)
	g.Patch("/status", h.SetEnabled)
	g.Post("/onboard", h.Onboard)
	g.Get("/missions", h.ListMissions)
	g.Get("/missions/:id", h.GetMission)
	g.Get("/missions/:id/shifts", h.ListShifts)
	g.Post("/missions/:id/positions", h.ReportPosition)
	g.Patch("/missions/:id/positions/:positionId", h.UpdatePosition)
	g.Delete("/missions/:id/positions/:positionId", h.DeletePosition)
	g.Post("/missions/:id/sectors", h.ImportSectors)
	g.Patch("/missions/:id/sectors/:sectorId", h.AssignSector)
	g.Post("/missions/:id/markers", h.CreateMarker)
	g.Patch("/missions/:id/markers/:markerId", h.UpdateMarker)
	g.Delete("/missions/:id/markers/:markerId", h.DeleteMarker)
	g.Get("/missions/:id/share", h.GetShare)
	g.Post("/missions/:id/share/enable", h.EnableShare)
	g.Post("/missions/:id/share/disable", h.DisableShare)
	g.Get("/missions/:id/live-tracks", h.ListLiveTracks)
	g.Post("/missions/:id/live-track/enable", h.EnableLiveTrack)
	g.Post("/missions/:id/live-track/disable", h.DisableLiveTrack)
	g.Post("/missions/:id/teams", h.UpsertTeam)
	g.Delete("/missions/:id/teams/:sru", h.RemoveTeam)
}

// MountPublic registers unauthenticated view-only share routes.
func MountPublic(g fiber.Router, h *Handler) {
	g.Get("/:token", h.GetPublicShare)
}

// MountLiveTrack registers field GPS magic-link routes.
func MountLiveTrack(g fiber.Router, h *Handler) {
	g.Get("/:token", h.GetLiveTrackSession)
	g.Post("/:token", h.PingLiveTrack)
}
