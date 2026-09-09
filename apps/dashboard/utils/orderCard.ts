import { isEmergencyJenis, jenisPelayananLabel } from "~/utils/jenisPelayanan";
import { formatTriageSummary } from "~/utils/triage";

const JENIS_HINT: Record<string, string> = {
  emergency: "Gawat darurat & respon cepat",
  transport: "Transport & rujukan pasien",
  jenazah: "Mobil jenazah",
  pemadam: "Pemadaman kebakaran",
  "pencarian dan pertolongan": "Evakuasi & penyelamatan",
};

export function effectiveJenisCode(code?: string | null): string {
  const j = String(code || "").toLowerCase().trim();
  return j || "emergency";
}

type OrderCardLike = {
  jenis_pelayanan?: string | null;
  assessment_acuity?: string | null;
  assessment?: {
    answers?: Array<{ code?: string; label?: string; value?: string }>;
    notes?: string;
  } | null;
  condition?: string | null;
};

/** One-line service detail for order list cards — never raw assessment questions. */
export function orderServiceDetailLine(order: OrderCardLike): string {
  const jenis = effectiveJenisCode(order.jenis_pelayanan);

  if (isEmergencyJenis(jenis)) {
    const triage = formatTriageSummary(order.assessment, order.condition);
    if (triage) return triage;
    return JENIS_HINT.emergency;
  }

  const notes = String(order.assessment?.notes || "").trim();
  if (notes) return notes;

  return JENIS_HINT[jenis] || `Layanan ${jenisPelayananLabel(jenis).toLowerCase()}`;
}
