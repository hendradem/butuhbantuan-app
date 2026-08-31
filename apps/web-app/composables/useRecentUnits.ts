import {
  clearRecentUnits,
  listRecentUnits,
  recentUnitsTick,
  rememberRecentUnit,
  type RecentUnit,
} from "~/utils/recentUnits";

/** Reactive recent-units helper keyed by current regency. */
export function useRecentUnits() {
  const userLocation = useUserLocationStore();

  const regencyId = computed(
    () => String(userLocation.currentRegion.regency.id || "").trim(),
  );

  const items = computed(() => {
    void recentUnitsTick.value;
    return listRecentUnits(regencyId.value);
  });

  function rememberFromEmergency(
    emergency: any,
    via: RecentUnit["via"],
  ) {
    const ed = emergency?.emergencyData ?? emergency;
    if (!ed?.id) return;
    const rid =
      String(ed?.address?.regency_id || "") ||
      regencyId.value;
    if (!rid) return;

    rememberRecentUnit({
      id: String(ed.id),
      name: ed.name || "Unit",
      organizationName: ed.organization_name,
      typeName: ed.emergency_type?.name,
      typeIcon: ed.emergency_type?.icon,
      logo: ed.organization_logo,
      regencyId: rid,
      regencyName:
        ed.address?.regency || userLocation.currentRegion.regency.name,
      via,
    });
  }

  function clear() {
    clearRecentUnits(regencyId.value || undefined);
  }

  return { items, regencyId, rememberFromEmergency, clear };
}
