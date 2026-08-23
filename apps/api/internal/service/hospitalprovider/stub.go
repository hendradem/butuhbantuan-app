package hospitalprovider

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/butuhbantuan/api/internal/domain"
)

type stubFile struct {
	ProvinceID   string `json:"province_id"`
	ProvinceName string `json:"province_name"`
	RegencyName  string `json:"regency_name"`
	Hospitals    []struct {
		SourceCode string  `json:"source_code"`
		Name       string  `json:"name"`
		Address    string  `json:"address"`
		Phone      string  `json:"phone"`
		Class      string  `json:"class"`
		Ownership  string  `json:"ownership"`
		Latitude   float64 `json:"latitude"`
		Longitude  float64 `json:"longitude"`
	} `json:"hospitals"`
}

// StubProvider serves bundled sample RS per kabupaten (local/dev & no SATUSEHAT creds).
type StubProvider struct {
	path string
	once sync.Once
	data map[string]stubFile
	err  error
}

func NewStubProvider(path string) *StubProvider {
	return &StubProvider{path: path}
}

func (p *StubProvider) Name() string { return domain.HospitalSourceStub }

func (p *StubProvider) load() {
	p.once.Do(func() {
		candidates := []string{
			p.path,
			filepath.Join("data", "hospitals", "stub_by_regency.json"),
			filepath.Join("apps", "api", "data", "hospitals", "stub_by_regency.json"),
		}
		var raw []byte
		var err error
		for _, c := range candidates {
			if c == "" {
				continue
			}
			raw, err = os.ReadFile(c)
			if err == nil {
				p.path = c
				break
			}
		}
		if err != nil {
			p.err = fmt.Errorf("stub hospital file: %w", err)
			return
		}
		p.data = map[string]stubFile{}
		if err := json.Unmarshal(raw, &p.data); err != nil {
			p.err = fmt.Errorf("parse stub hospital file: %w", err)
		}
	})
}

func (p *StubProvider) ListByRegency(regencyID, regencyName, provinceID, provinceName string) ([]domain.HospitalMaster, error) {
	p.load()
	if p.err != nil {
		return nil, p.err
	}
	block, ok := p.data[regencyID]
	if !ok {
		log.Printf("stub hospital: no data for regency %s (%s) — configure SATUSEHAT_CLIENT_ID/SECRET for live data", regencyID, regencyName)
		return []domain.HospitalMaster{}, nil
	}
	now := time.Now()
	out := make([]domain.HospitalMaster, 0, len(block.Hospitals))
	for _, h := range block.Hospitals {
		provID := block.ProvinceID
		if provID == "" {
			provID = provinceID
		}
		provName := block.ProvinceName
		if provName == "" {
			provName = provinceName
		}
		regName := block.RegencyName
		if regName == "" {
			regName = regencyName
		}
		out = append(out, domain.HospitalMaster{
			Source:       domain.HospitalSourceStub,
			SourceCode:   h.SourceCode,
			Name:         strings.TrimSpace(h.Name),
			Address:      strings.TrimSpace(h.Address),
			Phone:        strings.TrimSpace(h.Phone),
			Class:        h.Class,
			Ownership:    h.Ownership,
			Latitude:     h.Latitude,
			Longitude:    h.Longitude,
			ProvinceID:   provID,
			RegencyID:    regencyID,
			ProvinceName: provName,
			RegencyName:  regName,
			SyncedAt:     now,
		})
	}
	return out, nil
}
