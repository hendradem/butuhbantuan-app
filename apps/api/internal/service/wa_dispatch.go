package service

import (
	"github.com/butuhbantuan/api/internal/domain"
	"github.com/butuhbantuan/api/internal/repository"
)

// WaDispatchResolver computes citizen-facing WA-only unit mode.
type WaDispatchResolver struct {
	unitCreds repository.UnitCredentialRepository
}

func NewWaDispatchResolver(unitCreds repository.UnitCredentialRepository) *WaDispatchResolver {
	return &WaDispatchResolver{unitCreds: unitCreds}
}

func (r *WaDispatchResolver) HasUnitLogin(emergencyUUID string) bool {
	if r == nil || r.unitCreds == nil || emergencyUUID == "" {
		return false
	}
	_, err := r.unitCreds.FindByEmergencyUUID(emergencyUUID)
	return err == nil
}

func (r *WaDispatchResolver) UsesWaDispatch(u domain.Emergency) bool {
	return u.UsesWaDispatch(r.HasUnitLogin(u.ID))
}

func (r *WaDispatchResolver) EnrichEmergency(e *domain.Emergency) {
	if e == nil {
		return
	}
	e.WaDispatch = r.UsesWaDispatch(*e)
}

func (r *WaDispatchResolver) EnrichEmergencies(list []domain.Emergency) []domain.Emergency {
	if r == nil {
		return list
	}
	for i := range list {
		r.EnrichEmergency(&list[i])
	}
	return list
}
