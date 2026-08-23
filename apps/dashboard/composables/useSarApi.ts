/** Client for SAR / SMC app module (`/api/v1/apps/sar`). */

export type SarMission = {
  id: string
  name: string
  area: string
  status: string
  kind?: string
  kml_url: string
  center_lat: number
  center_lng: number
  started_at: string
  notes?: string
  share_token?: string
  share_enabled_at?: string | null
  share_expires_at?: string | null
}

export type SarShareInfo = {
  mission_id: string
  share_token?: string
  share_enabled_at?: string | null
  share_expires_at?: string | null
  active: boolean
}

export type SarShift = {
  id: string
  mission_id: string
  date: string
  label: string
  status: string
}

export type SarAppConfig = {
  enabled: boolean
  onboarded: boolean
  active_mission_id?: string
}

export type SarGearItem = {
  name: string
  qty: number
  unit?: string
}

export type SarShiftTeam = {
  shift_id: string
  sru: string
  color: string
  assigned_sectors?: string[]
  equipment: SarGearItem[]
  notes?: string
}

export type SarSector = {
  id: string
  code: string
  label: string
  color: string
  assigned_sru?: string
  ring: [number, number][]
}

export type SarMember = {
  id: string
  mission_id: string
  shift_id: string
  callsign: string
  name: string
  sru: string
  role: string
  status: string
}

export type SarPosition = {
  id: string
  mission_id: string
  shift_id: string
  member_id: string
  callsign: string
  lat: number
  lng: number
  source: string
  note?: string
  sector_hint?: string
  reported_at: string
  logged_by?: string
}

export type SarMarker = {
  id: string
  mission_id: string
  kind: string
  label: string
  lat: number
  lng: number
  note?: string
  color?: string
  icon?: string
  created_at: string
  created_by?: string
}

export type SarMissionBundle = {
  mission: SarMission
  shifts: SarShift[]
  shift?: SarShift | null
  teams: SarShiftTeam[]
  sectors: SarSector[]
  members: SarMember[]
  positions: SarPosition[]
  markers: SarMarker[]
  last_by_member: Record<string, SarPosition>
  sru_list: string[]
  live_tracks?: SarLiveTrack[]
}

export type SarLiveTrack = {
  token: string
  mission_id: string
  shift_id: string
  sru: string
  member_id: string
  callsign: string
  color?: string
  enabled_at: string
  expires_at: string
  last_lat?: number
  last_lng?: number
  last_at?: string | null
  last_accuracy_m?: number | null
  active: boolean
}

export function useSarApi() {
  const { baseUrl } = useApi()
  const { token } = useAuth()

  function headers(): Record<string, string> {
    return token.value ? { "X-Admin-Key": token.value } : {}
  }

  async function listMissions(): Promise<SarMission[]> {
    const res = await $fetch<{ data: SarMission[] }>(`${baseUrl}/api/v1/apps/sar/missions`, {
      headers: headers(),
    })
    return res.data ?? []
  }

  async function getStatus(): Promise<SarAppConfig> {
    const res = await $fetch<{ data: SarAppConfig }>(`${baseUrl}/api/v1/apps/sar/status`, {
      headers: headers(),
    })
    return res.data
  }

  async function setEnabled(enabled: boolean): Promise<SarAppConfig> {
    const res = await $fetch<{ data: SarAppConfig }>(`${baseUrl}/api/v1/apps/sar/status`, {
      method: "PATCH",
      headers: headers(),
      body: { enabled },
    })
    return res.data
  }

  async function onboard(body: {
    use_demo?: boolean
    name?: string
    area?: string
    center_lat?: number
    center_lng?: number
    notes?: string
    teams?: Array<{
      sru: string
      color?: string
      assigned_sectors?: string[]
      equipment?: SarGearItem[]
      members?: Array<{ callsign: string; name: string; role: string }>
      notes?: string
    }>
    sectors?: SarSector[]
    markers?: Array<{
      kind: string
      label: string
      lat: number
      lng: number
      note?: string
      color?: string
      icon?: string
    }>
  }): Promise<{ status: SarAppConfig; bundle: SarMissionBundle }> {
    const res = await $fetch<{ data: { status: SarAppConfig; bundle: SarMissionBundle } }>(
      `${baseUrl}/api/v1/apps/sar/onboard`,
      { method: "POST", headers: headers(), body },
    )
    return res.data
  }

  async function getMission(id: string, day?: string): Promise<SarMissionBundle> {
    const q = day ? `?day=${encodeURIComponent(day)}` : ""
    const res = await $fetch<{ data: SarMissionBundle }>(
      `${baseUrl}/api/v1/apps/sar/missions/${id}${q}`,
      { headers: headers() },
    )
    return res.data
  }

  async function listShifts(missionId: string): Promise<SarShift[]> {
    const res = await $fetch<{ data: SarShift[] }>(
      `${baseUrl}/api/v1/apps/sar/missions/${missionId}/shifts`,
      { headers: headers() },
    )
    return res.data ?? []
  }

  async function reportPosition(
    missionId: string,
    body: {
      member_id: string
      lat: number
      lng: number
      note?: string
      sector_hint?: string
      source?: string
      logged_by?: string
      shift_id?: string
    },
  ): Promise<SarPosition> {
    const res = await $fetch<{ data: SarPosition }>(
      `${baseUrl}/api/v1/apps/sar/missions/${missionId}/positions`,
      { method: "POST", headers: headers(), body },
    )
    return res.data
  }

  async function importSectors(
    missionId: string,
    body: {
      mode: "replace" | "append"
      sectors?: SarSector[]
      markers?: Array<{
        kind: string
        label: string
        lat: number
        lng: number
        note?: string
        color?: string
        icon?: string
        created_by?: string
      }>
    },
  ): Promise<{ sectors: SarSector[]; markers: SarMarker[] }> {
    const res = await $fetch<{ data: { sectors: SarSector[]; markers: SarMarker[] } | SarSector[] }>(
      `${baseUrl}/api/v1/apps/sar/missions/${missionId}/sectors`,
      { method: "POST", headers: headers(), body },
    )
    const data = res.data
    if (Array.isArray(data)) {
      return { sectors: data, markers: [] }
    }
    return {
      sectors: data?.sectors ?? [],
      markers: data?.markers ?? [],
    }
  }

  async function assignSector(
    missionId: string,
    sectorId: string,
    assigned_sru: string,
  ): Promise<SarSector> {
    const res = await $fetch<{ data: SarSector }>(
      `${baseUrl}/api/v1/apps/sar/missions/${missionId}/sectors/${sectorId}`,
      { method: "PATCH", headers: headers(), body: { assigned_sru } },
    )
    return res.data
  }

  async function createMarker(
    missionId: string,
    body: {
      kind: string
      label: string
      lat: number
      lng: number
      note?: string
      color?: string
      icon?: string
      created_by?: string
    },
  ): Promise<SarMarker> {
    const res = await $fetch<{ data: SarMarker }>(
      `${baseUrl}/api/v1/apps/sar/missions/${missionId}/markers`,
      { method: "POST", headers: headers(), body },
    )
    return res.data
  }

  async function updateMarker(
    missionId: string,
    markerId: string,
    body: {
      kind: string
      label: string
      lat: number
      lng: number
      note?: string
      color?: string
      icon?: string
      created_by?: string
    },
  ): Promise<SarMarker> {
    const res = await $fetch<{ data: SarMarker }>(
      `${baseUrl}/api/v1/apps/sar/missions/${missionId}/markers/${markerId}`,
      { method: "PATCH", headers: headers(), body },
    )
    return res.data
  }

  async function deleteMarker(missionId: string, markerId: string): Promise<void> {
    await $fetch(`${baseUrl}/api/v1/apps/sar/missions/${missionId}/markers/${markerId}`, {
      method: "DELETE",
      headers: headers(),
    })
  }

  async function updatePosition(
    missionId: string,
    positionId: string,
    body: {
      member_id?: string
      lat: number
      lng: number
      note?: string
      sector_hint?: string
      source?: string
      logged_by?: string
      shift_id?: string
    },
  ): Promise<SarPosition> {
    const res = await $fetch<{ data: SarPosition }>(
      `${baseUrl}/api/v1/apps/sar/missions/${missionId}/positions/${positionId}`,
      { method: "PATCH", headers: headers(), body },
    )
    return res.data
  }

  async function deletePosition(missionId: string, positionId: string): Promise<void> {
    await $fetch(`${baseUrl}/api/v1/apps/sar/missions/${missionId}/positions/${positionId}`, {
      method: "DELETE",
      headers: headers(),
    })
  }

  async function getShare(missionId: string): Promise<SarShareInfo> {
    const res = await $fetch<{ data: SarShareInfo }>(
      `${baseUrl}/api/v1/apps/sar/missions/${missionId}/share`,
      { headers: headers() },
    )
    return res.data
  }

  async function enableShare(missionId: string, ttlHours = 72): Promise<SarShareInfo> {
    const res = await $fetch<{ data: SarShareInfo }>(
      `${baseUrl}/api/v1/apps/sar/missions/${missionId}/share/enable`,
      { method: "POST", headers: headers(), body: { ttl_hours: ttlHours } },
    )
    return res.data
  }

  async function disableShare(missionId: string): Promise<SarShareInfo> {
    const res = await $fetch<{ data: SarShareInfo }>(
      `${baseUrl}/api/v1/apps/sar/missions/${missionId}/share/disable`,
      { method: "POST", headers: headers() },
    )
    return res.data
  }

  async function enableLiveTrack(
    missionId: string,
    body: { sru: string; member_id?: string; shift_id?: string; ttl_hours?: number },
  ): Promise<SarLiveTrack> {
    const res = await $fetch<{ data: SarLiveTrack }>(
      `${baseUrl}/api/v1/apps/sar/missions/${missionId}/live-track/enable`,
      { method: "POST", headers: headers(), body },
    )
    return res.data
  }

  async function disableLiveTrack(
    missionId: string,
    body: { sru?: string; token?: string },
  ): Promise<void> {
    await $fetch(`${baseUrl}/api/v1/apps/sar/missions/${missionId}/live-track/disable`, {
      method: "POST",
      headers: headers(),
      body,
    })
  }

  async function upsertTeam(
    missionId: string,
    body: {
      sru: string
      color?: string
      callsign?: string
      name?: string
      role?: string
      shift_id?: string
    },
  ): Promise<{ team: SarShiftTeam; member: SarMember }> {
    const res = await $fetch<{ data: { team: SarShiftTeam; member: SarMember } }>(
      `${baseUrl}/api/v1/apps/sar/missions/${missionId}/teams`,
      { method: "POST", headers: headers(), body },
    )
    return res.data
  }

  async function removeTeam(missionId: string, sru: string, shiftId?: string): Promise<void> {
    const q = shiftId ? `?shift=${encodeURIComponent(shiftId)}` : ""
    await $fetch(
      `${baseUrl}/api/v1/apps/sar/missions/${missionId}/teams/${encodeURIComponent(sru)}${q}`,
      { method: "DELETE", headers: headers() },
    )
  }

  return {
    listMissions,
    getStatus,
    setEnabled,
    onboard,
    getMission,
    listShifts,
    reportPosition,
    updatePosition,
    deletePosition,
    importSectors,
    assignSector,
    createMarker,
    updateMarker,
    deleteMarker,
    getShare,
    enableShare,
    disableShare,
    enableLiveTrack,
    disableLiveTrack,
    upsertTeam,
    removeTeam,
  }
}
