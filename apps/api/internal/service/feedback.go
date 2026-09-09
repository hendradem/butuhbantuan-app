package service

import (
	"errors"

	"github.com/butuhbantuan/api/internal/domain"
	"github.com/butuhbantuan/api/internal/repository"
)

type FeedbackService struct {
	repo repository.FeedbackRepository
}

func NewFeedbackService(repo repository.FeedbackRepository) *FeedbackService {
	return &FeedbackService{repo: repo}
}

var _ FeedbackUseCase = (*FeedbackService)(nil)

func (s *FeedbackService) Submit(f domain.Feedback) (*domain.Feedback, error)          { return s.repo.Create(f) }
func (s *FeedbackService) GetStats() (domain.FeedbackStats, error)                    { return s.repo.GetStats() }
func (s *FeedbackService) GetAll() ([]domain.Feedback, error)                         { return s.repo.FindAll() }
func (s *FeedbackService) GetGroupedByUnit() ([]domain.FeedbackGroup, error)          { return s.repo.FindGroupedByUnit() }
func (s *FeedbackService) GetByUnit(uuid string) ([]domain.Feedback, error)           { return s.repo.FindByUnit(uuid) }

// NoopFeedbackService is used when running in json storage mode (no persistent DB).
type NoopFeedbackService struct{}

func NewNoopFeedbackService() *NoopFeedbackService { return &NoopFeedbackService{} }

var _ FeedbackUseCase = (*NoopFeedbackService)(nil)

var errNotSupported = errors.New("feedback not supported in json storage mode")

func (s *NoopFeedbackService) Submit(_ domain.Feedback) (*domain.Feedback, error) {
	return nil, errNotSupported
}
func (s *NoopFeedbackService) GetStats() (domain.FeedbackStats, error)           { return domain.FeedbackStats{}, nil }
func (s *NoopFeedbackService) GetAll() ([]domain.Feedback, error)                { return []domain.Feedback{}, nil }
func (s *NoopFeedbackService) GetGroupedByUnit() ([]domain.FeedbackGroup, error) { return []domain.FeedbackGroup{}, nil }
func (s *NoopFeedbackService) GetByUnit(_ string) ([]domain.Feedback, error)     { return []domain.Feedback{}, nil }
