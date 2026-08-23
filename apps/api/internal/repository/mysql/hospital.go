package mysqlrepo

import (
	"errors"
	"time"

	"github.com/butuhbantuan/api/internal/domain"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type HospitalMasterRepo struct{ db *gorm.DB }

func NewHospitalMasterRepo(db *gorm.DB) *HospitalMasterRepo {
	return &HospitalMasterRepo{db: db}
}

func (r *HospitalMasterRepo) ListByRegency(regencyID string) ([]domain.HospitalMaster, error) {
	var rows []HospitalMasterEntity
	if err := r.db.Where("regency_id = ?", regencyID).Order("name asc").Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]domain.HospitalMaster, len(rows))
	for i, row := range rows {
		out[i] = mapHospitalMaster(row)
	}
	return out, nil
}

func (r *HospitalMasterRepo) FindByUUIDs(ids []string) ([]HospitalMasterEntity, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	var rows []HospitalMasterEntity
	if err := r.db.Where("uuid IN ?", ids).Find(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *HospitalMasterRepo) UpsertMany(items []domain.HospitalMaster) (int, error) {
	if len(items) == 0 {
		return 0, nil
	}
	now := time.Now()
	n := 0
	for _, item := range items {
		row := HospitalMasterEntity{
			Source:       item.Source,
			SourceCode:   item.SourceCode,
			Name:         item.Name,
			Address:      item.Address,
			Phone:        item.Phone,
			Class:        item.Class,
			Ownership:    item.Ownership,
			Latitude:     item.Latitude,
			Longitude:    item.Longitude,
			ProvinceID:   item.ProvinceID,
			RegencyID:    item.RegencyID,
			ProvinceName: item.ProvinceName,
			RegencyName:  item.RegencyName,
			SyncedAt:     now,
		}
		var existing HospitalMasterEntity
		err := r.db.Where("source = ? AND source_code = ?", item.Source, item.SourceCode).First(&existing).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			row.UUID = uuid.New()
			if err := r.db.Create(&row).Error; err != nil {
				return n, err
			}
			n++
			continue
		}
		if err != nil {
			return n, err
		}
		if err := r.db.Model(&existing).Updates(map[string]any{
			"name":          row.Name,
			"address":       row.Address,
			"phone":         row.Phone,
			"class":         row.Class,
			"ownership":     row.Ownership,
			"latitude":      row.Latitude,
			"longitude":     row.Longitude,
			"province_id":   row.ProvinceID,
			"regency_id":    row.RegencyID,
			"province_name": row.ProvinceName,
			"regency_name":  row.RegencyName,
			"synced_at":     now,
		}).Error; err != nil {
			return n, err
		}
		n++
	}
	return n, nil
}

func (r *HospitalMasterRepo) MarkImported(masterID uint, emergencyUUID string) error {
	return r.db.Model(&HospitalMasterEntity{}).Where("id = ?", masterID).Updates(map[string]any{
		"imported_emergency_uuid": emergencyUUID,
	}).Error
}

func (r *HospitalMasterRepo) LinkEmergencyHospitalMaster(emergencyUUID string, masterID uint) error {
	return r.db.Model(&EmergencyEntity{}).
		Where("uuid = ?", emergencyUUID).
		Update("hospital_master_id", masterID).Error
}

func mapHospitalMaster(row HospitalMasterEntity) domain.HospitalMaster {
	return domain.HospitalMaster{
		ID:                  row.UUID.String(),
		Source:              row.Source,
		SourceCode:          row.SourceCode,
		Name:                row.Name,
		Address:             row.Address,
		Phone:               row.Phone,
		Class:               row.Class,
		Ownership:           row.Ownership,
		Latitude:            row.Latitude,
		Longitude:           row.Longitude,
		ProvinceID:          row.ProvinceID,
		RegencyID:           row.RegencyID,
		ProvinceName:        row.ProvinceName,
		RegencyName:         row.RegencyName,
		SyncedAt:            row.SyncedAt,
		ImportedEmergencyID: row.ImportedEmergencyUUID,
		AlreadyImported:     row.ImportedEmergencyUUID != "",
	}
}