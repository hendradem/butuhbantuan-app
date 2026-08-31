import { toast } from "~/utils/appToast";

export type OrderDispatchMode = "admin" | "unit";
export type ReassignMode = "auto" | "manual";
export type RejectReasonCode = "busy" | "out_of_area" | "wrong_type" | "other";

/**
 * Shared accept / reject / reassign helpers for admin + unit dashboards.
 * Unit mode also supports escalate-psc for assigned unit / wilayah dispatcher
 * (server enforces authorizeActor + ops scope).
 */
export function useOrderDispatch(mode: OrderDispatchMode) {
  const config = useRuntimeConfig();
  const baseUrl = config.public.apiBaseUrl as string;
  const acting = ref<string | null>(null);

  function headers(): Record<string, string> {
    if (mode === "admin") {
      const { token } = useAuth();
      return token.value ? { "X-Admin-Key": token.value } : {};
    }
    const { unitHeaders } = useUnitAuth();
    return unitHeaders();
  }

  function prefix() {
    return mode === "admin" ? "/api/v1/admin/orders" : "/api/v1/unit/orders";
  }

  async function accept(orderId: string) {
    acting.value = orderId;
    try {
      await $fetch(`${baseUrl}${prefix()}/${orderId}/accept`, {
        method: "POST",
        headers: headers(),
      });
      toast.success("Terima pesanan");
      return true;
    } catch (e: any) {
      toast.error(e?.data?.message || "Gagal menerima pesanan");
      return false;
    } finally {
      acting.value = null;
    }
  }

  async function reject(
    orderId: string,
    opts?: { reason?: RejectReasonCode | string; note?: string }
  ) {
    acting.value = orderId;
    try {
      await $fetch(`${baseUrl}${prefix()}/${orderId}/reject`, {
        method: "POST",
        headers: headers(),
        body: {
          reason: opts?.reason || "other",
          note: opts?.note || "",
        },
      });
      toast.success("Pesanan ditolak — dialihkan ke unit lain");
      return true;
    } catch (e: any) {
      toast.error(e?.data?.message || "Gagal menolak pesanan");
      return false;
    } finally {
      acting.value = null;
    }
  }

  async function escalatePsc(orderId: string) {
    acting.value = orderId;
    try {
      await $fetch(`${baseUrl}${prefix()}/${orderId}/escalate-psc`, {
        method: "POST",
        headers: headers(),
      });
      toast.success("Dieskalasi ke PSC / pusat darurat");
      return true;
    } catch (e: any) {
      toast.error(e?.data?.message || "Gagal eskalasi PSC");
      return false;
    } finally {
      acting.value = null;
    }
  }

  async function cancel(orderId: string, note = "") {
    if (mode !== "admin") {
      toast.error("Hanya admin yang dapat membatalkan tiket");
      return false;
    }
    acting.value = orderId;
    try {
      await $fetch(`${baseUrl}/api/v1/admin/orders/${orderId}/cancel`, {
        method: "POST",
        headers: headers(),
        body: { note },
      });
      toast.success("Pesanan dibatalkan");
      return true;
    } catch (e: any) {
      toast.error(e?.data?.message || "Gagal membatalkan pesanan");
      return false;
    } finally {
      acting.value = null;
    }
  }

  async function reassign(
    orderId: string,
    opts: { mode: ReassignMode; emergencyUUID?: string },
  ): Promise<{ ok: true; order: any } | { ok: false }> {
    acting.value = orderId;
    try {
      const body =
        opts.mode === "auto"
          ? { mode: "auto" }
          : { mode: "manual", emergency_uuid: opts.emergencyUUID };
      const res = await $fetch<{ data: any }>(`${baseUrl}${prefix()}/${orderId}/reassign`, {
        method: "POST",
        headers: headers(),
        body,
      });
      return { ok: true, order: res.data ?? null };
    } catch (e: any) {
      toast.error(e?.data?.message || "Gagal mengalihkan pesanan");
      return { ok: false };
    } finally {
      acting.value = null;
    }
  }

  async function fetchCandidates(orderId: string) {
    const res = await $fetch<{ data: any[] }>(`${baseUrl}${prefix()}/${orderId}/candidates`, {
      headers: headers(),
    });
    return res.data ?? [];
  }

  return { acting, accept, reject, reassign, escalatePsc, cancel, fetchCandidates };
}
