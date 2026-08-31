export const INCIDENT_REPORT_PRESET_GENERIC = "generic";
export const INCIDENT_REPORT_PRESET_PMI = "pmi";

export type IncidentReportTemplate = {
  preset_id: string;
  header: string;
  volunteer_title: string;
  closing: string;
  footer: string;
};

export type IncidentReportVictim = {
  id: string;
  name: string;
  age: string;
  gender: string;
  address: string;
  conditions: string;
  treatments: string;
};

export type IncidentReportVolunteer = {
  id: string;
  name: string;
  role: string;
};

export type IncidentReportFormData = {
  dateStr: string;
  timeIncident: string;
  timeArrivedScene: string;
  timeArrivedHospital: string;
  incidentType: string;
  location: string;
  maleCount: string;
  femaleCount: string;
  victims: IncidentReportVictim[];
  sources: string;
  parties: string;
  volunteers: IncidentReportVolunteer[];
  vehicle: string;
  referralHospitalId: string;
  referralHospitalName: string;
};

const DEFAULT_CLOSING =
  "Demikian laporan yang dapat kami sampaikan, bila ada kejadian yang bersifat Emergency akan kami sampaikan kembali.";

const PMI_SLEMAN_FOOTER = `*POSKO PMI KABUPATEN SLEMAN*
🏥 Jl. Radjimin, Sucen, Triharjo, Sleman
☎ *Call Center :*
Pelayanan (0274) 868900
UDD (0274) 868900/
📱 *Phone :* Posko 085161131368 (WA)
📧 *Email :* pmislm@pmi.or.id
🕊 *Twitter :* @pmi_sleman
📷 *Instagram :* @pmikabsleman
🌐 https://linktr.ee/pmikabsleman
📻 *Frekuensi :* UHF 434.375 Dup -4000 Tune 88.5`;

export function isPmiSlemanUnit(unitName?: string, orgName?: string, regency?: string): boolean {
  const combined = `${unitName || ""} ${orgName || ""} ${regency || ""}`.toLowerCase();
  return combined.includes("pmi") && combined.includes("sleman");
}

export function genericIncidentReportTemplate(unitName?: string): IncidentReportTemplate {
  const name = (unitName || "NAMA UNIT").trim().toUpperCase();
  return {
    preset_id: INCIDENT_REPORT_PRESET_GENERIC,
    header: `*${name}*\n*INFORMASI KEJADIAN EMERGENCY / NON EMERGENCY* 🚑`,
    volunteer_title: `RELAWAN / PETUGAS ${name}`,
    closing: DEFAULT_CLOSING,
    footer: "",
  };
}

export function pmiSlemanIncidentReportTemplate(): IncidentReportTemplate {
  return {
    preset_id: INCIDENT_REPORT_PRESET_PMI,
    header:
      "*PALANG MERAH INDONESIA*\n*KABUPATEN SLEMAN*\n*INFORMASI KEJADIAN EMERGENCY / NON EMERGENCY* 🚑",
    volunteer_title: "RELAWAN/PETUGAS PMI SLEMAN",
    closing: DEFAULT_CLOSING,
    footer: PMI_SLEMAN_FOOTER,
  };
}

export function defaultIncidentReportTemplate(opts?: {
  unitName?: string;
  orgName?: string;
  regency?: string;
}): IncidentReportTemplate {
  if (isPmiSlemanUnit(opts?.unitName, opts?.orgName, opts?.regency)) {
    return pmiSlemanIncidentReportTemplate();
  }
  return genericIncidentReportTemplate(opts?.unitName);
}

const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const NUM_EMOJI = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

function parseReportDate(date: string, time: string): Date | null {
  const d = new Date(`${date || ""}T${time || "00:00"}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtTimeWib(time?: string): string {
  const t = String(time || "").trim();
  if (!t) return "";
  return `${t.replace(":", ".")} WIB`;
}

function linesFromMultiline(raw: string): string[] {
  return raw.split("\n").map((s) => s.trim()).filter(Boolean);
}

export function buildIncidentReportMessage(
  data: IncidentReportFormData,
  template: IncidentReportTemplate,
): string {
  const d = parseReportDate(data.dateStr, data.timeIncident);
  const dateFmt = d
    ? `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
    : (data.dateStr || "-");
  const dayName = d ? DAYS[d.getDay()] : "-";

  const L: string[] = [];

  if (template.header.trim()) {
    L.push(template.header.trim());
    L.push("");
  }

  L.push("🔍 *HARI/TANGGAL:*");
  L.push(`• ${dayName}, ${dateFmt}`);
  L.push("");

  L.push("⏰ *PUKUL:*");
  const tIncident = fmtTimeWib(data.timeIncident);
  const tScene = fmtTimeWib(data.timeArrivedScene);
  const tHospital = fmtTimeWib(data.timeArrivedHospital);
  if (tIncident) L.push(`- waktu kejadian : ${tIncident}`);
  if (tScene) L.push(`- waktu tiba lokasi : ${tScene}`);
  if (tHospital) L.push(`- waktu tiba di RS : ${tHospital}`);
  if (!tIncident && !tScene && !tHospital) L.push("-");
  L.push("");

  L.push("📝 *JENIS KEJADIAN:*");
  L.push(`* ${data.incidentType.trim() || "..."}`);
  L.push("");

  L.push("📍 *LOKASI:*");
  L.push(`* ${data.location.trim() || "..."}`);
  L.push("");

  L.push("*JUMLAH KORBAN/PASIEN*");
  L.push(`L.  : ${data.maleCount || "-"}${data.maleCount ? " orang" : ""}`);
  L.push(`P.  : ${data.femaleCount || "-"}`);
  L.push("");

  data.victims.forEach((v, i) => {
    if (data.victims.length > 1) {
      L.push(`*👤IDENTITAS KORBAN/PASIEN ${NUM_EMOJI[i] ?? i + 1}:*`);
    } else {
      L.push("*👤IDENTITAS KORBAN/PASIEN :*");
    }
    L.push(`* Nama : ${v.name || "-"}`);
    L.push(`* Umur : ${v.age ? `${v.age} th` : "-"}`);
    if (v.address) L.push(`* Alamat : ${v.address}`);
    L.push("");

    const conds = linesFromMultiline(v.conditions);
    if (conds.length) {
      L.push("*🩹 KONDISI KORBAN/PASIEN*");
      conds.forEach((c) => L.push(`- ${c}`));
      L.push("");
    }

    const treats = linesFromMultiline(v.treatments);
    if (treats.length) {
      L.push("*🩺 PENANGANAN KORBAN/PASIEN*");
      treats.forEach((t) => L.push(`* ${t}`));
      L.push("");
    }
  });

  if (data.referralHospitalName.trim()) {
    L.push("*🏥 RS RUJUKAN*");
    L.push(`* ${data.referralHospitalName.trim()}`);
    L.push("");
  }

  const srcs = linesFromMultiline(data.sources);
  if (srcs.length) {
    L.push("*📱SUMBER INFORMASI*");
    srcs.forEach((s) => L.push(`• ${s}`));
    L.push("");
  }

  const pts = linesFromMultiline(data.parties);
  if (pts.length) {
    L.push("*🤝 PIHAK YANG TERLIBAT*");
    pts.forEach((p, j) => L.push(`${j + 1}. ${p}`));
    L.push("");
  }

  const vols = data.volunteers.filter((v) => v.name.trim());
  if (vols.length && template.volunteer_title.trim()) {
    L.push(`*⛑️ ${template.volunteer_title.trim()}*`);
    vols.forEach((v, i) => {
      const role = v.role.trim() ? ` (${v.role.trim()})` : "";
      L.push(`${i + 1}. ${v.name}${role}`);
    });
    L.push("");
  }

  if (data.vehicle.trim()) {
    L.push("*🚑 ARMADA KENDARAAN:*");
    linesFromMultiline(data.vehicle).forEach((line) => L.push(`* ${line}`));
    L.push("");
  }

  if (template.closing.trim()) {
    L.push(template.closing.trim());
    L.push("");
  }
  if (template.footer.trim()) L.push(template.footer.trim());

  return L.join("\n").trim();
}

export function whatsAppShareUrl(text: string, phone?: string): string {
  const encoded = encodeURIComponent(text);
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits) return `https://wa.me/${digits}?text=${encoded}`;
  return `https://wa.me/?text=${encoded}`;
}
