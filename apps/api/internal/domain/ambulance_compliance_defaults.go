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

// DefaultInteriorDaratTemplate — Lampiran Tabel 3 (Interior Ambulans Darat).
func DefaultInteriorDaratTemplate() AmbulanceComplianceTemplate {
	return AmbulanceComplianceTemplate{
		Code:        CategoryInteriorDarat,
		Name:        "Interior Ambulans Darat",
		Version:     1,
		TableRef:    "tabel_3",
		Description: "Kelengkapan interior ambulans darat (Kemenkes 2019).",
		Items: []AmbulanceComplianceItem{
			{Code: "ruang_perawatan", Label: "Ruang perawatan cukup untuk brankar & petugas", Group: "interior", Required: true, Sort: 1},
			{Code: "pencahayaan", Label: "Pencahayaan interior adekuat (halogen/LED)", Group: "interior", Required: true, Sort: 2},
			{Code: "ventilasi_ac", Label: "Ventilasi / AC kabin belakang", Group: "interior", Required: true, Sort: 3},
			{Code: "kabinet_obat", Label: "Kabinet obat & alat terkunci", Group: "interior", Required: true, Sort: 4},
			{Code: "tempat_sampah", Label: "Tempat sampah medis (kuning) & non-medis", Group: "interior", Required: true, Sort: 5},
			{Code: "kursi_petugas", Label: "Kursi petugas medis dengan sabuk pengaman", Group: "interior", Required: true, Sort: 6},
			{Code: "lantai_antislip", Label: "Lantai anti-slip & mudah dibersihkan", Group: "interior", Required: true, Sort: 7},
			{Code: "interior_oxygen", Label: "Titik oksigen & suction terpasang di kabin", Group: "interior", Required: true, Sort: 8},
			{Code: "listrik_12v", Label: "Stop kontak 12V untuk peralatan medis", Group: "interior", Required: false, Sort: 9},
		},
	}
}

// DefaultExteriorDaratTemplate — Lampiran Tabel 4–5 (Eksterior Ambulans Darat).
func DefaultExteriorDaratTemplate() AmbulanceComplianceTemplate {
	return AmbulanceComplianceTemplate{
		Code:        CategoryExteriorDarat,
		Name:        "Eksterior Ambulans Darat",
		Version:     1,
		TableRef:    "tabel_4_5",
		Description: "Kelengkapan eksterior ambulans darat (Kemenkes 2019).",
		Items: []AmbulanceComplianceItem{
			{Code: "lampu_rotasi", Label: "Lampu rotasi / beacon darurat", Group: "exterior", Required: true, Sort: 1},
			{Code: "sirene", Label: "Sirene / klakson darurat", Group: "exterior", Required: true, Sort: 2},
			{Code: "marking_reflektor", Label: "Marking & strip reflektor (Star of Life)", Group: "exterior", Required: true, Sort: 3},
			{Code: "pintu_belakang", Label: "Pintu belakang lebar / ramp akses brankar", Group: "exterior", Required: true, Sort: 4},
			{Code: "tangga_step", Label: "Tangga / step masuk dengan pegangan", Group: "exterior", Required: true, Sort: 5},
			{Code: "wiper_air", Label: "Wiper & sistem air kaca depan/belakang", Group: "exterior", Required: true, Sort: 6},
			{Code: "radio_antena", Label: "Antena komunikasi radio / GPS eksternal", Group: "exterior", Required: false, Sort: 7},
			{Code: "ban_cadangan", Label: "Ban cadangan & peralatan darurat jalan", Group: "exterior", Required: false, Sort: 8},
		},
	}
}

// DefaultAGDDaratRoda2Template — Lampiran Tabel 6–9 (AGD Darat Roda 2, disederhanakan).
func DefaultAGDDaratRoda2Template() AmbulanceComplianceTemplate {
	return AmbulanceComplianceTemplate{
		Code:        CategoryAGDDaratRoda2,
		Name:        "Ambulans Gawat Darurat Darat (Roda 2)",
		Version:     1,
		TableRef:    "tabel_6_9",
		Description: "Kelengkapan ambulans gawat darurat roda dua (motor/sepeda) — Kemenkes 2019.",
		Items: []AmbulanceComplianceItem{
			{Code: "tas_emergency", Label: "Tas emergency tahan air", Group: "supporting", Required: true, Sort: 1},
			{Code: "helm_petugas", Label: "Helm & rompi reflektor petugas", Group: "supporting", Required: true, Sort: 2},

			{Code: "opa_npa", Label: "OPA & NPA (bayi–dewasa)", Group: "airway", Required: true, Sort: 10},
			{Code: "bvm", Label: "Bag valve mask portable", Group: "breathing", Required: true, Sort: 20},
			{Code: "oksigen_portable", Label: "Tabung oksigen portable mini", Group: "breathing", Required: true, Sort: 21},

			{Code: "tensimeter", Label: "Tensimeter digital portable", Group: "umum", Required: true, Sort: 30},
			{Code: "pulse_oximeter", Label: "Pulse oximeter", Group: "circulation", Required: true, Sort: 31},
			{Code: "aed", Label: "AED portable", Group: "circulation", Required: true, Sort: 32},
			{Code: "bandage_set", Label: "Set perban & dressing trauma", Group: "circulation", Required: true, Sort: 33},

			{Code: "cervical_collar", Label: "Cervical collar portable", Group: "immobilization", Required: true, Sort: 40},
			{Code: "gps", Label: "GPS / pelacakan posisi", Group: "supporting", Required: false, Sort: 50},
		},
	}
}
