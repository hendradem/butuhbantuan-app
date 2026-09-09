package domain

import "strings"

// DefaultTriageLevels is the display catalog for assessment_acuity.
// Derived from WHO CABCDE danger signs and Kemenkes PSC 119 ambulance labels.
func DefaultTriageLevels() []TriageLevel {
	return []TriageLevel{
		{
			Code:  AssessmentAcuityRed,
			Label: "Merah",
			Hint:  "Ada tanda bahaya jiwa (WHO CABCDE / KMK 119). Hint untuk unit — bukan diagnosis.",
		},
		{
			Code:  AssessmentAcuityYellow,
			Label: "Kuning",
			Hint:  "Ada keluhan yang perlu diwaspadai (sesak/nyeri dada, trauma). Bukan diagnosis.",
		},
		{
			Code:  AssessmentAcuityGreen,
			Label: "Hijau",
			Hint:  "Jawaban terisi dan tidak ada tanda bahaya yang terpicu. Tetap observasi.",
		},
		{
			Code:  AssessmentAcuityUnknown,
			Label: "Hitam",
			Hint:  "Pelapor belum menjawab, atau semua jawaban masih belum diisi.",
		},
	}
}

// DefaultABCDELiteTemplate is the system checklist: observable danger signs for lay reporters.
func DefaultABCDELiteTemplate() AssessmentTemplate {
	return AssessmentTemplate{
		Code:        "abcde_lite",
		Name:        "Asesmen awal",
		Version:     1,
		Category:    AssessmentCategoryTriage,
		Description: "Tanda bahaya yang bisa diamati awam (CABCDE-lite). Dipakai sebagai hint triase unit, bukan diagnosis. Pertolongan oleh masyarakat mengikuti panduan petugas (Permenkes 19/2016).",
		IsActive:    true,
		IsDefault:   true,
		Indicators: []AssessmentIndicator{
			{Code: "conscious", Label: "Apakah korban sadar / bisa diajak bicara?", Hint: "Tidak menjawab atau tidak bereaksi → Tidak. WHO Disability; KMK 119 cek kesadaran.", AbcdeGroup: "D", CriticalIf: "no", Required: true, SortOrder: 1, IsActive: true},
			{Code: "breathing_ok", Label: "Apakah napas terlihat normal?", Hint: "Sesak berat, terengah, atau berhenti → Tidak. WHO Breathing; KMK 119 cek napas.", AbcdeGroup: "B", CriticalIf: "no", Required: true, SortOrder: 2, IsActive: true},
			{Code: "heavy_bleeding", Label: "Apakah ada pendarahan hebat yang terlihat?", Hint: "Darah menyemprot atau tidak terkontrol dengan tekan → Ya. WHO Circulation / catastrophic bleeding.", AbcdeGroup: "C", CriticalIf: "yes", Required: true, SortOrder: 3, IsActive: true},
			{Code: "breathless_or_chest", Label: "Apakah sesak napas atau nyeri dada?", Hint: "WHO difficulty breathing; KMK 119 nyeri dada / masalah pernapasan → waspada.", AbcdeGroup: "B", WarnIf: "yes", Required: true, SortOrder: 4, IsActive: true},
			{Code: "seizure_or_faint", Label: "Apakah pingsan atau kejang?", Hint: "WHO altered mental status; KMK 119 tidak sadar / kejang → bahaya jiwa.", AbcdeGroup: "D", CriticalIf: "yes", Required: true, SortOrder: 5, IsActive: true},
			{Code: "trauma", Label: "Apakah karena kecelakaan / jatuh / benturan?", Hint: "WHO Exposure / trauma; KMK 119 tabrakan / jatuh → waspada.", AbcdeGroup: "E", WarnIf: "yes", Required: true, SortOrder: 6, IsActive: true},
		},
		References: DefaultABCDELiteReferences(),
	}
}

// DefaultABCDELiteReferences cites the sources behind the default rules.
func DefaultABCDELiteReferences() []AssessmentReference {
	return []AssessmentReference{
		{
			Org:   "WHO",
			Title: "Community First Aid Response (CFAR) — CABCDE",
			URL:   "https://cdn.who.int/media/docs/default-source/integrated-health-services-%28ihs%29/csy/cfar-pocketguide.pdf",
			Note:  "Awam terlatih mengenali tanda bahaya: pendarahan berat, napas, syok, penurunan kesadaran. Bukan triase IGD.",
		},
		{
			Org:   "WHO / ICRC",
			Title: "Basic Emergency Care: approach to the acutely ill and injured (2018)",
			URL:   "https://www.who.int/publications/i/item/9789241513081",
			Note:  "Kerangka ABCDE untuk petugas garis depan. CFAR diselaraskan ke sini.",
		},
		{
			Org:   "Kemenkes",
			Title: "Permenkes No. 19 Tahun 2016 tentang SPGDT",
			URL:   "https://keslan.kemkes.go.id/unduhan/fileunduhan_1661489796_780416.pdf",
			Note:  "PSC yang men-triase. Pertolongan masyarakat hanya dengan panduan operator call center (Pasal 19 ayat 4).",
		},
		{
			Org:   "Kemenkes",
			Title: "KMK HK.01.07/MENKES/796/2019 — Algoritme NCC & PSC 119",
			URL:   "https://psc.kemkes.go.id/web/tentang-psc-119",
			Note:  "Operator cek ancaman jiwa (kesadaran, napas), lalu label ambulans merah / kuning dari keterangan pelapor.",
		},
		{
			Org:   "ERC / ILCOR",
			Title: "European Resuscitation Council Guidelines 2025 First Aid",
			URL:   "https://doi.org/10.1016/j.resuscitation.2025.110752",
			Note:  "Asesmen awam: safety, respon, catastrophic bleeding, ABCDE.",
		},
	}
}

// MergeSystemIndicatorRules fills empty rule fields on known ABCDE-lite codes.
func MergeSystemIndicatorRules(indicators []AssessmentIndicator) []AssessmentIndicator {
	sys := map[string]AssessmentIndicator{}
	for _, ind := range DefaultABCDELiteTemplate().Indicators {
		sys[ind.Code] = ind
	}
	out := make([]AssessmentIndicator, len(indicators))
	copy(out, indicators)
	for i := range out {
		src, ok := sys[out[i].Code]
		if !ok {
			continue
		}
		if strings.TrimSpace(out[i].CriticalIf) == "" {
			out[i].CriticalIf = src.CriticalIf
		}
		if strings.TrimSpace(out[i].WarnIf) == "" {
			out[i].WarnIf = src.WarnIf
		}
		if strings.TrimSpace(out[i].AbcdeGroup) == "" {
			out[i].AbcdeGroup = src.AbcdeGroup
		}
		if strings.TrimSpace(out[i].Hint) == "" {
			out[i].Hint = src.Hint
		}
	}
	return out
}

// DefaultTransportIntakeTemplate — citizen intake for non-emergency patient transport.
func DefaultTransportIntakeTemplate() AssessmentTemplate {
	return AssessmentTemplate{
		Code:        "transport_intake",
		Name:        "Kesiapan transport",
		Version:     1,
		Category:    AssessmentCategoryTransport,
		Description: "Informasi agar unit menyiapkan alat dan kendaraan yang tepat. Bukan triase gawat darurat — untuk rujukan dan transport pasien.",
		IsActive:    true,
		Indicators: []AssessmentIndicator{
			{Code: "ambulatory", Label: "Apakah korban bisa berjalan sendiri?", Hint: "Tidak → siapkan stretcher atau kursi roda.", WarnIf: "no", Required: true, SortOrder: 1, IsActive: true},
			{Code: "conscious", Label: "Apakah korban sadar dan bisa berkomunikasi?", Hint: "Untuk posisi dan pendampingan selama perjalanan.", Required: true, SortOrder: 2, IsActive: true},
			{Code: "needs_oxygen", Label: "Apakah membutuhkan oksigen selama perjalanan?", Hint: "Unit menyiapkan O₂ portabel bila perlu.", WarnIf: "yes", Required: true, SortOrder: 3, IsActive: true},
			{Code: "infectious_risk", Label: "Apakah ada riwayat atau dugaan penyakit menular?", Hint: "Unit menyiapkan APD sesuai protokol.", WarnIf: "yes", Required: true, SortOrder: 4, IsActive: true},
			{Code: "family_escort", Label: "Apakah ada keluarga yang ikut mendampingi?", Required: true, SortOrder: 5, IsActive: true},
			{Code: "referral_ready", Label: "Apakah surat rujukan / rencana tujuan sudah jelas?", Hint: "RS tujuan, rawat inap, atau kontrol.", Required: true, SortOrder: 6, IsActive: true},
		},
		References: DefaultTransportIntakeReferences(),
	}
}

func DefaultTransportIntakeReferences() []AssessmentReference {
	return []AssessmentReference{
		{
			Org:   "Kemenkes",
			Title: "Pedoman Teknis Ambulans (2019) — Ambulans Transport",
			URL:   "https://keslan.kemkes.go.id/",
			Note:  "Ambulans transport untuk pemindahan pasien non-gawat darurat antar fasilitas.",
		},
		{
			Org:   "Kemenkes",
			Title: "Permenkes No. 19 Tahun 2016 tentang SPGDT",
			URL:   "https://keslan.kemkes.go.id/unduhan/fileunduhan_1661489796_780416.pdf",
			Note:  "Rujukan antar fasilitas dan koordinasi transport pasien.",
		},
	}
}

// DefaultJenazahIntakeTemplate — citizen intake for deceased transport.
func DefaultJenazahIntakeTemplate() AssessmentTemplate {
	return AssessmentTemplate{
		Code:        "jenazah_intake",
		Name:        "Informasi jenazah",
		Version:     1,
		Category:    AssessmentCategoryJenazah,
		Description: "Data logistik pemindahan jenazah. Bukan asesmen klinis — fokus lokasi, dokumen, dan keluarga.",
		IsActive:    true,
		Indicators: []AssessmentIndicator{
			{Code: "at_facility", Label: "Apakah jenazah sudah berada di kamar mayat / fasilitas kesehatan?", Required: true, SortOrder: 1, IsActive: true},
			{Code: "death_recent", Label: "Apakah perkiraan waktu meninggal kurang dari 6 jam?", Hint: "Relevan untuk prosedur pemulasaraan.", Required: true, SortOrder: 2, IsActive: true},
			{Code: "identity_known", Label: "Apakah identitas jenazah sudah diketahui?", Required: true, SortOrder: 3, IsActive: true},
			{Code: "infectious_risk", Label: "Apakah ada riwayat penyakit menular yang diketahui?", WarnIf: "yes", Required: true, SortOrder: 4, IsActive: true},
			{Code: "family_on_site", Label: "Apakah ada keluarga di lokasi?", Required: true, SortOrder: 5, IsActive: true},
			{Code: "death_certificate", Label: "Apakah surat keterangan kematian sudah ada?", Required: true, SortOrder: 6, IsActive: true},
		},
		References: DefaultJenazahIntakeReferences(),
	}
}

func DefaultJenazahIntakeReferences() []AssessmentReference {
	return []AssessmentReference{
		{
			Org:   "Kemenkes",
			Title: "Pedoman Teknis Ambulans (2019) — Mobil Jenazah",
			URL:   "https://keslan.kemkes.go.id/",
			Note:  "Unit jenazah untuk pemindahan mayat sesuai standar fasilitas.",
		},
		{
			Org:   "Kemenkes",
			Title: "Permenkes tentang Pemulasaraan Jenazah",
			Note:  "Prosedur dan persyaratan dokumen pemindahan jenazah.",
		},
	}
}

// TemplateCodeForJenisPelayanan maps citizen service mode to default system template.
func TemplateCodeForJenisPelayanan(jenis string) string {
	switch strings.ToLower(strings.TrimSpace(jenis)) {
	case "transport":
		return "transport_intake"
	case "jenazah":
		return "jenazah_intake"
	case "emergency", "":
		return "abcde_lite"
	default:
		return ""
	}
}
