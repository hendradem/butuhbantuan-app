import type { UnitChip } from "~/utils/savedUnits";
import { recordServiceDemand } from "~/utils/serviceDemand";

type OpenDetailOpts = {
  /** When hydrating from URL — do not write back to the address bar. */
  skipUrl?: boolean;
  /** Opened from explore list (back returns to list). */
  fromExplore?: boolean;
};

type OpenServiceOpts = {
  skipUrl?: boolean;
};

/** Open a nearby emergency unit (detail + route) or fall back to its service list. */
export function useOpenUnit() {
  const emergencyStore = useEmergencyStore();
  const emergencyDataStore = useEmergencyDataStore();
  const detailSheet = useDetailSheetStore();
  const exploreSheet = useExploreSheetStore();
  const moreSheet = useMoreSheetStore();
  const mapUrl = useMapUrl();
  const { setRouteTo, clearRoute } = useMapRouting();
  const { fetchEmergencyTypes } = useEmergencyApi();

  const { data: emergencyTypeData, pending: loading } = useAsyncData(
    "emergency-types",
    fetchEmergencyTypes,
  );

  function openEmergencyDetail(item: any, opts?: OpenDetailOpts) {
    const data = item?.emergencyData;
    if (!data) return;

    emergencyDataStore.updateSelectedEmergencyData({
      selectedEmergencyData: data,
      selectedEmergencySource: opts?.fromExplore ? "detail" : "map",
    });

    detailSheet.setDetailSheetData({
      emergencyType: data.emergency_type,
      emergency: item,
    });

    if (opts?.fromExplore) {
      exploreSheet.onClose();
      detailSheet.onOpenFromExplore();
    } else if (exploreSheet.isOpen) {
      exploreSheet.onClose();
      detailSheet.onOpenFromExplore();
    } else {
      detailSheet.onOpen();
    }

    const coords = data.coordinates;
    if (coords) {
      setRouteTo(parseFloat(coords[1]), parseFloat(coords[0]), { skipUrl: opts?.skipUrl });
    }

    if (!opts?.skipUrl) {
      mapUrl.setUnit(String(data.id || ""), { keepService: !!opts?.fromExplore });
    }
  }

  function openService(service: any, opts?: OpenServiceOpts) {
    if (!service) return;
    if (service.name) recordServiceDemand(String(service.name));
    moreSheet.onClose();
    detailSheet.onClose();
    clearRoute({ skipUrl: opts?.skipUrl });
    const filtered = emergencyStore.filteredEmergency.filter(
      (item: any) => item.emergencyData?.emergency_type?.name === service.name,
    );
    exploreSheet.setSheetData({ emergencyType: service, emergency: filtered });
    exploreSheet.onOpen();
    if (!opts?.skipUrl) mapUrl.setService(String(service.id ?? ""));
  }

  function openUnit(unit: UnitChip) {
    const live = emergencyStore.filteredEmergency.find(
      (item: any) => String(item.emergencyData?.id) === unit.id,
    );
    if (live) {
      openEmergencyDetail(live);
      return;
    }

    const typeName = unit.typeName;
    if (!typeName || !emergencyTypeData.value?.data) return;
    const service = emergencyTypeData.value.data.find(
      (t: any) => t.name === typeName,
    );
    if (service) openService(service);
  }

  return {
    openUnit,
    openService,
    openEmergencyDetail,
    emergencyTypeData,
    loading,
  };
}
