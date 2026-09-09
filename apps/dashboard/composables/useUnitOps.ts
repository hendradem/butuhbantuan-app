/** Dispatcher profile helpers for unit panel wilayah ops. */

export type UnitOpsScope = {
  actor_uuid?: string
  unit_name?: string
  regency_id?: string
  province_id?: string
  province_wide?: boolean
}

export type UnitProfile = {
  emergency_uuid?: string
  username?: string
  unit_name?: string
  emergency_type?: string
  is_dispatcher?: boolean
  is_province_dispatcher?: boolean
  regency_id?: string
  province_id?: string
  ops_scope?: UnitOpsScope | null
  coordinates?: [string, string] | number[]
  operational?: any
  address?: any
  contact?: any
  fleet?: any
  partner_tier?: string
}

export function isUnitDispatcher(profile: UnitProfile | null | undefined): boolean {
  if (!profile) return false
  return !!(profile.is_dispatcher || profile.is_province_dispatcher || profile.ops_scope)
}

/** PSC / province command may Terima an offer assigned to another unit. */
export function mayAcceptOnBehalf(profile: UnitProfile | null | undefined): boolean {
  if (!profile) return false
  if (profile.is_province_dispatcher) return true
  if (String(profile.partner_tier || "").toLowerCase() === "psc") return true
  const blob = `${profile.unit_name || ""} ${profile.emergency_type || ""}`.toLowerCase()
  return /\bpsc\b|spgdt|\b119\b/.test(blob)
}

/** Show Terima only if this unit is the assignee, or is PSC/province ops. */
export function canAcceptTicket(
  profile: UnitProfile | null | undefined,
  order: { emergency_uuid?: string } | null | undefined,
): boolean {
  if (!profile || !order) return false
  const me = String(profile.emergency_uuid || profile.ops_scope?.actor_uuid || "").trim()
  const assignee = String(order.emergency_uuid || "").trim()
  if (me && assignee && me === assignee) return true
  return mayAcceptOnBehalf(profile)
}

export function useUnitOpsFetch() {
  const config = useRuntimeConfig()
  const baseUrl = config.public.apiBaseUrl as string
  const { unitHeaders } = useUnitAuth()

  async function opsGet<T>(path: string): Promise<T> {
    const res = await $fetch<{ data: T }>(`${baseUrl}${path}`, {
      headers: unitHeaders(),
    })
    return res.data
  }

  return {
    baseUrl,
    headers: unitHeaders,
    getOrders: () => opsGet<any[]>("/api/v1/unit/ops/orders"),
    getUnits: () => opsGet<any[]>("/api/v1/unit/ops/units"),
    getStats: () => opsGet<Record<string, any>>("/api/v1/unit/ops/stats"),
  }
}
