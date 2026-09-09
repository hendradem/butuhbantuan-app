package service

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/butuhbantuan/api/internal/domain"
	"github.com/butuhbantuan/api/internal/repository"
	"github.com/butuhbantuan/api/pkg/hub"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

// ── OrderService ──────────────────────────────────────────────────────────────

type OrderService struct {
	repo        repository.OrderRepository
	pub         hub.Publisher
	pushSvc     PushUseCase
	attemptRepo repository.DispatchAttemptRepository // optional; nil-safe
	eventRepo   repository.OrderEventRepository      // optional; nil-safe
}

func NewOrderService(repo repository.OrderRepository, pub hub.Publisher, pushSvc PushUseCase) *OrderService {
	return &OrderService{repo: repo, pub: pub, pushSvc: pushSvc}
}

// WithAttemptRepo enables dispatch-attempt bookkeeping on status changes.
func (s *OrderService) WithAttemptRepo(repo repository.DispatchAttemptRepository) *OrderService {
	s.attemptRepo = repo
	return s
}

// WithEventRepo enables persistent order timeline history.
func (s *OrderService) WithEventRepo(repo repository.OrderEventRepository) *OrderService {
	s.eventRepo = repo
	return s
}

var _ OrderUseCase = (*OrderService)(nil)

func (s *OrderService) Create(o domain.OrderTicket) (*domain.OrderTicket, error) {
	result, err := s.repo.Create(o)
	if err != nil {
		return nil, err
	}
	src := result.Source
	if src == "" {
		src = "call"
	}
	msg := "Pesanan masuk"
	if src == "sos" {
		msg = "Pesanan SOS masuk"
	} else if src == "manual" {
		msg = "E-tiket dibuat manual"
	}
	if result.UnitName != "" {
		if src == "sos" {
			msg += " · menunggu respons " + result.UnitName
		} else {
			msg += " · ditugaskan ke " + result.UnitName
		}
	}
	_ = s.RecordEvent(domain.OrderEvent{
		OrderID:      result.ID,
		TicketNumber: result.TicketNumber,
		Type:         domain.OrderEventCreated,
		Message:      msg,
		Actor:        "system",
		ToUnit:       result.UnitName,
	})

	// Unit walk-in e-tickets pass Status=accepted so we skip the pending offer ring
	// (new_order) and land directly on accepted via AcceptPending's order_updated.
	if o.Status == "accepted" && result.EmergencyUUID != "" {
		accepted, aerr := s.AcceptPending(result.ID, result.EmergencyUUID)
		if aerr == nil {
			return accepted, nil
		}
		log.Printf("Create auto-accept failed (id=%s): %v", result.ID, aerr)
	}

	s.pub.PublishScoped(result.EmergencyUUID, result.RegencyID, result.ProvinceID, hub.Event{Type: "new_order", Payload: result})
	return result, nil
}

func (s *OrderService) GetByID(id string) (*domain.OrderTicket, error) {
	ticket, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	s.attachHistory(ticket)
	return ticket, nil
}

func (s *OrderService) GetByTicketNumber(number string) (*domain.OrderTicket, error) {
	ticket, err := s.repo.FindByTicketNumber(number)
	if err != nil {
		return nil, err
	}
	s.attachHistory(ticket)
	return ticket, nil
}

func (s *OrderService) GetByPublicToken(token string) (*domain.OrderTicket, error) {
	ticket, err := s.repo.FindByPublicToken(token)
	if err != nil {
		return nil, err
	}
	s.attachHistory(ticket)
	return ticket, nil
}

func (s *OrderService) GetAll() ([]domain.OrderTicket, error) {
	return s.repo.FindAll()
}

func (s *OrderService) GetByUnit(emergencyUUID, unitName string) ([]domain.OrderTicket, error) {
	return s.repo.FindByUnit(emergencyUUID, unitName)
}

func (s *OrderService) GetByWilayahScope(regencyID, provinceID string, provinceWide bool) ([]domain.OrderTicket, error) {
	return s.repo.FindByWilayahScope(regencyID, provinceID, provinceWide)
}

func (s *OrderService) UpdateStatus(id, status, handlerName, notes string) (*domain.OrderTicket, error) {
	before, _ := s.repo.FindByID(id)
	result, err := s.repo.UpdateStatus(id, status, handlerName, notes)
	if err != nil {
		return nil, err
	}
	if status == "accepted" && s.attemptRepo != nil {
		_ = s.attemptRepo.MarkAccepted(result.ID, result.EmergencyUUID)
	}
	if status == "cancelled" {
		if _, err := s.repo.DisableTrack(id); err == nil {
			result.TrackToken = ""
			result.TrackEnabledAt = nil
			result.TrackExpiresAt = nil
		}
	}
	if status == "completed" {
		// Full revoke — field magic link must not keep PII reachable after close.
		if closed, err := s.repo.DisableTrack(id); err == nil {
			result = closed
			result.TrackToken = ""
			_ = s.RecordEvent(domain.OrderEvent{
				OrderID:      result.ID,
				TicketNumber: result.TicketNumber,
				Type:         domain.OrderEventTrackDisabled,
				Message:      "Link petugas dicabut (tiket selesai)",
				Actor:        handlerName,
			})
		}
	}
	s.recordStatusEvent(before, result, status, handlerName, notes)

	if status == "accepted" {
		s.NotifyCitizenAccept(result, 0)
	} else if s.pushSvc != nil {
		label := map[string]string{
			"in_progress": "Sedang Diproses",
			"completed":   "Selesai",
			"cancelled":   "Dibatalkan",
		}[status]
		if label != "" {
			s.pushSvc.Notify(result.TicketNumber, "Update Tiket "+result.TicketNumber, "Status: "+label)
		}
	}
	if s.pub != nil {
		s.pub.PublishScoped(result.EmergencyUUID, result.RegencyID, result.ProvinceID, hub.Event{Type: "order_updated", Payload: result})
	}
	return result, nil
}

func (s *OrderService) AcceptPending(id, expectedUUID string) (*domain.OrderTicket, error) {
	before, _ := s.repo.FindByID(id)
	result, err := s.repo.AcceptPending(id, expectedUUID)
	if err != nil {
		return nil, err
	}
	if s.attemptRepo != nil {
		_ = s.attemptRepo.MarkAccepted(result.ID, result.EmergencyUUID)
	}
	// Same magic-link URL stays valid; extend TTL for field GPS / complete.
	if refreshed, rerr := s.RefreshTrackTTL(result.ID); rerr == nil && refreshed != nil {
		result = refreshed
	}
	s.recordStatusEvent(before, result, "accepted", "", "")
	if s.pub != nil {
		s.pub.PublishScoped(result.EmergencyUUID, result.RegencyID, result.ProvinceID, hub.Event{Type: "order_updated", Payload: result})
	}
	return result, nil
}

// NotifyCitizenAccept sends the calm-down callback to the requester's ticket push subscription.
func (s *OrderService) NotifyCitizenAccept(ticket *domain.OrderTicket, etaMinutes int) {
	if s.pushSvc == nil || ticket == nil {
		return
	}
	title := "Unit menerima permintaan Anda"
	body := "Tim darurat telah menerima tiket " + ticket.TicketNumber
	if ticket.UnitName != "" {
		body = ticket.UnitName + " menerima permintaan Anda"
	}
	if etaMinutes > 0 {
		body += fmt.Sprintf(". Perkiraan tiba ±%d menit", etaMinutes)
	} else {
		body += ". Mohon tetap di lokasi yang aman."
	}
	s.pushSvc.Notify(ticket.TicketNumber, title, body)
}

func (s *OrderService) RecordEvent(ev domain.OrderEvent) error {
	if s.eventRepo == nil {
		return nil
	}
	if ev.OrderID == "" || ev.Message == "" || ev.Type == "" {
		return nil
	}
	if _, err := s.eventRepo.Create(ev); err != nil {
		log.Printf("order event: %v", err)
		return err
	}
	return nil
}

func (s *OrderService) GetHistory(orderID string) ([]domain.OrderEvent, error) {
	if orderID == "" {
		return nil, repository.ErrNotFound
	}
	ticket, err := s.repo.FindByID(orderID)
	if err != nil {
		return nil, err
	}
	events, err := s.loadHistory(ticket)
	if err != nil {
		return nil, err
	}
	return events, nil
}

func (s *OrderService) attachHistory(ticket *domain.OrderTicket) {
	if ticket == nil {
		return
	}
	events, err := s.loadHistory(ticket)
	if err != nil {
		log.Printf("order history %s: %v", ticket.TicketNumber, err)
		return
	}
	ticket.History = events
}

func (s *OrderService) loadHistory(ticket *domain.OrderTicket) ([]domain.OrderEvent, error) {
	if s.eventRepo != nil {
		events, err := s.eventRepo.FindByOrderID(ticket.ID)
		if err != nil {
			return nil, err
		}
		if len(events) > 0 {
			return events, nil
		}
	}
	return synthesizeHistory(ticket, s.attemptRepo), nil
}

func (s *OrderService) recordStatusEvent(before, result *domain.OrderTicket, status, handlerName, notes string) {
	if result == nil {
		return
	}
	unit := result.UnitName
	var (
		typ string
		msg string
	)
	switch status {
	case "accepted":
		typ = domain.OrderEventAccepted
		msg = "Pesanan diterima"
		if unit != "" {
			msg += " oleh " + unit
		}
	case "in_progress":
		typ = domain.OrderEventInProgress
		msg = "Unit mulai menuju / memproses lokasi"
		if unit != "" {
			msg += " · " + unit
		}
	case "completed":
		typ = domain.OrderEventCompleted
		msg = "Pesanan selesai"
		if handlerName != "" {
			msg += " · petugas " + handlerName
		}
		if notes != "" {
			msg += " · " + notes
		}
	case "cancelled":
		typ = domain.OrderEventCancelled
		msg = "Pesanan dibatalkan"
		if unit != "" {
			msg += " · " + unit
		}
	default:
		return
	}
	_ = s.RecordEvent(domain.OrderEvent{
		OrderID:      result.ID,
		TicketNumber: result.TicketNumber,
		Type:         typ,
		Message:      msg,
		Actor:        "unit",
		ToUnit:       unit,
	})
	_ = before
}

// synthesizeHistory builds a best-effort timeline for legacy tickets without event rows.
func synthesizeHistory(ticket *domain.OrderTicket, attempts repository.DispatchAttemptRepository) []domain.OrderEvent {
	if ticket == nil {
		return nil
	}
	out := make([]domain.OrderEvent, 0, 8)
	createdMsg := "Pesanan masuk"
	if ticket.Source == "sos" {
		createdMsg = "Pesanan SOS masuk"
	}
	if ticket.UnitName != "" {
		createdMsg += " · " + ticket.UnitName
	}
	out = append(out, domain.OrderEvent{
		OrderID: ticket.ID, TicketNumber: ticket.TicketNumber,
		Type: domain.OrderEventCreated, Message: createdMsg, Actor: "system",
		ToUnit: ticket.UnitName, CreatedAt: ticket.CreatedAt,
	})

	if attempts != nil {
		rows, err := attempts.FindByOrderID(ticket.ID)
		if err == nil {
			var prev string
			for _, a := range rows {
				msg := fmt.Sprintf("Ditawarkan ke %s", a.UnitName)
				typ := domain.OrderEventOffered
				if prev != "" && prev != a.UnitName {
					typ = domain.OrderEventReassigned
					msg = fmt.Sprintf("Dialihkan dari %s ke %s", prev, a.UnitName)
				}
				out = append(out, domain.OrderEvent{
					OrderID: ticket.ID, TicketNumber: ticket.TicketNumber,
					Type: typ, Message: msg, Actor: "system",
					FromUnit: prev, ToUnit: a.UnitName, CreatedAt: a.OfferedAt,
				})
				prev = a.UnitName
			}
		}
	}

	if ticket.AcceptedAt != nil {
		msg := "Pesanan diterima"
		if ticket.UnitName != "" {
			msg += " oleh " + ticket.UnitName
		}
		out = append(out, domain.OrderEvent{
			OrderID: ticket.ID, TicketNumber: ticket.TicketNumber,
			Type: domain.OrderEventAccepted, Message: msg, Actor: "unit",
			ToUnit: ticket.UnitName, CreatedAt: *ticket.AcceptedAt,
		})
	}
	if ticket.Status == "in_progress" {
		out = append(out, domain.OrderEvent{
			OrderID: ticket.ID, TicketNumber: ticket.TicketNumber,
			Type: domain.OrderEventInProgress, Message: "Unit sedang memproses",
			Actor: "unit", ToUnit: ticket.UnitName, CreatedAt: ticket.CreatedAt.Add(time.Minute),
		})
	}
	if ticket.CompletedAt != nil {
		out = append(out, domain.OrderEvent{
			OrderID: ticket.ID, TicketNumber: ticket.TicketNumber,
			Type: domain.OrderEventCompleted, Message: "Pesanan selesai",
			Actor: "unit", ToUnit: ticket.UnitName, CreatedAt: *ticket.CompletedAt,
		})
	}
	if ticket.Status == "cancelled" {
		t := ticket.CreatedAt
		out = append(out, domain.OrderEvent{
			OrderID: ticket.ID, TicketNumber: ticket.TicketNumber,
			Type: domain.OrderEventCancelled, Message: "Pesanan dibatalkan",
			Actor: "unit", ToUnit: ticket.UnitName, CreatedAt: t,
		})
	}
	if ticket.DispatchStatus == "exhausted" {
		out = append(out, domain.OrderEvent{
			OrderID: ticket.ID, TicketNumber: ticket.TicketNumber,
			Type: domain.OrderEventExhausted, Message: "Tidak ada unit yang merespons",
			Actor: "system", CreatedAt: time.Now(),
		})
	}
	return out
}

const (
	// Pending WA-dispatch / offer links — short window so leaked chat URLs die fast.
	trackOfferTTL = 4 * time.Hour
	// After accept — field GPS / complete still needs a working link.
	trackActiveTTL = 8 * time.Hour
)

// EnableTrack creates/refreshes a magic link so field staff can share GPS without dashboard login.
// Also allowed for pending orders so dispatchers can pre-generate a respond link for WA delivery.
func (s *OrderService) EnableTrack(id, actor string) (*domain.OrderTicket, error) {
	ticket, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	if ticket.Status == "completed" || ticket.Status == "cancelled" {
		return nil, repository.ErrConflict
	}
	token := uuid.New().String()
	ttl := trackActiveTTL
	if ticket.Status == "pending" {
		ttl = trackOfferTTL
	}
	expires := time.Now().Add(ttl)
	updated, err := s.repo.EnableTrack(id, token, expires)
	if err != nil {
		return nil, err
	}
	_ = s.RecordEvent(domain.OrderEvent{
		OrderID:      updated.ID,
		TicketNumber: updated.TicketNumber,
		Type:         domain.OrderEventTrackEnabled,
		Message:      "Link bagikan lokasi petugas diaktifkan",
		Actor:        actor,
	})
	s.pub.PublishScoped(updated.EmergencyUUID, updated.RegencyID, updated.ProvinceID, hub.Event{Type: "order_updated", Payload: updated})
	return updated, nil
}

// RefreshTrackTTL extends expiry without rotating the token (keeps the same /dispatch URL).
func (s *OrderService) RefreshTrackTTL(id string) (*domain.OrderTicket, error) {
	ticket, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	if ticket.TrackToken == "" {
		return ticket, nil
	}
	if ticket.Status == "completed" || ticket.Status == "cancelled" {
		return nil, repository.ErrConflict
	}
	ttl := trackActiveTTL
	if ticket.Status == "pending" {
		ttl = trackOfferTTL
	}
	if err := s.repo.ExtendTrackExpiry(id, time.Now().Add(ttl)); err != nil {
		return nil, err
	}
	return s.repo.FindByID(id)
}

func (s *OrderService) DisableTrack(id, actor string) (*domain.OrderTicket, error) {
	updated, err := s.repo.DisableTrack(id)
	if err != nil {
		return nil, err
	}
	_ = s.RecordEvent(domain.OrderEvent{
		OrderID:      updated.ID,
		TicketNumber: updated.TicketNumber,
		Type:         domain.OrderEventTrackDisabled,
		Message:      "Link bagikan lokasi petugas dinonaktifkan",
		Actor:        actor,
	})
	s.pub.PublishScoped(updated.EmergencyUUID, updated.RegencyID, updated.ProvinceID, hub.Event{Type: "order_updated", Payload: updated})
	return updated, nil
}

// GetOfferByToken returns session data for the WA dispatch respond page.
// Unlike GetByTrackToken, this also allows pending (unaccepted) orders so a unit
// can see the offer and accept/reject without opening the dashboard.
func (s *OrderService) GetOfferByToken(token string) (*domain.OrderTicket, error) {
	ticket, err := s.repo.FindByTrackToken(strings.TrimSpace(token))
	if err != nil {
		return nil, err
	}
	if ticket.Status == "cancelled" || ticket.Status == "completed" {
		return nil, repository.ErrConflict
	}
	if ticket.TrackExpiresAt != nil && time.Now().After(*ticket.TrackExpiresAt) {
		return nil, repository.ErrConflict
	}
	return ticket, nil
}

// GetByTrackToken returns a session for the field tracking page (active tickets only).
// Completed/cancelled links are revoked — no PII over magic link after close.
func (s *OrderService) GetByTrackToken(token string) (*domain.OrderTicket, error) {
	ticket, err := s.repo.FindByTrackToken(strings.TrimSpace(token))
	if err != nil {
		return nil, err
	}
	switch ticket.Status {
	case "accepted", "in_progress":
		if ticket.TrackExpiresAt != nil && time.Now().After(*ticket.TrackExpiresAt) {
			return nil, repository.ErrConflict
		}
		return ticket, nil
	default:
		return nil, repository.ErrConflict
	}
}

func (s *OrderService) PingTrackLocation(token string, lat, lng float64) (*domain.OrderTicket, error) {
	if lat < -90 || lat > 90 || lng < -180 || lng > 180 {
		return nil, repository.ErrConflict
	}
	// Reject obvious null island / zero coords unless somehow valid Indonesia edge.
	if lat == 0 && lng == 0 {
		return nil, repository.ErrConflict
	}
	updated, err := s.repo.UpdateResponderLocation(token, lat, lng)
	if err != nil {
		return nil, err
	}
	// Citizens poll ticket; nudge unit + wilayah dispatcher streams for ops maps.
	s.pub.PublishScoped(updated.EmergencyUUID, updated.RegencyID, updated.ProvinceID, hub.Event{Type: "responder_location", Payload: updated})
	return updated, nil
}

func (s *OrderService) MarkArrivedByToken(token string) (*domain.OrderTicket, error) {
	before, _ := s.repo.FindByTrackToken(token)
	updated, err := s.repo.MarkArrivedByToken(token)
	if err != nil {
		return nil, err
	}
	s.emitArrived(before, updated)
	return updated, nil
}

func (s *OrderService) MarkArrived(id string) (*domain.OrderTicket, error) {
	before, _ := s.repo.FindByID(id)
	updated, err := s.repo.MarkArrived(id)
	if err != nil {
		return nil, err
	}
	s.emitArrived(before, updated)
	return updated, nil
}

// CompleteByToken marks the ticket completed from the field magic-link page.
// Live tracking stays active until this call; track link is then disabled.
func (s *OrderService) CompleteByToken(token, handlerName, notes string) (*domain.OrderTicket, error) {
	ticket, err := s.repo.FindByTrackToken(token)
	if err != nil {
		return nil, err
	}
	if ticket.TrackExpiresAt != nil && time.Now().After(*ticket.TrackExpiresAt) {
		return nil, repository.ErrConflict
	}
	switch ticket.Status {
	case "accepted", "in_progress":
		// ok — field may complete after on-scene / referral / return to base
	default:
		return nil, repository.ErrConflict
	}
	return s.UpdateStatus(ticket.ID, "completed", strings.TrimSpace(handlerName), strings.TrimSpace(notes))
}

func (s *OrderService) SetReferralHospital(id, hospitalID, hospitalName string) error {
	return s.repo.SetReferralHospital(id, hospitalID, hospitalName)
}

func (s *OrderService) SaveIncidentReport(id, reportJSON string) (*domain.OrderTicket, error) {
	updated, err := s.repo.SaveIncidentReport(id, reportJSON)
	if err != nil {
		return nil, err
	}
	// Sync referral hospital fields from the report JSON onto the ticket row so
	// analytics queries can aggregate by referral_hospital_name without parsing JSON.
	var report struct {
		ReferralHospitalID   string `json:"referralHospitalId"`
		ReferralHospitalName string `json:"referralHospitalName"`
	}
	if jsonErr := json.Unmarshal([]byte(reportJSON), &report); jsonErr == nil {
		if report.ReferralHospitalName != "" || updated.ReferralHospitalName == "" {
			_ = s.repo.SetReferralHospital(id, report.ReferralHospitalID, report.ReferralHospitalName)
		}
	}
	_ = s.RecordEvent(domain.OrderEvent{
		OrderID:      updated.ID,
		TicketNumber: updated.TicketNumber,
		Type:         "incident_report",
		Message:      "Laporan kejadian disimpan",
		Actor:        "unit",
	})
	return updated, nil
}

func (s *OrderService) emitArrived(before, updated *domain.OrderTicket) {
	if updated == nil {
		return
	}
	// Only emit once when newly marked.
	if before != nil && before.ArrivedAt != nil {
		return
	}
	travelNote := ""
	if updated.AcceptedAt != nil && updated.ArrivedAt != nil {
		sec := int(updated.ArrivedAt.Sub(*updated.AcceptedAt).Seconds())
		if sec < 0 {
			sec = 0
		}
		travelNote = fmt.Sprintf(" · waktu tempuh %d dtk", sec)
	}
	_ = s.RecordEvent(domain.OrderEvent{
		OrderID:      updated.ID,
		TicketNumber: updated.TicketNumber,
		Type:         domain.OrderEventArrived,
		Message:      "Petugas sudah sampai di lokasi" + travelNote,
		Actor:        "unit",
	})
	if s.pushSvc != nil {
		s.pushSvc.Notify(
			updated.TicketNumber,
			"Petugas sudah sampai",
			"Tim darurat sudah tiba di lokasi Anda.",
		)
	}
	s.pub.PublishScoped(updated.EmergencyUUID, updated.RegencyID, updated.ProvinceID, hub.Event{Type: "order_arrived", Payload: updated})
}

func (s *OrderService) relayCore(ticket *domain.OrderTicket, windowSecs int) (*domain.OrderTicket, error) {
	if ticket.Status != "pending" && ticket.Status != "accepted" {
		return nil, repository.ErrConflict
	}
	if windowSecs <= 0 {
		windowSecs = 300
	}
	claimToken := uuid.New().String()
	expiresAt := time.Now().Add(time.Duration(windowSecs) * time.Second)
	updated, err := s.repo.SetClaimToken(ticket.ID, claimToken, expiresAt)
	if err != nil {
		return nil, err
	}
	_ = s.RecordEvent(domain.OrderEvent{
		OrderID:      updated.ID,
		TicketNumber: updated.TicketNumber,
		Type:         "relay_community",
		Message:      "Pesanan diteruskan ke grup komunitas, menunggu relawan",
		Actor:        "unit",
	})
	s.pub.PublishScoped(updated.EmergencyUUID, updated.RegencyID, updated.ProvinceID,
		hub.Event{Type: "order_updated", Payload: updated})
	return updated, nil
}

func (s *OrderService) RelayToCommunity(trackToken string, windowSecs int) (*domain.OrderTicket, error) {
	ticket, err := s.repo.FindByTrackToken(strings.TrimSpace(trackToken))
	if err != nil {
		return nil, err
	}
	return s.relayCore(ticket, windowSecs)
}

func (s *OrderService) RelayToCommunityByID(orderID string, windowSecs int) (*domain.OrderTicket, error) {
	ticket, err := s.repo.FindByID(strings.TrimSpace(orderID))
	if err != nil {
		return nil, err
	}
	return s.relayCore(ticket, windowSecs)
}

func (s *OrderService) GetClaim(claimToken string) (*domain.OrderTicket, error) {
	ticket, err := s.repo.FindByClaimToken(strings.TrimSpace(claimToken))
	if err != nil {
		return nil, err
	}
	// Strip PII — volunteers only see what's needed to decide.
	ticket.RequesterPhone = ""
	ticket.RequesterName = ""
	ticket.TrackToken = ""
	ticket.ClaimToken = ""
	return ticket, nil
}

func (s *OrderService) ClaimOrder(claimToken string, in CommunityClaimInput) (*domain.OrderTicket, error) {
	volunteerName := strings.TrimSpace(in.VolunteerName)
	if volunteerName == "" {
		return nil, ErrDispatchConflict
	}

	updated, err := s.repo.ClaimOrder(claimToken, repository.ClaimInput{
		VolunteerName:  volunteerName,
		VolunteerPhone: strings.TrimSpace(in.VolunteerPhone),
		UnitLabel:      strings.TrimSpace(in.UnitLabel),
	})
	if err != nil {
		return nil, err
	}
	// Mint a fresh track token so the volunteer can share GPS / mark arrived /
	// complete via the same /dispatch page WA units use.
	if withTrack, terr := s.EnableTrack(updated.ID, "community"); terr == nil && withTrack != nil {
		updated = withTrack
	}
	handlerLabel := volunteerName
	if updated.UnitName != "" && !strings.HasPrefix(updated.UnitName, "Relawan · ") {
		handlerLabel = updated.UnitName + " · " + volunteerName
	}
	_ = s.RecordEvent(domain.OrderEvent{
		OrderID:      updated.ID,
		TicketNumber: updated.TicketNumber,
		Type:         domain.OrderEventAccepted,
		Message:      "Diklaim oleh relawan komunitas: " + handlerLabel,
		Actor:        "community",
	})
	s.pub.PublishScoped(updated.EmergencyUUID, updated.RegencyID, updated.ProvinceID,
		hub.Event{Type: "order_updated", Payload: updated})
	if s.pushSvc != nil {
		s.pushSvc.Notify(updated.TicketNumber,
			"Relawan komunitas merespons",
			"Pesanan Anda akan ditangani oleh "+handlerLabel+".",
		)
	}
	return updated, nil
}

// ── NoopOrderService ──────────────────────────────────────────────────────────

type NoopOrderService struct{}

func NewNoopOrderService() *NoopOrderService { return &NoopOrderService{} }

var _ OrderUseCase = (*NoopOrderService)(nil)

var errOrderNotSupported = errors.New("orders not supported in json storage mode")

func (s *NoopOrderService) Create(_ domain.OrderTicket) (*domain.OrderTicket, error) {
	return nil, errOrderNotSupported
}
func (s *NoopOrderService) GetByID(_ string) (*domain.OrderTicket, error) {
	return nil, errOrderNotSupported
}
func (s *NoopOrderService) GetByTicketNumber(_ string) (*domain.OrderTicket, error) {
	return nil, errOrderNotSupported
}
func (s *NoopOrderService) GetByPublicToken(_ string) (*domain.OrderTicket, error) {
	return nil, errOrderNotSupported
}
func (s *NoopOrderService) GetAll() ([]domain.OrderTicket, error) { return []domain.OrderTicket{}, nil }
func (s *NoopOrderService) GetByUnit(_, _ string) ([]domain.OrderTicket, error) {
	return []domain.OrderTicket{}, nil
}
func (s *NoopOrderService) GetByWilayahScope(_, _ string, _ bool) ([]domain.OrderTicket, error) {
	return []domain.OrderTicket{}, nil
}
func (s *NoopOrderService) UpdateStatus(_, _, _, _ string) (*domain.OrderTicket, error) {
	return nil, errOrderNotSupported
}
func (s *NoopOrderService) AcceptPending(_, _ string) (*domain.OrderTicket, error) {
	return nil, errOrderNotSupported
}
func (s *NoopOrderService) NotifyCitizenAccept(_ *domain.OrderTicket, _ int) {}
func (s *NoopOrderService) RecordEvent(_ domain.OrderEvent) error { return nil }
func (s *NoopOrderService) GetHistory(_ string) ([]domain.OrderEvent, error) {
	return nil, errOrderNotSupported
}
func (s *NoopOrderService) EnableTrack(_, _ string) (*domain.OrderTicket, error) {
	return nil, errOrderNotSupported
}
func (s *NoopOrderService) RefreshTrackTTL(_ string) (*domain.OrderTicket, error) {
	return nil, errOrderNotSupported
}
func (s *NoopOrderService) DisableTrack(_, _ string) (*domain.OrderTicket, error) {
	return nil, errOrderNotSupported
}
func (s *NoopOrderService) GetByTrackToken(_ string) (*domain.OrderTicket, error) {
	return nil, errOrderNotSupported
}
func (s *NoopOrderService) GetOfferByToken(_ string) (*domain.OrderTicket, error) {
	return nil, errOrderNotSupported
}
func (s *NoopOrderService) PingTrackLocation(_ string, _, _ float64) (*domain.OrderTicket, error) {
	return nil, errOrderNotSupported
}
func (s *NoopOrderService) MarkArrivedByToken(_ string) (*domain.OrderTicket, error) {
	return nil, errOrderNotSupported
}
func (s *NoopOrderService) MarkArrived(_ string) (*domain.OrderTicket, error) {
	return nil, errOrderNotSupported
}
func (s *NoopOrderService) CompleteByToken(_, _, _ string) (*domain.OrderTicket, error) {
	return nil, errOrderNotSupported
}
func (s *NoopOrderService) SaveIncidentReport(_, _ string) (*domain.OrderTicket, error) {
	return nil, errOrderNotSupported
}
func (s *NoopOrderService) SetReferralHospital(_, _, _ string) error {
	return errOrderNotSupported
}
func (s *NoopOrderService) RelayToCommunity(_ string, _ int) (*domain.OrderTicket, error) {
	return nil, repository.ErrNotSupported
}
func (s *NoopOrderService) RelayToCommunityByID(_ string, _ int) (*domain.OrderTicket, error) {
	return nil, repository.ErrNotSupported
}
func (s *NoopOrderService) GetClaim(_ string) (*domain.OrderTicket, error) {
	return nil, repository.ErrNotFound
}
func (s *NoopOrderService) ClaimOrder(_ string, _ CommunityClaimInput) (*domain.OrderTicket, error) {
	return nil, repository.ErrNotSupported
}

// ── NoopUnitAuthService ───────────────────────────────────────────────────────

type NoopUnitAuthService struct{}

func NewNoopUnitAuthService() *NoopUnitAuthService { return &NoopUnitAuthService{} }

var _ UnitAuthUseCase = (*NoopUnitAuthService)(nil)

func (s *NoopUnitAuthService) SetCredentials(_, _, _, _ string) error {
	return repository.ErrNotSupported
}
func (s *NoopUnitAuthService) Login(_, _ string) (*domain.UnitCredential, error) {
	return nil, errOrderNotSupported
}
func (s *NoopUnitAuthService) GetByToken(_ string) (*domain.UnitCredential, error) {
	return nil, errOrderNotSupported
}
func (s *NoopUnitAuthService) GetCredential(_ string) (*domain.UnitCredential, error) {
	return nil, repository.ErrNotFound
}
func (s *NoopUnitAuthService) ListAllCredentials() ([]domain.UnitCredential, error) {
	return nil, nil
}
func (s *NoopUnitAuthService) DeleteCredentials(_ string) error {
	return repository.ErrNotSupported
}

// ── UnitAuthService ───────────────────────────────────────────────────────────

type UnitAuthService struct {
	repo repository.UnitCredentialRepository
}

func NewUnitAuthService(repo repository.UnitCredentialRepository) *UnitAuthService {
	return &UnitAuthService{repo: repo}
}

var _ UnitAuthUseCase = (*UnitAuthService)(nil)

func (s *UnitAuthService) SetCredentials(emergencyUUID, unitName, username, password string) error {
	return s.repo.Set(domain.UnitCredential{
		EmergencyUUID: emergencyUUID,
		UnitName:      unitName,
		Username:      username,
		Password:      password,
	})
}

func (s *UnitAuthService) Login(username, password string) (*domain.UnitCredential, error) {
	cred, err := s.repo.FindByUsername(username)
	if err != nil {
		return nil, errors.New("invalid credentials")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(cred.Password), []byte(password)); err != nil {
		return nil, errors.New("invalid credentials")
	}
	return &domain.UnitCredential{
		EmergencyUUID: cred.EmergencyUUID,
		Username:      cred.Username,
		AccessToken:   cred.AccessToken,
	}, nil
}

func (s *UnitAuthService) GetByToken(token string) (*domain.UnitCredential, error) {
	return s.repo.FindByToken(token)
}

func (s *UnitAuthService) GetCredential(emergencyUUID string) (*domain.UnitCredential, error) {
	return s.repo.FindByEmergencyUUID(emergencyUUID)
}

func (s *UnitAuthService) ListAllCredentials() ([]domain.UnitCredential, error) {
	return s.repo.ListAll()
}

func (s *UnitAuthService) DeleteCredentials(emergencyUUID string) error {
	return s.repo.Delete(emergencyUUID)
}
