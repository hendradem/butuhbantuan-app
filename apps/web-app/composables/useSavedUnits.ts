import {
  isUnitSaved,
  listSavedUnits,
  savedUnitsTick,
  toggleSavedUnit,
  type SavedUnit,
} from "~/utils/savedUnits";

export function useSavedUnits() {
  const items = computed(() => {
    void savedUnitsTick.value;
    return listSavedUnits();
  });

  function saved(id?: string | number | null) {
    void savedUnitsTick.value;
    return isUnitSaved(String(id || ""));
  }

  function toggleFromEmergency(emergency: any): boolean {
    const ed = emergency?.emergencyData ?? emergency;
    if (!ed?.id) return false;
    const result = toggleSavedUnit({
      id: String(ed.id),
      name: ed.name || "Unit",
      organizationName: ed.organization_name,
      typeName: ed.emergency_type?.name,
      typeIcon: ed.emergency_type?.icon,
      logo: ed.organization_logo,
      regencyId: String(ed?.address?.regency_id || ""),
      regencyName: ed?.address?.regency,
    });
    return result.saved;
  }

  return { items, saved, toggleFromEmergency };
}

export type { SavedUnit };
