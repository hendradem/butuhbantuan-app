package domain

import (
	"encoding/json"
	"strings"
)

const (
	IncidentReportPresetGeneric = "generic"
	IncidentReportPresetPMI     = "pmi"
)

// IncidentReportTemplate is the WA message shell per unit (header/footer).
type IncidentReportTemplate struct {
	PresetID       string `json:"preset_id"`
	Header         string `json:"header"`
	VolunteerTitle string `json:"volunteer_title"`
	Closing        string `json:"closing"`
	Footer         string `json:"footer"`
}

const defaultIncidentClosing = "Demikian laporan yang dapat kami sampaikan, bila ada kejadian yang bersifat Emergency akan kami sampaikan kembali."

func ParseIncidentReportTemplate(raw string) (*IncidentReportTemplate, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, nil
	}
	var t IncidentReportTemplate
	if err := json.Unmarshal([]byte(raw), &t); err != nil {
		return nil, err
	}
	return &t, nil
}

func (t IncidentReportTemplate) Marshal() (string, error) {
	b, err := json.Marshal(t)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

// DefaultIncidentReportTemplate picks PMI-style when unit looks like PMI Sleman.
func DefaultIncidentReportTemplate(unitName, orgName, regency string) IncidentReportTemplate {
	combined := strings.ToLower(unitName + " " + orgName + " " + regency)
	if strings.Contains(combined, "pmi") && strings.Contains(combined, "sleman") {
		return PMISlemanIncidentReportTemplate(unitName, orgName)
	}
	return GenericIncidentReportTemplate(unitName)
}

func GenericIncidentReportTemplate(unitName string) IncidentReportTemplate {
	name := strings.TrimSpace(unitName)
	if name == "" {
		name = "NAMA UNIT"
	}
	return IncidentReportTemplate{
		PresetID:       IncidentReportPresetGeneric,
		Header:         "*" + strings.ToUpper(name) + "*\n*INFORMASI KEJADIAN EMERGENCY / NON EMERGENCY* 🚑",
		VolunteerTitle: "RELAWAN / PETUGAS " + strings.ToUpper(name),
		Closing:        defaultIncidentClosing,
		Footer:         "",
	}
}

func PMISlemanIncidentReportTemplate(unitName, orgName string) IncidentReportTemplate {
	_ = orgName
	title := strings.TrimSpace(unitName)
	if title == "" {
		title = "PMI KABUPATEN SLEMAN"
	}
	return IncidentReportTemplate{
		PresetID: IncidentReportPresetPMI,
		Header: "*PALANG MERAH INDONESIA*\n*KABUPATEN SLEMAN*\n*INFORMASI KEJADIAN EMERGENCY / NON EMERGENCY* 🚑",
		VolunteerTitle: "RELAWAN/PETUGAS PMI SLEMAN",
		Closing:        defaultIncidentClosing,
		Footer: `*POSKO PMI KABUPATEN SLEMAN*
🏥 Jl. Radjimin, Sucen, Triharjo, Sleman
☎ *Call Center :*
Pelayanan (0274) 868900
UDD (0274) 868900/
📱 *Phone :* Posko 085161131368 (WA)
📧 *Email :* pmislm@pmi.or.id
🕊 *Twitter :* @pmi_sleman
📷 *Instagram :* @pmikabsleman
🌐 https://linktr.ee/pmikabsleman
📻 *Frekuensi :* UHF 434.375 Dup -4000 Tune 88.5`,
	}
}
