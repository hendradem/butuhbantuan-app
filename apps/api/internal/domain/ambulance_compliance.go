package domain

import (
	"encoding/json"
	"errors"
	"strings"
	"time"
)

const (
	ComplianceStatusAda            = "ada"
	ComplianceStatusTidak          = "tidak"
	ComplianceStatusTidakDiketahui = "tidak_diketahui"

	ComplianceVerificationSelfDeclared = "self_declared"
	ComplianceVerificationVerified     = "verified"
	ComplianceVerificationExpired      = "expired"

	CategoryTransportDarat        = "transport_darat"
	CategoryAGDDaratRoda4         = "agd_darat_roda4"
	CategoryAGDDaratRoda2         = "agd_darat_roda2"
	CategoryInteriorDarat         = "interior_darat"
	CategoryExteriorDarat         = "exterior_darat"
	CategoryBelumTerklasifikasi   = "belum_terklasifikasi"

	complianceVerifyDefaultDays = 365
)

// AmbulanceComplianceItem is a master checklist row (Kemenkes Pedoman 2019).
type AmbulanceComplianceItem struct {
	Code     string `json:"code"`
	Label    string `json:"label"`
	Group    string `json:"group"`
	Required bool   `json:"required"`
	Sort     int    `json:"sort_order"`
}

// AmbulanceComplianceTemplate is a category bundle (Tabel 1 / Tabel 2).
type AmbulanceComplianceTemplate struct {
	Code        string                    `json:"code"`
	Name        string                    `json:"name"`
	Version     int                       `json:"version"`
	Description string                    `json:"description,omitempty"`
	TableRef    string                    `json:"table_ref"`
	Items       []AmbulanceComplianceItem `json:"items"`
}

// AmbulanceComplianceAnswer is one unit self-declaration.
type AmbulanceComplianceAnswer struct {
	Code     string `json:"code"`
	Status   string `json:"status"`
	Note     string `json:"note,omitempty"`
	PhotoURL string `json:"photo_url,omitempty"`
}

// AmbulanceComplianceProfile is persisted on emergency (JSON column).
type AmbulanceComplianceProfile struct {
	DeclaredCategory   string                      `json:"declared_category"`
	Items              []AmbulanceComplianceAnswer `json:"items"`
	UpdatedAt          string                      `json:"updated_at,omitempty"`
	VerifiedCategory   string                      `json:"verified_category,omitempty"`
	VerificationStatus string                      `json:"verification_status,omitempty"`
	VerifiedAt         string                      `json:"verified_at,omitempty"`
	VerifiedExpiresAt  string                      `json:"verified_expires_at,omitempty"`
	VerifiedBy         string                      `json:"verified_by,omitempty"`
}

// AmbulanceComplianceView is the public read model for citizens.
type AmbulanceComplianceView struct {
	DeclaredCategory string                         `json:"declared_category"`
	CategoryLabel    string                         `json:"category_label"`
	CompletenessPct  int                            `json:"completeness_pct"`
	RequiredTotal    int                            `json:"required_total"`
	RequiredMet      int                            `json:"required_met"`
	Groups           []AmbulanceComplianceGroupView `json:"groups"`
	Disclaimer       string                         `json:"disclaimer"`
	Reference        ComplianceReference            `json:"reference"`
	UpdatedAt        string                         `json:"updated_at,omitempty"`
	Verification     *ComplianceVerificationView    `json:"verification,omitempty"`
}

type ComplianceVerificationView struct {
	Status                string `json:"status"`
	VerifiedCategory      string `json:"verified_category,omitempty"`
	VerifiedCategoryLabel string `json:"verified_category_label,omitempty"`
	VerifiedAt            string `json:"verified_at,omitempty"`
	ExpiresAt             string `json:"expires_at,omitempty"`
	IsVerified            bool   `json:"is_verified"`
}

type AmbulanceComplianceGroupView struct {
	Code  string                        `json:"code"`
	Label string                        `json:"label"`
	Items []AmbulanceComplianceItemView `json:"items"`
}

type AmbulanceComplianceItemView struct {
	Code     string `json:"code"`
	Label    string `json:"label"`
	Required bool   `json:"required"`
	Status   string `json:"status"`
	PhotoURL string `json:"photo_url,omitempty"`
}

type ComplianceReference struct {
	Org   string `json:"org"`
	Title string `json:"title"`
	Year  int    `json:"year"`
}

func NormalizeComplianceStatus(v string) string {
	switch strings.ToLower(strings.TrimSpace(v)) {
	case ComplianceStatusAda, "yes", "ya", "true", "1":
		return ComplianceStatusAda
	case ComplianceStatusTidak, "no", "false", "0":
		return ComplianceStatusTidak
	default:
		return ComplianceStatusTidakDiketahui
	}
}

func IsAmbulanceEmergencyType(typeName string) bool {
	n := strings.ToLower(strings.TrimSpace(typeName))
	return strings.Contains(n, "ambulance") || strings.Contains(n, "ambulans")
}

func CategoryLabel(code string) string {
	switch strings.TrimSpace(code) {
	case CategoryTransportDarat:
		return "Ambulans Transport Darat"
	case CategoryAGDDaratRoda4:
		return "Ambulans Gawat Darurat Darat (Roda 4+)"
	case CategoryAGDDaratRoda2:
		return "Ambulans Gawat Darurat Darat (Roda 2)"
	default:
		return "Belum terklasifikasi"
	}
}

// IsAmbulanceCategory is true for primary unit types (not interior/exterior checklists).
func IsAmbulanceCategory(category string) bool {
	return ComplianceTemplateForCategory(category) != nil
}

func ComplianceTemplateForCategory(category string) *AmbulanceComplianceTemplate {
	switch normalizeDeclaredCategory(category) {
	case CategoryTransportDarat:
		tpl := DefaultTransportDaratTemplate()
		return &tpl
	case CategoryAGDDaratRoda4:
		tpl := DefaultAGDDaratRoda4Template()
		return &tpl
	case CategoryAGDDaratRoda2:
		tpl := DefaultAGDDaratRoda2Template()
		return &tpl
	default:
		return nil
	}
}

// FullComplianceTemplate merges primary type + vehicle interior/exterior checklists.
func FullComplianceTemplate(category string) *AmbulanceComplianceTemplate {
	primary := ComplianceTemplateForCategory(category)
	if primary == nil {
		return nil
	}
	merged := *primary
	merged.Items = append(merged.Items, DefaultInteriorDaratTemplate().Items...)
	merged.Items = append(merged.Items, DefaultExteriorDaratTemplate().Items...)
	return &merged
}

func ListComplianceCategories() []struct {
	Code  string `json:"code"`
	Label string `json:"label"`
} {
	return []struct {
		Code  string `json:"code"`
		Label string `json:"label"`
	}{
		{Code: CategoryTransportDarat, Label: CategoryLabel(CategoryTransportDarat)},
		{Code: CategoryAGDDaratRoda4, Label: CategoryLabel(CategoryAGDDaratRoda4)},
		{Code: CategoryAGDDaratRoda2, Label: CategoryLabel(CategoryAGDDaratRoda2)},
	}
}

func normalizeDeclaredCategory(category string) string {
	switch strings.TrimSpace(category) {
	case CategoryInteriorDarat, CategoryExteriorDarat:
		// Legacy: interior/exterior were wrongly stored as declared_category.
		return CategoryTransportDarat
	default:
		return strings.TrimSpace(category)
	}
}

func (p AmbulanceComplianceProfile) Marshal() (string, error) {
	b, err := json.Marshal(p)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

func ParseAmbulanceComplianceProfile(raw string) (*AmbulanceComplianceProfile, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, nil
	}
	var p AmbulanceComplianceProfile
	if err := json.Unmarshal([]byte(raw), &p); err != nil {
		return nil, err
	}
	return &p, nil
}

func BuildComplianceView(profile *AmbulanceComplianceProfile) *AmbulanceComplianceView {
	if profile == nil || profile.DeclaredCategory == "" {
		return nil
	}
	profile.DeclaredCategory = normalizeDeclaredCategory(profile.DeclaredCategory)
	ResolveVerificationStatus(profile)
	tpl := FullComplianceTemplate(profile.DeclaredCategory)
	if tpl == nil {
		return nil
	}

	answers := map[string]AmbulanceComplianceAnswer{}
	for _, a := range profile.Items {
		answers[a.Code] = AmbulanceComplianceAnswer{
			Code:     a.Code,
			Status:   NormalizeComplianceStatus(a.Status),
			Note:     strings.TrimSpace(a.Note),
			PhotoURL: strings.TrimSpace(a.PhotoURL),
		}
	}

	requiredTotal, requiredMet := 0, 0
	groupOrder := complianceGroupOrder()
	groupLabels := complianceGroupLabels()
	byGroup := map[string][]AmbulanceComplianceItemView{}

	for _, item := range tpl.Items {
		ans := answers[item.Code]
		status := ans.Status
		if status == "" {
			status = ComplianceStatusTidakDiketahui
		}
		if item.Required {
			requiredTotal++
			if status == ComplianceStatusAda {
				requiredMet++
			}
		}
		byGroup[item.Group] = append(byGroup[item.Group], AmbulanceComplianceItemView{
			Code:     item.Code,
			Label:    item.Label,
			Required: item.Required,
			Status:   status,
			PhotoURL: ans.PhotoURL,
		})
	}

	pct := 0
	if requiredTotal > 0 {
		pct = int(float64(requiredMet) / float64(requiredTotal) * 100)
	}

	groups := make([]AmbulanceComplianceGroupView, 0, len(groupOrder))
	for _, g := range groupOrder {
		items := byGroup[g]
		if len(items) == 0 {
			continue
		}
		groups = append(groups, AmbulanceComplianceGroupView{
			Code:  g,
			Label: groupLabels[g],
			Items: items,
		})
	}

	return &AmbulanceComplianceView{
		DeclaredCategory: profile.DeclaredCategory,
		CategoryLabel:    CategoryLabel(profile.DeclaredCategory),
		CompletenessPct:  pct,
		RequiredTotal:    requiredTotal,
		RequiredMet:      requiredMet,
		Groups:           groups,
		Disclaimer:       complianceDisclaimer(profile),
		Reference: ComplianceReference{
			Org:   "Kemenkes RI",
			Title: "Pedoman Teknis Ambulans",
			Year:  2019,
		},
		UpdatedAt:    profile.UpdatedAt,
		Verification: buildVerificationView(profile),
	}
}

func MergeComplianceAnswers(tpl AmbulanceComplianceTemplate, incoming []AmbulanceComplianceAnswer) []AmbulanceComplianceAnswer {
	allowed := map[string]bool{}
	for _, item := range tpl.Items {
		allowed[item.Code] = true
	}
	out := make([]AmbulanceComplianceAnswer, 0, len(incoming))
	for _, a := range incoming {
		if !allowed[a.Code] {
			continue
		}
		out = append(out, AmbulanceComplianceAnswer{
			Code:     a.Code,
			Status:   NormalizeComplianceStatus(a.Status),
			Note:     strings.TrimSpace(a.Note),
			PhotoURL: strings.TrimSpace(a.PhotoURL),
		})
	}
	return out
}

func answersByCode(items []AmbulanceComplianceAnswer) map[string]AmbulanceComplianceAnswer {
	m := make(map[string]AmbulanceComplianceAnswer, len(items))
	for _, a := range items {
		m[a.Code] = a
	}
	return m
}

// MergeAnswersForTemplate fills every template row; keeps existing values when switching type.
func MergeAnswersForTemplate(tpl AmbulanceComplianceTemplate, incoming, existing []AmbulanceComplianceAnswer) []AmbulanceComplianceAnswer {
	inMap := answersByCode(incoming)
	exMap := answersByCode(existing)
	out := make([]AmbulanceComplianceAnswer, 0, len(tpl.Items))
	for _, item := range tpl.Items {
		if a, ok := inMap[item.Code]; ok {
			out = append(out, a)
			continue
		}
		if a, ok := exMap[item.Code]; ok {
			out = append(out, AmbulanceComplianceAnswer{
				Code:     item.Code,
				Status:   NormalizeComplianceStatus(a.Status),
				Note:     strings.TrimSpace(a.Note),
				PhotoURL: strings.TrimSpace(a.PhotoURL),
			})
			continue
		}
		out = append(out, AmbulanceComplianceAnswer{
			Code:   item.Code,
			Status: ComplianceStatusTidakDiketahui,
		})
	}
	return out
}

func NewComplianceProfile(category string, answers []AmbulanceComplianceAnswer, existing *AmbulanceComplianceProfile) AmbulanceComplianceProfile {
	category = normalizeDeclaredCategory(category)
	tpl := FullComplianceTemplate(category)
	var items []AmbulanceComplianceAnswer
	if tpl != nil {
		var prev []AmbulanceComplianceAnswer
		if existing != nil {
			prev = existing.Items
		}
		items = MergeAnswersForTemplate(*tpl, answers, prev)
	} else {
		items = answers
	}

	now := time.Now().UTC().Format(time.RFC3339)
	p := AmbulanceComplianceProfile{
		DeclaredCategory:   category,
		Items:              items,
		UpdatedAt:          now,
		VerificationStatus: ComplianceVerificationSelfDeclared,
	}

	categoryChanged := existing != nil && normalizeDeclaredCategory(existing.DeclaredCategory) != category
	if !categoryChanged && existing != nil {
		p.VerifiedCategory = existing.VerifiedCategory
		p.VerificationStatus = existing.VerificationStatus
		p.VerifiedAt = existing.VerifiedAt
		p.VerifiedExpiresAt = existing.VerifiedExpiresAt
		p.VerifiedBy = existing.VerifiedBy
		if p.VerificationStatus == "" {
			p.VerificationStatus = ComplianceVerificationSelfDeclared
		}
	}
	return p
}

func complianceGroupOrder() []string {
	return []string{
		"umum", "airway", "breathing", "circulation", "immobilization",
		"interior", "exterior", "supporting",
	}
}

func complianceGroupLabels() map[string]string {
	return map[string]string{
		"umum":           "Pemeriksaan umum",
		"airway":         "Jalan napas",
		"breathing":      "Pernapasan",
		"circulation":    "Sirkulasi",
		"immobilization": "Imobilisasi",
		"interior":       "Interior kendaraan",
		"exterior":       "Eksterior kendaraan",
		"supporting":     "Pendukung",
	}
}

func ResolveVerificationStatus(p *AmbulanceComplianceProfile) {
	if p == nil {
		return
	}
	if p.VerificationStatus == "" {
		p.VerificationStatus = ComplianceVerificationSelfDeclared
	}
	if p.VerificationStatus != ComplianceVerificationVerified {
		return
	}
	if p.VerifiedExpiresAt == "" {
		return
	}
	t, err := time.Parse(time.RFC3339, p.VerifiedExpiresAt)
	if err == nil && time.Now().UTC().After(t) {
		p.VerificationStatus = ComplianceVerificationExpired
	}
}

func complianceDisclaimer(p *AmbulanceComplianceProfile) string {
	if p != nil && p.VerificationStatus == ComplianceVerificationVerified {
		return "Terverifikasi admin PSC/Dinkes. Berdasarkan Pedoman Teknis Ambulans Kemenkes 2019."
	}
	return "Data dilaporkan unit — bukan sertifikasi resmi Dinkes."
}

func buildVerificationView(p *AmbulanceComplianceProfile) *ComplianceVerificationView {
	if p == nil {
		return nil
	}
	status := p.VerificationStatus
	if status == "" {
		status = ComplianceVerificationSelfDeclared
	}
	verifiedCat := strings.TrimSpace(p.VerifiedCategory)
	return &ComplianceVerificationView{
		Status:                status,
		VerifiedCategory:      verifiedCat,
		VerifiedCategoryLabel: CategoryLabel(verifiedCat),
		VerifiedAt:            p.VerifiedAt,
		ExpiresAt:             p.VerifiedExpiresAt,
		IsVerified:            status == ComplianceVerificationVerified,
	}
}

func (p *AmbulanceComplianceProfile) ClearVerification() {
	p.VerifiedCategory = ""
	p.VerificationStatus = ComplianceVerificationSelfDeclared
	p.VerifiedAt = ""
	p.VerifiedExpiresAt = ""
	p.VerifiedBy = ""
}

func (p *AmbulanceComplianceProfile) ApplyVerification(verifiedCategory, verifiedBy string, expiresAt *time.Time) error {
	verifiedCategory = strings.TrimSpace(verifiedCategory)
	if verifiedCategory == "" {
		verifiedCategory = p.DeclaredCategory
	}
	verifiedCategory = normalizeDeclaredCategory(verifiedCategory)
	if !IsAmbulanceCategory(verifiedCategory) {
		return errors.New("kategori verifikasi tidak dikenal")
	}
	exp := time.Now().UTC().AddDate(1, 0, 0)
	if expiresAt != nil && !expiresAt.IsZero() {
		exp = expiresAt.UTC()
	}
	now := time.Now().UTC()
	p.VerifiedCategory = verifiedCategory
	p.VerificationStatus = ComplianceVerificationVerified
	p.VerifiedAt = now.Format(time.RFC3339)
	p.VerifiedExpiresAt = exp.Format(time.RFC3339)
	p.VerifiedBy = strings.TrimSpace(verifiedBy)
	return nil
}

func ProfileFromEmergency(complianceJSON, declaredCategory string) *AmbulanceComplianceProfile {
	profile, _ := ParseAmbulanceComplianceProfile(complianceJSON)
	if profile == nil && declaredCategory != "" {
		profile = &AmbulanceComplianceProfile{DeclaredCategory: declaredCategory}
	}
	if profile != nil && profile.DeclaredCategory == "" && declaredCategory != "" {
		profile.DeclaredCategory = declaredCategory
	}
	if profile != nil {
		profile.DeclaredCategory = normalizeDeclaredCategory(profile.DeclaredCategory)
	}
	return profile
}

// Compliance queue reasons for admin follow-up.
const (
	ComplianceQueueExpired      = "expired"
	ComplianceQueueExpiringSoon = "expiring_soon"
	ComplianceQueueUnverified   = "unverified"
)

// ComplianceQueueEntry is an admin work-queue row for verification follow-up.
type ComplianceQueueEntry struct {
	EmergencyID        string `json:"emergency_id"`
	Name               string `json:"name"`
	OrganizationName   string `json:"organization_name"`
	Regency            string `json:"regency"`
	Province           string `json:"province"`
	DeclaredCategory   string `json:"declared_category,omitempty"`
	CategoryLabel      string `json:"category_label,omitempty"`
	CompletenessPct    int    `json:"completeness_pct"`
	VerificationStatus string `json:"verification_status"`
	ExpiresAt          string `json:"expires_at,omitempty"`
	DaysUntilExpiry    *int   `json:"days_until_expiry,omitempty"`
	QueueReason        string `json:"queue_reason"`
}

// ComplianceRankDelta returns a soft dispatch score adjustment (lower is better).
// Only applies to ambulance units; must stay small relative to ~1 km distance.
func ComplianceRankDelta(e Emergency, acuity string) float64 {
	if !IsAmbulanceEmergencyType(e.EmergencyType.Name) {
		return 0
	}
	delta := 0.0
	c := e.Compliance
	if c == nil || c.Verification == nil {
		delta = 0.12
	} else if c.Verification.IsVerified {
		delta = -0.22
	} else if c.Verification.Status == ComplianceVerificationExpired {
		delta = 0.35
	} else if c.CompletenessPct >= 85 {
		delta = -0.08
	} else if c.CompletenessPct < 50 {
		delta = 0.18
	}
	switch strings.ToLower(strings.TrimSpace(acuity)) {
	case "red":
		if delta < 0 {
			delta *= 1.35
		} else if delta > 0 {
			delta *= 1.25
		}
	case "yellow":
		if delta < 0 {
			delta *= 1.15
		}
	}
	if delta < -0.35 {
		delta = -0.35
	}
	if delta > 0.5 {
		delta = 0.5
	}
	return delta
}

// BuildComplianceQueueEntry returns a queue row when the unit needs admin attention.
func BuildComplianceQueueEntry(e Emergency, withinDays int, now time.Time) (*ComplianceQueueEntry, bool) {
	if !IsAmbulanceEmergencyType(e.EmergencyType.Name) {
		return nil, false
	}
	view := e.Compliance
	if view == nil {
		view = BuildComplianceView(ProfileFromEmergency("", ""))
	}
	if view == nil {
		return nil, false
	}

	entry := &ComplianceQueueEntry{
		EmergencyID:        e.ID,
		Name:               e.Name,
		OrganizationName:   e.OrganizationName,
		Regency:            e.Address.Regency,
		Province:           e.Address.Province,
		DeclaredCategory:   view.DeclaredCategory,
		CategoryLabel:      view.CategoryLabel,
		CompletenessPct:    view.CompletenessPct,
		VerificationStatus: ComplianceVerificationSelfDeclared,
	}
	if view.Verification != nil {
		entry.VerificationStatus = view.Verification.Status
		entry.ExpiresAt = view.Verification.ExpiresAt
	}

	if view.Verification != nil && view.Verification.Status == ComplianceVerificationExpired {
		entry.QueueReason = ComplianceQueueExpired
		return entry, true
	}

	if view.Verification != nil && view.Verification.IsVerified && view.Verification.ExpiresAt != "" {
		exp, err := time.Parse(time.RFC3339, view.Verification.ExpiresAt)
		if err == nil {
			days := int(exp.Sub(now).Hours() / 24)
			entry.DaysUntilExpiry = &days
			if days < 0 {
				entry.QueueReason = ComplianceQueueExpired
				return entry, true
			}
			if withinDays > 0 && days <= withinDays {
				entry.QueueReason = ComplianceQueueExpiringSoon
				return entry, true
			}
		}
	}

	if view.DeclaredCategory != "" && (view.Verification == nil || !view.Verification.IsVerified) {
		entry.QueueReason = ComplianceQueueUnverified
		return entry, true
	}

	return nil, false
}

func ComplianceQueueReasonRank(reason string) int {
	switch reason {
	case ComplianceQueueExpired:
		return 0
	case ComplianceQueueExpiringSoon:
		return 1
	case ComplianceQueueUnverified:
		return 2
	default:
		return 9
	}
}
