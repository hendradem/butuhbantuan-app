package service

import (
	"errors"
	"log"
	"sort"
	"time"

	"github.com/butuhbantuan/api/internal/domain"
	"github.com/butuhbantuan/api/internal/repository"
	"github.com/butuhbantuan/api/pkg/hub"
)

var (
	ErrDispatchForbidden = errors.New("not allowed to act on this order")
	ErrDispatchConflict  = errors.New("order is not in a state that allows this action")
)

// DispatchUseCase ranks units, assigns SOS tickets, and supports manual accept/reject/reassign.
type DispatchUseCase interface {
	AssignSOS(alert domain.SOSAlert) (*domain.DispatchResult, error)
	EscalateOverdue() (int, error)
	Accept(orderID, actorUUID string, admin bool) (*domain.OrderTicket, error)
	Reject(orderID, actorUUID string, admin bool, reason, note string) (*domain.OrderTicket, error)
	ReassignTo(orderID, targetUUID, actorUUID string, admin bool) (*domain.OrderTicket, error)
	ReassignBest(orderID, actorUUID string, admin bool) (*domain.OrderTicket, error)
	EscalateToPSC(orderID, actorUUID string, admin bool) (*domain.OrderTicket, error)
	ListCandidates(orderID string) ([]domain.RankedCandidate, error)
	// AuthorizeOrder checks admin / assigned unit / wilayah dispatcher access.
	AuthorizeOrder(orderID, actorUUID string, admin bool) error
}

type DispatchService struct {
	emergencyRepo repository.EmergencyRepository
	typeRepo      repository.EmergencyTypeRepository
	orderRepo     repository.OrderRepository
	attemptRepo   repository.DispatchAttemptRepository
	orderSvc      OrderUseCase
	pub           hub.Publisher
	pushSvc       PushUseCase
	sla           time.Duration
}

func NewDispatchService(
	emergencyRepo repository.EmergencyRepository,
	orderRepo repository.OrderRepository,
	attemptRepo repository.DispatchAttemptRepository,
	orderSvc OrderUseCase,
	pub hub.Publisher,
	pushSvc PushUseCase,
	sla time.Duration,
) *DispatchService {
	if sla <= 0 {
		sla = domain.DefaultDispatchSLA
	}
	if pushSvc == nil {
		pushSvc = NewNoopPushService()
	}
	return &DispatchService{
		emergencyRepo: emergencyRepo,
		orderRepo:     orderRepo,
		attemptRepo:   attemptRepo,
		orderSvc:      orderSvc,
		pub:           pub,
		pushSvc:       pushSvc,
		sla:           sla,
	}
}

// WithTypeRepo enables resolving emergency type names for family-based routing.
func (s *DispatchService) WithTypeRepo(typeRepo repository.EmergencyTypeRepository) *DispatchService {
	s.typeRepo = typeRepo
	return s
}

var _ DispatchUseCase = (*DispatchService)(nil)

// AssignSOS picks the best dispatcher and creates a ticket with an SLA deadline.
func (s *DispatchService) AssignSOS(alert domain.SOSAlert) (*domain.DispatchResult, error) {
	candidate, err := s.pickCandidate(alert.Lat, alert.Lng, alert.TypeID, alert.RegencyID, alert.ProvinceID, nil)
	if err != nil {
		return nil, err
	}

	deadline := time.Now().Add(s.sla)
	ticketInput := domain.OrderTicket{
		RequesterName:  alert.Name,
		RequesterPhone: alert.Phone,
		Location:       alert.Address,
		Condition:      alert.Description,
		PhotoURL:       alert.PhotoURL,
		RequesterLat:   alert.Lat,
		RequesterLng:   alert.Lng,
		Source:         "sos",
		TypeID:         alert.TypeID,
		RegencyID:      alert.RegencyID,
		ProvinceID:     alert.ProvinceID,
		DispatchRound:  1,
		DispatchStatus: "searching",
		SlaDeadline:    &deadline,
	}

	if candidate == nil {
		// No unit available — still create a searchable ticket shell without assignee.
		ticketInput.DispatchStatus = "exhausted"
		ticketInput.SlaDeadline = nil
		ticketInput.DispatchRound = 0
		ticket, err := s.orderSvc.Create(ticketInput)
		if err != nil {
			return nil, err
		}
		_ = s.orderSvc.RecordEvent(domain.OrderEvent{
			OrderID:      ticket.ID,
			TicketNumber: ticket.TicketNumber,
			Type:         domain.OrderEventExhausted,
			Message:      "Tidak ada unit yang cocok di wilayah ini",
			Actor:        "system",
		})
		return &domain.DispatchResult{Ticket: ticket}, nil
	}

	ticketInput.EmergencyUUID = candidate.Emergency.ID
	ticketInput.UnitName = candidate.Emergency.Name

	ticket, err := s.orderSvc.Create(ticketInput)
	if err != nil {
		return nil, err
	}

	attempt, err := s.recordOffer(ticket, *candidate, 1)
	if err != nil {
		log.Printf("dispatch: failed to record attempt for %s: %v", ticket.TicketNumber, err)
	}
	_ = s.orderSvc.RecordEvent(domain.OrderEvent{
		OrderID:      ticket.ID,
		TicketNumber: ticket.TicketNumber,
		Type:         domain.OrderEventOffered,
		Message:      "Ditawarkan ke " + candidate.Emergency.Name,
		Actor:        "system",
		ToUnit:       candidate.Emergency.Name,
		Tier:         domain.DispatchTierOf(candidate.Emergency),
	})

	return &domain.DispatchResult{
		Ticket:    ticket,
		Attempt:   attempt,
		Candidate: candidate,
	}, nil
}

// EscalateOverdue reassigns pending SOS tickets whose SLA has elapsed.
func (s *DispatchService) EscalateOverdue() (int, error) {
	overdue, err := s.orderRepo.FindPendingPastSLA(time.Now())
	if err != nil {
		return 0, err
	}
	escalated := 0
	for i := range overdue {
		if err := s.escalateOne(&overdue[i]); err != nil {
			log.Printf("dispatch: escalate %s: %v", overdue[i].TicketNumber, err)
			continue
		}
		escalated++
	}
	return escalated, nil
}

func (s *DispatchService) escalateOne(ticket *domain.OrderTicket) error {
	_ = s.attemptRepo.ResolveOffered(ticket.ID, domain.DispatchAttemptTimedOut)
	_, err := s.offerNext(ticket, "Unit sebelumnya belum merespons. Menghubungkan ke ")
	return err
}

// Accept marks a pending offer as accepted by the assigned unit (or admin/ops on their behalf).
func (s *DispatchService) Accept(orderID, actorUUID string, admin bool) (*domain.OrderTicket, error) {
	ticket, err := s.orderRepo.FindByID(orderID)
	if err != nil {
		return nil, err
	}
	if err := s.authorizeActor(ticket, actorUUID, admin); err != nil {
		return nil, err
	}
	if ticket.Status != "pending" {
		return nil, ErrDispatchConflict
	}
	// Ops dispatcher / admin may accept on behalf of the current assignee.
	ops := !admin && actorUUID != "" && ticket.EmergencyUUID != actorUUID && s.canOpsAct(ticket, actorUUID)
	expected := ""
	if !admin && !ops {
		expected = ticket.EmergencyUUID
		if expected == "" {
			expected = actorUUID
		}
	}
	updated, err := s.orderSvc.AcceptPending(orderID, expected)
	if errors.Is(err, repository.ErrConflict) {
		return nil, ErrDispatchConflict
	}
	if err != nil {
		return nil, err
	}
	eta := 0
	if updated.EmergencyUUID != "" && (updated.RequesterLat != 0 || updated.RequesterLng != 0) {
		if units, eerr := s.emergencyRepo.FindByIDs([]string{updated.EmergencyUUID}); eerr == nil && len(units) > 0 {
			ulat, ulng := parseCoords(units[0].Coordinates)
			eta = domain.EstimateETAMinutes(ulat, ulng, updated.RequesterLat, updated.RequesterLng, 40)
			updated.ETAMinutes = eta
			updated.UnitPhone = units[0].Contact.Phone
			updated.UnitWhatsapp = units[0].Contact.Whatsapp
		}
	}
	s.orderSvc.NotifyCitizenAccept(updated, eta)
	return updated, nil
}

// Reject declines the current unit offer and auto-assigns the next same-type candidate.
// The citizen ticket stays pending (not cancelled).
func (s *DispatchService) Reject(orderID, actorUUID string, admin bool, reason, note string) (*domain.OrderTicket, error) {
	ticket, err := s.orderRepo.FindByID(orderID)
	if err != nil {
		return nil, err
	}
	if err := s.authorizeActor(ticket, actorUUID, admin); err != nil {
		return nil, err
	}
	if ticket.Status != "pending" {
		return nil, ErrDispatchConflict
	}
	if !domain.ValidRejectReason(reason) {
		return nil, ErrDispatchConflict
	}
	if reason == "" {
		reason = domain.RejectReasonOther
	}
	_ = s.attemptRepo.RejectOffered(ticket.ID, reason, note)
	fromUnit := ticket.UnitName
	msg := rejectMessage(fromUnit)
	if label := domain.RejectReasonLabel(reason); label != "" {
		msg += " · " + label
	}
	if note != "" {
		msg += " · " + note
	}
	_ = s.orderSvc.RecordEvent(domain.OrderEvent{
		OrderID:      ticket.ID,
		TicketNumber: ticket.TicketNumber,
		Type:         domain.OrderEventRejected,
		Message:      msg,
		Actor:        actorLabel(admin),
		FromUnit:     fromUnit,
	})
	return s.offerNext(ticket, "Unit sebelumnya menolak. Menghubungkan ke ")
}

// ReassignTo manually moves a ticket to a chosen emergency unit (same type family).
func (s *DispatchService) ReassignTo(orderID, targetUUID, actorUUID string, admin bool) (*domain.OrderTicket, error) {
	if targetUUID == "" {
		return nil, ErrDispatchConflict
	}
	ticket, err := s.orderRepo.FindByID(orderID)
	if err != nil {
		return nil, err
	}
	if err := s.authorizeActor(ticket, actorUUID, admin); err != nil {
		return nil, err
	}
	if ticket.Status != "pending" && ticket.Status != "accepted" {
		return nil, ErrDispatchConflict
	}
	if targetUUID == ticket.EmergencyUUID && ticket.Status == "pending" {
		return ticket, nil
	}

	units, err := s.emergencyRepo.FindByIDs([]string{targetUUID})
	if err != nil || len(units) == 0 {
		return nil, repository.ErrNotFound
	}
	target := units[0]
	if !s.compatibleType(ticket, target) {
		return nil, ErrDispatchConflict
	}

	_ = s.attemptRepo.ResolveOffered(ticket.ID, domain.DispatchAttemptSuperseded)

	nextRound := ticket.DispatchRound + 1
	if nextRound < 1 {
		nextRound = 1
	}
	deadline := time.Now().Add(s.sla)
	prevUUID := ticket.EmergencyUUID
	prevName := ticket.UnitName

	updated, err := s.orderRepo.Reassign(
		ticket.ID,
		prevUUID,
		target.ID,
		target.Name,
		nextRound,
		&deadline,
		"searching",
	)
	if errors.Is(err, repository.ErrConflict) {
		return nil, ErrDispatchConflict
	}
	if err != nil {
		return nil, err
	}

	cand := domain.RankedCandidate{Emergency: target, Tier: domain.DispatchTierOf(target)}
	if _, err := s.recordOffer(updated, cand, nextRound); err != nil {
		log.Printf("dispatch: record manual reassign %s: %v", updated.TicketNumber, err)
	}
	s.notifyReassigned(updated, prevUUID, target.ID, target.Name, nextRound, "Pesanan dialihkan ke "+target.Name+".")
	_ = s.orderSvc.RecordEvent(domain.OrderEvent{
		OrderID:      updated.ID,
		TicketNumber: updated.TicketNumber,
		Type:         domain.OrderEventReassigned,
		Message:      reassignMessage(prevName, target.Name),
		Actor:        actorLabel(admin),
		FromUnit:     prevName,
		ToUnit:       target.Name,
		Tier:         domain.DispatchTierOf(target),
	})
	return updated, nil
}

// ReassignBest assigns the top-ranked same-type candidate (system recommendation).
func (s *DispatchService) ReassignBest(orderID, actorUUID string, admin bool) (*domain.OrderTicket, error) {
	ticket, err := s.orderRepo.FindByID(orderID)
	if err != nil {
		return nil, err
	}
	if err := s.authorizeActor(ticket, actorUUID, admin); err != nil {
		return nil, err
	}
	if ticket.Status != "pending" && ticket.Status != "accepted" {
		return nil, ErrDispatchConflict
	}
	ranked, err := s.ListCandidates(orderID)
	if err != nil {
		return nil, err
	}
	if len(ranked) == 0 {
		return nil, ErrDispatchConflict
	}
	return s.ReassignTo(orderID, ranked[0].Emergency.ID, actorUUID, admin)
}

// EscalateToPSC marks an exhausted/pending ticket as escalated to PSC hotline.
// Ticket stays alive (pending) with a tap-to-call number for ops + citizen.
func (s *DispatchService) EscalateToPSC(orderID, actorUUID string, admin bool) (*domain.OrderTicket, error) {
	ticket, err := s.orderRepo.FindByID(orderID)
	if err != nil {
		return nil, err
	}
	if err := s.authorizeActor(ticket, actorUUID, admin); err != nil {
		return nil, err
	}
	if ticket.Status != "pending" {
		return nil, ErrDispatchConflict
	}

	hotline := ""
	label := "Pusat darurat wilayah"
	emergencyUUID := ""
	unitName := ""

	rt := s.routingFor(ticket)
	typeName := s.resolveTypeName(rt.typeID)
	reqFam := typeFamily(typeName)
	if reqFam == "medical" || reqFam == "" {
		hotline = "119"
		label = "PSC / SPGDT 119"
	}

	// Prefer a PSC-like unit in the same province / regency, matching type family.
	if all, err := s.emergencyRepo.FindAll(); err == nil {
		var best *domain.Emergency
		bestScore := 1e9
		for i := range all {
			e := &all[i]
			if !isPSCPartner(*e) && !e.IsProvinceDispatcher && !e.IsDispatcher {
				continue
			}
			// Prefer PSC branding; allow province dispatcher as fallback.
			familyOK := matchesRequestedType(*e, rt.typeID, reqFam) || (reqFam == "medical" && isPSCPartner(*e))
			if reqFam != "" && !familyOK {
				continue
			}
			if rt.provinceID != "" && e.Address.ProvinceID != "" && e.Address.ProvinceID != rt.provinceID {
				continue
			}
			score := 20.0
			if isPSCPartner(*e) {
				score -= 10
			}
			if rt.regencyID != "" && e.Address.RegencyID == rt.regencyID {
				score -= 5
			}
			if e.IsProvinceDispatcher {
				score -= 2
			}
			if score < bestScore {
				bestScore = score
				best = e
			}
		}
		if best != nil {
			emergencyUUID = best.ID
			unitName = best.Name
			label = best.Name
			if best.Contact.Phone != "" {
				hotline = best.Contact.Phone
			} else if best.Contact.Whatsapp != "" {
				hotline = best.Contact.Whatsapp
			}
		}
	}
	if hotline == "" {
		hotline = "119"
	}

	updated, err := s.orderRepo.MarkEscalated(ticket.ID, hotline, label, emergencyUUID, unitName)
	if errors.Is(err, repository.ErrConflict) {
		return nil, ErrDispatchConflict
	}
	if err != nil {
		return nil, err
	}

	_ = s.orderSvc.RecordEvent(domain.OrderEvent{
		OrderID:      updated.ID,
		TicketNumber: updated.TicketNumber,
		Type:         domain.OrderEventEscalatedPSC,
		Message:      "Dieskalasi ke " + label + " · " + hotline,
		Actor:        "admin",
		ToUnit:       label,
		Tier:         domain.DispatchTierProvince,
	})
	s.pushSvc.Notify(
		updated.TicketNumber,
		"Tim ops menghubungi pusat darurat",
		"Tiket Anda dieskalasi ke "+label+". Hubungi "+hotline+" bila kondisi mendesak.",
	)
	if s.pub != nil {
		payload := updated
		if emergencyUUID != "" {
			s.pub.Publish(emergencyUUID, hub.Event{Type: "new_order", Payload: payload})
		}
		if ticket.EmergencyUUID != "" && ticket.EmergencyUUID != emergencyUUID {
			s.pub.Publish(ticket.EmergencyUUID, hub.Event{
				Type:    "order_dispatch_exhausted",
				Payload: updated,
			})
		}
	}
	return updated, nil
}

// ListCandidates returns cascade-ordered candidates for reassignment UI:
// 1) unit sekabupaten → 2) dispatcher kabupaten → 3) dispatcher provinsi.
func (s *DispatchService) ListCandidates(orderID string) ([]domain.RankedCandidate, error) {
	ticket, err := s.orderRepo.FindByID(orderID)
	if err != nil {
		return nil, err
	}
	exclude := map[string]struct{}{}
	if ticket.EmergencyUUID != "" {
		exclude[ticket.EmergencyUUID] = struct{}{}
	}
	rt := s.routingFor(ticket)
	ranked, err := s.rankCascade(
		ticket.RequesterLat, ticket.RequesterLng,
		rt.typeID, rt.typeName, rt.regencyID, rt.provinceID,
		exclude,
	)
	if err != nil {
		return nil, err
	}
	if len(ranked) > 30 {
		ranked = ranked[:30]
	}
	return ranked, nil
}

type routingCtx struct {
	typeID     uint
	typeName   string
	regencyID  string
	provinceID string
}

// routingFor resolves type/region for dispatch. Call orders often lack these
// fields — infer from the currently assigned emergency unit.
func (s *DispatchService) routingFor(ticket *domain.OrderTicket) routingCtx {
	ctx := routingCtx{
		typeID:     ticket.TypeID,
		typeName:   s.resolveTypeName(ticket.TypeID),
		regencyID:  ticket.RegencyID,
		provinceID: ticket.ProvinceID,
	}
	if ticket.EmergencyUUID == "" {
		return ctx
	}
	if ctx.typeID > 0 && ctx.typeName != "" && ctx.regencyID != "" && ctx.provinceID != "" {
		return ctx
	}
	units, err := s.emergencyRepo.FindByIDs([]string{ticket.EmergencyUUID})
	if err != nil || len(units) == 0 {
		return ctx
	}
	u := units[0]
	if ctx.typeID == 0 {
		ctx.typeID = uint(u.EmergencyType.ID)
	}
	if ctx.typeName == "" {
		ctx.typeName = u.EmergencyType.Name
	}
	if ctx.regencyID == "" {
		ctx.regencyID = u.Address.RegencyID
	}
	if ctx.provinceID == "" {
		ctx.provinceID = u.Address.ProvinceID
	}
	return ctx
}

func (s *DispatchService) authorizeActor(ticket *domain.OrderTicket, actorUUID string, admin bool) error {
	if admin {
		return nil
	}
	if actorUUID != "" && ticket.EmergencyUUID != "" && ticket.EmergencyUUID == actorUUID {
		return nil
	}
	if actorUUID != "" && s.canOpsAct(ticket, actorUUID) {
		return nil
	}
	return ErrDispatchForbidden
}

// AuthorizeOrder loads a ticket and checks actor access (assigned unit, wilayah dispatcher, or admin).
func (s *DispatchService) AuthorizeOrder(orderID, actorUUID string, admin bool) error {
	ticket, err := s.orderRepo.FindByID(orderID)
	if err != nil {
		return err
	}
	return s.authorizeActor(ticket, actorUUID, admin)
}

func (s *DispatchService) canOpsAct(ticket *domain.OrderTicket, actorUUID string) bool {
	units, err := s.emergencyRepo.FindByIDs([]string{actorUUID})
	if err != nil || len(units) == 0 {
		return false
	}
	scope, ok := domain.OpsScopeFromEmergency(units[0])
	if !ok {
		return false
	}
	return domain.TicketInScope(*ticket, scope)
}

func (s *DispatchService) compatibleType(ticket *domain.OrderTicket, unit domain.Emergency) bool {
	typeName := s.resolveTypeName(ticket.TypeID)
	reqFam := typeFamily(typeName)
	candFam := candidateFamily(unit)
	if reqFam != "" && candFam != "" {
		return reqFam == candFam
	}
	if ticket.TypeID > 0 {
		return uint(unit.EmergencyType.ID) == ticket.TypeID
	}
	return true
}

// offerNext picks the next unused same-type unit and reassigns the pending ticket.
func (s *DispatchService) offerNext(ticket *domain.OrderTicket, pushPrefix string) (*domain.OrderTicket, error) {
	if ticket.DispatchRound >= domain.MaxDispatchRounds {
		if err := s.markExhausted(ticket); err != nil {
			return nil, err
		}
		updated, err := s.orderRepo.FindByID(ticket.ID)
		return updated, err
	}

	tried, err := s.attemptRepo.FindOfferedEmergencyUUIDs(ticket.ID)
	if err != nil {
		return nil, err
	}
	exclude := toExcludeSet(tried)
	if ticket.EmergencyUUID != "" {
		exclude[ticket.EmergencyUUID] = struct{}{}
	}

	rt := s.routingFor(ticket)
	nextRound := ticket.DispatchRound + 1
	candidate, err := s.pickCandidate(
		ticket.RequesterLat, ticket.RequesterLng,
		rt.typeID, rt.regencyID, rt.provinceID,
		exclude,
	)
	if err != nil {
		return nil, err
	}
	if candidate == nil {
		if err := s.markExhausted(ticket); err != nil {
			return nil, err
		}
		return s.orderRepo.FindByID(ticket.ID)
	}

	deadline := time.Now().Add(s.sla)
	prevUUID := ticket.EmergencyUUID
	prevName := ticket.UnitName

	updated, err := s.orderRepo.Reassign(
		ticket.ID,
		prevUUID,
		candidate.Emergency.ID,
		candidate.Emergency.Name,
		nextRound,
		&deadline,
		"searching",
	)
	if errors.Is(err, repository.ErrConflict) {
		// Accepted or reassigned by another actor — stop escalation quietly.
		return s.orderRepo.FindByID(ticket.ID)
	}
	if err != nil {
		return nil, err
	}

	if _, err := s.recordOffer(updated, *candidate, nextRound); err != nil {
		log.Printf("dispatch: record offer %s: %v", updated.TicketNumber, err)
	}

	s.notifyReassigned(updated, prevUUID, candidate.Emergency.ID, candidate.Emergency.Name, nextRound, pushPrefix+candidate.Emergency.Name+".")
	_ = s.orderSvc.RecordEvent(domain.OrderEvent{
		OrderID:      updated.ID,
		TicketNumber: updated.TicketNumber,
		Type:         domain.OrderEventReassigned,
		Message:      reassignMessage(prevName, candidate.Emergency.Name),
		Actor:        "system",
		FromUnit:     prevName,
		ToUnit:       candidate.Emergency.Name,
		Tier:         domain.DispatchTierOf(candidate.Emergency),
	})
	return updated, nil
}

func (s *DispatchService) notifyReassigned(
	updated *domain.OrderTicket,
	prevUUID, newUUID, newName string,
	round int,
	pushBody string,
) {
	if s.pub != nil {
		s.pub.Publish(newUUID, hub.Event{Type: "new_order", Payload: updated})
		if prevUUID != "" && prevUUID != newUUID {
			s.pub.Publish(prevUUID, hub.Event{
				Type: "order_reassigned",
				Payload: map[string]any{
					"ticket_number": updated.TicketNumber,
					"order_id":      updated.ID,
					"to_unit":       newName,
					"round":         round,
				},
			})
		}
	}
	if s.pushSvc != nil {
		s.pushSvc.Notify(updated.TicketNumber, "Mencari unit lain", pushBody)
	}
}

func (s *DispatchService) markExhausted(ticket *domain.OrderTicket) error {
	updated, err := s.orderRepo.MarkDispatchExhausted(ticket.ID)
	if err != nil {
		return err
	}
	_ = s.orderSvc.RecordEvent(domain.OrderEvent{
		OrderID:      updated.ID,
		TicketNumber: updated.TicketNumber,
		Type:         domain.OrderEventExhausted,
		Message:      "Tidak ada unit alternatif yang merespons",
		Actor:        "system",
		FromUnit:     ticket.UnitName,
	})
	s.pushSvc.Notify(
		updated.TicketNumber,
		"Belum ada unit yang merespons",
		"Unit dengan jenis darurat yang sama belum merespons. Follow-up via WhatsApp atau cari unit lain di aplikasi.",
	)
	if s.pub != nil && updated.EmergencyUUID != "" {
		s.pub.Publish(updated.EmergencyUUID, hub.Event{
			Type:    "order_dispatch_exhausted",
			Payload: updated,
		})
	}
	return nil
}

func reassignMessage(from, to string) string {
	if from != "" && to != "" && from != to {
		return "Dialihkan dari " + from + " ke " + to
	}
	if to != "" {
		return "Dialihkan ke " + to
	}
	return "Pesanan dialihkan"
}

func rejectMessage(unit string) string {
	if unit != "" {
		return "Ditolak oleh " + unit
	}
	return "Pesanan ditolak"
}

func actorLabel(admin bool) string {
	if admin {
		return "admin"
	}
	return "unit"
}

func (s *DispatchService) pickCandidate(
	lat, lng float64,
	typeID uint,
	regencyID, provinceID string,
	exclude map[string]struct{},
) (*domain.RankedCandidate, error) {
	if exclude == nil {
		exclude = map[string]struct{}{}
	}
	typeName := s.resolveTypeName(typeID)
	ranked, err := s.rankCascade(lat, lng, typeID, typeName, regencyID, provinceID, exclude)
	if err != nil {
		return nil, err
	}
	if len(ranked) == 0 {
		return nil, nil
	}
	best := ranked[0]
	return &best, nil
}

// rankCascade walks dispatch tiers in order and ranks within each tier:
//  1. unit emergency sekabupaten (bukan dispatcher)
//  2. dispatcher kabupaten
//  3. dispatcher provinsi
func (s *DispatchService) rankCascade(
	lat, lng float64,
	typeID uint,
	typeName, regencyID, provinceID string,
	exclude map[string]struct{},
) ([]domain.RankedCandidate, error) {
	tiers, err := s.loadCascadeTiers(typeID, typeName, regencyID, provinceID)
	if err != nil {
		return nil, err
	}
	out := make([]domain.RankedCandidate, 0, 32)
	for _, tier := range [][]domain.Emergency{tiers.localUnits, tiers.regencyDispatchers, tiers.provinceDispatchers} {
		ranked := RankCandidates(tier, lat, lng, typeID, typeName, exclude)
		s.applyRejectPenalties(ranked)
		out = append(out, ranked...)
	}
	return out, nil
}

func (s *DispatchService) applyRejectPenalties(ranked []domain.RankedCandidate) {
	if s.attemptRepo == nil || len(ranked) == 0 {
		return
	}
	since := time.Now().Add(-24 * time.Hour)
	for i := range ranked {
		n, err := s.attemptRepo.CountRejectsSince(ranked[i].Emergency.ID, since)
		if err != nil || n <= 0 {
			continue
		}
		// Soft penalty so chronic rejectors sink within the same cascade tier.
		ranked[i].Score += float64(n) * 8
	}
	sort.SliceStable(ranked, func(i, j int) bool {
		if ranked[i].Score == ranked[j].Score {
			return ranked[i].DistanceKm < ranked[j].DistanceKm
		}
		return ranked[i].Score < ranked[j].Score
	})
}

type cascadeTiers struct {
	localUnits           []domain.Emergency
	regencyDispatchers   []domain.Emergency
	provinceDispatchers  []domain.Emergency
}

// loadCascadeTiers builds the 3-step SOS / reassignment pool.
// Every tier is hard-filtered to the requested emergency type family
// (Ambulance, Damkar, SAR stay on separate lanes).
func (s *DispatchService) loadCascadeTiers(typeID uint, typeName, regencyID, provinceID string) (cascadeTiers, error) {
	var tiers cascadeTiers

	if regencyID != "" {
		raw, err := s.emergencyRepo.FindByRegency(regencyID)
		if err != nil {
			return tiers, err
		}
		local := splitRegencyCascade(raw, regencyID, typeID, typeName)
		tiers.localUnits = local.localUnits
		tiers.regencyDispatchers = local.regencyDispatchers
	}

	if provinceID != "" {
		byProv, err := s.emergencyRepo.FindByProvince(provinceID)
		if err != nil {
			return tiers, err
		}
		reqFam := typeFamily(typeName)
		seen := map[string]struct{}{}
		for _, e := range byProv {
			if !e.IsProvinceDispatcher || !matchesRequestedType(e, typeID, reqFam) {
				continue
			}
			if _, ok := seen[e.ID]; ok {
				continue
			}
			seen[e.ID] = struct{}{}
			tiers.provinceDispatchers = append(tiers.provinceDispatchers, e)
		}
	}

	return tiers, nil
}

// splitRegencyCascade separates same-kabupaten units vs kabupaten dispatchers.
func splitRegencyCascade(raw []domain.Emergency, regencyID string, typeID uint, typeName string) cascadeTiers {
	var tiers cascadeTiers
	reqFam := typeFamily(typeName)
	for _, e := range raw {
		if e.Address.RegencyID != regencyID || e.IsProvinceDispatcher {
			continue
		}
		if !matchesRequestedType(e, typeID, reqFam) {
			continue
		}
		if e.IsDispatcher {
			tiers.regencyDispatchers = append(tiers.regencyDispatchers, e)
		} else {
			tiers.localUnits = append(tiers.localUnits, e)
		}
	}
	return tiers
}

func (s *DispatchService) resolveTypeName(typeID uint) string {
	if typeID == 0 || s.typeRepo == nil {
		return ""
	}
	types, err := s.typeRepo.FindAllTypes()
	if err != nil {
		return ""
	}
	for _, t := range types {
		if t.ID == typeID {
			return t.Name
		}
	}
	return ""
}

func (s *DispatchService) recordOffer(ticket *domain.OrderTicket, candidate domain.RankedCandidate, round int) (*domain.DispatchAttempt, error) {
	return s.attemptRepo.Create(domain.DispatchAttempt{
		OrderID:       ticket.ID,
		TicketNumber:  ticket.TicketNumber,
		EmergencyUUID: candidate.Emergency.ID,
		UnitName:      candidate.Emergency.Name,
		Round:         round,
		Status:        domain.DispatchAttemptOffered,
		DistanceKm:    candidate.DistanceKm,
		Score:         candidate.Score,
	})
}

// NoopDispatchService is used when mysql/order storage is unavailable.
type NoopDispatchService struct{}

func NewNoopDispatchService() *NoopDispatchService { return &NoopDispatchService{} }

func (s *NoopDispatchService) AssignSOS(_ domain.SOSAlert) (*domain.DispatchResult, error) {
	return nil, repository.ErrNotSupported
}
func (s *NoopDispatchService) EscalateOverdue() (int, error) { return 0, nil }
func (s *NoopDispatchService) Accept(_, _ string, _ bool) (*domain.OrderTicket, error) {
	return nil, repository.ErrNotSupported
}
func (s *NoopDispatchService) Reject(_, _ string, _ bool, _, _ string) (*domain.OrderTicket, error) {
	return nil, repository.ErrNotSupported
}
func (s *NoopDispatchService) ReassignTo(_, _, _ string, _ bool) (*domain.OrderTicket, error) {
	return nil, repository.ErrNotSupported
}
func (s *NoopDispatchService) ReassignBest(_, _ string, _ bool) (*domain.OrderTicket, error) {
	return nil, repository.ErrNotSupported
}
func (s *NoopDispatchService) EscalateToPSC(_, _ string, _ bool) (*domain.OrderTicket, error) {
	return nil, repository.ErrNotSupported
}
func (s *NoopDispatchService) ListCandidates(_ string) ([]domain.RankedCandidate, error) {
	return nil, repository.ErrNotSupported
}
func (s *NoopDispatchService) AuthorizeOrder(_, _ string, _ bool) error {
	return repository.ErrNotSupported
}

var _ DispatchUseCase = (*NoopDispatchService)(nil)
