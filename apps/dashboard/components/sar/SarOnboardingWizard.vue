<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { toast } from "~/utils/appToast";
import type { SarGearItem, SarSector } from "~/composables/useSarApi";
import { readKmlFile } from "~/utils/kmlParse";

const emit = defineEmits<{
  done: [];
}>();

const { onboard } = useSarApi();

type TeamDraft = {
  sru: string
  color: string
  notes: string
  equipment: SarGearItem[]
  members: { callsign: string; name: string; role: string }[]
}

const step = ref(1);
const submitting = ref(false);
const kmlInput = ref<HTMLInputElement | null>(null);

const form = reactive({
  name: "",
  area: "",
  center_lat: -7.5405,
  center_lng: 110.4462,
  notes: "",
});

const teams = ref<TeamDraft[]>([
  {
    sru: "SRU-Alpha",
    color: "#2563eb",
    notes: "",
    equipment: [{ name: "HT VHF", qty: 3, unit: "unit" }],
    members: [{ callsign: "Alpha-1", name: "", role: "leader" }],
  },
]);

const sectors = ref<SarSector[]>([]);
const markers = ref<
  Array<{ kind: string; label: string; lat: number; lng: number; note?: string; icon?: string; color?: string }>
>([]);

function addTeam() {
  const n = teams.value.length + 1;
  teams.value.push({
    sru: `SRU-${n}`,
    color: ["#2563eb", "#059669", "#d97706", "#7c3aed", "#dc2626"][n % 5],
    notes: "",
    equipment: [{ name: "HT VHF", qty: 2, unit: "unit" }],
    members: [{ callsign: `Unit-${n}-1`, name: "", role: "leader" }],
  });
}

function removeTeam(i: number) {
  if (teams.value.length <= 1) return;
  teams.value.splice(i, 1);
}

function addMember(ti: number) {
  const t = teams.value[ti];
  t.members.push({ callsign: "", name: "", role: "member" });
}

function addGear(ti: number) {
  teams.value[ti].equipment.push({ name: "", qty: 1, unit: "unit" });
}

async function onKml(ev: Event) {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  try {
    const parsed = await readKmlFile(file);
    sectors.value = parsed.sectors;
    markers.value = parsed.points.map((p) => ({
      kind: p.kind,
      label: p.name,
      lat: p.lat,
      lng: p.lng,
      note: p.note,
      icon: p.icon,
      color: p.color,
    }));
    if (parsed.sectors[0]?.ring?.[0]) {
      form.center_lat = parsed.sectors[0].ring[0][0];
      form.center_lng = parsed.sectors[0].ring[0][1];
    }
    toast.success(
      `KML: ${parsed.sectors.length} karvak · ${parsed.points.length} marker`,
    );
  } catch (e: any) {
    toast.error(e?.message || "Gagal baca KML");
  }
}

async function submitCustom() {
  if (!form.name.trim()) {
    toast.error("Nama misi wajib");
    step.value = 1;
    return;
  }
  if (!teams.value.some((t) => t.sru.trim() && t.members.some((m) => m.callsign.trim()))) {
    toast.error("Minimal 1 SRU + callsign");
    step.value = 2;
    return;
  }
  submitting.value = true;
  try {
    await onboard({
      use_demo: false,
      name: form.name.trim(),
      area: form.area.trim(),
      center_lat: form.center_lat,
      center_lng: form.center_lng,
      notes: form.notes.trim() || undefined,
      teams: teams.value.map((t) => ({
        sru: t.sru.trim(),
        color: t.color,
        notes: t.notes || undefined,
        equipment: t.equipment.filter((g) => g.name.trim()),
        members: t.members
          .filter((m) => m.callsign.trim())
          .map((m) => ({
            callsign: m.callsign.trim(),
            name: m.name.trim(),
            role: m.role || "member",
          })),
        assigned_sectors: [],
      })),
      sectors: sectors.value,
      markers: markers.value,
    });
    toast.success("Master data misi siap");
    emit("done");
  } catch (e: any) {
    toast.error(e?.data?.message || e?.message || "Gagal onboarding");
  } finally {
    submitting.value = false;
  }
}

async function submitDemo() {
  submitting.value = true;
  try {
    await onboard({ use_demo: true });
    toast.success("Demo Merapi dimuat");
    emit("done");
  } catch (e: any) {
    toast.error(e?.data?.message || e?.message || "Gagal load demo");
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-5">
    <div>
      <p class="text-[11px] font-semibold uppercase tracking-wide text-violet-700">Onboarding</p>
      <h2 class="text-lg font-semibold text-neutral-900">Pengaturan master data misi</h2>
      <p class="text-sm text-neutral-500 mt-1">
        Isi misi, roster SRU + perlengkapan, dan opsional import KML. Setelah selesai, peta SMC aktif.
      </p>
    </div>

    <div class="flex gap-2 text-xs">
      <span
        v-for="n in 3"
        :key="n"
        class="px-2.5 py-1 rounded-full border"
        :class="step === n ? 'bg-violet-600 text-white border-violet-600' : 'border-neutral-200 text-neutral-500'"
      >
        {{ n === 1 ? "Misi" : n === 2 ? "SRU & gear" : "KML" }}
      </span>
    </div>

    <div v-if="step === 1" class="rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
      <label class="block text-xs font-medium text-neutral-600">
        Nama misi *
        <input v-model="form.name" class="mt-1 w-full text-sm border border-neutral-200 rounded-lg px-3 py-2" placeholder="Pencarian Hilang — Lereng Merapi">
      </label>
      <label class="block text-xs font-medium text-neutral-600">
        Area
        <input v-model="form.area" class="mt-1 w-full text-sm border border-neutral-200 rounded-lg px-3 py-2" placeholder="Sleman / kawasan hutan">
      </label>
      <div class="grid grid-cols-2 gap-2">
        <label class="block text-xs font-medium text-neutral-600">
          Center lat
          <input v-model.number="form.center_lat" type="number" step="0.0001" class="mt-1 w-full text-sm border border-neutral-200 rounded-lg px-3 py-2">
        </label>
        <label class="block text-xs font-medium text-neutral-600">
          Center lng
          <input v-model.number="form.center_lng" type="number" step="0.0001" class="mt-1 w-full text-sm border border-neutral-200 rounded-lg px-3 py-2">
        </label>
      </div>
      <label class="block text-xs font-medium text-neutral-600">
        Catatan
        <input v-model="form.notes" class="mt-1 w-full text-sm border border-neutral-200 rounded-lg px-3 py-2" placeholder="Opsional">
      </label>
      <div class="flex justify-between gap-2 pt-1">
        <UiButton variant="secondary" :loading="submitting" @click="submitDemo">
          <Icon icon="lucide:sparkles" class="text-sm" />
          Pakai data demo Merapi
        </UiButton>
        <UiButton @click="step = 2">Lanjut</UiButton>
      </div>
    </div>

    <div v-else-if="step === 2" class="space-y-3">
      <div
        v-for="(t, ti) in teams"
        :key="ti"
        class="rounded-xl border border-neutral-200 bg-white p-4 space-y-3"
      >
        <div class="flex items-center gap-2">
          <input v-model="t.color" type="color" class="w-8 h-8 rounded border border-neutral-200">
          <input v-model="t.sru" class="flex-1 text-sm border border-neutral-200 rounded-lg px-3 py-2 font-semibold" placeholder="SRU-Alpha">
          <button type="button" class="text-xs text-red-600" :disabled="teams.length <= 1" @click="removeTeam(ti)">Hapus</button>
        </div>
        <div>
          <p class="text-[11px] font-semibold uppercase text-neutral-500 mb-1">Personil</p>
          <div v-for="(m, mi) in t.members" :key="mi" class="grid grid-cols-3 gap-1.5 mb-1.5">
            <input v-model="m.callsign" class="text-sm border border-neutral-200 rounded-lg px-2 py-1.5" placeholder="Callsign">
            <input v-model="m.name" class="text-sm border border-neutral-200 rounded-lg px-2 py-1.5" placeholder="Nama">
            <select v-model="m.role" class="text-sm border border-neutral-200 rounded-lg px-2 py-1.5 bg-white">
              <option value="leader">leader</option>
              <option value="member">member</option>
              <option value="medic">medic</option>
            </select>
          </div>
          <button type="button" class="text-xs text-violet-700" @click="addMember(ti)">+ anggota</button>
        </div>
        <div>
          <p class="text-[11px] font-semibold uppercase text-neutral-500 mb-1">Perlengkapan</p>
          <div v-for="(g, gi) in t.equipment" :key="gi" class="grid grid-cols-[1fr_4rem_5rem] gap-1.5 mb-1.5">
            <input v-model="g.name" class="text-sm border border-neutral-200 rounded-lg px-2 py-1.5" placeholder="HT VHF">
            <input v-model.number="g.qty" type="number" min="1" class="text-sm border border-neutral-200 rounded-lg px-2 py-1.5">
            <input v-model="g.unit" class="text-sm border border-neutral-200 rounded-lg px-2 py-1.5" placeholder="unit">
          </div>
          <button type="button" class="text-xs text-violet-700" @click="addGear(ti)">+ gear</button>
        </div>
      </div>
      <button type="button" class="text-sm text-violet-700 font-medium" @click="addTeam">+ tambah SRU</button>
      <div class="flex justify-between gap-2">
        <UiButton variant="secondary" @click="step = 1">Kembali</UiButton>
        <UiButton @click="step = 3">Lanjut</UiButton>
      </div>
    </div>

    <div v-else class="rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
      <p class="text-sm text-neutral-600">Import KML karvak / marker (opsional). Bisa dilewati.</p>
      <input ref="kmlInput" type="file" accept=".kml,application/vnd.google-earth.kml+xml,text/xml" class="hidden" @change="onKml">
      <UiButton variant="secondary" class="w-full" @click="kmlInput?.click()">
        <Icon icon="lucide:upload" class="text-sm" />
        Pilih file KML
      </UiButton>
      <p class="text-xs text-neutral-500">
        Siap: {{ sectors.length }} karvak · {{ markers.length }} marker
      </p>
      <div class="flex justify-between gap-2 pt-1">
        <UiButton variant="secondary" @click="step = 2">Kembali</UiButton>
        <UiButton :loading="submitting" @click="submitCustom">
          <Icon icon="lucide:check" class="text-sm" />
          Selesai & buka peta
        </UiButton>
      </div>
    </div>
  </div>
</template>
