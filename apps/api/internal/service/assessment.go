package service

import (
	"strings"

	"github.com/butuhbantuan/api/internal/domain"
	"github.com/butuhbantuan/api/internal/repository"
)

type AssessmentService struct {
	repo       repository.AssessmentRepository
	emergencies repository.EmergencyRepository
}

func NewAssessmentService(repo repository.AssessmentRepository, emergencies repository.EmergencyRepository) *AssessmentService {
	return &AssessmentService{repo: repo, emergencies: emergencies}
}

func (s *AssessmentService) GetTemplateForEmergency(emergencyUUID string) (*domain.AssessmentTemplate, error) {
	var typeID uint
	if uuid := strings.TrimSpace(emergencyUUID); uuid != "" && s.emergencies != nil {
		if e, err := s.emergencies.FindByID(uuid); err == nil && e != nil {
			typeID = uint(e.EmergencyType.ID)
		}
	}
	tpl, err := s.repo.FindTemplateForEmergencyType(typeID)
	if err != nil {
		if err == repository.ErrNotFound {
			return s.repo.FindDefaultTemplate()
		}
		return nil, err
	}
	return tpl, nil
}

func (s *AssessmentService) GetTemplateForOrder(emergencyUUID, jenisPelayanan string) (*domain.AssessmentTemplate, error) {
	jenis := strings.ToLower(strings.TrimSpace(jenisPelayanan))
	if jenis != "" {
		if tpl, err := s.repo.FindTemplateForJenisPelayanan(jenis); err == nil {
			return tpl, nil
		} else if err != repository.ErrNotFound {
			return nil, err
		}
		if code := domain.TemplateCodeForJenisPelayanan(jenis); code != "" {
			if tpl, err := s.repo.FindTemplateByCode(code); err == nil {
				return tpl, nil
			} else if err != repository.ErrNotFound {
				return nil, err
			}
		}
	}
	return s.GetTemplateForEmergency(emergencyUUID)
}

func (s *AssessmentService) GetDefaultTemplate() (*domain.AssessmentTemplate, error) {
	return s.repo.FindDefaultTemplate()
}

func (s *AssessmentService) ListTemplates() ([]domain.AssessmentTemplate, error) {
	return s.repo.ListTemplates()
}

func (s *AssessmentService) GetTemplateByID(id uint) (*domain.AssessmentTemplate, error) {
	return s.repo.FindTemplateByID(id)
}

func (s *AssessmentService) CreateTemplate(t domain.AssessmentTemplate) (*domain.AssessmentTemplate, error) {
	return s.repo.CreateTemplate(t)
}

func (s *AssessmentService) UpdateTemplate(t domain.AssessmentTemplate) (*domain.AssessmentTemplate, error) {
	return s.repo.UpdateTemplate(t)
}

func (s *AssessmentService) DeleteTemplate(id uint) error {
	return s.repo.DeleteTemplate(id)
}

func (s *AssessmentService) ListBindings() ([]domain.AssessmentBinding, error) {
	return s.repo.ListBindings()
}

func (s *AssessmentService) UpsertBinding(b domain.AssessmentBinding) (*domain.AssessmentBinding, error) {
	return s.repo.UpsertBinding(b)
}

func (s *AssessmentService) DeleteBinding(emergencyTypeID uint) error {
	return s.repo.DeleteBinding(emergencyTypeID)
}

func (s *AssessmentService) ListJenisBindings() ([]domain.AssessmentJenisBinding, error) {
	return s.repo.ListJenisBindings()
}

func (s *AssessmentService) UpsertJenisBinding(b domain.AssessmentJenisBinding) (*domain.AssessmentJenisBinding, error) {
	return s.repo.UpsertJenisBinding(b)
}

func (s *AssessmentService) DeleteJenisBinding(jenisPelayanan string) error {
	return s.repo.DeleteJenisBinding(jenisPelayanan)
}

// EnrichOrderAssessment validates answers, computes acuity, and fills condition summary when empty.
func EnrichOrderAssessment(o *domain.OrderTicket, tpl *domain.AssessmentTemplate) {
	if o == nil || o.Assessment == nil || tpl == nil {
		return
	}
	a := o.Assessment
	a.TemplateCode = tpl.Code
	a.TemplateVersion = tpl.Version

	labelByCode := map[string]string{}
	for _, ind := range tpl.Indicators {
		labelByCode[ind.Code] = ind.Label
	}
	normalized := make([]domain.AssessmentAnswer, 0, len(a.Answers))
	for _, ans := range a.Answers {
		code := strings.TrimSpace(ans.Code)
		if code == "" {
			continue
		}
		label := strings.TrimSpace(ans.Label)
		if label == "" {
			label = labelByCode[code]
		}
		normalized = append(normalized, domain.AssessmentAnswer{
			Code:  code,
			Label: label,
			Value: domain.NormalizeAssessmentValue(ans.Value),
		})
	}
	a.Answers = normalized
	if tpl.UsesTriage() {
		a.Acuity = domain.ComputeAcuity(tpl.Indicators, a.Answers)
		o.AssessmentAcuity = a.Acuity
	} else {
		a.Acuity = ""
		o.AssessmentAcuity = ""
	}
	if strings.TrimSpace(o.Condition) == "" {
		o.Condition = domain.FormatConditionSummary(a.Answers, a.Notes)
	}
}
