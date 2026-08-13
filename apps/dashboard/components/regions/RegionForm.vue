<script setup lang="ts">
import { Icon } from "@iconify/vue"

const props = defineProps<{
  form: {
    name: string
    regency_id: string
    latitude: string
    longitude: string
  }
}>()

const { get } = useApi()

// ── Cascading selects ─────────────────────────────────────────────────────────
const selectedProvince = ref("")
const selectedRegency  = ref("")

const provinces = ref<{ id: string; name: string }[]>([])
const regencies = ref<{ id: string; name: string; province_id: string }[]>([])
const loadingReg = ref(false)
const geocoding  = ref(false)

// Load all provinces once
onMounted(async () => {
  const res = await get<{ data: { id: string; name: string }[] }>("/api/v1/service/province")
  provinces.value = res.data ?? []

  // If form already has regency_id, reverse-populate province/regency selectors
  if (props.form.regency_id) {
    selectedRegency.value = props.form.regency_id
    // Try to infer province from existing regencies
    await loadAllRegencies()
    const match = allRegencies.value.find(r => r.id === props.form.regency_id)
    if (match) {
      selectedProvince.value = match.province_id
      await loadRegencies(match.province_id)
    }
  }
})

// All regencies (for reverse-lookup on edit)
const allRegencies = ref<{ id: string; name: string; province_id: string }[]>([])
async function loadAllRegencies() {
  if (allRegencies.value.length) return
  for (const prov of provinces.value) {
    const res = await get<{ data: any[] }>(`/api/v1/service/regency?province_id=${prov.id}`)
    allRegencies.value.push(...(res.data ?? []))
  }
}

async function loadRegencies(provinceId: string) {
  loadingReg.value = true
  try {
    const res = await get<{ data: any[] }>(`/api/v1/service/regency?province_id=${provinceId}`)
    regencies.value = res.data ?? []
  } finally {
    loadingReg.value = false
  }
}

// When province changes → reset regency, load regencies list
watch(selectedProvince, async (id) => {
  selectedRegency.value = ""
  props.form.regency_id = ""
  props.form.name       = ""
  props.form.latitude   = ""
  props.form.longitude  = ""
  regencies.value = []
  if (id) await loadRegencies(id)
})

// When regency changes → fill form fields + geocode
watch(selectedRegency, async (id) => {
  if (!id) return
  const reg = regencies.value.find(r => r.id === id)
  if (!reg) return

  props.form.regency_id = reg.id
  props.form.name       = reg.name

  // Auto-geocode
  geocoding.value = true
  try {
    const res = await get<{ data: { lat: string; lon: string }[] }>(
      `/api/v1/geocoding/search?q=${encodeURIComponent(reg.name + " Indonesia")}`
    )
    const first = res.data?.[0]
    if (first?.lat && first?.lon) {
      props.form.latitude  = parseFloat(first.lat).toFixed(7)
      props.form.longitude = parseFloat(first.lon).toFixed(7)
    }
  } catch {
    // geocoding failed, leave blank
  } finally {
    geocoding.value = false
  }
})
</script>

<template>
  <div class="space-y-4">

    <!-- Province select -->
    <div>
      <label class="block text-sm font-medium text-neutral-700 mb-1.5">
        Provinsi <span class="text-red-500">*</span>
      </label>
      <UiSelect v-model="selectedProvince" placeholder="Pilih provinsi...">
        <option v-for="p in provinces" :key="p.id" :value="p.id">{{ p.name }}</option>
      </UiSelect>
    </div>

    <!-- Regency select -->
    <div>
      <label class="block text-sm font-medium text-neutral-700 mb-1.5">
        Kabupaten / Kota <span class="text-red-500">*</span>
      </label>
      <div class="relative">
        <UiSelect
          v-model="selectedRegency"
          :disabled="!selectedProvince || loadingReg"
          :placeholder="loadingReg ? 'Memuat...' : !selectedProvince ? 'Pilih provinsi dulu' : 'Pilih kabupaten/kota...'"
        >
          <option v-for="r in regencies" :key="r.id" :value="r.id">{{ r.name }}</option>
        </UiSelect>
        <Icon v-if="loadingReg" icon="lucide:loader-2" class="animate-spin absolute right-8 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
      </div>
    </div>

    <!-- Display name (auto-filled, editable) -->
    <div>
      <label class="block text-sm font-medium text-neutral-700 mb-1.5">Nama Tampilan</label>
      <UiInput v-model="form.name" placeholder="Akan terisi otomatis" />
      <p class="text-xs text-neutral-400 mt-1">Bisa diubah untuk nama yang lebih singkat</p>
    </div>

    <!-- Lat/Lng — auto-geocoded, shown as info -->
    <div
      v-if="form.latitude && form.longitude"
      class="flex items-center gap-2 text-xs text-neutral-500 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2.5"
    >
      <Icon icon="lucide:map-pin" class="text-emerald-500 shrink-0" />
      <span>
        {{ parseFloat(form.latitude).toFixed(5) }}, {{ parseFloat(form.longitude).toFixed(5) }}
        <span class="text-neutral-400 ml-1">(auto-geocoded)</span>
      </span>
    </div>
    <div v-else-if="geocoding" class="flex items-center gap-2 text-xs text-neutral-400 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2.5">
      <Icon icon="lucide:loader-2" class="animate-spin shrink-0" />
      Mengambil koordinat lokasi...
    </div>
    <div v-else-if="selectedRegency && !geocoding" class="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
      <Icon icon="lucide:alert-triangle" class="shrink-0" />
      Koordinat tidak ditemukan — wilayah akan ditambahkan tanpa koordinat
    </div>

  </div>
</template>
