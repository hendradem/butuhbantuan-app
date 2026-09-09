package mysqlrepo

import (
	"encoding/json"
	"errors"
	"strings"

	"github.com/butuhbantuan/api/internal/domain"
	"github.com/butuhbantuan/api/internal/repository"
	"gorm.io/gorm"
)

type AssessmentRepo struct {
	db *gorm.DB
}

func NewAssessmentRepo(db *gorm.DB) *AssessmentRepo {
	return &AssessmentRepo{db: db}
}

func (r *AssessmentRepo) FindTemplateByCode(code string) (*domain.AssessmentTemplate, error) {
	var tpl AssessmentTemplateEntity
	if err := r.db.Where("code = ? AND is_active = ?", code, true).First(&tpl).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, repository.ErrNotFound
		}
		return nil, err
	}
	return r.loadTemplate(tpl, true)
}

func (r *AssessmentRepo) FindDefaultTemplate() (*domain.AssessmentTemplate, error) {
	var tpl AssessmentTemplateEntity
	err := r.db.Where("is_default = ? AND is_active = ?", true, true).
		Order("id ASC").
		First(&tpl).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, repository.ErrNotFound
		}
		return nil, err
	}
	return r.loadTemplate(tpl, true)
}

func (r *AssessmentRepo) FindTemplateForJenisPelayanan(jenis string) (*domain.AssessmentTemplate, error) {
	jenis = strings.ToLower(strings.TrimSpace(jenis))
	if jenis == "" {
		return nil, repository.ErrNotFound
	}
	var bind AssessmentJenisBindingEntity
	err := r.db.Where("jenis_pelayanan = ?", jenis).First(&bind).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, repository.ErrNotFound
		}
		return nil, err
	}
	if bind.TemplateCode == "" {
		return nil, repository.ErrNotFound
	}
	return r.FindTemplateByCode(bind.TemplateCode)
}

func (r *AssessmentRepo) FindTemplateForEmergencyType(typeID uint) (*domain.AssessmentTemplate, error) {
	if typeID > 0 {
		var bind AssessmentTemplateBindingEntity
		err := r.db.Where("emergency_type_id = ?", typeID).First(&bind).Error
		if err == nil && bind.TemplateCode != "" {
			tpl, findErr := r.FindTemplateByCode(bind.TemplateCode)
			if findErr == nil {
				return tpl, nil
			}
			if findErr != repository.ErrNotFound {
				return nil, findErr
			}
		} else if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
	}
	return r.FindDefaultTemplate()
}

func (r *AssessmentRepo) ListTemplates() ([]domain.AssessmentTemplate, error) {
	var rows []AssessmentTemplateEntity
	if err := r.db.Order("is_default DESC, id ASC").Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]domain.AssessmentTemplate, 0, len(rows))
	for _, row := range rows {
		tpl, err := r.loadTemplate(row, false)
		if err != nil {
			return nil, err
		}
		out = append(out, *tpl)
	}
	return out, nil
}

func (r *AssessmentRepo) FindTemplateByID(id uint) (*domain.AssessmentTemplate, error) {
	var tpl AssessmentTemplateEntity
	if err := r.db.First(&tpl, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, repository.ErrNotFound
		}
		return nil, err
	}
	return r.loadTemplate(tpl, false)
}

func (r *AssessmentRepo) CreateTemplate(t domain.AssessmentTemplate) (*domain.AssessmentTemplate, error) {
	code := strings.TrimSpace(t.Code)
	name := strings.TrimSpace(t.Name)
	if code == "" || name == "" {
		return nil, repository.ErrConflict
	}
	version := t.Version
	if version <= 0 {
		version = 1
	}

	var newID uint
	err := r.db.Transaction(func(tx *gorm.DB) error {
		if t.IsDefault {
			if err := tx.Model(&AssessmentTemplateEntity{}).
				Where("is_default = ?", true).
				Update("is_default", false).Error; err != nil {
				return err
			}
		}
		row := AssessmentTemplateEntity{
			Code:           code,
			Name:           name,
			Version:        version,
			Description:    strings.TrimSpace(t.Description),
			Category:       normalizeTemplateCategory(t),
			IsActive:       t.IsActive,
			IsDefault:      t.IsDefault,
			ReferencesJSON: marshalReferences(t.References),
		}
		if err := tx.Create(&row).Error; err != nil {
			return err
		}
		newID = row.ID
		return replaceIndicators(tx, row.ID, normalizeIndicatorsActive(t.Indicators))
	})
	if err != nil {
		if isDuplicateErr(err) {
			return nil, repository.ErrDuplicate
		}
		return nil, err
	}
	return r.FindTemplateByID(newID)
}

func normalizeIndicatorsActive(indicators []domain.AssessmentIndicator) []domain.AssessmentIndicator {
	out := make([]domain.AssessmentIndicator, 0, len(indicators))
	for _, ind := range indicators {
		if strings.TrimSpace(ind.Code) == "" || strings.TrimSpace(ind.Label) == "" {
			continue
		}
		// Dashboard always sets is_active; seed sets true. Keep as-is.
		out = append(out, ind)
	}
	return out
}

func (r *AssessmentRepo) UpdateTemplate(t domain.AssessmentTemplate) (*domain.AssessmentTemplate, error) {
	if t.ID == 0 {
		return nil, repository.ErrNotFound
	}
	err := r.db.Transaction(func(tx *gorm.DB) error {
		var row AssessmentTemplateEntity
		if err := tx.First(&row, t.ID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return repository.ErrNotFound
			}
			return err
		}
		if t.IsDefault {
			if err := tx.Model(&AssessmentTemplateEntity{}).
				Where("is_default = ? AND id <> ?", true, t.ID).
				Update("is_default", false).Error; err != nil {
				return err
			}
		}
		code := strings.TrimSpace(t.Code)
		name := strings.TrimSpace(t.Name)
		if code == "" {
			code = row.Code
		}
		if name == "" {
			name = row.Name
		}
		version := t.Version
		if version <= 0 {
			version = row.Version
		}
		updates := map[string]any{
			"code":            code,
			"name":            name,
			"version":         version,
			"description":     strings.TrimSpace(t.Description),
			"category":        normalizeTemplateCategory(t),
			"is_active":       t.IsActive,
			"is_default":      t.IsDefault,
			"references_json": marshalReferences(t.References),
		}
		if err := tx.Model(&row).Updates(updates).Error; err != nil {
			return err
		}
		return replaceIndicators(tx, row.ID, normalizeIndicatorsActive(t.Indicators))
	})
	if err != nil {
		if isDuplicateErr(err) {
			return nil, repository.ErrDuplicate
		}
		return nil, err
	}
	return r.FindTemplateByID(t.ID)
}

func (r *AssessmentRepo) DeleteTemplate(id uint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var row AssessmentTemplateEntity
		if err := tx.First(&row, id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return repository.ErrNotFound
			}
			return err
		}
		if err := tx.Where("template_id = ?", id).Delete(&AssessmentIndicatorEntity{}).Error; err != nil {
			return err
		}
		if err := tx.Where("template_code = ?", row.Code).Delete(&AssessmentTemplateBindingEntity{}).Error; err != nil {
			return err
		}
		res := tx.Delete(&AssessmentTemplateEntity{}, id)
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			return repository.ErrNotFound
		}
		return nil
	})
}

func (r *AssessmentRepo) ListBindings() ([]domain.AssessmentBinding, error) {
	var rows []AssessmentTemplateBindingEntity
	if err := r.db.Order("emergency_type_id ASC").Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]domain.AssessmentBinding, len(rows))
	for i, row := range rows {
		out[i] = domain.AssessmentBinding{
			ID:              row.ID,
			EmergencyTypeID: row.EmergencyTypeID,
			TemplateCode:    row.TemplateCode,
		}
	}
	return out, nil
}

func (r *AssessmentRepo) UpsertBinding(b domain.AssessmentBinding) (*domain.AssessmentBinding, error) {
	code := strings.TrimSpace(b.TemplateCode)
	if code == "" {
		return nil, repository.ErrConflict
	}
	var existing AssessmentTemplateBindingEntity
	err := r.db.Where("emergency_type_id = ?", b.EmergencyTypeID).First(&existing).Error
	if err == nil {
		existing.TemplateCode = code
		if err := r.db.Save(&existing).Error; err != nil {
			return nil, err
		}
		return &domain.AssessmentBinding{
			ID:              existing.ID,
			EmergencyTypeID: existing.EmergencyTypeID,
			TemplateCode:    existing.TemplateCode,
		}, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	row := AssessmentTemplateBindingEntity{
		EmergencyTypeID: b.EmergencyTypeID,
		TemplateCode:    code,
	}
	if err := r.db.Create(&row).Error; err != nil {
		return nil, err
	}
	return &domain.AssessmentBinding{
		ID:              row.ID,
		EmergencyTypeID: row.EmergencyTypeID,
		TemplateCode:    row.TemplateCode,
	}, nil
}

func (r *AssessmentRepo) DeleteBinding(emergencyTypeID uint) error {
	res := r.db.Where("emergency_type_id = ?", emergencyTypeID).Delete(&AssessmentTemplateBindingEntity{})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return repository.ErrNotFound
	}
	return nil
}

func (r *AssessmentRepo) loadTemplate(tpl AssessmentTemplateEntity, activeIndicatorsOnly bool) (*domain.AssessmentTemplate, error) {
	q := r.db.Where("template_id = ?", tpl.ID)
	if activeIndicatorsOnly {
		q = q.Where("is_active = ?", true)
	}
	var rows []AssessmentIndicatorEntity
	if err := q.Order("sort_order ASC, id ASC").Find(&rows).Error; err != nil {
		return nil, err
	}
	out := &domain.AssessmentTemplate{
		ID:          tpl.ID,
		Code:        tpl.Code,
		Name:        tpl.Name,
		Version:     tpl.Version,
		Description: tpl.Description,
		Category:    normalizeLoadedCategory(tpl),
		IsActive:    tpl.IsActive,
		IsDefault:   tpl.IsDefault,
		References:  parseReferences(tpl.ReferencesJSON),
		Indicators:  make([]domain.AssessmentIndicator, 0, len(rows)),
	}
	for _, row := range rows {
		out.Indicators = append(out.Indicators, domain.AssessmentIndicator{
			ID:         row.ID,
			Code:       row.Code,
			Label:      row.Label,
			Hint:       row.Hint,
			AbcdeGroup: row.AbcdeGroup,
			CriticalIf: row.CriticalIf,
			WarnIf:     row.WarnIf,
			SortOrder:  row.SortOrder,
			Required:   row.Required,
			IsActive:   row.IsActive,
		})
	}
	return out, nil
}

func replaceIndicators(tx *gorm.DB, templateID uint, indicators []domain.AssessmentIndicator) error {
	if err := tx.Where("template_id = ?", templateID).Delete(&AssessmentIndicatorEntity{}).Error; err != nil {
		return err
	}
	for i, ind := range indicators {
		code := strings.TrimSpace(ind.Code)
		label := strings.TrimSpace(ind.Label)
		if code == "" || label == "" {
			continue
		}
		sort := ind.SortOrder
		if sort <= 0 {
			sort = i + 1
		}
		row := AssessmentIndicatorEntity{
			TemplateID: templateID,
			Code:       code,
			Label:      label,
			Hint:       strings.TrimSpace(ind.Hint),
			AbcdeGroup: strings.TrimSpace(ind.AbcdeGroup),
			CriticalIf: strings.TrimSpace(ind.CriticalIf),
			WarnIf:     strings.TrimSpace(ind.WarnIf),
			Required:   ind.Required,
			SortOrder:  sort,
			IsActive:   ind.IsActive,
		}
		if err := tx.Create(&row).Error; err != nil {
			return err
		}
	}
	return nil
}

func isDuplicateErr(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "duplicate")
}

// EnsureDefaultTemplates seeds or backfills system checklists and bindings.
func (r *AssessmentRepo) EnsureDefaultTemplates() error {
	if err := r.ensureTemplate(domain.DefaultABCDELiteTemplate()); err != nil {
		return err
	}
	if err := r.ensureTemplate(domain.DefaultTransportIntakeTemplate()); err != nil {
		return err
	}
	if err := r.ensureTemplate(domain.DefaultJenazahIntakeTemplate()); err != nil {
		return err
	}

	binds := []domain.AssessmentBinding{
		{EmergencyTypeID: 0, TemplateCode: "abcde_lite"},
		{EmergencyTypeID: 1, TemplateCode: "abcde_lite"},
	}
	for _, b := range binds {
		if _, err := r.UpsertBinding(b); err != nil {
			return err
		}
	}

	jenisBinds := []domain.AssessmentJenisBinding{
		{JenisPelayanan: "emergency", TemplateCode: "abcde_lite"},
		{JenisPelayanan: "transport", TemplateCode: "transport_intake"},
		{JenisPelayanan: "jenazah", TemplateCode: "jenazah_intake"},
	}
	for _, b := range jenisBinds {
		if _, err := r.UpsertJenisBinding(b); err != nil {
			return err
		}
	}
	return nil
}

func (r *AssessmentRepo) ensureTemplate(def domain.AssessmentTemplate) error {
	existing, err := r.FindTemplateByCode(def.Code)
	if err != nil && err != repository.ErrNotFound {
		return err
	}
	if existing == nil {
		_, err := r.CreateTemplate(def)
		return err
	}
	needRefs := len(existing.References) == 0 && len(def.References) > 0
	needCategory := strings.TrimSpace(existing.Category) == "" && def.Category != ""
	needDesc := strings.TrimSpace(existing.Description) == "" && def.Description != ""
	needRules := false
	if def.Code == "abcde_lite" {
		for _, ind := range existing.Indicators {
			if strings.TrimSpace(ind.CriticalIf) == "" && strings.TrimSpace(ind.WarnIf) == "" {
				needRules = true
				break
			}
		}
	}
	if !needRefs && !needRules && !needCategory && !needDesc {
		return nil
	}
	if needRefs {
		existing.References = def.References
	}
	if needRules {
		existing.Indicators = domain.MergeSystemIndicatorRules(existing.Indicators)
	}
	if needCategory {
		existing.Category = def.Category
	}
	if needDesc {
		existing.Description = def.Description
	}
	_, err = r.UpdateTemplate(*existing)
	return err
}

func (r *AssessmentRepo) ListJenisBindings() ([]domain.AssessmentJenisBinding, error) {
	var rows []AssessmentJenisBindingEntity
	if err := r.db.Order("jenis_pelayanan ASC").Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]domain.AssessmentJenisBinding, 0, len(rows))
	for _, row := range rows {
		out = append(out, domain.AssessmentJenisBinding{
			JenisPelayanan: row.JenisPelayanan,
			TemplateCode:   row.TemplateCode,
		})
	}
	return out, nil
}

func (r *AssessmentRepo) UpsertJenisBinding(b domain.AssessmentJenisBinding) (*domain.AssessmentJenisBinding, error) {
	jenis := strings.ToLower(strings.TrimSpace(b.JenisPelayanan))
	code := strings.TrimSpace(b.TemplateCode)
	if jenis == "" || code == "" {
		return nil, repository.ErrConflict
	}
	var existing AssessmentJenisBindingEntity
	err := r.db.Where("jenis_pelayanan = ?", jenis).First(&existing).Error
	if err == nil {
		existing.TemplateCode = code
		if err := r.db.Save(&existing).Error; err != nil {
			return nil, err
		}
		return &domain.AssessmentJenisBinding{JenisPelayanan: jenis, TemplateCode: code}, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	row := AssessmentJenisBindingEntity{JenisPelayanan: jenis, TemplateCode: code}
	if err := r.db.Create(&row).Error; err != nil {
		return nil, err
	}
	return &domain.AssessmentJenisBinding{JenisPelayanan: jenis, TemplateCode: code}, nil
}

func (r *AssessmentRepo) DeleteJenisBinding(jenisPelayanan string) error {
	jenis := strings.ToLower(strings.TrimSpace(jenisPelayanan))
	if jenis == "" {
		return repository.ErrConflict
	}
	res := r.db.Where("jenis_pelayanan = ?", jenis).Delete(&AssessmentJenisBindingEntity{})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return repository.ErrNotFound
	}
	return nil
}

func normalizeTemplateCategory(t domain.AssessmentTemplate) string {
	c := strings.ToLower(strings.TrimSpace(t.Category))
	if c != "" {
		return c
	}
	switch strings.TrimSpace(t.Code) {
	case "transport_intake":
		return domain.AssessmentCategoryTransport
	case "jenazah_intake":
		return domain.AssessmentCategoryJenazah
	default:
		return domain.AssessmentCategoryTriage
	}
}

func normalizeLoadedCategory(tpl AssessmentTemplateEntity) string {
	c := strings.ToLower(strings.TrimSpace(tpl.Category))
	if c != "" {
		return c
	}
	switch strings.TrimSpace(tpl.Code) {
	case "transport_intake":
		return domain.AssessmentCategoryTransport
	case "jenazah_intake":
		return domain.AssessmentCategoryJenazah
	default:
		return domain.AssessmentCategoryTriage
	}
}

func marshalReferences(refs []domain.AssessmentReference) string {
	if len(refs) == 0 {
		return ""
	}
	raw, err := json.Marshal(refs)
	if err != nil {
		return ""
	}
	return string(raw)
}

func parseReferences(raw string) []domain.AssessmentReference {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}
	var refs []domain.AssessmentReference
	if err := json.Unmarshal([]byte(raw), &refs); err != nil {
		return nil
	}
	return refs
}
