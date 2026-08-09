package mysqlrepo

import (
	"fmt"
	"strings"

	"github.com/butuhbantuan/api/internal/domain"
	"github.com/butuhbantuan/api/internal/repository"
	"gorm.io/gorm"
)

// ---------- RegionRepo ----------

type RegionRepo struct{ db *gorm.DB }

func NewRegionRepo(db *gorm.DB) *RegionRepo { return &RegionRepo{db: db} }

func (r *RegionRepo) FindAllAvailableRegions() ([]domain.AvailableRegion, error) {
	var rows []AvailableServiceCityEntity
	if err := r.db.Preload("Regency").Preload("Regency.Province").Find(&rows).Error; err != nil {
		return nil, err
	}
	return mapManyRegions(rows), nil
}

func (r *RegionRepo) FindAvailableRegionsByName(name string) ([]domain.AvailableRegion, error) {
	var rows []AvailableServiceCityEntity
	needle := "%" + strings.ToLower(name) + "%"
	if err := r.db.Preload("Regency").Preload("Regency.Province").
		Where(
			"LOWER(name) LIKE ? OR LOWER(REPLACE(REPLACE(name, 'Kabupaten ', ''), 'Kota ', '')) LIKE ?",
			needle, needle,
		).
		Find(&rows).Error; err != nil {
		return nil, err
	}
	return mapManyRegions(rows), nil
}

func (r *RegionRepo) CreateAvailableRegion(reg domain.AvailableRegion) (*domain.AvailableRegion, error) {
	row := AvailableServiceCityEntity{
		Name:      reg.Name,
		RegencyID: reg.RegencyID,
		Latitude:  reg.Latitude,
		Longitude: reg.Longitude,
	}
	if err := r.db.Create(&row).Error; err != nil {
		return nil, err
	}
	if err := r.db.Preload("Regency").Preload("Regency.Province").First(&row, row.ID).Error; err != nil {
		return nil, err
	}
	created := mapRegion(row)
	return &created, nil
}

func (r *RegionRepo) UpdateAvailableRegion(reg domain.AvailableRegion) (*domain.AvailableRegion, error) {
	var row AvailableServiceCityEntity
	if err := r.db.First(&row, reg.ID).Error; err != nil {
		return nil, repository.ErrNotFound
	}
	row.Name = reg.Name
	row.RegencyID = reg.RegencyID
	row.Latitude = reg.Latitude
	row.Longitude = reg.Longitude
	if err := r.db.Save(&row).Error; err != nil {
		return nil, err
	}
	if err := r.db.Preload("Regency").Preload("Regency.Province").First(&row, row.ID).Error; err != nil {
		return nil, err
	}
	updated := mapRegion(row)
	return &updated, nil
}

func (r *RegionRepo) DeleteAvailableRegion(id string) error {
	result := r.db.Delete(&AvailableServiceCityEntity{}, id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return repository.ErrNotFound
	}
	return nil
}

func (r *RegionRepo) SearchRegencies(q string) ([]domain.Regency, error) {
	var rows []Regency
	needle := "%" + strings.ToLower(q) + "%"
	if err := r.db.Preload("Province").
		Where("LOWER(name) LIKE ?", needle).
		Order("name").Limit(15).Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]domain.Regency, len(rows))
	for i, row := range rows {
		out[i] = domain.Regency{
			ID: row.ID, ProvinceID: row.ProvinceID,
			Name: row.Name, ProvinceName: row.Province.Name,
		}
	}
	return out, nil
}

func (r *RegionRepo) FindProvinces() ([]domain.Province, error) {
	var rows []Province
	if err := r.db.Order("name").Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]domain.Province, len(rows))
	for i, row := range rows {
		out[i] = domain.Province{ID: row.ID, Name: row.Name}
	}
	return out, nil
}

func (r *RegionRepo) FindRegenciesByProvince(provinceID string) ([]domain.Regency, error) {
	var rows []Regency
	if err := r.db.Where("province_id = ?", provinceID).Order("name").Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]domain.Regency, len(rows))
	for i, row := range rows {
		out[i] = domain.Regency{ID: row.ID, ProvinceID: row.ProvinceID, Name: row.Name}
	}
	return out, nil
}

// ---------- Mappers ----------

func mapRegion(r AvailableServiceCityEntity) domain.AvailableRegion {
	return domain.AvailableRegion{
		ID:        fmt.Sprintf("%d", r.ID),
		Name:      r.Name,
		RegencyID: r.RegencyID,
		Regency:   r.Regency.Name,
		Province:  r.Regency.Province.Name,
		Latitude:  r.Latitude,
		Longitude: r.Longitude,
	}
}

func mapManyRegions(rows []AvailableServiceCityEntity) []domain.AvailableRegion {
	out := make([]domain.AvailableRegion, len(rows))
	for i, row := range rows {
		out[i] = mapRegion(row)
	}
	return out
}
