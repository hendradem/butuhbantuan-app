export type JenisPelayananCode =
  | "emergency"
  | "transport"
  | "jenazah"
  | "pemadam"
  | "pencarian dan pertolongan";

export type JenisPelayananOption = {
  code: JenisPelayananCode;
  label: string;
  icon: string;
  description?: string;
};

const LABELS: Record<string, string> = {
  emergency: "Darurat",
  transport: "Transport",
  jenazah: "Jenazah",
  pemadam: "Kebakaran",
  "pencarian dan pertolongan": "Penyelamatan",
};

export function jenisPelayananLabel(code: string): string {
  const key = String(code || "").toLowerCase().trim();
  if (!key || key === "unknown") return "Belum diisi";
  return LABELS[key] || code;
}

export type JenisPelayananMeta = {
  code: string;
  label: string;
  icon: string;
  pill: string;
};

const PILL: Record<string, string> = {
  emergency: "bg-red-50 text-red-700 ring-red-200",
  transport: "bg-sky-50 text-sky-700 ring-sky-200",
  jenazah: "bg-violet-50 text-violet-700 ring-violet-200",
  pemadam: "bg-orange-50 text-orange-700 ring-orange-200",
  "pencarian dan pertolongan": "bg-cyan-50 text-cyan-700 ring-cyan-200",
};

const ICON: Record<string, string> = {
  emergency: "lucide:siren",
  transport: "lucide:truck",
  jenazah: "lucide:flower-2",
  pemadam: "lucide:flame",
  "pencarian dan pertolongan": "lucide:life-buoy",
};

/** Badge / chip styling for order jenis pelayanan. */
export function jenisPelayananMeta(code?: string | null): JenisPelayananMeta | null {
  const key = String(code || "").toLowerCase().trim();
  if (!key || key === "unknown") return null;
  return {
    code: key,
    label: jenisPelayananLabel(key),
    icon: ICON[key] || "lucide:layers",
    pill: PILL[key] || "bg-neutral-100 text-neutral-700 ring-neutral-200",
  };
}

/** Triase badge applies only to emergency (or legacy empty) jenis. */
export function isEmergencyJenis(code?: string | null): boolean {
  const j = String(code || "").toLowerCase().trim();
  return !j || j === "emergency";
}

/** Dashboard list filter options (ambulance-centric). */
export const JENIS_PELAYANAN_FILTER_OPTIONS = [
  { code: "emergency", label: "Darurat" },
  { code: "transport", label: "Transport" },
  { code: "jenazah", label: "Jenazah" },
] as const;

export function matchesJenisPelayananFilter(
  orderJenis: string | undefined | null,
  filter: string,
): boolean {
  const f = String(filter || "").trim();
  if (!f) return true;
  const code = String(orderJenis || "").toLowerCase().trim();
  if (f === "__empty__") return !code;
  return code === f.toLowerCase();
}

export function isHospitalType(name?: string): boolean {
  const n = String(name || "").toLowerCase();
  return n.includes("rumah sakit") || n.includes("hospital") || n === "rs";
}

export function isSarType(name?: string): boolean {
  const n = String(name || "").toLowerCase();
  return n.includes("sar") || n.includes("basarnas") || n.includes("pencarian");
}

export function isAmbulanceServiceType(name?: string): boolean {
  const n = String(name || "").toLowerCase();
  return n.includes("ambulance") || n.includes("ambulans");
}

export function isDamkarType(name?: string): boolean {
  const n = String(name || "").toLowerCase();
  return n.includes("damkar") || n.includes("pemadam");
}

/** Whether the jenis pelayanan picker should be shown for this service domain. */
export function showJenisPelayananPicker(emergencyTypeName?: string): boolean {
  if (!emergencyTypeName) return true;
  if (isHospitalType(emergencyTypeName)) return false;
  if (isSarType(emergencyTypeName)) return false;
  return true;
}

export function jenisPelayananOptions(emergencyTypeName?: string): JenisPelayananOption[] {
  if (isAmbulanceServiceType(emergencyTypeName)) {
    return [
      {
        code: "emergency",
        label: "Darurat",
        icon: "lucide:siren",
        description: "Gawat darurat & respon cepat",
      },
      {
        code: "transport",
        label: "Transport",
        icon: "lucide:truck",
        description: "Rujukan & transport pasien",
      },
      {
        code: "jenazah",
        label: "Jenazah",
        icon: "lucide:flower-2",
        description: "Mobil jenazah",
      },
    ];
  }
  if (isDamkarType(emergencyTypeName)) {
    return [
      {
        code: "emergency",
        label: "Kebakaran",
        icon: "lucide:flame",
        description: "Pemadaman & rescue struktur",
      },
      {
        code: "pencarian dan pertolongan",
        label: "Penyelamatan",
        icon: "lucide:life-buoy",
        description: "Evakuasi & pertolongan",
      },
    ];
  }
  return [
    {
      code: "emergency",
      label: "Darurat",
      icon: "lucide:siren",
      description: "Respon darurat",
    },
    {
      code: "transport",
      label: "Transport",
      icon: "lucide:truck",
      description: "Transport & rujukan",
    },
  ];
}

/** Citizen order: options intersected with unit's configured tipe_emergency. */
export function jenisPelayananOptionsForUnit(
  unitModes: string[] | undefined,
  emergencyTypeName?: string,
): JenisPelayananOption[] {
  const all = jenisPelayananOptions(emergencyTypeName);
  if (!unitModes?.length) return all;
  const allowed = new Set(unitModes.map((m) => String(m || "").toLowerCase().trim()));
  const filtered = all.filter((o) => allowed.has(o.code));
  return filtered.length ? filtered : all;
}

export function sanitizeJenisPelayanan(
  selected: string[],
  emergencyTypeName?: string,
): string[] {
  const allowed = new Set(
    jenisPelayananOptions(emergencyTypeName).map((o) => o.code),
  );
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of selected) {
    const code = String(raw || "").toLowerCase().trim();
    if (!code || !allowed.has(code as JenisPelayananCode) || seen.has(code)) continue;
    seen.add(code);
    out.push(code);
  }
  return out;
}
