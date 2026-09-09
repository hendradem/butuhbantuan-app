package mysqlrepo

import (
	"github.com/butuhbantuan/api/internal/domain"
	"gorm.io/gorm"
)

type OrderEventRepo struct {
	db *gorm.DB
}

func NewOrderEventRepo(db *gorm.DB) *OrderEventRepo {
	return &OrderEventRepo{db: db}
}

func (r *OrderEventRepo) Create(e domain.OrderEvent) (*domain.OrderEvent, error) {
	row := OrderEventEntity{
		OrderID:      e.OrderID,
		TicketNumber: e.TicketNumber,
		Type:         e.Type,
		Message:      e.Message,
		Actor:        e.Actor,
		FromUnit:     e.FromUnit,
		ToUnit:       e.ToUnit,
		Tier:         e.Tier,
	}
	if row.Actor == "" {
		row.Actor = "system"
	}
	if err := r.db.Create(&row).Error; err != nil {
		return nil, err
	}
	return mapOrderEvent(row), nil
}

func (r *OrderEventRepo) FindByOrderID(orderID string) ([]domain.OrderEvent, error) {
	var rows []OrderEventEntity
	if err := r.db.Where("order_id = ?", orderID).Order("created_at ASC, id ASC").Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]domain.OrderEvent, len(rows))
	for i, row := range rows {
		out[i] = *mapOrderEvent(row)
	}
	return out, nil
}

func mapOrderEvent(row OrderEventEntity) *domain.OrderEvent {
	return &domain.OrderEvent{
		ID:           row.UUID.String(),
		OrderID:      row.OrderID,
		TicketNumber: row.TicketNumber,
		Type:         row.Type,
		Message:      row.Message,
		Actor:        row.Actor,
		FromUnit:     row.FromUnit,
		ToUnit:       row.ToUnit,
		Tier:         row.Tier,
		CreatedAt:    row.CreatedAt,
	}
}
