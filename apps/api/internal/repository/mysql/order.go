package mysqlrepo

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/butuhbantuan/api/internal/domain"
	"github.com/butuhbantuan/api/internal/repository"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// ── OrderRepo ─────────────────────────────────────────────────────────────────

type OrderRepo struct {
	db *gorm.DB
}

func NewOrderRepo(db *gorm.DB) *OrderRepo { return &OrderRepo{db: db} }

func (r *OrderRepo) generateTicketNumber() string {
	today := time.Now().Format("20060102")
	prefix := fmt.Sprintf("BB-%s-", today)
	var last string
	_ = r.db.Model(&OrderTicketEntity{}).
		Select("ticket_number").
		Where("ticket_number LIKE ?", prefix+"%").
		Order("ticket_number DESC").
		Limit(1).
		Scan(&last).Error
	next := 1
	if last != "" {
		var n int
		if _, err := fmt.Sscanf(last, prefix+"%d", &n); err == nil && n >= 0 {
			next = n + 1
		}
	}
	return fmt.Sprintf("%s%04d", prefix, next)
}

func (r *OrderRepo) Create(o domain.OrderTicket) (*domain.OrderTicket, error) {
	src := o.Source
	if src == "" {
		src = "call"
	}
	const maxAttempts = 5
	var lastErr error
	for attempt := 0; attempt < maxAttempts; attempt++ {
		row := OrderTicketEntity{
			TicketNumber:   r.generateTicketNumber(),
			EmergencyUUID:  o.EmergencyUUID,
			UnitName:       o.UnitName,
			RequesterName:  o.RequesterName,
			RequesterPhone: o.RequesterPhone,
			JenisPelayanan: o.JenisPelayanan,
			Location:         o.Location,
			Condition:        o.Condition,
			AssessmentJSON:   marshalAssessment(o),
			AssessmentAcuity: o.AssessmentAcuity,
			PhotoURL:         o.PhotoURL,
			RequesterLat:   o.RequesterLat,
			RequesterLng:   o.RequesterLng,
			Status:         "pending",
			Source:         src,
			TypeID:         o.TypeID,
			RegencyID:      o.RegencyID,
			ProvinceID:     o.ProvinceID,
			DispatchRound:  o.DispatchRound,
			SlaDeadline:    o.SlaDeadline,
			DispatchStatus: o.DispatchStatus,
		}
		if err := r.db.Create(&row).Error; err != nil {
			lastErr = err
			// Race / gap after deletes: retry with a fresh max+1.
			if isDuplicateTicketErr(err) {
				continue
			}
			return nil, err
		}
		return mapOrder(row), nil
	}
	return nil, lastErr
}

func isDuplicateTicketErr(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "duplicate") && strings.Contains(msg, "ticket_number")
}

func (r *OrderRepo) FindByID(id string) (*domain.OrderTicket, error) {
	var row OrderTicketEntity
	if err := r.db.Where("uuid = ?", id).First(&row).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, repository.ErrNotFound
		}
		return nil, err
	}
	return mapOrder(row), nil
}

func (r *OrderRepo) FindByTicketNumber(number string) (*domain.OrderTicket, error) {
	var row OrderTicketEntity
	if err := r.db.Where("ticket_number = ?", number).First(&row).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, repository.ErrNotFound
		}
		return nil, err
	}
	return mapOrder(row), nil
}

func (r *OrderRepo) FindByPublicToken(token string) (*domain.OrderTicket, error) {
	token = strings.TrimSpace(token)
	if token == "" {
		return nil, repository.ErrNotFound
	}
	var row OrderTicketEntity
	if err := r.db.Where("public_token = ?", token).First(&row).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, repository.ErrNotFound
		}
		return nil, err
	}
	return mapOrder(row), nil
}

func (r *OrderRepo) FindAll() ([]domain.OrderTicket, error) {
	var rows []OrderTicketEntity
	if err := r.db.Order("created_at DESC").Find(&rows).Error; err != nil {
		return nil, err
	}
	result := make([]domain.OrderTicket, len(rows))
	for i, row := range rows {
		result[i] = *mapOrder(row)
	}
	return result, nil
}

func (r *OrderRepo) FindByUnit(emergencyUUID, unitName string) ([]domain.OrderTicket, error) {
	var rows []OrderTicketEntity
	q := r.db.Order("created_at DESC")
	if unitName != "" {
		q = q.Where("emergency_uuid = ? OR unit_name = ?", emergencyUUID, unitName)
	} else {
		q = q.Where("emergency_uuid = ?", emergencyUUID)
	}
	if err := q.Find(&rows).Error; err != nil {
		return nil, err
	}
	result := make([]domain.OrderTicket, len(rows))
	for i, row := range rows {
		result[i] = *mapOrder(row)
	}
	return result, nil
}

func (r *OrderRepo) FindByWilayahScope(regencyID, provinceID string, provinceWide bool) ([]domain.OrderTicket, error) {
	var rows []OrderTicketEntity
	q := r.db.Order("created_at DESC")
	if provinceWide {
		if provinceID == "" {
			return []domain.OrderTicket{}, nil
		}
		q = q.Where("province_id = ?", provinceID)
	} else {
		if regencyID == "" {
			return []domain.OrderTicket{}, nil
		}
		q = q.Where("regency_id = ?", regencyID)
	}
	if err := q.Find(&rows).Error; err != nil {
		return nil, err
	}
	result := make([]domain.OrderTicket, len(rows))
	for i, row := range rows {
		result[i] = *mapOrder(row)
	}
	return result, nil
}

func (r *OrderRepo) UpdateStatus(id, status, handlerName, notes string) (*domain.OrderTicket, error) {
	now := time.Now()
	updates := map[string]any{
		"status":         status,
		"handler_name":   handlerName,
		"handling_notes": notes,
	}
	q := r.db.Model(&OrderTicketEntity{}).Where("uuid = ?", id)
	switch status {
	case "accepted":
		// Atomic accept — only while still pending (race-safe vs reassign worker).
		q = q.Where("status = ?", "pending")
		updates["accepted_at"] = &now
		updates["dispatch_status"] = "assigned"
		updates["sla_deadline"] = nil
	case "in_progress":
		q = q.Where("status IN ?", []string{"accepted", "in_progress"})
	case "completed":
		q = q.Where("status IN ?", []string{"accepted", "in_progress"})
		updates["completed_at"] = &now
		updates["sla_deadline"] = nil
	case "cancelled":
		q = q.Where("status NOT IN ?", []string{"completed", "cancelled"})
		updates["cancelled_at"] = &now
		updates["sla_deadline"] = nil
	}
	result := q.Updates(updates)
	if result.Error != nil {
		return nil, result.Error
	}
	if result.RowsAffected == 0 {
		existing, err := r.FindByID(id)
		if err != nil {
			return nil, err
		}
		// Idempotent no-op (same status / unchanged columns) vs illegal transition.
		switch status {
		case "accepted":
			return nil, repository.ErrConflict
		case "in_progress":
			if existing.Status == "accepted" || existing.Status == "in_progress" {
				return existing, nil
			}
			return nil, repository.ErrConflict
		case "completed":
			if existing.Status == "completed" {
				return existing, nil
			}
			return nil, repository.ErrConflict
		case "cancelled":
			if existing.Status == "cancelled" {
				return existing, nil
			}
			return nil, repository.ErrConflict
		}
	}
	var row OrderTicketEntity
	if err := r.db.Where("uuid = ?", id).First(&row).Error; err != nil {
		return nil, err
	}
	return mapOrder(row), nil
}

// AcceptPending accepts a pending ticket, optionally requiring it still belong to expectedUUID.
func (r *OrderRepo) AcceptPending(id, expectedUUID string) (*domain.OrderTicket, error) {
	now := time.Now()
	q := r.db.Model(&OrderTicketEntity{}).Where("uuid = ? AND status = ?", id, "pending")
	if expectedUUID != "" {
		q = q.Where("emergency_uuid = ?", expectedUUID)
	}
	result := q.Updates(map[string]any{
		"status":          "accepted",
		"accepted_at":     &now,
		"dispatch_status": "assigned",
		"sla_deadline":    nil,
	})
	if result.Error != nil {
		return nil, result.Error
	}
	if result.RowsAffected == 0 {
		return nil, repository.ErrConflict
	}
	var row OrderTicketEntity
	if err := r.db.Where("uuid = ?", id).First(&row).Error; err != nil {
		return nil, err
	}
	return mapOrder(row), nil
}

func (r *OrderRepo) FindPendingPastSLA(now time.Time) ([]domain.OrderTicket, error) {
	var rows []OrderTicketEntity
	err := r.db.
		Where(
			"status = ? AND sla_deadline IS NOT NULL AND sla_deadline <= ? AND dispatch_status = ?"+
				" AND (claim_expires_at IS NULL OR claim_expires_at <= ?)",
			"pending", now, "searching", now,
		).
		Order("sla_deadline ASC").
		Limit(50).
		Find(&rows).Error
	if err != nil {
		return nil, err
	}
	result := make([]domain.OrderTicket, len(rows))
	for i, row := range rows {
		result[i] = *mapOrder(row)
	}
	return result, nil
}

func (r *OrderRepo) Reassign(id, fromUUID, emergencyUUID, unitName string, round int, slaDeadline *time.Time, dispatchStatus string) (*domain.OrderTicket, error) {
	updates := map[string]any{
		"emergency_uuid":  emergencyUUID,
		"unit_name":       unitName,
		"dispatch_round":  round,
		"sla_deadline":    slaDeadline,
		"dispatch_status": dispatchStatus,
		"status":          "pending",
		"accepted_at":     nil,
		"handler_name":    "",
		"handling_notes":  "",
		// Invalidate any previous live-track link when unit changes.
		"track_token":          nil,
		"track_enabled_at":     nil,
		"track_expires_at":     nil,
		"responder_lat":        0,
		"responder_lng":        0,
		"responder_updated_at": nil,
	}
	q := r.db.Model(&OrderTicketEntity{}).
		Where("uuid = ? AND status IN ?", id, []string{"pending", "accepted"})
	if fromUUID != "" {
		q = q.Where("emergency_uuid = ?", fromUUID)
	}
	result := q.Updates(updates)
	if result.Error != nil {
		return nil, result.Error
	}
	if result.RowsAffected == 0 {
		return nil, repository.ErrConflict
	}
	var row OrderTicketEntity
	if err := r.db.Where("uuid = ?", id).First(&row).Error; err != nil {
		return nil, err
	}
	return mapOrder(row), nil
}

func (r *OrderRepo) MarkDispatchExhausted(id string) (*domain.OrderTicket, error) {
	updates := map[string]any{
		"dispatch_status": "exhausted",
		"sla_deadline":    nil,
	}
	if err := r.db.Model(&OrderTicketEntity{}).Where("uuid = ? AND status = ?", id, "pending").Updates(updates).Error; err != nil {
		return nil, err
	}
	var row OrderTicketEntity
	if err := r.db.Where("uuid = ?", id).First(&row).Error; err != nil {
		return nil, err
	}
	return mapOrder(row), nil
}

func (r *OrderRepo) MarkEscalated(id, hotline, label, emergencyUUID, unitName string) (*domain.OrderTicket, error) {
	updates := map[string]any{
		"dispatch_status":    "escalated",
		"sla_deadline":       nil,
		"escalation_hotline": hotline,
		"escalation_label":   label,
	}
	if emergencyUUID != "" {
		updates["emergency_uuid"] = emergencyUUID
	}
	if unitName != "" {
		updates["unit_name"] = unitName
	}
	result := r.db.Model(&OrderTicketEntity{}).
		Where("uuid = ? AND status = ?", id, "pending").
		Updates(updates)
	if result.Error != nil {
		return nil, result.Error
	}
	if result.RowsAffected == 0 {
		return nil, repository.ErrConflict
	}
	var row OrderTicketEntity
	if err := r.db.Where("uuid = ?", id).First(&row).Error; err != nil {
		return nil, err
	}
	return mapOrder(row), nil
}

func (r *OrderRepo) FindActiveByPhone(phone string, typeID uint) (*domain.OrderTicket, error) {
	variants := domain.PhoneVariants(phone)
	if len(variants) == 0 {
		return nil, repository.ErrNotFound
	}
	q := r.db.Model(&OrderTicketEntity{}).
		Where("status IN ? AND requester_phone IN ?",
			[]string{"pending", "accepted", "in_progress"}, variants)
	if typeID > 0 {
		q = q.Where("type_id = ? OR type_id = 0", typeID)
	}
	var row OrderTicketEntity
	if err := q.Order("created_at DESC").First(&row).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, repository.ErrNotFound
		}
		return nil, err
	}
	return mapOrder(row), nil
}

func marshalAssessment(o domain.OrderTicket) string {
	if o.Assessment == nil {
		return ""
	}
	raw, err := o.Assessment.Marshal()
	if err != nil {
		return ""
	}
	return raw
}

func mapOrder(row OrderTicketEntity) *domain.OrderTicket {
	src := row.Source
	if src == "" {
		src = "call"
	}
	o := &domain.OrderTicket{
		ID:                row.UUID.String(),
		TicketNumber:      row.TicketNumber,
		EmergencyUUID:     row.EmergencyUUID,
		UnitName:          row.UnitName,
		RequesterName:     row.RequesterName,
		RequesterPhone:    row.RequesterPhone,
		JenisPelayanan:    row.JenisPelayanan,
		Location:         row.Location,
		Condition:        row.Condition,
		AssessmentAcuity: row.AssessmentAcuity,
		PhotoURL:         row.PhotoURL,
		RequesterLat:      row.RequesterLat,
		RequesterLng:      row.RequesterLng,
		Status:            row.Status,
		Source:            src,
		HandlerName:          row.HandlerName,
		HandlerPhone:         row.HandlerPhone,
		HandlingNotes:        row.HandlingNotes,
		ReferralHospitalID:   row.ReferralHospitalID,
		ReferralHospitalName: row.ReferralHospitalName,
		TypeID:            row.TypeID,
		RegencyID:         row.RegencyID,
		ProvinceID:        row.ProvinceID,
		DispatchRound:     row.DispatchRound,
		SlaDeadline:       row.SlaDeadline,
		DispatchStatus:    row.DispatchStatus,
		EscalationHotline:  row.EscalationHotline,
		EscalationLabel:    row.EscalationLabel,
		TrackToken:         row.TrackToken,
		PublicToken:        row.PublicToken,
		TrackEnabledAt:     row.TrackEnabledAt,
		TrackExpiresAt:     row.TrackExpiresAt,
		ClaimToken:         row.ClaimToken,
		ClaimExpiresAt:     row.ClaimExpiresAt,
		ResponderLat:       row.ResponderLat,
		ResponderLng:       row.ResponderLng,
		ResponderUpdatedAt: row.ResponderUpdatedAt,
		ArrivedAt:          row.ArrivedAt,
		AcceptedAt:         row.AcceptedAt,
		CompletedAt:        row.CompletedAt,
		CreatedAt:          row.CreatedAt,
		HasIncidentReport:  strings.TrimSpace(row.IncidentReport) != "",
		IncidentReportAt:   row.IncidentReportAt,
	}
	if o.HasIncidentReport {
		o.IncidentReport = json.RawMessage(row.IncidentReport)
	}
	if a, err := domain.ParseOrderAssessment(row.AssessmentJSON); err == nil && a != nil {
		o.Assessment = a
	}
	o.CitizenPhase = domain.ResolveCitizenPhase(*o)
	return o
}

func (r *OrderRepo) SaveIncidentReport(id, reportJSON string) (*domain.OrderTicket, error) {
	if id == "" || strings.TrimSpace(reportJSON) == "" {
		return nil, repository.ErrConflict
	}
	// Validate JSON
	if !json.Valid([]byte(reportJSON)) {
		return nil, repository.ErrConflict
	}
	now := time.Now()
	result := r.db.Model(&OrderTicketEntity{}).
		Where("uuid = ?", id).
		Updates(map[string]any{
			"incident_report":    reportJSON,
			"incident_report_at": now,
		})
	if result.Error != nil {
		return nil, result.Error
	}
	if result.RowsAffected == 0 {
		return nil, repository.ErrNotFound
	}
	return r.FindByID(id)
}

func (r *OrderRepo) SetReferralHospital(id, hospitalID, hospitalName string) error {
	return r.db.Model(&OrderTicketEntity{}).
		Where("uuid = ?", id).
		Updates(map[string]any{
			"referral_hospital_id":   hospitalID,
			"referral_hospital_name": hospitalName,
		}).Error
}

func (r *OrderRepo) SetClaimToken(id, token string, expiresAt time.Time) (*domain.OrderTicket, error) {
	result := r.db.Model(&OrderTicketEntity{}).
		Where("uuid = ? AND status = ?", id, "pending").
		Updates(map[string]any{
			"claim_token":      token,
			"claim_expires_at": expiresAt,
		})
	if result.Error != nil {
		return nil, result.Error
	}
	if result.RowsAffected == 0 {
		return nil, repository.ErrConflict
	}
	return r.FindByID(id)
}

func (r *OrderRepo) FindByClaimToken(token string) (*domain.OrderTicket, error) {
	if token == "" {
		return nil, repository.ErrNotFound
	}
	var row OrderTicketEntity
	err := r.db.
		Where("claim_token = ? AND claim_expires_at > ?", token, time.Now()).
		First(&row).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, repository.ErrNotFound
		}
		return nil, err
	}
	return mapOrder(row), nil
}

func (r *OrderRepo) ClaimOrder(claimToken, volunteerName, volunteerPhone string) (*domain.OrderTicket, error) {
	now := time.Now()
	var row OrderTicketEntity
	if err := r.db.Where("claim_token = ? AND claim_expires_at > ? AND status = ?",
		claimToken, now, "pending").First(&row).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, repository.ErrConflict
		}
		return nil, err
	}
	ticketUUID := row.UUID.String()

	unitLabel := "Relawan · " + volunteerName
	result := r.db.Model(&OrderTicketEntity{}).
		Where("uuid = ? AND claim_token = ? AND status = ?", ticketUUID, claimToken, "pending").
		Updates(map[string]any{
			"status":           "accepted",
			"unit_name":        unitLabel,
			"handler_name":     volunteerName,
			"handler_phone":    volunteerPhone,
			"handling_notes":   "Diklaim relawan komunitas",
			"accepted_at":      now,
			"claim_token":      "",
			"claim_expires_at": nil,
		})
	if result.Error != nil {
		return nil, result.Error
	}
	if result.RowsAffected == 0 {
		return nil, repository.ErrConflict
	}
	return r.FindByID(ticketUUID)
}

func (r *OrderRepo) EnableTrack(id, token string, expiresAt time.Time) (*domain.OrderTicket, error) {
	now := time.Now()
	// pending allowed: WA dispatch /unit-job link before accept.
	result := r.db.Model(&OrderTicketEntity{}).
		Where("uuid = ? AND status IN ?", id, []string{"pending", "accepted", "in_progress"}).
		Updates(map[string]any{
			"track_token":      token,
			"track_enabled_at": now,
			"track_expires_at": expiresAt,
		})
	if result.Error != nil {
		return nil, result.Error
	}
	if result.RowsAffected == 0 {
		return nil, repository.ErrConflict
	}
	return r.FindByID(id)
}

func (r *OrderRepo) ExtendTrackExpiry(id string, expiresAt time.Time) error {
	result := r.db.Model(&OrderTicketEntity{}).
		Where("uuid = ? AND track_token IS NOT NULL AND track_token <> ''", id).
		Update("track_expires_at", expiresAt)
	if result.Error != nil {
		return result.Error
	}
	return nil
}

func (r *OrderRepo) FindByTrackToken(token string) (*domain.OrderTicket, error) {
	if token == "" {
		return nil, repository.ErrNotFound
	}
	token = strings.TrimSpace(token)
	if token == "" {
		return nil, repository.ErrNotFound
	}
	var row OrderTicketEntity
	if err := r.db.Where("track_token = ?", token).First(&row).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, repository.ErrNotFound
		}
		return nil, err
	}
	return mapOrder(row), nil
}

func (r *OrderRepo) UpdateResponderLocation(token string, lat, lng float64) (*domain.OrderTicket, error) {
	now := time.Now()
	result := r.db.Model(&OrderTicketEntity{}).
		Where("track_token = ? AND status IN ? AND (track_expires_at IS NULL OR track_expires_at > ?)",
			token, []string{"accepted", "in_progress"}, now).
		Updates(map[string]any{
			"responder_lat":        lat,
			"responder_lng":        lng,
			"responder_updated_at": now,
		})
	if result.Error != nil {
		return nil, result.Error
	}
	if result.RowsAffected == 0 {
		return nil, repository.ErrConflict
	}
	return r.FindByTrackToken(token)
}

func (r *OrderRepo) MarkArrivedByToken(token string) (*domain.OrderTicket, error) {
	if token == "" {
		return nil, repository.ErrNotFound
	}
	now := time.Now()
	result := r.db.Model(&OrderTicketEntity{}).
		Where("track_token = ? AND status IN ? AND arrived_at IS NULL",
			token, []string{"accepted", "in_progress"}).
		Updates(map[string]any{
			"arrived_at": now,
			"status":     "in_progress",
		})
	if result.Error != nil {
		return nil, result.Error
	}
	if result.RowsAffected == 0 {
		// Already arrived or inactive — surface as conflict if token exists.
		existing, err := r.FindByTrackToken(token)
		if err != nil {
			return nil, err
		}
		if existing.ArrivedAt != nil {
			return existing, nil
		}
		return nil, repository.ErrConflict
	}
	return r.FindByTrackToken(token)
}

func (r *OrderRepo) MarkArrived(id string) (*domain.OrderTicket, error) {
	if id == "" {
		return nil, repository.ErrNotFound
	}
	now := time.Now()
	result := r.db.Model(&OrderTicketEntity{}).
		Where("uuid = ? AND status IN ? AND arrived_at IS NULL",
			id, []string{"accepted", "in_progress"}).
		Updates(map[string]any{
			"arrived_at": now,
			"status":     "in_progress",
		})
	if result.Error != nil {
		return nil, result.Error
	}
	if result.RowsAffected == 0 {
		existing, err := r.FindByID(id)
		if err != nil {
			return nil, err
		}
		if existing.ArrivedAt != nil {
			return existing, nil
		}
		return nil, repository.ErrConflict
	}
	return r.FindByID(id)
}

func (r *OrderRepo) DisableTrack(id string) (*domain.OrderTicket, error) {
	result := r.db.Model(&OrderTicketEntity{}).
		Where("uuid = ?", id).
		Updates(map[string]any{
			"track_token":          nil,
			"track_enabled_at":     nil,
			"track_expires_at":     nil,
			"responder_lat":        0,
			"responder_lng":        0,
			"responder_updated_at": nil,
		})
	if result.Error != nil {
		return nil, result.Error
	}
	return r.FindByID(id)
}

// ExpireTrack stops live GPS without wiping the magic-link token (field read-only).
// Keep track_enabled_at so dashboard checklist still counts "link was created".
func (r *OrderRepo) ExpireTrack(id string) (*domain.OrderTicket, error) {
	now := time.Now()
	result := r.db.Model(&OrderTicketEntity{}).
		Where("uuid = ?", id).
		Updates(map[string]any{
			"track_expires_at": now,
		})
	if result.Error != nil {
		return nil, result.Error
	}
	return r.FindByID(id)
}

// ── UnitCredentialRepo ────────────────────────────────────────────────────────

type UnitCredentialRepo struct {
	db *gorm.DB
}

func NewUnitCredentialRepo(db *gorm.DB) *UnitCredentialRepo { return &UnitCredentialRepo{db: db} }

func (r *UnitCredentialRepo) Set(cred domain.UnitCredential) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(cred.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	newToken := uuid.New().String()

	// Look up existing credential by emergency UUID
	var existing UnitCredentialEntity
	err = r.db.Where("emergency_uuid = ?", cred.EmergencyUUID).First(&existing).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}

	wrapDup := func(err error) error {
		if err != nil && strings.Contains(err.Error(), "Duplicate entry") && strings.Contains(err.Error(), "username") {
			return repository.ErrDuplicate
		}
		return err
	}

	if existing.ID == 0 {
		// Create new
		return wrapDup(r.db.Create(&UnitCredentialEntity{
			EmergencyUUID: cred.EmergencyUUID,
			UnitName:      cred.UnitName,
			Username:      cred.Username,
			PasswordHash:  string(hash),
			AccessToken:   newToken,
			ExpiresAt:     time.Now().Add(30 * 24 * time.Hour),
		}).Error)
	}

	// Update existing — keep the existing access_token and expires_at so logged-in sessions
	// remain valid after a password/username change. ExpiresAt continues to roll via FindByToken.
	// To revoke a token immediately, Delete + Set must be called instead.
	return wrapDup(r.db.Model(&existing).Updates(map[string]any{
		"unit_name":     cred.UnitName,
		"username":      cred.Username,
		"password_hash": string(hash),
	}).Error)
}

func (r *UnitCredentialRepo) FindByToken(token string) (*domain.UnitCredential, error) {
	var row UnitCredentialEntity
	err := r.db.
		Where("access_token = ? AND expires_at > ?", token, time.Now()).
		First(&row).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, repository.ErrNotFound
		}
		return nil, err
	}
	// Extend TTL on each successful use (rolling 30-day window).
	_ = r.db.Model(&row).Update("expires_at", time.Now().Add(30*24*time.Hour))
	return &domain.UnitCredential{EmergencyUUID: row.EmergencyUUID, UnitName: row.UnitName, Username: row.Username, AccessToken: row.AccessToken}, nil
}

func (r *UnitCredentialRepo) FindByUsername(username string) (*domain.UnitCredential, error) {
	var row UnitCredentialEntity
	if err := r.db.Where("username = ?", username).First(&row).Error; err != nil {
		return nil, err
	}
	return &domain.UnitCredential{
		EmergencyUUID: row.EmergencyUUID,
		UnitName:      row.UnitName,
		Username:      row.Username,
		Password:      row.PasswordHash,
		AccessToken:   row.AccessToken,
	}, nil
}

func (r *UnitCredentialRepo) FindByEmergencyUUID(emergencyUUID string) (*domain.UnitCredential, error) {
	var row UnitCredentialEntity
	if err := r.db.Where("emergency_uuid = ?", emergencyUUID).First(&row).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, repository.ErrNotFound
		}
		return nil, err
	}
	return &domain.UnitCredential{
		EmergencyUUID: row.EmergencyUUID,
		UnitName:      row.UnitName,
		Username:      row.Username,
	}, nil
}

func (r *UnitCredentialRepo) ListAll() ([]domain.UnitCredential, error) {
	var rows []UnitCredentialEntity
	if err := r.db.Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]domain.UnitCredential, len(rows))
	for i, row := range rows {
		out[i] = domain.UnitCredential{EmergencyUUID: row.EmergencyUUID, UnitName: row.UnitName, Username: row.Username}
	}
	return out, nil
}

func (r *UnitCredentialRepo) Delete(emergencyUUID string) error {
	res := r.db.Where("emergency_uuid = ?", emergencyUUID).Delete(&UnitCredentialEntity{})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return repository.ErrNotFound
	}
	return nil
}
