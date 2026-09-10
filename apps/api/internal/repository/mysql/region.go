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
	// Geocoders normalise regency names inconsistently — Nominatim returns
	// "Kulonprogo" (one word) while our seed data stores "Kabupaten Kulon Progo".
	// Load everything and match in-memory after collapsing to a canonical form
	// (lowercase, no "Kabupaten "/"Kota " prefix, no spaces). The regions table
	// is small so this is cheap and works across DB dialects.
	var all []AvailableServiceCityEntity
	if err := r.db.Preload("Regency").Preload("Regency.Province").
		Find(&all).Error; err != nil {
		return nil, err
	}
	needle := normalizeRegionName(name)
	if needle == "" {
		return nil, nil
	}
	matched := make([]AvailableServiceCityEntity, 0, len(all))
	for _, row := range all {
		if strings.Contains(normalizeRegionName(row.Name), needle) {
			matched = append(matched, row)
		}
	}
	return mapManyRegions(matched), nil
}

func normalizeRegionName(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	s = strings.ReplaceAll(s, "kabupaten ", "")
	s = strings.ReplaceAll(s, "kota ", "")
	s = strings.ReplaceAll(s, " ", "")
	return s
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

func (r *RegionRepo) FindRegency(id string) (*domain.Regency, error) {
	var row Regency
	if err := r.db.Where("id = ?", id).First(&row).Error; err != nil {
		return nil, err
	}
	return &domain.Regency{ID: row.ID, ProvinceID: row.ProvinceID, Name: row.Name}, nil
}

func (r *RegionRepo) FindProvince(id string) (*domain.Province, error) {
	var row Province
	if err := r.db.Where("id = ?", id).First(&row).Error; err != nil {
		return nil, err
	}
	return &domain.Province{ID: row.ID, Name: row.Name}, nil
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

// FindCoveredProvinces returns provinces that have at least one Wilayah Tercakup entry.
func (r *RegionRepo) FindCoveredProvinces() ([]domain.Province, error) {
	var rows []Province
	err := r.db.Model(&Province{}).
		Joins("JOIN regency ON regency.province_id = province.id").
		Joins("JOIN available_service_city_entity ON available_service_city_entity.regency_id = regency.id").
		Group("province.id, province.name").
		Order("province.name").
		Find(&rows).Error
	if err != nil {
		return nil, err
	}
	out := make([]domain.Province, len(rows))
	for i, row := range rows {
		out[i] = domain.Province{ID: row.ID, Name: row.Name}
	}
	return out, nil
}

// FindCoveredRegenciesByProvince returns only kab/kota in the coverage allowlist for a province.
func (r *RegionRepo) FindCoveredRegenciesByProvince(provinceID string) ([]domain.Regency, error) {
	var rows []Regency
	q := r.db.Model(&Regency{}).
		Joins("JOIN available_service_city_entity ON available_service_city_entity.regency_id = regency.id").
		Order("regency.name")
	if provinceID != "" {
		q = q.Where("regency.province_id = ?", provinceID)
	}
	if err := q.Find(&rows).Error; err != nil {
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
		ID:         fmt.Sprintf("%d", r.ID),
		Name:       r.Name,
		RegencyID:  r.RegencyID,
		Regency:    r.Regency.Name,
		ProvinceID: r.Regency.ProvinceID,
		Province:   r.Regency.Province.Name,
		Latitude:   r.Latitude,
		Longitude:  r.Longitude,
	}
}

func mapManyRegions(rows []AvailableServiceCityEntity) []domain.AvailableRegion {
	out := make([]domain.AvailableRegion, len(rows))
	for i, row := range rows {
		out[i] = mapRegion(row)
	}
	return out
}
