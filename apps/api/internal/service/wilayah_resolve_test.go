package service

import (
	"testing"

	"github.com/butuhbantuan/api/internal/domain"
)

type stubRegionRepo struct {
	regions []domain.AvailableRegion
}

func (s *stubRegionRepo) FindAllAvailableRegions() ([]domain.AvailableRegion, error) {
	return s.regions, nil
}
func (s *stubRegionRepo) FindAvailableRegionsByName(string) ([]domain.AvailableRegion, error) {
	return nil, nil
}
func (s *stubRegionRepo) CreateAvailableRegion(domain.AvailableRegion) (*domain.AvailableRegion, error) {
	return nil, nil
}
func (s *stubRegionRepo) UpdateAvailableRegion(domain.AvailableRegion) (*domain.AvailableRegion, error) {
	return nil, nil
}
func (s *stubRegionRepo) DeleteAvailableRegion(string) error { return nil }
func (s *stubRegionRepo) SearchRegencies(string) ([]domain.Regency, error) {
	return nil, nil
}
func (s *stubRegionRepo) FindProvinces() ([]domain.Province, error) { return nil, nil }
func (s *stubRegionRepo) FindRegenciesByProvince(string) ([]domain.Regency, error) {
	return nil, nil
}
func (s *stubRegionRepo) FindCoveredProvinces() ([]domain.Province, error) { return nil, nil }
func (s *stubRegionRepo) FindCoveredRegenciesByProvince(string) ([]domain.Regency, error) {
	return nil, nil
}
func (s *stubRegionRepo) FindProvince(string) (*domain.Province, error) { return nil, nil }
func (s *stubRegionRepo) FindRegency(string) (*domain.Regency, error)   { return nil, nil }

type stubEmergencyRepo struct {
	byProvince map[string][]domain.Emergency
}

func (s *stubEmergencyRepo) FindAll() ([]domain.Emergency, error)       { return nil, nil }
func (s *stubEmergencyRepo) FindAllActive() ([]domain.Emergency, error) { return nil, nil }
func (s *stubEmergencyRepo) FindByID(string) (*domain.Emergency, error) { return nil, nil }
func (s *stubEmergencyRepo) FindByProvince(provinceID string) ([]domain.Emergency, error) {
	return s.byProvince[provinceID], nil
}
func (s *stubEmergencyRepo) FindByRegency(string) ([]domain.Emergency, error) { return nil, nil }
func (s *stubEmergencyRepo) FindDispatchers(string, string) ([]domain.Emergency, error) {
	return nil, nil
}
func (s *stubEmergencyRepo) FindByType(string) ([]domain.Emergency, error) { return nil, nil }
func (s *stubEmergencyRepo) FindByIDs([]string) ([]domain.Emergency, error) { return nil, nil }
func (s *stubEmergencyRepo) Create(domain.Emergency) (*domain.Emergency, error) {
	return nil, nil
}
func (s *stubEmergencyRepo) Update(domain.Emergency) (*domain.Emergency, error) {
	return nil, nil
}
func (s *stubEmergencyRepo) Delete(string) error { return nil }
func (s *stubEmergencyRepo) UpdateOperational(string, domain.OperationalStatus) error {
	return nil
}
func (s *stubEmergencyRepo) UpdateFleet(string, domain.FleetStatus) error { return nil }
func (s *stubEmergencyRepo) UpdateActive(string, bool) error                      { return nil }
func (s *stubEmergencyRepo) UpdateWilayah(string, domain.Address) error           { return nil }

func TestWilayahResolver_prefersNearestGPS(t *testing.T) {
	repo := &stubRegionRepo{regions: []domain.AvailableRegion{
		{RegencyID: "3402", ProvinceID: "34", Latitude: -7.89, Longitude: 110.32, Name: "Bantul"},
		{RegencyID: "3404", ProvinceID: "34", Latitude: -7.72, Longitude: 110.36, Name: "Sleman"},
	}}
	r := NewWilayahResolver(repo, nil)
	// Near Sleman HQ
	reg, prov := r.Resolve(-7.71, 110.35, "", "9999", "00")
	if reg != "3404" || prov != "34" {
		t.Fatalf("got reg=%s prov=%s", reg, prov)
	}
}

func TestWilayahResolver_TridadiUsesNearestUnitNotYogyaCentroid(t *testing.T) {
	// Real bug: Yogya HQ centroid closer than Sleman HQ centroid, but Sleman units are nearer.
	regions := &stubRegionRepo{regions: []domain.AvailableRegion{
		{RegencyID: "3471", ProvinceID: "34", Latitude: -7.8031634, Longitude: 110.3336451, Name: "Kota Yogyakarta"},
		{RegencyID: "3404", ProvinceID: "34", Latitude: -7.6893463, Longitude: 110.2164617, Name: "Kabupaten Sleman"},
	}}
	ems := &stubEmergencyRepo{byProvince: map[string][]domain.Emergency{
		"34": {
			{
				ID: "pmi-sleman", Name: "PMI Kab. Sleman",
				Address:     domain.Address{RegencyID: "3404", ProvinceID: "34"},
				Coordinates: [2]string{"110.3475165", "-7.7062870"},
			},
			{
				ID: "psc-yes", Name: "PSC 119 YES",
				Address:     domain.Address{RegencyID: "3471", ProvinceID: "34"},
				Coordinates: [2]string{"110.3919178", "-7.8011771"},
			},
		},
	}}
	r := NewWilayahResolver(regions, ems)
	lat, lng := -7.696535388181718, 110.35303115844727
	reg, prov := r.Resolve(lat, lng, "", "", "")
	if reg != "3404" || prov != "34" {
		t.Fatalf("Jalan Turi must resolve to Sleman 3404, got reg=%s prov=%s", reg, prov)
	}
}
