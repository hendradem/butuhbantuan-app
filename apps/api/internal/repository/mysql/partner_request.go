package mysqlrepo

import (
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/butuhbantuan/api/internal/domain"
	"github.com/butuhbantuan/api/internal/repository"
	"gorm.io/gorm"
)

type PartnerRequestRepo struct{ db *gorm.DB }

func NewPartnerRequestRepo(db *gorm.DB) *PartnerRequestRepo { return &PartnerRequestRepo{db: db} }

func (r *PartnerRequestRepo) Create(p domain.PartnerRequest) (*domain.PartnerRequest, error) {
	payload, err := json.Marshal(p.Payload)
	if err != nil {
		return nil, err
	}
	row := PartnerRequestEntity{
		Status:           domain.NormalizePartnerRequestStatus(p.Status),
		Name:             p.Payload.Name,
		OrganizationName: p.Payload.OrganizationName,
		EmergencyTypeID:  p.Payload.EmergencyType.ID,
		ProvinceID:       p.Payload.Address.ProvinceID,
		RegencyID:        p.Payload.Address.RegencyID,
		ContactPhone:     p.Payload.Contact.Phone,
		ContactWhatsapp:  p.Payload.Contact.Whatsapp,
		ContactEmail:     p.Payload.Contact.Email,
		PayloadJSON:      string(payload),
	}
	if err := r.db.Create(&row).Error; err != nil {
		return nil, err
	}
	result := mapPartnerRequest(row)
	return &result, nil
}

func (r *PartnerRequestRepo) FindAll(status string) ([]domain.PartnerRequest, error) {
	var rows []PartnerRequestEntity
	q := r.db.Order("created_at desc")
	if s := strings.TrimSpace(status); s != "" {
		q = q.Where("status = ?", domain.NormalizePartnerRequestStatus(s))
	}
	if err := q.Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]domain.PartnerRequest, len(rows))
	for i, row := range rows {
		out[i] = mapPartnerRequest(row)
	}
	r.fillDisplayNames(out)
	return out, nil
}

func (r *PartnerRequestRepo) FindByID(id string) (*domain.PartnerRequest, error) {
	var row PartnerRequestEntity
	if err := r.db.Where("uuid = ?", id).First(&row).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, repository.ErrNotFound
		}
		return nil, err
	}
	out := []domain.PartnerRequest{mapPartnerRequest(row)}
	r.fillDisplayNames(out)
	return &out[0], nil
}

// fillDisplayNames resolves the type and region names from our own master
// tables. The payload only carries ids — it is deliberately the same shape the
// admin create form posts — so without this the review table would show blank
// type and region columns.
func (r *PartnerRequestRepo) fillDisplayNames(reqs []domain.PartnerRequest) {
	typeIDs := map[uint]bool{}
	regencyIDs := map[string]bool{}
	provinceIDs := map[string]bool{}
	for _, req := range reqs {
		if id := req.Payload.EmergencyType.ID; id != 0 {
			typeIDs[id] = true
		}
		if id := req.Payload.Address.RegencyID; id != "" {
			regencyIDs[id] = true
		}
		if id := req.Payload.Address.ProvinceID; id != "" {
			provinceIDs[id] = true
		}
	}

	typeNames := map[uint]string{}
	if len(typeIDs) > 0 {
		var types []EmergencyTypeEntity
		r.db.Where("id IN ?", keysOf(typeIDs)).Find(&types)
		for _, t := range types {
			typeNames[t.ID] = t.Name
		}
	}

	regencyNames := map[string]string{}
	if len(regencyIDs) > 0 {
		var regencies []Regency
		r.db.Where("id IN ?", keysOf(regencyIDs)).Find(&regencies)
		for _, rg := range regencies {
			regencyNames[rg.ID] = rg.Name
		}
	}

	provinceNames := map[string]string{}
	if len(provinceIDs) > 0 {
		var provinces []Province
		r.db.Where("id IN ?", keysOf(provinceIDs)).Find(&provinces)
		for _, p := range provinces {
			provinceNames[p.ID] = p.Name
		}
	}

	for i := range reqs {
		if name := typeNames[reqs[i].Payload.EmergencyType.ID]; name != "" {
			reqs[i].Payload.EmergencyType.Name = name
		}
		if name := regencyNames[reqs[i].Payload.Address.RegencyID]; name != "" {
			reqs[i].Payload.Address.Regency = name
		}
		if name := provinceNames[reqs[i].Payload.Address.ProvinceID]; name != "" {
			reqs[i].Payload.Address.Province = name
		}
	}
}

func keysOf[K comparable, V any](m map[K]V) []K {
	out := make([]K, 0, len(m))
	for k := range m {
		out = append(out, k)
	}
	return out
}

func (r *PartnerRequestRepo) Review(id, status, note, reviewedBy, emergencyUUID string) (*domain.PartnerRequest, error) {
	var row PartnerRequestEntity
	if err := r.db.Where("uuid = ?", id).First(&row).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, repository.ErrNotFound
		}
		return nil, err
	}

	now := time.Now()
	row.Status = status
	row.ReviewNote = note
	row.ReviewedBy = reviewedBy
	row.ReviewedAt = &now
	if emergencyUUID != "" {
		row.EmergencyUUID = emergencyUUID
	}
	if err := r.db.Save(&row).Error; err != nil {
		return nil, err
	}
	result := mapPartnerRequest(row)
	return &result, nil
}

func mapPartnerRequest(e PartnerRequestEntity) domain.PartnerRequest {
	out := domain.PartnerRequest{
		ID:            e.UUID.String(),
		Status:        e.Status,
		ReviewNote:    e.ReviewNote,
		ReviewedAt:    e.ReviewedAt,
		ReviewedBy:    e.ReviewedBy,
		EmergencyUUID: e.EmergencyUUID,
		CreatedAt:     e.CreatedAt,
		UpdatedAt:     e.UpdatedAt,
	}
	// A payload that fails to decode leaves the zero Emergency in place; the
	// review screen then simply shows empty fields instead of 500ing.
	_ = json.Unmarshal([]byte(e.PayloadJSON), &out.Payload)
	return out
}
