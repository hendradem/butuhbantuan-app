package service

import (
	"errors"
	"log"
	"sort"
	"strings"
	"time"

	"github.com/butuhbantuan/api/internal/domain"
	"github.com/butuhbantuan/api/internal/repository"
	"github.com/butuhbantuan/api/pkg/hub"
)

var (
	ErrDispatchForbidden = errors.New("not allowed to act on this order")
	ErrDispatchConflict  = errors.New("order is not in a state that allows this action")
)

// IncidentAssignInput is the shared create+offer payload for SOS and call/list.
type IncidentAssignInput struct {
	Source        string // sos | call
	Name          string
	Phone         string
	Address       string
	Description   string
	PhotoURL      string
	Lat, Lng      float64
	TypeID        uint
	RegencyID     string
	ProvinceID    string
	PreferredUUID string // list tap; kept only if near distance-best
}

// DispatchUseCase ranks units, assigns SOS/call tickets, and supports manual accept/reject/reassign.
type DispatchUseCase interface {
	AssignSOS(alert domain.SOSAlert) (*domain.DispatchResult, error)
	AssignIncident(in IncidentAssignInput) (*domain.DispatchResult, error)
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

// AssignSOS is the SOS entry point into the shared incident assigner.
func (s *DispatchService) AssignSOS(alert domain.SOSAlert) (*domain.DispatchResult, error) {
	return s.AssignIncident(IncidentAssignInput{
		Source:      "sos",
		Name:        alert.Name,
		Phone:       alert.Phone,
		Address:     alert.Address,
		Description: alert.Description,
		PhotoURL:    alert.PhotoURL,
		Lat:         alert.Lat,
		Lng:         alert.Lng,
		TypeID:      alert.TypeID,
		RegencyID:   alert.RegencyID,
		ProvinceID:  alert.ProvinceID,
	})
}

// AssignIncident picks the best unit (distance-first cascade) and creates a
// searching ticket with SLA — used by both SOS and citizen call/list orders.
func (s *DispatchService) AssignIncident(in IncidentAssignInput) (*domain.DispatchResult, error) {
	source := strings.TrimSpace(in.Source)
	if source == "" {
		source = "sos"
	}

	candidate, err := s.pickCandidatePreferred(
		in.Lat, in.Lng, in.TypeID, in.RegencyID, in.ProvinceID, in.PreferredUUID, nil,
	)
	if err != nil {
		return nil, err
	}

	deadline := time.Now().Add(s.sla)
	ticketInput := domain.OrderTicket{
		RequesterName:  in.Name,
		RequesterPhone: in.Phone,
		Location:       in.Address,
		Condition:      in.Description,
		PhotoURL:       in.PhotoURL,
		RequesterLat:   in.Lat,
		RequesterLng:   in.Lng,
		Source:         source,
		TypeID:         in.TypeID,
		RegencyID:      in.RegencyID,
		ProvinceID:     in.ProvinceID,
		DispatchRound:  1,
		DispatchStatus: "searching",
		SlaDeadline:    &deadline,
	}

	if candidate == nil {
		// No unit available — create ticket then auto-escalate to PSC/komando.
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
		if escalated, escErr := s.EscalateToPSC(ticket.ID, "system", true); escErr != nil {
			log.Printf("dispatch: auto-PSC on empty pool %s: %v", ticket.TicketNumber, escErr)
			return &domain.DispatchResult{Ticket: ticket}, nil
		} else if escalated != nil {
			ticket = escalated
		}
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
	offerMsg := "Ditawarkan ke " + candidate.Emergency.Name
	if in.PreferredUUID != "" && in.PreferredUUID != candidate.Emergency.ID {
		offerMsg = "Unit terdekat: " + candidate.Emergency.Name + " (pilihan daftar diganti)"
	}
	_ = s.orderSvc.RecordEvent(domain.OrderEvent{
		OrderID:      ticket.ID,
		TicketNumber: ticket.TicketNumber,
		Type:         domain.OrderEventOffered,
		Message:      offerMsg,
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
	if err := s.authorizeAccept(ticket, actorUUID, admin); err != nil {
		return nil, err
	}
	if ticket.Status != "pending" {
		return nil, ErrDispatchConflict
	}
	// PSC / province command may accept on behalf of the current assignee.
	// Plain kab is_dispatcher (e.g. PMI) may NOT — only the offered unit can Terima.
	ops := !admin && actorUUID != "" && ticket.EmergencyUUID != actorUUID && s.canAcceptOnBehalf(ticket, actorUUID)
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
// Medical tickets escalate to medical PSC / 119 only — never Damkar / SAR.
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

	rt := s.routingFor(ticket)
	typeName := s.resolveTypeName(rt.typeID)
	reqFam := typeFamily(typeName)
	if reqFam == "" {
		reqFam = "medical"
	}

	hotline := "119"
	label := "PSC / SPGDT 119"
	emergencyUUID := ""
	unitName := ""
	if reqFam == "fire" {
		hotline = ""
		label = "Pusat Damkar wilayah"
	} else if reqFam == "sar" {
		hotline = ""
		label = "Pusat SAR wilayah"
	}

	if best := s.pickEscalationTarget(rt, reqFam); best != nil {
		emergencyUUID = best.ID
		unitName = best.Name
		label = best.Name
		if best.Contact.Phone != "" {
			hotline = best.Contact.Phone
		} else if best.Contact.Whatsapp != "" {
			hotline = best.Contact.Whatsapp
		}
	}
	if hotline == "" && reqFam == "medical" {
		hotline = "119"
	}

	updated, err := s.orderRepo.MarkEscalated(ticket.ID, hotline, label, emergencyUUID, unitName)
	if errors.Is(err, repository.ErrConflict) {
		return nil, ErrDispatchConflict
	}
	if err != nil {
		return nil, err
	}

	actor := "admin"
	if !admin {
		actor = "unit"
	}
	if actorUUID == "system" {
		actor = "system"
	}
	_ = s.orderSvc.RecordEvent(domain.OrderEvent{
		OrderID:      updated.ID,
		TicketNumber: updated.TicketNumber,
		Type:         domain.OrderEventEscalatedPSC,
		Message:      "Dieskalasi ke " + label + " · " + hotline,
		Actor:        actor,
		ToUnit:       label,
		Tier:         domain.DispatchTierProvince,
	})
	pushTitle := "Tim ops menghubungi pusat darurat"
	pushBody := "Tiket Anda dieskalasi ke " + label + ". Hubungi " + hotline + " bila kondisi mendesak."
	if actorUUID == "system" {
		pushTitle = "Dieskalasi ke pusat darurat"
		pushBody = "Belum ada unit yang merespons. Hubungi " + label + " · " + hotline + " bila kondisi mendesak."
	}
	s.pushSvc.Notify(updated.TicketNumber, pushTitle, pushBody)
	if s.pub != nil {
		payload := updated
		if emergencyUUID != "" {
			s.pub.PublishScoped(emergencyUUID, updated.RegencyID, updated.ProvinceID, hub.Event{Type: "new_order", Payload: payload})
		} else {
			s.pub.PublishScoped("", updated.RegencyID, updated.ProvinceID, hub.Event{Type: "order_dispatch_exhausted", Payload: updated})
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

// pickEscalationTarget chooses a command-center unit for escalate-psc.
// Medical priority: same-regency PSC → province PSC/dispatcher → other kab PSC in province.
// Never returns Damkar/SAR for medical tickets.
func (s *DispatchService) pickEscalationTarget(rt routingCtx, reqFam string) *domain.Emergency {
	all, err := s.emergencyRepo.FindAll()
	if err != nil || len(all) == 0 {
		return nil
	}

	var best *domain.Emergency
	bestScore := 1e9
	for i := range all {
		e := &all[i]
		fam := candidateFamily(*e)

		switch reqFam {
		case "medical":
			if fam == "fire" || fam == "sar" {
				continue
			}
			medicalPSC := isMedicalPSCPartner(*e)
			medicalProvCmd := e.IsProvinceDispatcher && (fam == "medical" || medicalPSC || fam == "")
			if medicalProvCmd && fam == "" && !isMedicalPSCNameHeuristic(*e) &&
				!strings.EqualFold(strings.TrimSpace(e.PartnerTier), domain.PartnerTierPSC) {
				// Province dispatcher without medical/PSC signal — skip (e.g. generic ops).
				medicalProvCmd = false
			}
			medicalKabPSC := e.IsDispatcher && medicalPSC
			if !medicalPSC && !medicalProvCmd && !medicalKabPSC {
				continue
			}
		case "fire":
			if fam == "medical" || fam == "sar" {
				continue
			}
			if fam != "fire" && !isFireCommandHeuristic(*e) {
				continue
			}
		case "sar":
			if fam != "sar" {
				continue
			}
		default:
			if !matchesRequestedType(*e, rt.typeID, reqFam) {
				continue
			}
		}

		if rt.provinceID != "" && e.Address.ProvinceID != "" && e.Address.ProvinceID != rt.provinceID {
			continue
		}

		score := 50.0
		if reqFam == "medical" {
			if isMedicalPSCPartner(*e) {
				score -= 25
			}
			if strings.EqualFold(strings.TrimSpace(e.PartnerTier), domain.PartnerTierPSC) {
				score -= 10
			}
		}
		// Prefer city PSC, then province command (DIY), then other kab PSC.
		if rt.regencyID != "" && e.Address.RegencyID == rt.regencyID {
			score -= 20
		}
		if e.IsProvinceDispatcher {
			score -= 12
		} else if e.IsDispatcher && isMedicalPSCPartner(*e) {
			score -= 8
		}
		if score < bestScore {
			bestScore = score
			best = e
		}
	}
	return best
}

// ListCandidates returns distance-ordered candidates for reassignment UI
// (radius pool first, then farther same-province units).
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

// authorizeAccept is stricter than authorizeActor: field kab dispatchers may
// monitor/reassign, but only the offered unit (or PSC/province command) may Terima.
func (s *DispatchService) authorizeAccept(ticket *domain.OrderTicket, actorUUID string, admin bool) error {
	if admin {
		return nil
	}
	if actorUUID != "" && ticket.EmergencyUUID != "" && ticket.EmergencyUUID == actorUUID {
		return nil
	}
	if actorUUID != "" && s.canAcceptOnBehalf(ticket, actorUUID) {
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

func (s *DispatchService) canAcceptOnBehalf(ticket *domain.OrderTicket, actorUUID string) bool {
	units, err := s.emergencyRepo.FindByIDs([]string{actorUUID})
	if err != nil || len(units) == 0 {
		return false
	}
	e := units[0]
	if !domain.MayAcceptOnBehalf(e) {
		return false
	}
	scope, ok := domain.OpsScopeFromEmergency(e)
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
		s.pub.PublishScoped(newUUID, updated.RegencyID, updated.ProvinceID, hub.Event{Type: "new_order", Payload: updated})
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
	if s.pub != nil {
		s.pub.PublishScoped(updated.EmergencyUUID, updated.RegencyID, updated.ProvinceID, hub.Event{
			Type:    "order_dispatch_exhausted",
			Payload: updated,
		})
	}

	// Auto-escalate to PSC/komando so citizen is not left in exhausted limbo.
	if _, escErr := s.EscalateToPSC(updated.ID, "system", true); escErr != nil {
		log.Printf("dispatch: auto-PSC after exhausted %s: %v", updated.TicketNumber, escErr)
		if s.pushSvc != nil {
			s.pushSvc.Notify(
				updated.TicketNumber,
				"Belum ada unit yang merespons",
				"Unit dengan jenis darurat yang sama belum merespons. Follow-up via WhatsApp atau hubungi pusat darurat.",
			)
		}
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
	return s.pickCandidatePreferred(lat, lng, typeID, regencyID, provinceID, "", exclude)
}

func (s *DispatchService) pickCandidatePreferred(
	lat, lng float64,
	typeID uint,
	regencyID, provinceID, preferredUUID string,
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
	return choosePreferredOrBest(ranked, preferredUUID), nil
}

// choosePreferredOrBest keeps the citizen-selected unit when it is nearly as
// close as the distance winner; otherwise returns the closest ranked unit.
func choosePreferredOrBest(ranked []domain.RankedCandidate, preferredUUID string) *domain.RankedCandidate {
	if len(ranked) == 0 {
		return nil
	}
	best := ranked[0]
	pref := strings.TrimSpace(preferredUUID)
	if pref == "" {
		c := best
		return &c
	}
	for i := range ranked {
		if ranked[i].Emergency.ID != pref {
			continue
		}
		if ranked[i].DistanceKm <= best.DistanceKm+domain.PreferSelectedSlackKm {
			c := ranked[i]
			return &c
		}
		break
	}
	c := best
	return &c
}

// rankCascade walks dispatch tiers — distance first across the province.
//  1. All matching responders within NearbyDispatchRadiusKm (field + PMI + PSC)
//  2. Remaining matching responders farther away (incl. province command)
//
// is_dispatcher must NOT delay a closer ambulance (Jalan Turi: PMI Sleman 1km
// must beat MPD Peduli 7km). Kab/province flags only label the tier for UI.
func (s *DispatchService) rankCascade(
	lat, lng float64,
	typeID uint,
	typeName, regencyID, provinceID string,
	exclude map[string]struct{},
) ([]domain.RankedCandidate, error) {
	tiers, err := s.loadCascadeTiers(typeID, typeName, regencyID, provinceID, lat, lng)
	if err != nil {
		return nil, err
	}
	strict := s.walkCascadeTiers(tiers, lat, lng, typeID, typeName, exclude, true)
	if len(strict) > 0 {
		return strict, nil
	}
	return s.walkCascadeTiers(tiers, lat, lng, typeID, typeName, exclude, false), nil
}

func (s *DispatchService) walkCascadeTiers(
	tiers cascadeTiers,
	lat, lng float64,
	typeID uint,
	typeName string,
	exclude map[string]struct{},
	strictCapacity bool,
) []domain.RankedCandidate {
	out := make([]domain.RankedCandidate, 0, 32)

	labelTier := func(ranked []domain.RankedCandidate) {
		for i := range ranked {
			e := ranked[i].Emergency
			switch {
			case e.IsProvinceDispatcher:
				ranked[i].Tier = domain.DispatchTierProvince
			case tiers.homeRegencyID != "" && e.Address.RegencyID == tiers.homeRegencyID &&
				(e.IsDispatcher || isMedicalPSCPartner(e)):
				ranked[i].Tier = domain.DispatchTierKabDispatcher
			case tiers.homeRegencyID != "" && e.Address.RegencyID == tiers.homeRegencyID:
				ranked[i].Tier = domain.DispatchTierLocal
			default:
				ranked[i].Tier = domain.DispatchTierNearby
			}
		}
	}

	// 1) Everyone in radius — pure distance (PMI/PSC dispatcher included).
	nearRanked := rankCandidates(tiers.radiusPool, lat, lng, typeID, typeName, exclude, strictCapacity)
	labelTier(nearRanked)
	s.applyRejectPenalties(nearRanked)
	out = append(out, nearRanked...)

	// 2) Farther same-province units.
	farRanked := rankCandidates(tiers.farPool, lat, lng, typeID, typeName, exclude, strictCapacity)
	labelTier(farRanked)
	s.applyRejectPenalties(farRanked)
	out = append(out, farRanked...)

	return out
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
	homeRegencyID string
	radiusPool    []domain.Emergency // all matching within NearbyDispatchRadiusKm
	farPool       []domain.Emergency // matching beyond radius (same province)
	// Legacy split fields kept for splitRegencyCascade helpers / tests.
	localUnits          []domain.Emergency
	nearbyField         []domain.Emergency
	nearbyCommand       []domain.Emergency
	regencyDispatchers  []domain.Emergency
	provinceDispatchers []domain.Emergency
}

// loadCascadeTiers builds the SOS / reassignment pool.
// Every tier is hard-filtered to the requested emergency type family
// (Ambulance, Damkar, SAR stay on separate lanes).
func (s *DispatchService) loadCascadeTiers(
	typeID uint,
	typeName, regencyID, provinceID string,
	lat, lng float64,
) (cascadeTiers, error) {
	var tiers cascadeTiers
	tiers.homeRegencyID = regencyID

	if regencyID != "" {
		raw, err := s.emergencyRepo.FindByRegency(regencyID)
		if err != nil {
			return tiers, err
		}
		local := splitRegencyCascade(raw, regencyID, typeID, typeName)
		tiers.localUnits = local.localUnits
		tiers.regencyDispatchers = local.regencyDispatchers
	}

	if provinceID == "" {
		return tiers, nil
	}
	byProv, err := s.emergencyRepo.FindByProvince(provinceID)
	if err != nil {
		return tiers, err
	}

	reqFam := typeFamily(typeName)
	seen := map[string]struct{}{}
	hasGPS := lat != 0 || lng != 0
	for _, e := range byProv {
		if e.ID == "" {
			continue
		}
		if _, dup := seen[e.ID]; dup {
			continue
		}
		if !matchesRequestedType(e, typeID, reqFam) {
			continue
		}
		seen[e.ID] = struct{}{}
		if e.IsProvinceDispatcher {
			tiers.provinceDispatchers = append(tiers.provinceDispatchers, e)
		}
		if !hasGPS {
			tiers.radiusPool = append(tiers.radiusPool, e)
			continue
		}
		uLat, uLng := parseCoords(e.Coordinates)
		dist := haversineKm(lat, lng, uLat, uLng)
		if dist <= domain.NearbyDispatchRadiusKm {
			tiers.radiusPool = append(tiers.radiusPool, e)
		} else {
			tiers.farPool = append(tiers.farPool, e)
		}
	}

	// Populate legacy nearby slices for tests / debugging.
	if hasGPS {
		localIDs := map[string]struct{}{}
		for _, e := range append(tiers.localUnits, tiers.regencyDispatchers...) {
			localIDs[e.ID] = struct{}{}
		}
		tiers.nearbyField = filterNearbyField(
			byProv, regencyID, typeID, typeName, lat, lng,
			domain.NearbyDispatchRadiusKm, localIDs,
		)
		tiers.nearbyCommand = filterNearbyCommand(
			byProv, regencyID, typeID, typeName, lat, lng,
			domain.NearbyDispatchRadiusKm, localIDs,
		)
	}

	return tiers, nil
}

// filterNearbyField keeps other-regency FIELD units (not dispatcher / PSC command /
// province) within radius — used for border distance-first offers.
func filterNearbyField(
	pool []domain.Emergency,
	homeRegencyID string,
	typeID uint,
	typeName string,
	lat, lng, radiusKm float64,
	skipIDs map[string]struct{},
) []domain.Emergency {
	reqFam := typeFamily(typeName)
	out := make([]domain.Emergency, 0, 8)
	seen := map[string]struct{}{}
	for _, e := range pool {
		if e.ID == "" {
			continue
		}
		if _, skip := skipIDs[e.ID]; skip {
			continue
		}
		if _, dup := seen[e.ID]; dup {
			continue
		}
		if e.IsProvinceDispatcher || e.IsDispatcher || isMedicalPSCPartner(e) {
			continue
		}
		if homeRegencyID != "" && e.Address.RegencyID == homeRegencyID {
			continue
		}
		if !matchesRequestedType(e, typeID, reqFam) {
			continue
		}
		uLat, uLng := parseCoords(e.Coordinates)
		dist := haversineKm(lat, lng, uLat, uLng)
		if dist > radiusKm {
			continue
		}
		seen[e.ID] = struct{}{}
		out = append(out, e)
	}
	return out
}

// filterNearbyCommand keeps other-regency PSC / dispatcher command nodes within radius.
func filterNearbyCommand(
	pool []domain.Emergency,
	homeRegencyID string,
	typeID uint,
	typeName string,
	lat, lng, radiusKm float64,
	skipIDs map[string]struct{},
) []domain.Emergency {
	reqFam := typeFamily(typeName)
	out := make([]domain.Emergency, 0, 8)
	seen := map[string]struct{}{}
	for _, e := range pool {
		if e.ID == "" {
			continue
		}
		if _, skip := skipIDs[e.ID]; skip {
			continue
		}
		if _, dup := seen[e.ID]; dup {
			continue
		}
		if e.IsProvinceDispatcher {
			continue
		}
		if homeRegencyID != "" && e.Address.RegencyID == homeRegencyID {
			continue
		}
		if !(e.IsDispatcher || isMedicalPSCPartner(e)) {
			continue
		}
		if !matchesRequestedType(e, typeID, reqFam) {
			continue
		}
		uLat, uLng := parseCoords(e.Coordinates)
		dist := haversineKm(lat, lng, uLat, uLng)
		if dist > radiusKm {
			continue
		}
		seen[e.ID] = struct{}{}
		out = append(out, e)
	}
	return out
}

// filterNearbyTrusted is kept for tests / callers — other-kab PSC|verified within radius.
func filterNearbyTrusted(
	pool []domain.Emergency,
	homeRegencyID string,
	typeID uint,
	typeName string,
	lat, lng, radiusKm float64,
	skipIDs map[string]struct{},
) []domain.Emergency {
	reqFam := typeFamily(typeName)
	out := make([]domain.Emergency, 0, 8)
	seen := map[string]struct{}{}
	for _, e := range pool {
		if e.ID == "" {
			continue
		}
		if _, skip := skipIDs[e.ID]; skip {
			continue
		}
		if _, dup := seen[e.ID]; dup {
			continue
		}
		if e.IsProvinceDispatcher {
			continue
		}
		if homeRegencyID != "" && e.Address.RegencyID == homeRegencyID {
			continue
		}
		if !isTrustedNearbyPartner(e) {
			continue
		}
		if !matchesRequestedType(e, typeID, reqFam) {
			continue
		}
		uLat, uLng := parseCoords(e.Coordinates)
		dist := haversineKm(lat, lng, uLat, uLng)
		if dist > radiusKm {
			continue
		}
		seen[e.ID] = struct{}{}
		out = append(out, e)
	}
	return out
}

// isTrustedNearbyPartner gates legacy trusted-partner checks (PSC / verified).
func isTrustedNearbyPartner(e domain.Emergency) bool {
	switch strings.ToLower(strings.TrimSpace(e.PartnerTier)) {
	case domain.PartnerTierPSC, domain.PartnerTierVerified:
		return true
	}
	return isPSCPartner(e)
}

// splitRegencyCascade separates same-kabupaten field units vs kabupaten command.
// Medical PSC / 119 / SPGDT always go to the dispatcher tier even when
// is_dispatcher is unset in DB — otherwise they compete with nearer ambulances
// in the local tier and leapfrog PMI/MPD.
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
		if e.IsDispatcher || isMedicalPSCPartner(e) {
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
func (s *NoopDispatchService) AssignIncident(_ IncidentAssignInput) (*domain.DispatchResult, error) {
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
