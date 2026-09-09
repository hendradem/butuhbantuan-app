package hospitalprovider

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/butuhbantuan/api/internal/domain"
)

// SatuSehatProvider pulls RS (jenis_sarana=104) from Kemenkes Master Sarana Index.
// Docs: filter with kode_kabkota (4-digit Kemendagri); response wilayah object is kabkota.
type SatuSehatProvider struct {
	baseURL      string
	clientID     string
	clientSecret string
	httpClient   *http.Client

	mu          sync.Mutex
	accessToken string
	tokenExpiry time.Time
}

func NewSatuSehatProvider(baseURL, clientID, clientSecret string) *SatuSehatProvider {
	baseURL = strings.TrimRight(strings.TrimSpace(baseURL), "/")
	if baseURL == "" {
		baseURL = "https://api-satusehat-stg.dto.kemkes.go.id"
	}
	return &SatuSehatProvider{
		baseURL:      baseURL,
		clientID:     clientID,
		clientSecret: clientSecret,
		httpClient:   &http.Client{Timeout: 45 * time.Second},
	}
}

func (p *SatuSehatProvider) Name() string { return domain.HospitalSourceSatuSehat }

func (p *SatuSehatProvider) ListByRegency(regencyID, regencyName, provinceID, provinceName string) ([]domain.HospitalMaster, error) {
	if p.clientID == "" || p.clientSecret == "" {
		return nil, fmt.Errorf("SATUSEHAT credentials belum dikonfigurasi")
	}
	token, err := p.getToken()
	if err != nil {
		return nil, err
	}

	now := time.Now()
	out := make([]domain.HospitalMaster, 0, 32)
	page := 1
	const limit = 100
	rawRows := 0
	skippedFilter := 0
	skippedMeta := 0
	lastTotalPages := 0

	for {
		rows, totalPages, err := p.fetchPage(token, page, limit, regencyID, provinceID)
		if err != nil {
			return nil, err
		}
		lastTotalPages = totalPages
		rawRows += len(rows)
		for _, row := range rows {
			if !isHospital(row) {
				skippedFilter++
				continue
			}
			kab := row.wilayahKab()
			kabCode := firstNonEmpty(kab.KodeBPS, kab.Kode, row.KodeKabupaten)
			kabName := firstNonEmpty(kab.Nama, row.NamaKabupaten)
			// Server already filtered by kode_kabkota; still accept name/code match as safety.
			if kabCode != "" || kabName != "" {
				if !regencyMatch(regencyID, regencyName, kabCode, kabName) {
					skippedFilter++
					continue
				}
			}
			code := firstNonEmpty(stringify(row.KodeSatuSehat), row.KodeSarana, row.ID)
			name := strings.TrimSpace(firstNonEmpty(row.Nama, row.Name))
			if code == "" || name == "" {
				skippedMeta++
				continue
			}
			lat, lng := row.Latitude, row.Longitude
			if lat == 0 && lng == 0 {
				lat, lng = row.Lat, row.Lng
			}
			out = append(out, domain.HospitalMaster{
				Source:       domain.HospitalSourceSatuSehat,
				SourceCode:   code,
				Name:         name,
				Address:      strings.TrimSpace(firstNonEmpty(row.Alamat, row.Address)),
				Phone:        strings.TrimSpace(firstNonEmpty(row.Telp, row.Telepon, row.Phone)),
				Class:        strings.TrimSpace(firstNonEmpty(row.KelasSarana.Nama, row.Kelas, row.Class)),
				Ownership:    strings.TrimSpace(firstNonEmpty(row.Kepemilikan, row.Ownership)),
				Latitude:     lat,
				Longitude:    lng,
				ProvinceID:   firstNonEmpty(provinceID, row.Provinsi.KodeBPS, row.Provinsi.Kode),
				RegencyID:    regencyID,
				ProvinceName: firstNonEmpty(provinceName, row.Provinsi.Nama),
				RegencyName:  firstNonEmpty(regencyName, kabName),
				SyncedAt:     now,
			})
		}
		if page >= totalPages || page >= 40 || len(rows) == 0 {
			break
		}
		page++
	}

	if len(out) == 0 {
		log.Printf("SATUSEHAT MSI empty: regency=%s name=%q province=%s pages=%d raw_rows=%d skipped_filter=%d skipped_meta=%d base=%s",
			regencyID, regencyName, provinceID, lastTotalPages, rawRows, skippedFilter, skippedMeta, p.baseURL)
		return nil, fmt.Errorf("SATUSEHAT MSI: tidak ada RS untuk kabupaten %s (%s) — raw=%d pages=%d (cek kode_kabkota / restart API bila kode baru)",
			regencyID, regencyName, rawRows, lastTotalPages)
	}
	log.Printf("SATUSEHAT MSI ok: regency=%s fetched=%d pages=%d", regencyID, len(out), lastTotalPages)
	return out, nil
}

type msiWilayah struct {
	Kode     string `json:"kode"`
	Nama     string `json:"nama"`
	KodeBPS  string `json:"kode_bps"`
	KodeLama string `json:"kode_lama"`
}

type msiNamed struct {
	Kode string `json:"kode"`
	Nama string `json:"nama"`
}

type msiRow struct {
	ID            string          `json:"id"`
	KodeSatuSehat json.RawMessage `json:"kode_satusehat"`
	KodeSarana    string          `json:"kode_sarana"`
	Nama          string          `json:"nama"`
	Name          string          `json:"name"`
	Alamat        string          `json:"alamat"`
	Address       string          `json:"address"`
	Telp          string          `json:"telp"`
	Telepon       string          `json:"telepon"`
	Phone         string          `json:"phone"`
	Kelas         string          `json:"kelas"`
	Class         string          `json:"class"`
	KelasSarana   msiNamed        `json:"kelas_sarana"`
	Kepemilikan   string          `json:"kepemilikan"`
	Ownership     string          `json:"ownership"`
	JenisSarana   any             `json:"jenis_sarana"`
	Latitude      float64         `json:"latitude"`
	Longitude     float64         `json:"longitude"`
	Lat           float64         `json:"lat"`
	Lng           float64         `json:"lng"`
	KodeKabupaten string          `json:"kode_kabupaten"`
	NamaKabupaten string          `json:"nama_kabupaten"`
	// Official MSI field is kabkota; kabupaten kept as legacy alias.
	Kabkota   msiWilayah `json:"kabkota"`
	Kabupaten msiWilayah `json:"kabupaten"`
	Provinsi  msiWilayah `json:"provinsi"`
}

func (r msiRow) wilayahKab() msiWilayah {
	if r.Kabkota.Kode != "" || r.Kabkota.KodeBPS != "" || r.Kabkota.Nama != "" {
		return r.Kabkota
	}
	return r.Kabupaten
}

func isHospital(row msiRow) bool {
	switch v := row.JenisSarana.(type) {
	case float64:
		return int(v) == 104
	case string:
		s := strings.ToLower(v)
		return v == "104" || strings.Contains(s, "rumah sakit")
	case map[string]any:
		if kode, ok := v["kode"]; ok {
			return fmt.Sprint(kode) == "104"
		}
		if nama, ok := v["nama"]; ok {
			return strings.Contains(strings.ToLower(fmt.Sprint(nama)), "rumah sakit")
		}
	case nil:
		// When query already sets jenis_sarana=104, missing field still counts as RS.
		return true
	}
	return true
}

func regencyMatch(wantID, wantName, gotCode, gotName string) bool {
	wantID = strings.TrimSpace(wantID)
	gotCode = strings.TrimSpace(gotCode)
	if wantID != "" && gotCode != "" {
		if wantID == gotCode || strings.TrimLeft(wantID, "0") == strings.TrimLeft(gotCode, "0") {
			return true
		}
	}
	wantName = strings.ToLower(strings.TrimSpace(wantName))
	gotName = strings.ToLower(strings.TrimSpace(gotName))
	if wantName == "" || gotName == "" {
		return false
	}
	wantName = normalizeWilayahName(wantName)
	gotName = normalizeWilayahName(gotName)
	return wantName == gotName || strings.Contains(gotName, wantName) || strings.Contains(wantName, gotName)
}

func normalizeWilayahName(s string) string {
	s = strings.TrimSpace(s)
	for _, p := range []string{"kabupaten ", "kab. ", "kab ", "kota "} {
		s = strings.TrimPrefix(s, p)
	}
	return strings.TrimSpace(s)
}

func (p *SatuSehatProvider) getToken() (string, error) {
	p.mu.Lock()
	defer p.mu.Unlock()
	if p.accessToken != "" && time.Now().Before(p.tokenExpiry.Add(-30*time.Second)) {
		return p.accessToken, nil
	}
	form := url.Values{}
	form.Set("client_id", p.clientID)
	form.Set("client_secret", p.clientSecret)

	req, err := http.NewRequest(http.MethodPost, p.baseURL+"/oauth2/v1/accesstoken?grant_type=client_credentials", strings.NewReader(form.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	res, err := p.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("SATUSEHAT token: %w", err)
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)
	if res.StatusCode >= 300 {
		return "", fmt.Errorf("SATUSEHAT token HTTP %d: %s", res.StatusCode, truncate(string(body), 200))
	}
	var tok struct {
		AccessToken string          `json:"access_token"`
		ExpiresIn   json.RawMessage `json:"expires_in"`
	}
	if err := json.Unmarshal(body, &tok); err != nil {
		return "", err
	}
	if tok.AccessToken == "" {
		return "", fmt.Errorf("SATUSEHAT token kosong")
	}
	exp := parseExpiresIn(tok.ExpiresIn)
	if exp <= 0 {
		exp = 3600
	}
	p.accessToken = tok.AccessToken
	p.tokenExpiry = time.Now().Add(time.Duration(exp) * time.Second)
	return p.accessToken, nil
}

// parseExpiresIn accepts both JSON number and string (SATUSEHAT sometimes returns "3600").
func parseExpiresIn(raw json.RawMessage) int {
	if len(raw) == 0 {
		return 0
	}
	var n int
	if err := json.Unmarshal(raw, &n); err == nil {
		return n
	}
	var s string
	if err := json.Unmarshal(raw, &s); err == nil {
		n, _ = strconv.Atoi(strings.TrimSpace(s))
		return n
	}
	return 0
}

func (p *SatuSehatProvider) fetchPage(token string, page, limit int, regencyID, provinceID string) ([]msiRow, int, error) {
	q := url.Values{}
	q.Set("page", strconv.Itoa(page))
	q.Set("limit", strconv.Itoa(limit))
	q.Set("jenis_sarana", "104")
	// Official MSI filter: kode_kabkota = 4-digit Kemendagri (same as BPS for most kab/kota).
	if rid := strings.TrimSpace(regencyID); rid != "" {
		q.Set("kode_kabkota", rid)
	}
	if pid := strings.TrimSpace(provinceID); pid != "" {
		q.Set("kode_provinsi", pid)
	}

	endpoint := p.baseURL + "/masterdata/v1/mastersaranaindex/mastersarana?" + q.Encode()
	req, err := http.NewRequest(http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/json")
	res, err := p.httpClient.Do(req)
	if err != nil {
		return nil, 0, fmt.Errorf("SATUSEHAT MSI: %w", err)
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)
	if res.StatusCode >= 300 {
		return nil, 0, fmt.Errorf("SATUSEHAT MSI HTTP %d: %s", res.StatusCode, truncate(string(body), 240))
	}

	var parsed struct {
		Data       []msiRow `json:"data"`
		TotalPage  int      `json:"total_page"`
		TotalPages int      `json:"total_pages"`
		Meta       struct {
			TotalPage  int `json:"total_page"`
			TotalPages int `json:"total_pages"`
		} `json:"meta"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil {
		return nil, 0, fmt.Errorf("SATUSEHAT MSI parse: %w", err)
	}
	total := parsed.TotalPage
	if total == 0 {
		total = parsed.TotalPages
	}
	if total == 0 {
		total = parsed.Meta.TotalPage
	}
	if total == 0 {
		total = parsed.Meta.TotalPages
	}
	if total == 0 {
		total = page
	}
	return parsed.Data, total, nil
}

func stringify(raw json.RawMessage) string {
	if len(raw) == 0 || string(raw) == "null" {
		return ""
	}
	var s string
	if err := json.Unmarshal(raw, &s); err == nil {
		return strings.TrimSpace(s)
	}
	var n json.Number
	if err := json.Unmarshal(raw, &n); err == nil {
		return n.String()
	}
	return strings.Trim(string(raw), `"`)
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if strings.TrimSpace(v) != "" {
			return strings.TrimSpace(v)
		}
	}
	return ""
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}
