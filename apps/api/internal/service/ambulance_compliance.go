package service

import (
	"errors"
	"sort"
	"strings"
	"time"

	"github.com/butuhbantuan/api/internal/domain"
	"github.com/butuhbantuan/api/internal/repository"
)

// AmbulanceComplianceUseCase manages Kemenkes 2019 unit equipment checklists.
type AmbulanceComplianceUseCase interface {
	GetTemplate(category string) (*domain.AmbulanceComplianceTemplate, error)
	ListCategories() []struct {
		Code  string `json:"code"`
		Label string `json:"label"`
	}
	GetForEmergency(emergencyID string) (*domain.AmbulanceComplianceView, error)
	UpdateForEmergency(emergencyID string, category string, answers []domain.AmbulanceComplianceAnswer) (*domain.AmbulanceComplianceView, error)
	VerifyForEmergency(emergencyID string, verifiedCategory string, verifiedBy string, expiresAt *time.Time, revoke bool) (*domain.AmbulanceComplianceView, error)
	ListVerificationQueue(withinDays int) ([]domain.ComplianceQueueEntry, error)
}

type AmbulanceComplianceService struct {
	emergencies repository.EmergencyRepository
}

func NewAmbulanceComplianceService(emergencies repository.EmergencyRepository) *AmbulanceComplianceService {
	return &AmbulanceComplianceService{emergencies: emergencies}
}

func (s *AmbulanceComplianceService) GetTemplate(category string) (*domain.AmbulanceComplianceTemplate, error) {
	tpl := domain.FullComplianceTemplate(category)
	if tpl == nil {
		return nil, repository.ErrNotFound
	}
	return tpl, nil
}

func (s *AmbulanceComplianceService) ListCategories() []struct {
	Code  string `json:"code"`
	Label string `json:"label"`
} {
	return domain.ListComplianceCategories()
}

func (s *AmbulanceComplianceService) GetForEmergency(emergencyID string) (*domain.AmbulanceComplianceView, error) {
	e, err := s.emergencies.FindByID(emergencyID)
	if err != nil {
		return nil, err
	}
	if !domain.IsAmbulanceEmergencyType(e.EmergencyType.Name) {
		return nil, repository.ErrNotFound
	}
	if e.Compliance != nil {
		return e.Compliance, nil
	}
	return nil, nil
}

func (s *AmbulanceComplianceService) UpdateForEmergency(
	emergencyID string,
	category string,
	answers []domain.AmbulanceComplianceAnswer,
) (*domain.AmbulanceComplianceView, error) {
	category = strings.TrimSpace(category)
	if category == "" {
		return nil, errors.New("declared_category wajib")
	}
	if domain.ComplianceTemplateForCategory(category) == nil {
		return nil, errors.New("kategori tidak dikenal")
	}

	e, err := s.emergencies.FindByID(emergencyID)
	if err != nil {
		return nil, err
	}
	if !domain.IsAmbulanceEmergencyType(e.EmergencyType.Name) {
		return nil, errors.New("hanya berlaku untuk unit ambulans")
	}

	existing, _ := s.emergencies.GetComplianceProfile(emergencyID)
	var existingProfile *domain.AmbulanceComplianceProfile
	if existing != nil {
		existingProfile = existing
	}

	profile := domain.NewComplianceProfile(category, answers, existingProfile)
	updated, err := s.emergencies.UpdateCompliance(emergencyID, profile)
	if err != nil {
		return nil, err
	}
	if updated.Compliance == nil {
		return nil, errors.New("gagal menyimpan kelengkapan")
	}
	return updated.Compliance, nil
}

func (s *AmbulanceComplianceService) VerifyForEmergency(
	emergencyID string,
	verifiedCategory string,
	verifiedBy string,
	expiresAt *time.Time,
	revoke bool,
) (*domain.AmbulanceComplianceView, error) {
	e, err := s.emergencies.FindByID(emergencyID)
	if err != nil {
		return nil, err
	}
	if !domain.IsAmbulanceEmergencyType(e.EmergencyType.Name) {
		return nil, errors.New("hanya berlaku untuk unit ambulans")
	}

	profile, err := s.emergencies.GetComplianceProfile(emergencyID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, errors.New("unit belum mengisi kelengkapan")
		}
		return nil, err
	}

	if revoke {
		profile.ClearVerification()
	} else if err := profile.ApplyVerification(verifiedCategory, verifiedBy, expiresAt); err != nil {
		return nil, err
	}

	updated, err := s.emergencies.UpdateCompliance(emergencyID, *profile)
	if err != nil {
		return nil, err
	}
	if updated.Compliance == nil {
		return nil, errors.New("gagal memverifikasi kelengkapan")
	}
	return updated.Compliance, nil
}

func (s *AmbulanceComplianceService) ListVerificationQueue(withinDays int) ([]domain.ComplianceQueueEntry, error) {
	if withinDays <= 0 {
		withinDays = 30
	}
	all, err := s.emergencies.FindAll()
	if err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	out := make([]domain.ComplianceQueueEntry, 0, 16)
	for _, e := range all {
		entry, ok := domain.BuildComplianceQueueEntry(e, withinDays, now)
		if !ok || entry == nil {
			continue
		}
		out = append(out, *entry)
	}
	sort.SliceStable(out, func(i, j int) bool {
		ri := domain.ComplianceQueueReasonRank(out[i].QueueReason)
		rj := domain.ComplianceQueueReasonRank(out[j].QueueReason)
		if ri != rj {
			return ri < rj
		}
		di := 9999
		dj := 9999
		if out[i].DaysUntilExpiry != nil {
			di = *out[i].DaysUntilExpiry
		}
		if out[j].DaysUntilExpiry != nil {
			dj = *out[j].DaysUntilExpiry
		}
		if di != dj {
			return di < dj
		}
		return out[i].Name < out[j].Name
	})
	return out, nil
}
