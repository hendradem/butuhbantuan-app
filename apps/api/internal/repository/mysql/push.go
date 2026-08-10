package mysqlrepo

import (
	"github.com/butuhbantuan/api/internal/domain"
	"gorm.io/gorm"
)

type PushRepo struct{ db *gorm.DB }

func NewPushRepo(db *gorm.DB) *PushRepo { return &PushRepo{db: db} }

func (r *PushRepo) Save(sub domain.PushSubscription) error {
	// Upsert by endpoint — replace if already exists (e.g. re-subscription).
	return r.db.Where("endpoint = ?", sub.Endpoint).
		Assign(PushSubscriptionEntity{
			TicketNumber: sub.TicketNumber,
			Endpoint:     sub.Endpoint,
			P256DH:       sub.P256DH,
			Auth:         sub.Auth,
		}).
		FirstOrCreate(&PushSubscriptionEntity{Endpoint: sub.Endpoint}).Error
}

func (r *PushRepo) FindByTicket(ticketNumber string) ([]domain.PushSubscription, error) {
	var rows []PushSubscriptionEntity
	if err := r.db.Where("ticket_number = ?", ticketNumber).Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]domain.PushSubscription, len(rows))
	for i, row := range rows {
		out[i] = domain.PushSubscription{
			ID:           row.ID,
			TicketNumber: row.TicketNumber,
			Endpoint:     row.Endpoint,
			P256DH:       row.P256DH,
			Auth:         row.Auth,
		}
	}
	return out, nil
}

func (r *PushRepo) DeleteByEndpoint(endpoint string) error {
	return r.db.Where("endpoint = ?", endpoint).Delete(&PushSubscriptionEntity{}).Error
}
