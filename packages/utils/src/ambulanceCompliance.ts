export type AmbulanceTypeCode =
  | "transport_darat"
  | "agd_darat_roda4"
  | "agd_darat_roda2";

export type AmbulanceTypeCard = {
  code: AmbulanceTypeCode;
  label: string;
  description: string;
  icon: string;
  tableRef: string;
};

export const AMBULANCE_TYPE_CARDS: AmbulanceTypeCard[] = [
  {
    code: "transport_darat",
    label: "Transport Darat",
    description: "Rujukan & transport pasien non-darurat",
    icon: "lucide:truck",
    tableRef: "Tabel 1",
  },
  {
    code: "agd_darat_roda4",
    label: "Gawat Darurat (Roda 4+)",
    description: "AGD mobil — kelengkapan lengkap",
    icon: "mynaui:ambulance-solid",
    tableRef: "Tabel 2",
  },
  {
    code: "agd_darat_roda2",
    label: "Gawat Darurat (Roda 2)",
    description: "Motor / sepeda — set darurat ringkas",
    icon: "lucide:bike",
    tableRef: "Tabel 6–9",
  },
];

export type ComplianceTabId = "alat" | "interior" | "exterior";

export type ComplianceTab = {
  id: ComplianceTabId;
  label: string;
  icon: string;
  groups: string[];
};

export const COMPLIANCE_TABS: ComplianceTab[] = [
  {
    id: "alat",
    label: "Kelengkapan ambulans",
    icon: "lucide:stethoscope",
    groups: ["umum", "airway", "breathing", "circulation", "immobilization", "supporting"],
  },
  {
    id: "interior",
    label: "Interior",
    icon: "lucide:layout-grid",
    groups: ["interior"],
  },
  {
    id: "exterior",
    label: "Eksterior",
    icon: "lucide:car-front",
    groups: ["exterior"],
  },
];

export const COMPLIANCE_GROUP_LABELS: Record<string, string> = {
  umum: "Pemeriksaan umum",
  airway: "Jalan napas",
  breathing: "Pernapasan",
  circulation: "Sirkulasi",
  immobilization: "Imobilisasi",
  interior: "Interior kendaraan",
  exterior: "Eksterior kendaraan",
  supporting: "Pendukung",
};

export function ambulanceTypeLabel(code?: string): string {
  return AMBULANCE_TYPE_CARDS.find((c) => c.code === code)?.label ?? "Belum terklasifikasi";
}
