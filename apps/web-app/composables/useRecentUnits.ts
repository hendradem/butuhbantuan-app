import {
  clearRecentUnits,
  listRecentUnits,
  rememberRecentUnit,
  type RecentUnit,
} from "~/utils/recentUnits";

/** Reactive recent-units helper keyed by current regency. */
export function useRecentUnits() {
  const userLocation = useUserLocationStore();
  const tick = ref(0);

  const regencyId = computed(
    () => String(userLocation.currentRegion.regency.id || "").trim(),
  );

  const items = computed(() => {
    tick.value;
    return listRecentUnits(regencyId.value);
  });

  function refresh() {
    tick.value += 1;
  }

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
    refresh();
  }

  function clear() {
    clearRecentUnits(regencyId.value || undefined);
    refresh();
  }

  /** Resolve saved ids against live nearby list. */
  function resolveLive(nearby: any[]): any[] {
    const byId = new Map(
      nearby.map((item) => [
        String(item?.emergencyData?.id ?? ""),
        item,
      ]),
    );
    return items.value
      .map((r) => byId.get(r.id))
      .filter(Boolean);
  }

  return { items, regencyId, rememberFromEmergency, clear, refresh, resolveLive };
}
