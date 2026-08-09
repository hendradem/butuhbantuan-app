package jsonrepo

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"strconv"
	"strings"

	"github.com/butuhbantuan/api/internal/domain"
	"github.com/butuhbantuan/api/internal/repository"
)

type Repo struct {
	emergencies []domain.Emergency
	types       []domain.EmergencyType
	regions     []domain.AvailableRegion
}

func New(dataDir string) (*Repo, error) {
	r := &Repo{}

	if dataDir == "" {
		dataDir = resolveDataDir()
	}

	if err := loadJSON(filepath.Join(dataDir, "emergencies.json"), &r.emergencies); err != nil {
		return nil, fmt.Errorf("emergencies.json: %w", err)
	}
	if err := loadJSON(filepath.Join(dataDir, "emergency_types.json"), &r.types); err != nil {
		return nil, fmt.Errorf("emergency_types.json: %w", err)
	}
	if err := loadJSON(filepath.Join(dataDir, "available_regions.json"), &r.regions); err != nil {
		return nil, fmt.Errorf("available_regions.json: %w", err)
	}

	return r, nil
}

func resolveDataDir() string {
	// Try ./data relative to working directory first
	if _, err := os.Stat("data"); err == nil {
		return "data"
	}
	// Fall back to path relative to this source file (useful in tests)
	_, filename, _, ok := runtime.Caller(0)
	if ok {
		return filepath.Join(filepath.Dir(filename), "../../../data")
	}
	return "data"
}

func loadJSON(path string, dest any) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()
	return json.NewDecoder(f).Decode(dest)
}

func (r *Repo) FindAll() ([]domain.Emergency, error) {
	return r.emergencies, nil
}

func (r *Repo) FindByProvince(provinceID string) ([]domain.Emergency, error) {
	var out []domain.Emergency
	for _, e := range r.emergencies {
		if e.Address.ProvinceID == provinceID {
			out = append(out, e)
		}
	}
	return out, nil
}

func (r *Repo) FindByRegency(regencyID string) ([]domain.Emergency, error) {
	var out []domain.Emergency
	for _, e := range r.emergencies {
		if e.Address.RegencyID == regencyID || e.IsProvinceDispatcher {
			out = append(out, e)
		}
	}
	return out, nil
}

func (r *Repo) FindDispatchers(regencyID, provinceID string) ([]domain.Emergency, error) {
	var out []domain.Emergency
	for _, e := range r.emergencies {
		if !e.IsDispatcher {
			continue
		}
		if e.Address.RegencyID == regencyID || (e.Address.ProvinceID == provinceID && e.IsProvinceDispatcher) {
			out = append(out, e)
		}
	}
	return out, nil
}

func (r *Repo) FindByType(emergencyTypeID string) ([]domain.Emergency, error) {
	typeID, err := strconv.ParseUint(emergencyTypeID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid emergency type id: %w", err)
	}
	var out []domain.Emergency
	for _, e := range r.emergencies {
		if uint64(e.EmergencyType.ID) == typeID {
			out = append(out, e)
		}
	}
	return out, nil
}

func (r *Repo) FindByIDs(ids []string) ([]domain.Emergency, error) {
	idSet := make(map[string]struct{}, len(ids))
	for _, id := range ids {
		idSet[id] = struct{}{}
	}
	var out []domain.Emergency
	for _, e := range r.emergencies {
		if _, ok := idSet[e.ID]; ok {
			out = append(out, e)
		}
	}
	return out, nil
}

func (r *Repo) Create(_ domain.Emergency) (*domain.Emergency, error) {
	return nil, repository.ErrNotSupported
}

func (r *Repo) Update(_ domain.Emergency) (*domain.Emergency, error) {
	return nil, repository.ErrNotSupported
}

func (r *Repo) Delete(_ string) error {
	return repository.ErrNotSupported
}

func (r *Repo) FindAllTypes() ([]domain.EmergencyType, error) {
	return r.types, nil
}

func (r *Repo) CreateType(_ domain.EmergencyType) (*domain.EmergencyType, error) {
	return nil, repository.ErrNotSupported
}

func (r *Repo) UpdateType(_ domain.EmergencyType) (*domain.EmergencyType, error) {
	return nil, repository.ErrNotSupported
}

func (r *Repo) DeleteType(_ string) error {
	return repository.ErrNotSupported
}

func (r *Repo) FindAllAvailableRegions() ([]domain.AvailableRegion, error) {
	return r.regions, nil
}

func (r *Repo) FindAvailableRegionsByName(name string) ([]domain.AvailableRegion, error) {
	needle := normalizeRegionName(name)
	var out []domain.AvailableRegion
	for _, reg := range r.regions {
		norm := normalizeRegionName(reg.Name)
		if strings.Contains(norm, needle) || strings.Contains(needle, norm) {
			out = append(out, reg)
		}
	}
	return out, nil
}

func (r *Repo) CreateAvailableRegion(_ domain.AvailableRegion) (*domain.AvailableRegion, error) {
	return nil, repository.ErrNotSupported
}

func (r *Repo) UpdateAvailableRegion(_ domain.AvailableRegion) (*domain.AvailableRegion, error) {
	return nil, repository.ErrNotSupported
}

func (r *Repo) DeleteAvailableRegion(_ string) error {
	return repository.ErrNotSupported
}

func (r *Repo) SearchRegencies(_ string) ([]domain.Regency, error) {
	return nil, repository.ErrNotSupported
}

func (r *Repo) FindProvinces() ([]domain.Province, error) {
	return nil, repository.ErrNotSupported
}

func (r *Repo) FindRegenciesByProvince(_ string) ([]domain.Regency, error) {
	return nil, repository.ErrNotSupported
}

var rePrefixes = regexp.MustCompile(`(?i)^(kabupaten|kab\.?|kota|provinsi|prov\.?|daerah istimewa|di)\s+`)
var reSpaces = regexp.MustCompile(`\s+`)

func normalizeRegionName(name string) string {
	s := strings.ToLower(strings.TrimSpace(name))
	for rePrefixes.MatchString(s) {
		s = rePrefixes.ReplaceAllString(s, "")
	}
	s = reSpaces.ReplaceAllString(s, "")
	return s
}
