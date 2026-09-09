package domain

import (
	"strings"
	"time"
	"unicode"
)

// Citizen-facing dispatch phases (honest status on e-ticket).
const (
	CitizenPhaseSearching   = "searching"    // mencari unit
	CitizenPhaseWaitingUnit = "waiting_unit" // menunggu respons unit X
	CitizenPhaseReassigned  = "reassigned"   // dialihkan ke unit lain
	CitizenPhaseExhausted   = "exhausted"    // habis opsi cascade
	CitizenPhaseEscalated   = "escalated_psc"
	CitizenPhaseAccepted   = "accepted"
	CitizenPhaseInProgress = "in_progress"
	CitizenPhaseOnScene    = "on_scene" // petugas sudah sampai lokasi
	CitizenPhaseCompleted  = "completed"
	CitizenPhaseCancelled  = "cancelled"
	CitizenPhaseKoordinasi = "koordinasi" // relayed to community group, waiting for volunteer
)

// RejectReason values stored on dispatch attempts.
const (
	RejectReasonBusy      = "busy"
	RejectReasonOutOfArea = "out_of_area"
	RejectReasonWrongType = "wrong_type"
	RejectReasonOther     = "other"
)

// ValidRejectReason reports whether reason is one of the allowed codes.
func ValidRejectReason(reason string) bool {
	switch reason {
	case RejectReasonBusy, RejectReasonOutOfArea, RejectReasonWrongType, RejectReasonOther, "":
		return true
	default:
		return false
	}
}

// RejectReasonLabel is the Indonesian label for UI/events.
func RejectReasonLabel(reason string) string {
	switch reason {
	case RejectReasonBusy:
		return "Sedang sibuk"
	case RejectReasonOutOfArea:
		return "Di luar wilayah"
	case RejectReasonWrongType:
		return "Salah jenis layanan"
	case RejectReasonOther:
		return "Alasan lain"
	default:
		return ""
	}
}

// ResolveCitizenPhase derives an honest citizen-facing phase from ticket state.
func ResolveCitizenPhase(o OrderTicket) string {
	switch o.Status {
	case "accepted", "in_progress":
		if o.ArrivedAt != nil {
			return CitizenPhaseOnScene
		}
		// Live GPS ping counts as OTW even while status stays "accepted"
		// until petugas taps Sampai Lokasi. track_enabled_at alone is set when
		// the WA magic link is minted — before accept or GPS share.
		if o.Status == "in_progress" || o.ResponderLat != 0 || o.ResponderLng != 0 {
			return CitizenPhaseInProgress
		}
		return CitizenPhaseAccepted
	case "completed":
		return CitizenPhaseCompleted
	case "cancelled":
		return CitizenPhaseCancelled
	}

	// Pending + active community claim window → koordinasi
	if o.Status == "pending" && o.ClaimToken != "" &&
		o.ClaimExpiresAt != nil && time.Now().Before(*o.ClaimExpiresAt) {
		return CitizenPhaseKoordinasi
	}

	switch o.DispatchStatus {
	case "escalated":
		return CitizenPhaseEscalated
	case "exhausted":
		return CitizenPhaseExhausted
	case "assigned":
		if o.Status == "pending" {
			return CitizenPhaseWaitingUnit
		}
	}

	if o.DispatchRound > 1 && o.UnitName != "" {
		return CitizenPhaseReassigned
	}
	if o.UnitName != "" && (o.DispatchStatus == "searching" || o.DispatchStatus == "") {
		return CitizenPhaseWaitingUnit
	}
	return CitizenPhaseSearching
}

// NormalizePhone strips non-digits and converts leading 0 → 62 for ID numbers.
func NormalizePhone(phone string) string {
	var b strings.Builder
	for _, r := range phone {
		if unicode.IsDigit(r) {
			b.WriteRune(r)
		}
	}
	digits := b.String()
	if digits == "" {
		return ""
	}
	if strings.HasPrefix(digits, "0") {
		return "62" + digits[1:]
	}
	if strings.HasPrefix(digits, "62") {
		return digits
	}
	return digits
}

// PhoneVariants returns lookup variants (08…, 62…, raw trimmed).
func PhoneVariants(phone string) []string {
	raw := strings.TrimSpace(phone)
	norm := NormalizePhone(raw)
	seen := map[string]struct{}{}
	out := make([]string, 0, 4)
	add := func(s string) {
		if s == "" {
			return
		}
		if _, ok := seen[s]; ok {
			return
		}
		seen[s] = struct{}{}
		out = append(out, s)
	}
	add(raw)
	add(norm)
	if norm != "" && strings.HasPrefix(norm, "62") && len(norm) > 2 {
		add("0" + norm[2:])
		add("+" + norm)
	}
	return out
}
