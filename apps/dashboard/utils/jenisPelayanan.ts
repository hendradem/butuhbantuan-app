import { jenisPelayananLabel } from "@butuhbantuan/utils";

export {
  jenisPelayananLabel,
  jenisPelayananMeta,
  jenisPelayananOptionsForUnit,
  isEmergencyJenis,
  matchesJenisPelayananFilter,
  JENIS_PELAYANAN_FILTER_OPTIONS,
  showJenisPelayananPicker,
} from "@butuhbantuan/utils";

export const JENIS_CHART_COLORS: Record<string, string> = {
  emergency: "#dc2626",
  transport: "#0284c7",
  jenazah: "#7c3aed",
  pemadam: "#ea580c",
  "pencarian dan pertolongan": "#0891b2",
  unknown: "#9ca3af",
};

export function jenisChartColors(code: string): string {
  const key = String(code || "unknown").toLowerCase().trim() || "unknown";
  return JENIS_CHART_COLORS[key] || JENIS_CHART_COLORS.unknown;
}

export function buildJenisChartData(rows: Array<{ code?: string; count?: number }> | null | undefined) {
  const list = rows ?? [];
  return {
    labels: list.map((r) => jenisPelayananLabel(String(r.code || "unknown"))),
    datasets: [{
      data: list.map((r) => Number(r.count) || 0),
      backgroundColor: list.map((r) => jenisChartColors(String(r.code || "unknown"))),
      borderWidth: 2,
      borderColor: "#fff",
    }],
  };
}
