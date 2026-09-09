/** Fallback logos when unit has no organization_logo. */

const TYPE_LOGO: Record<string, string> = {
  Ambulance: "/assets/icons/ambulance-logo.svg",
  Damkar: "/assets/icons/fire-fighter-logo.svg",
  SAR: "/assets/icons/sar-logo.svg",
  "Rumah Sakit": "/assets/icons/hospital-logo.svg",
};

const DEFAULT_LOGO = "/assets/icons/ambulance-logo.svg";

export function emergencyLogoSrc(emergency: any): string {
  const logo = String(emergency?.organization_logo || "").trim();
  if (logo) return logo;
  const typeName = String(emergency?.emergency_type?.name || "").trim();
  if (TYPE_LOGO[typeName]) return TYPE_LOGO[typeName];
  if (emergency?.organization_type === "rumah_sakit") return TYPE_LOGO["Rumah Sakit"];
  return DEFAULT_LOGO;
}

export function onEmergencyLogoError(event: Event, emergency?: any) {
  const img = event.target as HTMLImageElement | null;
  if (!img) return;
  const fallback = emergencyLogoSrc({
    ...emergency,
    organization_logo: "",
  });
  if (img.src.endsWith(fallback) || img.dataset.fallbackApplied === "1") {
    img.src = DEFAULT_LOGO;
    return;
  }
  img.dataset.fallbackApplied = "1";
  img.src = fallback;
}
