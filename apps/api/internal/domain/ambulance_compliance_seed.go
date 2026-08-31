package domain

// DefaultTransportDaratTemplate — Lampiran Tabel 1 (Ambulans Transport Darat).
func DefaultTransportDaratTemplate() AmbulanceComplianceTemplate {
	return AmbulanceComplianceTemplate{
		Code:        CategoryTransportDarat,
		Name:        "Ambulans Transport Darat",
		Version:     1,
		TableRef:    "tabel_1",
		Description: "Kelengkapan alat kesehatan ambulans transport darat (Kemenkes 2019).",
		Items: []AmbulanceComplianceItem{
			{Code: "tensimeter", Label: "Tensimeter (aneroid/digital)", Group: "umum", Required: true, Sort: 1},
			{Code: "stetoskop", Label: "Stetoskop dewasa & anak", Group: "umum", Required: true, Sort: 2},
			{Code: "reflex_hammer", Label: "Reflex hammer", Group: "umum", Required: true, Sort: 3},
			{Code: "senter", Label: "Senter (pencahayaan halogen)", Group: "umum", Required: true, Sort: 4},
			{Code: "termometer", Label: "Termometer digital", Group: "umum", Required: true, Sort: 5},
			{Code: "glukometer", Label: "Alat cek gula darah (POCT)", Group: "umum", Required: false, Sort: 6},

			{Code: "cervical_collar", Label: "Rigid cervical collar (bayi–dewasa)", Group: "airway", Required: true, Sort: 10},
			{Code: "opa_npa", Label: "OPA & NPA (bayi–dewasa)", Group: "airway", Required: true, Sort: 11},
			{Code: "forsep_magill", Label: "Forsep Magill", Group: "airway", Required: true, Sort: 12},
			{Code: "suction_manual", Label: "Mesin suction manual/portable", Group: "airway", Required: true, Sort: 13},

			{Code: "bvm", Label: "Bag valve mask + reservoir (bayi–dewasa)", Group: "breathing", Required: true, Sort: 20},
			{Code: "mask_nasal", Label: "Nasal cannula & simple mask", Group: "breathing", Required: true, Sort: 21},
			{Code: "oksigen_portable", Label: "Tabung oksigen portable + regulator", Group: "breathing", Required: true, Sort: 22},

			{Code: "pulse_oximeter", Label: "Pulse oximeter portable", Group: "circulation", Required: true, Sort: 30},
			{Code: "aed", Label: "Automated External Defibrillator (AED)", Group: "circulation", Required: true, Sort: 31},
			{Code: "infus_set", Label: "Infus set (min. 2 set)", Group: "circulation", Required: true, Sort: 32},
			{Code: "kateter_iv", Label: "Kateter intravena (14G–24G)", Group: "circulation", Required: true, Sort: 33},
			{Code: "cairan_infus", Label: "Cairan infus kristaloid", Group: "circulation", Required: true, Sort: 34},
			{Code: "bandage_set", Label: "Set alat bandaging", Group: "circulation", Required: true, Sort: 35},

			{Code: "brankar", Label: "Stretcher / brankar roll-in cot", Group: "immobilization", Required: true, Sort: 40},
			{Code: "spine_board", Label: "Long spine board", Group: "immobilization", Required: true, Sort: 41},

			{Code: "tas_emergency", Label: "Tas emergency (alat terkumpul)", Group: "supporting", Required: true, Sort: 50},
			{Code: "apar", Label: "Alat pemadam kebakaran (APAR)", Group: "supporting", Required: true, Sort: 51},
			{Code: "gps", Label: "GPS / pelacakan posisi", Group: "supporting", Required: false, Sort: 52},
		},
	}
}

// DefaultAGDDaratRoda4Template — Lampiran Tabel 2 (Ambulans Gawat Darurat Darat Roda 4+).
func DefaultAGDDaratRoda4Template() AmbulanceComplianceTemplate {
	return AmbulanceComplianceTemplate{
		Code:        CategoryAGDDaratRoda4,
		Name:        "Ambulans Gawat Darurat Darat (Roda 4+)",
		Version:     1,
		TableRef:    "tabel_2",
		Description: "Kelengkapan alat kesehatan ambulans gawat darurat darat roda empat atau lebih (Kemenkes 2019).",
		Items: []AmbulanceComplianceItem{
			{Code: "tensimeter", Label: "Tensimeter (aneroid/digital)", Group: "umum", Required: true, Sort: 1},
			{Code: "stetoskop", Label: "Stetoskop dewasa & anak", Group: "umum", Required: true, Sort: 2},
			{Code: "reflex_hammer", Label: "Reflex hammer", Group: "umum", Required: true, Sort: 3},
			{Code: "senter", Label: "Senter (pencahayaan halogen)", Group: "umum", Required: true, Sort: 4},
			{Code: "termometer", Label: "Termometer digital", Group: "umum", Required: true, Sort: 5},
			{Code: "glukometer", Label: "Alat cek gula darah (POCT)", Group: "umum", Required: true, Sort: 6},

			{Code: "cervical_collar", Label: "Rigid cervical collar (bayi–dewasa)", Group: "airway", Required: true, Sort: 10},
			{Code: "opa_npa", Label: "OPA & NPA (bayi–dewasa)", Group: "airway", Required: true, Sort: 11},
			{Code: "sad", Label: "Supraglottic airway device (SAD)", Group: "airway", Required: true, Sort: 12},
			{Code: "forsep_magill", Label: "Forsep Magill", Group: "airway", Required: true, Sort: 13},
			{Code: "suction_electric", Label: "Mesin suction listrik", Group: "airway", Required: true, Sort: 14},

			{Code: "bvm", Label: "Bag valve mask + reservoir (bayi–dewasa)", Group: "breathing", Required: true, Sort: 20},
			{Code: "mask_nasal", Label: "Nasal cannula, simple & non-rebreathing mask", Group: "breathing", Required: true, Sort: 21},
			{Code: "oksigen_portable", Label: "Tabung oksigen portable + regulator", Group: "breathing", Required: true, Sort: 22},
			{Code: "oksigen_sentral", Label: "Sistem oksigen sentral (min. 2 tabung)", Group: "breathing", Required: true, Sort: 23},

			{Code: "patient_monitor", Label: "Monitor pasien (TD, nadi, SpO₂, EKG)", Group: "circulation", Required: true, Sort: 30},
			{Code: "defibrillator", Label: "Defibrillator manual", Group: "circulation", Required: true, Sort: 31},
			{Code: "aed", Label: "Automated External Defibrillator (AED)", Group: "circulation", Required: true, Sort: 32},
			{Code: "infus_set", Label: "Infus set (min. 2 set)", Group: "circulation", Required: true, Sort: 33},
			{Code: "kateter_iv", Label: "Kateter intravena (14G–24G)", Group: "circulation", Required: true, Sort: 34},
			{Code: "intraosseous", Label: "Akses intraoseous (opsional)", Group: "circulation", Required: false, Sort: 35},
			{Code: "cairan_infus", Label: "Cairan infus kristaloid/koloid", Group: "circulation", Required: true, Sort: 36},
			{Code: "bandage_set", Label: "Set alat bandaging + gunting paramedik", Group: "circulation", Required: true, Sort: 37},
			{Code: "syringe", Label: "Disposable syringe (1–20 mL)", Group: "circulation", Required: true, Sort: 38},
			{Code: "antiseptik", Label: "Antiseptik (povidone iodine/alkohol swab)", Group: "circulation", Required: true, Sort: 39},

			{Code: "brankar", Label: "Stretcher / brankar roll-in cot", Group: "immobilization", Required: true, Sort: 40},
			{Code: "spine_board", Label: "Long spine board + strap", Group: "immobilization", Required: true, Sort: 41},
			{Code: "vacuum_mattress", Label: "Vacuum mattress (opsional)", Group: "immobilization", Required: false, Sort: 42},

			{Code: "tas_emergency", Label: "Tas emergency (alat terkumpul)", Group: "supporting", Required: true, Sort: 50},
			{Code: "apar", Label: "Alat pemadam kebakaran (APAR)", Group: "supporting", Required: true, Sort: 51},
			{Code: "gps", Label: "GPS / pelacakan posisi", Group: "supporting", Required: true, Sort: 52},
			{Code: "interkom", Label: "Interkom kabin depan–belakang", Group: "supporting", Required: true, Sort: 53},
		},
	}
}
