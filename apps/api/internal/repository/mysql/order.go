package mysqlrepo

import (
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
	var count int64
	r.db.Model(&OrderTicketEntity{}).Where("DATE(created_at) = CURDATE()").Count(&count)
	return fmt.Sprintf("BB-%s-%04d", today, count+1)
}

func (r *OrderRepo) Create(o domain.OrderTicket) (*domain.OrderTicket, error) {
	row := OrderTicketEntity{
		TicketNumber:   r.generateTicketNumber(),
		EmergencyUUID:  o.EmergencyUUID,
		UnitName:       o.UnitName,
		RequesterName:  o.RequesterName,
		RequesterPhone: o.RequesterPhone,
		Location:       o.Location,
		Condition:      o.Condition,
		RequesterLat:   o.RequesterLat,
		RequesterLng:   o.RequesterLng,
		Status:         "pending",
	}
	if err := r.db.Create(&row).Error; err != nil {
		return nil, err
	}
	return mapOrder(row), nil
}

func (r *OrderRepo) FindByTicketNumber(number string) (*domain.OrderTicket, error) {
	var row OrderTicketEntity
	if err := r.db.Where("ticket_number = ?", number).First(&row).Error; err != nil {
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

func (r *OrderRepo) UpdateStatus(id, status, handlerName, notes string) (*domain.OrderTicket, error) {
	updates := map[string]any{
		"status":       status,
		"handler_name": handlerName,
		"handling_notes": notes,
	}
	if status == "completed" {
		now := time.Now()
		updates["completed_at"] = &now
	}
	if err := r.db.Model(&OrderTicketEntity{}).Where("uuid = ?", id).Updates(updates).Error; err != nil {
		return nil, err
	}
	var row OrderTicketEntity
	if err := r.db.Where("uuid = ?", id).First(&row).Error; err != nil {
		return nil, err
	}
	return mapOrder(row), nil
}

func mapOrder(row OrderTicketEntity) *domain.OrderTicket {
	return &domain.OrderTicket{
		ID:             row.UUID.String(),
		TicketNumber:   row.TicketNumber,
		EmergencyUUID:  row.EmergencyUUID,
		UnitName:       row.UnitName,
		RequesterName:  row.RequesterName,
		RequesterPhone: row.RequesterPhone,
		Location:       row.Location,
		Condition:      row.Condition,
		RequesterLat:   row.RequesterLat,
		RequesterLng:   row.RequesterLng,
		Status:         row.Status,
		HandlerName:    row.HandlerName,
		HandlingNotes:  row.HandlingNotes,
		CompletedAt:    row.CompletedAt,
		CreatedAt:      row.CreatedAt,
	}
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
		}).Error)
	}

	// Update existing — keep the existing access_token so logged-in sessions remain valid.
	return wrapDup(r.db.Model(&existing).Updates(map[string]any{
		"unit_name":     cred.UnitName,
		"username":      cred.Username,
		"password_hash": string(hash),
	}).Error)
}

func (r *UnitCredentialRepo) FindByToken(token string) (*domain.UnitCredential, error) {
	var row UnitCredentialEntity
	if err := r.db.Where("access_token = ?", token).First(&row).Error; err != nil {
		return nil, err
	}
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
