package mysqlrepo

import (
	"errors"
	"fmt"
	"strconv"
	"strings"

	"github.com/butuhbantuan/api/internal/domain"
	"github.com/butuhbantuan/api/internal/repository"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// ---------- EmergencyRepo ----------

type EmergencyRepo struct{ db *gorm.DB }

func NewEmergencyRepo(db *gorm.DB) *EmergencyRepo { return &EmergencyRepo{db: db} }

func (r *EmergencyRepo) preload() *gorm.DB {
	return r.db.Preload("EmergencyType").
		Preload("Province").
		Preload("Regency").
		Preload("District")
}

func (r *EmergencyRepo) FindAll() ([]domain.Emergency, error) {
	var rows []EmergencyEntity
	if err := r.preload().Where("is_active = ?", true).Find(&rows).Error; err != nil {
		return nil, err
	}
	return mapManyEmergencies(rows), nil
}

func (r *EmergencyRepo) FindByProvince(provinceID string) ([]domain.Emergency, error) {
	var rows []EmergencyEntity
	if err := r.preload().
		Where("province_id = ? AND is_active = ?", provinceID, true).
		Find(&rows).Error; err != nil {
		return nil, err
	}
	return mapManyEmergencies(rows), nil
}

func (r *EmergencyRepo) FindByRegency(regencyID string) ([]domain.Emergency, error) {
	var rows []EmergencyEntity
	if err := r.preload().
		Where("(regency_id = ? OR is_province_dispatcher = ?) AND is_active = ?", regencyID, true, true).
		Find(&rows).Error; err != nil {
		return nil, err
	}
	return mapManyEmergencies(rows), nil
}

func (r *EmergencyRepo) FindDispatchers(regencyID, provinceID string) ([]domain.Emergency, error) {
	var rows []EmergencyEntity
	if err := r.preload().
		Where("is_dispatcher = ? AND is_active = ?", true, true).
		Where("regency_id = ? OR (province_id = ? AND is_province_dispatcher = ?)", regencyID, provinceID, true).
		Find(&rows).Error; err != nil {
		return nil, err
	}
	return mapManyEmergencies(rows), nil
}

func (r *EmergencyRepo) FindByType(emergencyTypeID string) ([]domain.Emergency, error) {
	var rows []EmergencyEntity
	if err := r.preload().
		Where("emergency_type_id = ? AND is_active = ?", emergencyTypeID, true).
		Find(&rows).Error; err != nil {
		return nil, err
	}
	return mapManyEmergencies(rows), nil
}

func (r *EmergencyRepo) FindByIDs(ids []string) ([]domain.Emergency, error) {
	var rows []EmergencyEntity
	if err := r.preload().Where("uuid IN ?", ids).Find(&rows).Error; err != nil {
		return nil, err
	}
	return mapManyEmergencies(rows), nil
}

func (r *EmergencyRepo) buildEntity(e domain.Emergency) EmergencyEntity {
	lat, _ := strconv.ParseFloat(e.Coordinates[1], 64)
	lng, _ := strconv.ParseFloat(e.Coordinates[0], 64)
	tier := normalizePartnerTier(e.PartnerTier)
	row := EmergencyEntity{
		Name:                 e.Name,
		OrganizationName:     e.OrganizationName,
		OrganizationType:     e.OrganizationType,
		EmergencyTypeID:      uint(e.EmergencyType.ID),
		Description:          e.Description,
		IsVerified:           tier == domain.PartnerTierPSC || tier == domain.PartnerTierVerified,
		PartnerTier:          tier,
		TrainedDriver:        e.Readiness.TrainedDriver,
		HasOxygen:            e.Readiness.HasOxygen,
		HasStretcher:         e.Readiness.HasStretcher,
		EquipmentNotes:       e.Readiness.EquipmentNotes,
		IsActive:             true,
		Is24Hours:            e.Operational.Is24Hours,
		OpenTime:             e.Operational.OpenTime,
		CloseTime:            e.Operational.CloseTime,
		TotalUnits:           e.Fleet.Total,
		AvailableUnits:       e.Fleet.Available,
		OrganizationLogo:     e.Logo,
		Latitude:             lat,
		Longitude:            lng,
		Email:                e.Contact.Email,
		Phone:                e.Contact.Phone,
		Whatsapp:             e.Contact.Whatsapp,
		DistrictID:           e.Address.DistrictID,
		RegencyID:            e.Address.RegencyID,
		ProvinceID:           e.Address.ProvinceID,
		FullAddress:          e.Address.FullAddress,
		TypeOfService:        e.TypeOfService,
		TipeEmergency:        strings.Join(e.TipeEmergency, ","),
		IsDispatcher:         e.IsDispatcher,
		IsProvinceDispatcher: e.IsProvinceDispatcher,
	}
	// Use the caller-supplied UUID when available so seeded data has stable IDs.
	if e.ID != "" {
		if parsed, err := uuid.Parse(e.ID); err == nil {
			row.UUID = parsed
		}
	}
	return row
}

func (r *EmergencyRepo) UpdateOperational(id string, status domain.OperationalStatus) error {
	result := r.db.Model(&EmergencyEntity{}).Where("uuid = ?", id).Updates(map[string]any{
		"is_active":   status.IsActive,
		"is24_hours":  status.Is24Hours,
		"open_time":   status.OpenTime,
		"close_time":  status.CloseTime,
	})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return repository.ErrNotFound
	}
	return nil
}

func (r *EmergencyRepo) UpdateFleet(id string, fleet domain.FleetStatus) error {
	var row EmergencyEntity
	if err := r.db.Where("uuid = ? AND deleted_at IS NULL", id).First(&row).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return repository.ErrNotFound
		}
		return err
	}
	return r.db.Model(&row).Updates(map[string]any{
		"total_units":     fleet.Total,
		"available_units": fleet.Available,
	}).Error
}

func (r *EmergencyRepo) UpdateActive(id string, isActive bool) error {
	var row EmergencyEntity
	if err := r.db.Where("uuid = ? AND deleted_at IS NULL", id).First(&row).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return repository.ErrNotFound
		}
		return err
	}
	return r.db.Model(&row).Update("is_active", isActive).Error
}

func (r *EmergencyRepo) Create(e domain.Emergency) (*domain.Emergency, error) {
	row := r.buildEntity(e)
	if err := r.db.Omit(clause.Associations).Create(&row).Error; err != nil {
		return nil, err
	}
	if err := r.preload().First(&row, row.ID).Error; err != nil {
		return nil, err
	}
	created := mapEmergency(row)
	return &created, nil
}

// Upsert creates the emergency with its stable UUID from the JSON data file, or
// updates all fields if a record with that UUID already exists. This is used by
// the seeder so re-running it never produces duplicate rows.
func (r *EmergencyRepo) Upsert(e domain.Emergency) (*domain.Emergency, error) {
	if e.ID == "" {
		return r.Create(e)
	}
	entityUUID, err := uuid.Parse(e.ID)
	if err != nil {
		return r.Create(e)
	}

	var existing EmergencyEntity
	err = r.db.Where("uuid = ?", entityUUID.String()).First(&existing).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return r.Create(e)
	}
	if err != nil {
		return nil, err
	}

	// Update every field except UUID/ID/timestamps.
	row := r.buildEntity(e)
	if err := r.db.Model(&existing).Updates(map[string]any{
		"name":                   row.Name,
		"organization_name":      row.OrganizationName,
		"organization_type":      row.OrganizationType,
		"emergency_type_id":      row.EmergencyTypeID,
		"description":            row.Description,
		"is_verified":            row.IsVerified,
		"partner_tier":           row.PartnerTier,
		"trained_driver":         row.TrainedDriver,
		"has_oxygen":             row.HasOxygen,
		"has_stretcher":          row.HasStretcher,
		"equipment_notes":        row.EquipmentNotes,
		"is_active":              row.IsActive,
		"is24_hours":             row.Is24Hours,
		"open_time":              row.OpenTime,
		"close_time":             row.CloseTime,
		"total_units":            row.TotalUnits,
		"available_units":        row.AvailableUnits,
		"organization_logo":      row.OrganizationLogo,
		"latitude":               row.Latitude,
		"longitude":              row.Longitude,
		"email":                  row.Email,
		"phone":                  row.Phone,
		"whatsapp":               row.Whatsapp,
		"district_id":            row.DistrictID,
		"regency_id":             row.RegencyID,
		"province_id":            row.ProvinceID,
		"full_address":           row.FullAddress,
		"type_of_service":        row.TypeOfService,
		"tipe_emergency":         row.TipeEmergency,
		"is_dispatcher":          row.IsDispatcher,
		"is_province_dispatcher": row.IsProvinceDispatcher,
	}).Error; err != nil {
		return nil, err
	}
	if err := r.preload().First(&existing, existing.ID).Error; err != nil {
		return nil, err
	}
	updated := mapEmergency(existing)
	return &updated, nil
}

func (r *EmergencyRepo) Update(e domain.Emergency) (*domain.Emergency, error) {
	lat, _ := strconv.ParseFloat(e.Coordinates[1], 64)
	lng, _ := strconv.ParseFloat(e.Coordinates[0], 64)

	var row EmergencyEntity
	if err := r.db.Where("uuid = ?", e.ID).First(&row).Error; err != nil {
		return nil, repository.ErrNotFound
	}
	row.Name = e.Name
	row.OrganizationName = e.OrganizationName
	row.OrganizationType = e.OrganizationType
	row.EmergencyTypeID = uint(e.EmergencyType.ID)
	row.Description = e.Description
	row.OrganizationLogo = e.Logo
	row.Latitude = lat
	row.Longitude = lng
	row.Email = e.Contact.Email
	row.Phone = e.Contact.Phone
	row.Whatsapp = e.Contact.Whatsapp
	row.DistrictID = e.Address.DistrictID
	row.RegencyID = e.Address.RegencyID
	row.ProvinceID = e.Address.ProvinceID
	row.FullAddress = e.Address.FullAddress
	row.TypeOfService = e.TypeOfService
	row.TipeEmergency = strings.Join(e.TipeEmergency, ",")
	row.IsDispatcher = e.IsDispatcher
	row.IsProvinceDispatcher = e.IsProvinceDispatcher
	tier := normalizePartnerTier(e.PartnerTier)
	row.PartnerTier = tier
	row.IsVerified = tier == domain.PartnerTierPSC || tier == domain.PartnerTierVerified
	row.TrainedDriver = e.Readiness.TrainedDriver
	row.HasOxygen = e.Readiness.HasOxygen
	row.HasStretcher = e.Readiness.HasStretcher
	row.EquipmentNotes = e.Readiness.EquipmentNotes
	row.Is24Hours = e.Operational.Is24Hours
	row.OpenTime = e.Operational.OpenTime
	row.CloseTime = e.Operational.CloseTime
	row.TotalUnits = e.Fleet.Total
	row.AvailableUnits = e.Fleet.Available
	row.IsActive = e.Operational.IsActive

	if err := r.db.Omit(clause.Associations).Save(&row).Error; err != nil {
		return nil, err
	}
	if err := r.preload().First(&row, row.ID).Error; err != nil {
		return nil, err
	}
	updated := mapEmergency(row)
	return &updated, nil
}

func (r *EmergencyRepo) Delete(id string) error {
	result := r.db.Where("uuid = ?", id).Delete(&EmergencyEntity{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return repository.ErrNotFound
	}
	return nil
}

// UpsertRegionData inserts provinces, regencies, and districts using INSERT IGNORE
// (safe to call repeatedly — existing rows are skipped).
// Order matters: province → regency → district.
func (r *EmergencyRepo) UpsertRegionData(
	provinces []domain.Province,
	regencies []domain.Regency,
	districts []domain.District,
) error {
	for _, p := range provinces {
		if err := r.db.Exec("INSERT IGNORE INTO province (id, name) VALUES (?, ?)",
			p.ID, p.Name).Error; err != nil {
			return fmt.Errorf("province %s: %w", p.ID, err)
		}
	}
	for _, reg := range regencies {
		if err := r.db.Exec("INSERT IGNORE INTO regency (id, province_id, name) VALUES (?, ?, ?)",
			reg.ID, reg.ProvinceID, reg.Name).Error; err != nil {
			return fmt.Errorf("regency %s: %w", reg.ID, err)
		}
	}
	for _, d := range districts {
		if err := r.db.Exec("INSERT IGNORE INTO district (id, regency_id, name) VALUES (?, ?, ?)",
			d.ID, d.RegencyID, d.Name).Error; err != nil {
			return fmt.Errorf("district %s: %w", d.ID, err)
		}
	}
	return nil
}

// ---------- EmergencyTypeRepo ----------

type EmergencyTypeRepo struct{ db *gorm.DB }

func NewEmergencyTypeRepo(db *gorm.DB) *EmergencyTypeRepo { return &EmergencyTypeRepo{db: db} }

func (r *EmergencyTypeRepo) FindAllTypes() ([]domain.EmergencyType, error) {
	var rows []EmergencyTypeEntity
	if err := r.db.Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]domain.EmergencyType, len(rows))
	for i, t := range rows {
		out[i] = domain.EmergencyType{ID: t.ID, Name: t.Name, Icon: t.Icon, Description: t.Description}
	}
	return out, nil
}

func (r *EmergencyTypeRepo) CreateType(t domain.EmergencyType) (*domain.EmergencyType, error) {
	row := EmergencyTypeEntity{Name: t.Name, Icon: t.Icon, Description: t.Description}
	if err := r.db.Create(&row).Error; err != nil {
		return nil, err
	}
	created := domain.EmergencyType{ID: row.ID, Name: row.Name, Icon: row.Icon, Description: row.Description}
	return &created, nil
}

func (r *EmergencyTypeRepo) UpdateType(t domain.EmergencyType) (*domain.EmergencyType, error) {
	result := r.db.Model(&EmergencyTypeEntity{}).Where("id = ?", t.ID).
		Updates(map[string]any{"name": t.Name, "icon": t.Icon, "description": t.Description})
	if result.Error != nil {
		return nil, result.Error
	}
	if result.RowsAffected == 0 {
		return nil, repository.ErrNotFound
	}
	var row EmergencyTypeEntity
	if err := r.db.First(&row, t.ID).Error; err != nil {
		return nil, err
	}
	updated := domain.EmergencyType{ID: row.ID, Name: row.Name, Icon: row.Icon, Description: row.Description}
	return &updated, nil
}

func (r *EmergencyTypeRepo) DeleteType(id string) error {
	result := r.db.Delete(&EmergencyTypeEntity{}, id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return repository.ErrNotFound
	}
	return nil
}

// ---------- Mappers ----------

func mapEmergency(e EmergencyEntity) domain.Emergency {
	tier := e.PartnerTier
	if tier == "" {
		// Legacy rows without partner_tier: derive from name / is_verified.
		if looksLikePSC(e) {
			tier = domain.PartnerTierPSC
		} else if e.IsVerified {
			tier = domain.PartnerTierVerified
		} else {
			tier = domain.PartnerTierCommunity
		}
	}
	return domain.Emergency{
		ID:                   e.UUID.String(),
		Name:                 e.Name,
		OrganizationName:     e.OrganizationName,
		OrganizationType:     e.OrganizationType,
		Logo:                 e.OrganizationLogo,
		Description:          e.Description,
		Coordinates:          [2]string{strconv.FormatFloat(e.Longitude, 'f', 7, 64), strconv.FormatFloat(e.Latitude, 'f', 7, 64)},
		TypeOfService:        e.TypeOfService,
		TipeEmergency:        resolveTipeEmergency(e.TipeEmergency, e.TypeOfService),
		IsDispatcher:         e.IsDispatcher,
		IsProvinceDispatcher: e.IsProvinceDispatcher,
		PartnerTier:          normalizePartnerTier(tier),
		Readiness: domain.Readiness{
			TrainedDriver:  e.TrainedDriver,
			HasOxygen:      e.HasOxygen,
			HasStretcher:   e.HasStretcher,
			EquipmentNotes: e.EquipmentNotes,
		},
		EmergencyType: domain.EmergencyType{
			ID:   typeIDOr(e.EmergencyType.ID, e.EmergencyTypeID),
			Name: e.EmergencyType.Name,
			Icon: e.EmergencyType.Icon,
		},
		Address: domain.Address{
			DistrictID:  e.District.ID,
			District:    e.District.Name,
			RegencyID:   e.Regency.ID,
			Regency:     e.Regency.Name,
			ProvinceID:  e.Province.ID,
			Province:    e.Province.Name,
			FullAddress: e.FullAddress,
		},
		Contact: domain.Contact{
			Email:    e.Email,
			Phone:    e.Phone,
			Whatsapp: e.Whatsapp,
		},
		Operational: domain.OperationalStatus{
			IsActive:  e.IsActive,
			Is24Hours: e.Is24Hours,
			OpenTime:  e.OpenTime,
			CloseTime: e.CloseTime,
		},
		Fleet: domain.FleetStatus{
			Total:     e.TotalUnits,
			Available: e.AvailableUnits,
		},
	}
}

func mapManyEmergencies(rows []EmergencyEntity) []domain.Emergency {
	out := make([]domain.Emergency, len(rows))
	for i, row := range rows {
		out[i] = mapEmergency(row)
	}
	return out
}

func typeIDOr(preloaded, fk uint) uint {
	if preloaded != 0 {
		return preloaded
	}
	return fk
}

func splitTipe(s string) []string {
	if s == "" {
		return []string{}
	}
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if t := strings.TrimSpace(p); t != "" {
			out = append(out, t)
		}
	}
	return out
}

// resolveTipeEmergency prefers explicit tipe_emergency; falls back to type_of_service labels.
func resolveTipeEmergency(tipeCSV, typeOfService string) []string {
	if tipes := splitTipe(tipeCSV); len(tipes) > 0 {
		out := make([]string, 0, len(tipes))
		for _, t := range tipes {
			out = append(out, normalizeTipeLabel(t))
		}
		return out
	}
	parts := splitTipe(typeOfService)
	out := make([]string, 0, len(parts))
	seen := map[string]bool{}
	for _, p := range parts {
		n := normalizeTipeLabel(p)
		if n == "" || seen[n] {
			continue
		}
		seen[n] = true
		out = append(out, n)
	}
	return out
}

func normalizeTipeLabel(s string) string {
	v := strings.ToLower(strings.TrimSpace(s))
	switch v {
	case "emergency", "darurat":
		return "emergency"
	case "transport", "transportasi":
		return "transport"
	case "pemadam", "damkar":
		return "pemadam"
	case "pencarian dan pertolongan", "sar", "basarnas":
		return "pencarian dan pertolongan"
	default:
		return v
	}
}

func normalizePartnerTier(tier string) string {
	switch strings.ToLower(strings.TrimSpace(tier)) {
	case domain.PartnerTierPSC:
		return domain.PartnerTierPSC
	case domain.PartnerTierVerified:
		return domain.PartnerTierVerified
	default:
		return domain.PartnerTierCommunity
	}
}

func looksLikePSC(e EmergencyEntity) bool {
	blob := strings.ToLower(strings.Join([]string{
		e.Name, e.OrganizationName, e.OrganizationType, e.TypeOfService, e.Description,
	}, " "))
	for _, n := range []string{
		"psc", "119", "spgdt", "dinas kesehatan", "dinkes",
		"basarnas", "damkar", "pemadam", "pencarian dan pertolongan",
	} {
		if strings.Contains(blob, n) {
			return true
		}
	}
	return false
}
