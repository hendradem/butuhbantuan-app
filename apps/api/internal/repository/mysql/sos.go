package mysqlrepo

import (
	"github.com/butuhbantuan/api/internal/domain"
	"gorm.io/gorm"
)

type SOSRepo struct{ db *gorm.DB }

func NewSOSRepo(db *gorm.DB) *SOSRepo { return &SOSRepo{db: db} }

func (r *SOSRepo) Create(s domain.SOSAlert) (*domain.SOSAlert, error) {
	row := SOSAlertEntity{
		Name:         s.Name,
		Phone:        s.Phone,
		Lat:          s.Lat,
		Lng:          s.Lng,
		Address:      s.Address,
		Description:  s.Description,
		PhotoURL:     s.PhotoURL,
		TypeID:       s.TypeID,
		RegencyID:    s.RegencyID,
		ProvinceID:   s.ProvinceID,
		TicketNumber: s.TicketNumber,
	}
	if err := r.db.Create(&row).Error; err != nil {
		return nil, err
	}
	return mapSOS(row), nil
}

func (r *SOSRepo) FindAll() ([]domain.SOSAlert, error) {
	var rows []SOSAlertEntity
	if err := r.db.Order("created_at DESC").Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]domain.SOSAlert, len(rows))
	for i, row := range rows {
		out[i] = *mapSOS(row)
	}
	return out, nil
}

func mapSOS(e SOSAlertEntity) *domain.SOSAlert {
	return &domain.SOSAlert{
		ID:           e.UUID.String(),
		Name:         e.Name,
		Phone:        e.Phone,
		Lat:          e.Lat,
		Lng:          e.Lng,
		Address:      e.Address,
		Description:  e.Description,
		PhotoURL:     e.PhotoURL,
		TypeID:       e.TypeID,
		RegencyID:    e.RegencyID,
		ProvinceID:   e.ProvinceID,
		TicketNumber: e.TicketNumber,
		CreatedAt:    e.CreatedAt,
	}
}
