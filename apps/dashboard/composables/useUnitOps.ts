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
