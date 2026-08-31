import { appToast } from "~/utils/appToast";
import {
  buildMapQuery,
  roundCoord,
  type MapUrlKey,
  type MapUrlState,
} from "~/utils/mapUrl";

type ShareMapLinkOpts = {
  title: string;
  patch?: Partial<MapUrlState>;
  remove?: MapUrlKey[];
};

/** Build and share/copy a home-map deep link (lat/lng/z + context). */
export function useShareMapLink() {
  const route = useRoute();

  function buildShareUrl(patch: Partial<MapUrlState> = {}, remove: MapUrlKey[] = []) {
    if (!import.meta.client) return "";

    const userLocation = useUserLocationStore();
    const leaflet = useLeafletStore();
    const view: Partial<MapUrlState> = { ...patch };

    if (userLocation.lat && userLocation.long) {
      view.lat = roundCoord(userLocation.lat);
      view.lng = roundCoord(userLocation.long);
    }
    const z = Math.round(leaflet.zoom || 0);
    if (z >= 1 && z <= 20) view.z = z;

    const query = buildMapQuery(route.query as Record<string, unknown>, view, remove);
    const qs = new URLSearchParams(query).toString();
    return qs ? `${window.location.origin}/?${qs}` : `${window.location.origin}/`;
  }

  async function share(opts: ShareMapLinkOpts) {
    const url = buildShareUrl(opts.patch, opts.remove);
    if (!url) return;

    const toast = appToast();
    if (navigator.share) {
      try {
        // URL only — `text` gets glued to the link on many share targets (WA, etc.).
        await navigator.share({ title: opts.title, url });
        return;
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link disalin");
    } catch {
      toast.error("Gagal menyalin link");
    }
  }

  return { buildShareUrl, share };
}
