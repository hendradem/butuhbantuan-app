package domain

import (
	"encoding/json"
	"strings"
)

const (
	AssessmentValueYes     = "yes"
	AssessmentValueNo      = "no"
	AssessmentValueUnknown = "unknown"

	AssessmentAcuityGreen   = "green"
	AssessmentAcuityYellow  = "yellow"
	AssessmentAcuityRed     = "red"
	AssessmentAcuityUnknown = "unknown"

	AssessmentCategoryTriage    = "triage"
	AssessmentCategoryTransport = "transport"
	AssessmentCategoryJenazah   = "jenazah"
)

// AssessmentIndicator is a single citizen-facing checklist item (master).
type AssessmentIndicator struct {
	ID         uint   `json:"id,omitempty"`
	Code       string `json:"code"`
	Label      string `json:"label"`
	Hint       string `json:"hint,omitempty"`
	AbcdeGroup string `json:"abcde_group,omitempty"` // A|B|C|D|E
	CriticalIf string `json:"critical_if,omitempty"` // yes|no → red
	WarnIf     string `json:"warn_if,omitempty"`     // yes|no → yellow
	SortOrder  int    `json:"sort_order"`
	Required   bool   `json:"required"`
	IsActive   bool   `json:"is_active"`
}

// AssessmentReference is a citable source for a checklist + triage rules.
type AssessmentReference struct {
	Org   string `json:"org"`
	Title string `json:"title"`
	URL   string `json:"url,omitempty"`
	Note  string `json:"note,omitempty"`
}

// TriageLevel is a display catalog for derived acuity (not a diagnosis).
type TriageLevel struct {
	Code  string `json:"code"`
	Label string `json:"label"`
	Hint  string `json:"hint"`
}

// AssessmentTemplate is a versioned checklist bundle for the report form.
type AssessmentTemplate struct {
	ID          uint                  `json:"id,omitempty"`
	Code        string                `json:"code"`
	Name        string                `json:"name"`
	Version     int                   `json:"version"`
	Description string                `json:"description,omitempty"`
	Category    string                `json:"category,omitempty"` // triage | transport | jenazah
	IsActive    bool                  `json:"is_active"`
	IsDefault   bool                  `json:"is_default"`
	Indicators  []AssessmentIndicator `json:"indicators"`
	References  []AssessmentReference `json:"references,omitempty"`
}

func (t AssessmentTemplate) UsesTriage() bool {
	c := strings.ToLower(strings.TrimSpace(t.Category))
	return c == "" || c == AssessmentCategoryTriage
}

// AssessmentBinding maps emergency type → template code (0 = default fallback).
type AssessmentBinding struct {
	ID              uint   `json:"id,omitempty"`
	EmergencyTypeID uint   `json:"emergency_type_id"`
	TemplateCode    string `json:"template_code"`
}

// AssessmentJenisBinding maps citizen jenis pelayanan → template code.
type AssessmentJenisBinding struct {
	JenisPelayanan string `json:"jenis_pelayanan"`
	TemplateCode   string `json:"template_code"`
}

// AssessmentAnswer is one citizen response (snapshotted onto the order).
type AssessmentAnswer struct {
	Code  string `json:"code"`
	Label string `json:"label"`
	Value string `json:"value"` // yes | no | unknown
}

// OrderAssessment is persisted on the order as JSON + derived acuity.
type OrderAssessment struct {
	TemplateCode    string             `json:"template_code"`
	TemplateVersion int                `json:"template_version"`
	Answers         []AssessmentAnswer `json:"answers"`
	Acuity          string             `json:"acuity"`
	Notes           string             `json:"notes,omitempty"`
}

func NormalizeAssessmentValue(v string) string {
	switch strings.ToLower(strings.TrimSpace(v)) {
	case AssessmentValueYes, "ya", "true", "1":
		return AssessmentValueYes
	case AssessmentValueNo, "tidak", "false", "0":
		return AssessmentValueNo
	default:
		return AssessmentValueUnknown
	}
}

// ComputeAcuity derives a priority hint from answers + indicator rules.
// Not a diagnosis — green/yellow/red for unit triage support only.
func ComputeAcuity(indicators []AssessmentIndicator, answers []AssessmentAnswer) string {
	byCode := map[string]string{}
	for _, a := range answers {
		byCode[a.Code] = NormalizeAssessmentValue(a.Value)
	}

	red, yellow, answered := false, false, false
	for _, ind := range indicators {
		val, ok := byCode[ind.Code]
		if !ok || val == AssessmentValueUnknown {
			continue
		}
		answered = true
		if ind.CriticalIf != "" && val == NormalizeAssessmentValue(ind.CriticalIf) {
			red = true
		}
		if ind.WarnIf != "" && val == NormalizeAssessmentValue(ind.WarnIf) {
			yellow = true
		}
	}
	if !answered {
		return AssessmentAcuityUnknown
	}
	if red {
		return AssessmentAcuityRed
	}
	if yellow {
		return AssessmentAcuityYellow
	}
	return AssessmentAcuityGreen
}

func shortAssessmentLabel(code, label string) string {
	switch strings.TrimSpace(code) {
	case "conscious":
		return "Sadar"
	case "breathing_ok":
		return "Napas"
	case "heavy_bleeding":
		return "Pendarahan"
	case "breathless_or_chest":
		return "Sesak / nyeri dada"
	case "seizure_or_faint":
		return "Pingsan / kejang"
	case "trauma":
		return "Trauma"
	case "ambulatory":
		return "Mobilitas"
	case "needs_oxygen":
		return "Butuh O₂"
	case "infectious_risk":
		return "Penyakit menular"
	case "family_escort":
		return "Pendamping"
	case "referral_ready":
		return "Rujukan siap"
	case "at_facility":
		return "Di fasilitas"
	case "death_recent":
		return "Meninggal <6 jam"
	case "identity_known":
		return "Identitas"
	case "family_on_site":
		return "Keluarga di lokasi"
	case "death_certificate":
		return "Surat kematian"
	}
	l := strings.TrimSpace(label)
	l = strings.TrimPrefix(l, "Apakah ")
	l = strings.TrimPrefix(l, "apakah ")
	l = strings.TrimRight(l, "?")
	if l == "" {
		return "—"
	}
	return l
}

// FormatConditionSummary is a short one-line fallback (WA, lists). UI uses structured answers.
func FormatConditionSummary(answers []AssessmentAnswer, notes string) string {
	labelOf := func(v string) string {
		switch NormalizeAssessmentValue(v) {
		case AssessmentValueYes:
			return "Ya"
		case AssessmentValueNo:
			return "Tidak"
		default:
			return ""
		}
	}
	var parts []string
	for _, a := range answers {
		val := labelOf(a.Value)
		if val == "" {
			continue
		}
		parts = append(parts, shortAssessmentLabel(a.Code, a.Label)+": "+val)
	}
	summary := strings.Join(parts, " · ")
	notes = strings.TrimSpace(notes)
	if notes == "" {
		return summary
	}
	if summary == "" {
		return notes
	}
	return summary + " · " + notes
}

func (a OrderAssessment) Marshal() (string, error) {
	b, err := json.Marshal(a)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

func ParseOrderAssessment(raw string) (*OrderAssessment, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, nil
	}
	var a OrderAssessment
	if err := json.Unmarshal([]byte(raw), &a); err != nil {
		return nil, err
	}
	return &a, nil
}
