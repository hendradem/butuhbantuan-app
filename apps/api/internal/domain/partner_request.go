package domain

import (
	"errors"
	"strconv"
	"strings"
	"time"
)

// Partner-request lifecycle. A citizen submits a unit for review; an admin
// contacts them and then either approves it (which creates the real Emergency
// row, still inactive until credentials exist) or rejects it.
const (
	PartnerRequestPending   = "pending"
	PartnerRequestContacted = "contacted"
	PartnerRequestApproved  = "approved"
	PartnerRequestRejected  = "rejected"
)

var (
	ErrPartnerRequestNameRequired     = errors.New("nama layanan wajib diisi")
	ErrPartnerRequestTypeRequired     = errors.New("jenis layanan wajib dipilih")
	ErrPartnerRequestContactRequired  = errors.New("nomor telepon atau WhatsApp wajib diisi")
	ErrPartnerRequestLocationRequired = errors.New("titik lokasi unit wajib ditandai di peta")
	ErrPartnerRequestStatus           = errors.New("status permintaan tidak bisa diubah dari kondisi sekarang")
)

// PartnerRequest is an inbound "daftar jadi mitra" submission. Payload is the
// same shape the admin create form posts, so approving one is a straight
// hand-off to EmergencyRepository.Create with no field mapping in between.
type PartnerRequest struct {
	ID            string     `json:"id"`
	Status        string     `json:"status"`
	Payload       Emergency  `json:"payload"`
	ReviewNote    string     `json:"review_note,omitempty"`
	ReviewedAt    *time.Time `json:"reviewed_at,omitempty"`
	ReviewedBy    string     `json:"reviewed_by,omitempty"`
	EmergencyUUID string     `json:"emergency_uuid,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

// ValidatePartnerRequest enforces the handful of fields a partner cannot skip.
// Everything else can be filled in by the admin during review.
func ValidatePartnerRequest(p PartnerRequest) error {
	if strings.TrimSpace(p.Payload.Name) == "" {
		return ErrPartnerRequestNameRequired
	}
	if p.Payload.EmergencyType.ID == 0 {
		return ErrPartnerRequestTypeRequired
	}
	if strings.TrimSpace(p.Payload.Contact.Phone) == "" && strings.TrimSpace(p.Payload.Contact.Whatsapp) == "" {
		return ErrPartnerRequestContactRequired
	}
	// A unit with no pin cannot be dispatched to, and would otherwise land on
	// 0,0 at approval time.
	if !hasCoordinates(p.Payload) {
		return ErrPartnerRequestLocationRequired
	}
	return nil
}

func hasCoordinates(e Emergency) bool {
	lat, errLat := strconv.ParseFloat(strings.TrimSpace(e.Coordinates[1]), 64)
	lng, errLng := strconv.ParseFloat(strings.TrimSpace(e.Coordinates[0]), 64)
	if errLat != nil || errLng != nil {
		return false
	}
	return lat != 0 && lng != 0
}

// NormalizePartnerRequestStatus maps empty or unknown input to pending.
func NormalizePartnerRequestStatus(s string) string {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case PartnerRequestContacted:
		return PartnerRequestContacted
	case PartnerRequestApproved:
		return PartnerRequestApproved
	case PartnerRequestRejected:
		return PartnerRequestRejected
	default:
		return PartnerRequestPending
	}
}

// IsPartnerRequestStatus reports whether s is one of the four known statuses.
func IsPartnerRequestStatus(s string) bool {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case PartnerRequestPending, PartnerRequestContacted, PartnerRequestApproved, PartnerRequestRejected:
		return true
	default:
		return false
	}
}

// CanTransitionPartnerRequest reports whether from → to is allowed. Approved
// and rejected are terminal, so a decision is never silently overwritten.
//
// `from` is compared literally rather than normalized: only a row that really
// is pending or contacted may move. Normalizing here would let an unrecognized
// status read as pending and get approved by mistake.
func CanTransitionPartnerRequest(from, to string) bool {
	if !IsPartnerRequestStatus(to) {
		return false
	}
	switch strings.ToLower(strings.TrimSpace(from)) {
	case PartnerRequestPending:
		return to == PartnerRequestContacted || to == PartnerRequestApproved || to == PartnerRequestRejected
	case PartnerRequestContacted:
		return to == PartnerRequestApproved || to == PartnerRequestRejected
	default:
		return false
	}
}
