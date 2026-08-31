package service

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/butuhbantuan/api/internal/domain"
	"github.com/butuhbantuan/api/internal/repository"
	mysqlrepo "github.com/butuhbantuan/api/internal/repository/mysql"
)

type HospitalUseCase interface {
	ListMaster(regencyID string) ([]domain.HospitalMaster, error)
	Sync(regencyID string) (*domain.HospitalSyncResult, error)
	Import(req domain.HospitalImportRequest) (*domain.HospitalImportResult, error)
	ProviderName() string
}

type hospitalService struct {
	master   *mysqlrepo.HospitalMasterRepo
	region   repository.RegionRepository
	emerg    repository.EmergencyRepository
	types    repository.EmergencyTypeRepository
	provider domain.HospitalProvider
}

func NewHospitalService(
	master *mysqlrepo.HospitalMasterRepo,
	region repository.RegionRepository,
	emerg repository.EmergencyRepository,
	types repository.EmergencyTypeRepository,
	provider domain.HospitalProvider,
) HospitalUseCase {
	return &hospitalService{
		master:   master,
		region:   region,
		emerg:    emerg,
		types:    types,
		provider: provider,
	}
}

func (s *hospitalService) ProviderName() string {
	if s.provider == nil {
		return ""
	}
	return s.provider.Name()
}

func (s *hospitalService) ListMaster(regencyID string) ([]domain.HospitalMaster, error) {
	regencyID = strings.TrimSpace(regencyID)
	if regencyID == "" {
		return nil, fmt.Errorf("regency_id wajib")
	}
	return s.master.ListByRegency(regencyID)
}

func (s *hospitalService) Sync(regencyID string) (*domain.HospitalSyncResult, error) {
	regencyID = strings.TrimSpace(regencyID)
	if regencyID == "" {
		return nil, fmt.Errorf("regency_id wajib")
	}
	var regName, provID, provName string
	if reg, err := s.region.FindRegency(regencyID); err == nil && reg != nil {
		regName = reg.Name
		provID = reg.ProvinceID
		if prov, err := s.region.FindProvince(provID); err == nil && prov != nil {
			provName = prov.Name
		}
	}
	items, err := s.provider.ListByRegency(regencyID, regName, provID, provName)
	if err != nil {
		return nil, err
	}
	for i := range items {
		if items[i].ProvinceID == "" {
			items[i].ProvinceID = provID
		}
		if items[i].RegencyID == "" {
			items[i].RegencyID = regencyID
		}
		if items[i].ProvinceName == "" {
			items[i].ProvinceName = provName
		}
		if items[i].RegencyName == "" {
			items[i].RegencyName = regName
		}
	}
	n, err := s.master.UpsertMany(items)
	if err != nil {
		return nil, err
	}
	cached, err := s.master.ListByRegency(regencyID)
	if err != nil {
		return nil, err
	}
	return &domain.HospitalSyncResult{
		RegencyID: regencyID,
		Source:    s.provider.Name(),
		Fetched:   len(items),
		Upserted:  n,
		Items:     cached,
	}, nil
}

func (s *hospitalService) Import(req domain.HospitalImportRequest) (*domain.HospitalImportResult, error) {
	if len(req.MasterIDs) == 0 {
		return nil, fmt.Errorf("master_ids wajib")
	}
	rows, err := s.master.FindByUUIDs(req.MasterIDs)
	if err != nil {
		return nil, err
	}
	byUUID := map[string]mysqlrepo.HospitalMasterEntity{}
	for _, row := range rows {
		byUUID[row.UUID.String()] = row
	}

	rsType, err := s.resolveRumahSakitType()
	if err != nil {
		return nil, err
	}

	tier := strings.TrimSpace(req.PartnerTier)
	if tier == "" {
		tier = domain.PartnerTierCommunity
	}
	active := false
	if req.IsActive != nil {
		active = *req.IsActive
	}

	result := &domain.HospitalImportResult{IDs: []string{}, Errors: []string{}}
	for _, id := range req.MasterIDs {
		row, ok := byUUID[id]
		if !ok {
			result.Failed++
			result.Errors = append(result.Errors, "master tidak ditemukan: "+id)
			continue
		}
		if row.ImportedEmergencyUUID != "" {
			result.Skipped++
			result.IDs = append(result.IDs, row.ImportedEmergencyUUID)
			continue
		}
		lat := formatCoord(row.Latitude)
		lng := formatCoord(row.Longitude)
		e := domain.Emergency{
			Name:             row.Name,
			OrganizationName: row.Name,
			OrganizationType: "rumah_sakit",
			Description:      strings.TrimSpace(strings.Join(filterEmpty(row.Class, row.Ownership), " · ")),
			Coordinates:      [2]string{lng, lat},
			TypeOfService:    "Rumah Sakit",
			TipeEmergency:    []string{"Rumah Sakit"},
			PartnerTier:      tier,
			EmergencyType:    *rsType,
			Address: domain.Address{
				RegencyID:   row.RegencyID,
				Regency:     row.RegencyName,
				ProvinceID:  row.ProvinceID,
				Province:    row.ProvinceName,
				FullAddress: row.Address,
				DistrictID:  "",
			},
			Contact: domain.Contact{
				Phone:    row.Phone,
				Whatsapp: row.Phone,
			},
			Operational: domain.OperationalStatus{
				IsActive:  active,
				Is24Hours: true,
				OpenTime:  "00:00",
				CloseTime: "23:59",
			},
			Fleet:            domain.FleetStatus{Total: 0, Available: 0},
			DashboardAccess:  true,
		}
		created, err := s.emerg.Create(e)
		if err != nil {
			result.Failed++
			result.Errors = append(result.Errors, row.Name+": "+err.Error())
			continue
		}
		_ = s.master.MarkImported(row.ID, created.ID)
		_ = s.master.LinkEmergencyHospitalMaster(created.ID, row.ID)
		result.Imported++
		result.IDs = append(result.IDs, created.ID)
	}
	return result, nil
}

func (s *hospitalService) resolveRumahSakitType() (*domain.EmergencyType, error) {
	types, err := s.types.FindAllTypes()
	if err != nil {
		return nil, err
	}
	for _, t := range types {
		name := strings.ToLower(t.Name)
		if strings.Contains(name, "rumah sakit") || name == "rs" || name == "hospital" {
			tt := t
			return &tt, nil
		}
	}
	created, err := s.types.CreateType(domain.EmergencyType{
		Name: "Rumah Sakit",
		Icon: "mdi:hospital-building",
	})
	if err != nil {
		return nil, fmt.Errorf("jenis layanan Rumah Sakit belum ada: %w", err)
	}
	return created, nil
}

func formatCoord(v float64) string {
	if v == 0 {
		return "0"
	}
	return strconv.FormatFloat(v, 'f', -1, 64)
}

func filterEmpty(vals ...string) []string {
	out := make([]string, 0, len(vals))
	for _, v := range vals {
		if strings.TrimSpace(v) != "" {
			out = append(out, strings.TrimSpace(v))
		}
	}
	return out
}
