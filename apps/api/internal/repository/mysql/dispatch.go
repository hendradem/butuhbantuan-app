package mysqlrepo

import (
	"time"

	"github.com/butuhbantuan/api/internal/domain"
	"gorm.io/gorm"
)

type DispatchAttemptRepo struct {
	db *gorm.DB
}

func NewDispatchAttemptRepo(db *gorm.DB) *DispatchAttemptRepo {
	return &DispatchAttemptRepo{db: db}
}

func (r *DispatchAttemptRepo) Create(a domain.DispatchAttempt) (*domain.DispatchAttempt, error) {
	row := DispatchAttemptEntity{
		OrderID:       a.OrderID,
		TicketNumber:  a.TicketNumber,
		EmergencyUUID: a.EmergencyUUID,
		UnitName:      a.UnitName,
		Round:         a.Round,
		Status:        a.Status,
		DistanceKm:    a.DistanceKm,
		Score:         a.Score,
	}
	if row.Status == "" {
		row.Status = domain.DispatchAttemptOffered
	}
	if row.Round == 0 {
		row.Round = 1
	}
	if err := r.db.Create(&row).Error; err != nil {
		return nil, err
	}
	return mapAttempt(row), nil
}

func (r *DispatchAttemptRepo) FindByOrderID(orderID string) ([]domain.DispatchAttempt, error) {
	var rows []DispatchAttemptEntity
	if err := r.db.Where("order_id = ?", orderID).Order("round ASC, offered_at ASC").Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]domain.DispatchAttempt, len(rows))
	for i, row := range rows {
		out[i] = *mapAttempt(row)
	}
	return out, nil
}

func (r *DispatchAttemptRepo) FindOfferedEmergencyUUIDs(orderID string) ([]string, error) {
	var uuids []string
	err := r.db.Model(&DispatchAttemptEntity{}).
		Where("order_id = ?", orderID).
		Distinct().
		Pluck("emergency_uuid", &uuids).Error
	return uuids, err
}

func (r *DispatchAttemptRepo) ResolveOffered(orderID, status string) error {
	now := time.Now()
	return r.db.Model(&DispatchAttemptEntity{}).
		Where("order_id = ? AND status = ?", orderID, domain.DispatchAttemptOffered).
		Updates(map[string]any{
			"status":      status,
			"resolved_at": &now,
		}).Error
}

func (r *DispatchAttemptRepo) RejectOffered(orderID, reason, note string) error {
	now := time.Now()
	updates := map[string]any{
		"status":      domain.DispatchAttemptRejected,
		"resolved_at": &now,
	}
	if reason != "" {
		updates["reject_reason"] = reason
	}
	if note != "" {
		updates["reject_note"] = note
	}
	return r.db.Model(&DispatchAttemptEntity{}).
		Where("order_id = ? AND status = ?", orderID, domain.DispatchAttemptOffered).
		Updates(updates).Error
}

func (r *DispatchAttemptRepo) MarkAccepted(orderID, emergencyUUID string) error {
	now := time.Now()
	if err := r.db.Model(&DispatchAttemptEntity{}).
		Where("order_id = ? AND emergency_uuid = ?", orderID, emergencyUUID).
		Updates(map[string]any{
			"status":      domain.DispatchAttemptAccepted,
			"resolved_at": &now,
		}).Error; err != nil {
		return err
	}
	return r.db.Model(&DispatchAttemptEntity{}).
		Where("order_id = ? AND status = ?", orderID, domain.DispatchAttemptOffered).
		Updates(map[string]any{
			"status":      domain.DispatchAttemptSuperseded,
			"resolved_at": &now,
		}).Error
}

func (r *DispatchAttemptRepo) CountRejectsSince(emergencyUUID string, since time.Time) (int, error) {
	if emergencyUUID == "" {
		return 0, nil
	}
	var n int64
	err := r.db.Model(&DispatchAttemptEntity{}).
		Where("emergency_uuid = ? AND status = ? AND resolved_at >= ?",
			emergencyUUID, domain.DispatchAttemptRejected, since).
		Count(&n).Error
	return int(n), err
}

func mapAttempt(row DispatchAttemptEntity) *domain.DispatchAttempt {
	return &domain.DispatchAttempt{
		ID:            row.UUID.String(),
		OrderID:       row.OrderID,
		TicketNumber:  row.TicketNumber,
		EmergencyUUID: row.EmergencyUUID,
		UnitName:      row.UnitName,
		Round:         row.Round,
		Status:        row.Status,
		DistanceKm:    row.DistanceKm,
		Score:         row.Score,
		RejectReason:  row.RejectReason,
		RejectNote:    row.RejectNote,
		OfferedAt:     row.OfferedAt,
		ResolvedAt:    row.ResolvedAt,
	}
}
