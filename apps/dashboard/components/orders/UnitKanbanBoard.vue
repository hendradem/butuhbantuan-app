<script setup lang="ts">
/**
 * Kanban board untuk pesanan unit. Kolom:
 *   Menunggu (pending) → Diterima (accepted) → Di lokasi (arrived) → Selesai hari ini
 *
 * Kartu bisa di-drag ke kolom berikutnya (forward-only). Aksi memakai endpoint
 * unit yang sudah ada (accept / arrive / PUT status). Component mengambil
 * `orders` sudah terfilter dari parent, jadi filter status/jenis/wilayah
 * tetap berlaku.
 */
import { Icon } from "@iconify/vue";
import { toast } from "~/utils/appToast";

type Ticket = {
  id: string;
  ticket_number: string;
  requester_name?: string;
  requester_phone?: string;
  location?: string;
  jenis_pelayanan?: string;
  status: string;
  assessment_acuity?: string;
  arrived_at?: string | null;
  accepted_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  unit_name?: string;
  previous_unit_name?: string;
};

const props = defineProps<{
  orders: Ticket[];
  loading?: boolean;
}>();

const emit = defineEmits<{
  refresh: [];
}>();

const { unitHeaders } = useUnitAuth();
const config = useRuntimeConfig();
const baseUrl = config.public.apiBaseUrl as string;

type ColumnKey = "waiting" | "accepted" | "on_scene" | "done_today";
type Column = {
  key: ColumnKey;
  label: string;
  hint: string;
  icon: string;
  accent: string;
};

const columns: Column[] = [
  { key: "waiting",    label: "Menunggu",         hint: "Belum diterima",                icon: "lucide:hourglass",    accent: "amber" },
  { key: "accepted",   label: "Diterima",         hint: "Berangkat / menuju lokasi",     icon: "lucide:navigation",   accent: "blue" },
  { key: "on_scene",   label: "Di lokasi",        hint: "Sudah tiba, sedang menangani",  icon: "lucide:map-pin",      accent: "indigo" },
  { key: "done_today", label: "Selesai hari ini", hint: "Ditutup hari ini",              icon: "lucide:check-circle", accent: "emerald" },
];

const columnAccents: Record<string, { header: string; count: string; empty: string; ring: string }> = {
  amber:   { header: "bg-amber-50 text-amber-800 border-amber-100",       count: "bg-amber-100 text-amber-700",     empty: "text-amber-500",   ring: "ring-amber-200" },
  blue:    { header: "bg-blue-50 text-blue-800 border-blue-100",          count: "bg-blue-100 text-blue-700",       empty: "text-blue-500",    ring: "ring-blue-200" },
  indigo:  { header: "bg-indigo-50 text-indigo-800 border-indigo-100",    count: "bg-indigo-100 text-indigo-700",   empty: "text-indigo-500",  ring: "ring-indigo-200" },
  emerald: { header: "bg-emerald-50 text-emerald-800 border-emerald-100", count: "bg-emerald-100 text-emerald-700", empty: "text-emerald-500", ring: "ring-emerald-200" },
};

function isToday(iso?: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

function columnFor(t: Ticket): ColumnKey | null {
  if (t.status === "pending") return "waiting";
  if (t.status === "accepted") return t.arrived_at ? "on_scene" : "accepted";
  if (t.status === "in_progress") return t.arrived_at ? "on_scene" : "accepted";
  if (t.status === "completed" && isToday(t.completed_at)) return "done_today";
  return null;
}

const acuityWeight: Record<string, number> = { P1: 3, P2: 2, P3: 1 };

const byColumn = computed<Record<ColumnKey, Ticket[]>>(() => {
  const buckets: Record<ColumnKey, Ticket[]> = { waiting: [], accepted: [], on_scene: [], done_today: [] };
  for (const t of props.orders) {
    const c = columnFor(t);
    if (c) buckets[c].push(t);
  }
  buckets.waiting.sort((a, b) => {
    const dw = (acuityWeight[b.assessment_acuity || ""] || 0) - (acuityWeight[a.assessment_acuity || ""] || 0);
    if (dw !== 0) return dw;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
  buckets.accepted.sort((a, b) =>
    new Date(b.accepted_at || b.created_at).getTime() - new Date(a.accepted_at || a.created_at).getTime());
  buckets.on_scene.sort((a, b) =>
    new Date(b.arrived_at || b.created_at).getTime() - new Date(a.arrived_at || a.created_at).getTime());
  buckets.done_today.sort((a, b) =>
    new Date(b.completed_at || b.created_at).getTime() - new Date(a.completed_at || a.created_at).getTime());
  return buckets;
});

// ── Drag & drop ────────────────────────────────────────────────────────────────
const draggingId = ref<string | null>(null);
const draggingFrom = ref<ColumnKey | null>(null);
const dropTarget = ref<ColumnKey | null>(null);
const acting = ref<Set<string>>(new Set());

const columnOrder: Record<ColumnKey, number> = { waiting: 0, accepted: 1, on_scene: 2, done_today: 3 };

function canDropTo(from: ColumnKey | null, to: ColumnKey): boolean {
  if (!from || from === to) return false;
  return columnOrder[to] === columnOrder[from] + 1;
}

function onDragStart(e: DragEvent, t: Ticket) {
  const col = columnFor(t);
  if (!col) return;
  draggingId.value = t.id;
  draggingFrom.value = col;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", t.id);
  }
}
function onDragEnd() {
  draggingId.value = null;
  draggingFrom.value = null;
  dropTarget.value = null;
}
function onDragOver(e: DragEvent, col: ColumnKey) {
  if (!canDropTo(draggingFrom.value, col)) return;
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
  dropTarget.value = col;
}
function onDragLeave(col: ColumnKey) {
  if (dropTarget.value === col) dropTarget.value = null;
}
async function onDrop(col: ColumnKey) {
  const id = draggingId.value;
  const from = draggingFrom.value;
  onDragEnd();
  if (!id || !from) return;
  if (!canDropTo(from, col)) return;
  const ticket = props.orders.find((t) => t.id === id);
  if (!ticket) return;

  if (col === "accepted") return runAccept(ticket);
  if (col === "on_scene") return runArrive(ticket);
  if (col === "done_today") return openCompleteModal(ticket);
}

async function runAccept(t: Ticket) {
  if (acting.value.has(t.id)) return;
  acting.value.add(t.id);
  try {
    await $fetch(`${baseUrl}/api/v1/unit/orders/${t.id}/accept`, {
      method: "POST",
      headers: unitHeaders(),
    });
    toast.success(`Diterima · ${t.ticket_number}`);
    emit("refresh");
  } catch (e: any) {
    toast.error(e?.data?.message || "Gagal menerima pesanan");
  } finally {
    acting.value.delete(t.id);
  }
}

async function runArrive(t: Ticket) {
  if (acting.value.has(t.id)) return;
  acting.value.add(t.id);
  try {
    await $fetch(`${baseUrl}/api/v1/unit/orders/${t.id}/arrive`, {
      method: "POST",
      headers: unitHeaders(),
    });
    toast.success(`Tiba di lokasi · ${t.ticket_number}`);
    emit("refresh");
  } catch (e: any) {
    toast.error(e?.data?.message || "Gagal mencatat kedatangan");
  } finally {
    acting.value.delete(t.id);
  }
}

// Complete modal
const showComplete = ref(false);
const completeTarget = ref<Ticket | null>(null);
const completeHandler = ref("");
const completeNotes = ref("");
const completing = ref(false);

function openCompleteModal(t: Ticket) {
  completeTarget.value = t;
  completeHandler.value = "";
  completeNotes.value = "";
  showComplete.value = true;
}
function closeCompleteModal() {
  if (completing.value) return;
  showComplete.value = false;
  completeTarget.value = null;
}
async function submitComplete() {
  const t = completeTarget.value;
  if (!t) return;
  completing.value = true;
  try {
    await $fetch(`${baseUrl}/api/v1/unit/orders/${t.id}`, {
      method: "PUT",
      headers: unitHeaders(),
      body: {
        status: "completed",
        handler_name: completeHandler.value.trim(),
        handling_notes: completeNotes.value.trim(),
      },
    });
    toast.success(`Selesai · ${t.ticket_number}`);
    showComplete.value = false;
    completeTarget.value = null;
    emit("refresh");
  } catch (e: any) {
    toast.error(e?.data?.message || "Gagal menyelesaikan pesanan");
  } finally {
    completing.value = false;
  }
}

function openDetail(t: Ticket) {
  return navigateTo(`/unit/orders/${t.ticket_number}`);
}

function acuityBadge(a?: string): string | null {
  if (a === "P1" || a === "P2" || a === "P3") return a;
  return null;
}
function acuityColor(a?: string): string {
  if (a === "P1") return "bg-red-100 text-red-700 ring-red-200";
  if (a === "P2") return "bg-amber-100 text-amber-700 ring-amber-200";
  if (a === "P3") return "bg-blue-100 text-blue-700 ring-blue-200";
  return "";
}
function shortTime(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}
function elapsed(iso: string): string {
  const d = new Date(iso).getTime();
  if (!Number.isFinite(d)) return "";
  const diff = Math.max(0, Date.now() - d);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "baru";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}j ${m % 60}m`;
}
</script>

<template>
  <div class="p-3 sm:p-4 space-y-3">
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
      <section
        v-for="col in columns"
        :key="col.key"
        class="rounded-xl border border-neutral-200 bg-neutral-50/60 flex flex-col min-h-[24rem] transition-shadow"
        :class="dropTarget === col.key && 'ring-2 ' + columnAccents[col.accent].ring"
        @dragover="onDragOver($event, col.key)"
        @dragleave="onDragLeave(col.key)"
        @drop="onDrop(col.key)"
      >
        <div
          class="px-3.5 py-3 border-b flex items-start gap-2.5 rounded-t-xl"
          :class="columnAccents[col.accent].header"
        >
          <div class="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 ring-1 ring-inset ring-white/60">
            <Icon :icon="col.icon" class="text-base" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold leading-tight">{{ col.label }}</p>
            <p class="text-[11px] opacity-70 mt-0.5 leading-snug">{{ col.hint }}</p>
          </div>
          <span
            class="shrink-0 inline-flex items-center px-2 rounded-full text-xs font-semibold h-6 tabular-nums"
            :class="columnAccents[col.accent].count"
          >
            {{ byColumn[col.key].length }}
          </span>
        </div>

        <div class="p-2 space-y-2 flex-1 overflow-y-auto">
          <template v-if="loading && !byColumn[col.key].length">
            <div v-for="n in 2" :key="n" class="rounded-lg bg-white p-3 space-y-2 border border-neutral-100">
              <div class="soft-skel h-3 w-2/3" />
              <div class="soft-skel h-3 w-1/2" />
              <div class="soft-skel h-3 w-full" />
            </div>
          </template>

          <template v-else-if="!byColumn[col.key].length">
            <div
              class="rounded-lg border border-dashed border-neutral-200 bg-white px-3 py-6 text-center text-xs"
              :class="columnAccents[col.accent].empty"
            >
              <Icon :icon="col.icon" class="text-lg opacity-60" />
              <p class="mt-1">Tidak ada pesanan</p>
            </div>
          </template>

          <article
            v-for="t in byColumn[col.key]"
            :key="t.id"
            :draggable="col.key !== 'done_today'"
            class="rounded-lg bg-white border border-neutral-200 shadow-sm px-3 py-2.5 hover:border-neutral-300 transition-colors"
            :class="{
              'opacity-40': draggingId === t.id,
              'cursor-grab active:cursor-grabbing': col.key !== 'done_today',
              'cursor-pointer': col.key === 'done_today',
            }"
            @dragstart="onDragStart($event, t)"
            @dragend="onDragEnd"
            @click="openDetail(t)"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="text-sm font-semibold text-neutral-900 truncate">
                  {{ t.requester_name || "Pelapor" }}
                </p>
                <p class="text-[11px] font-mono text-neutral-500 truncate">{{ t.ticket_number }}</p>
              </div>
              <span
                v-if="acuityBadge(t.assessment_acuity)"
                class="shrink-0 rounded-full px-1.5 h-5 inline-flex items-center text-[10px] font-bold ring-1 ring-inset"
                :class="acuityColor(t.assessment_acuity)"
              >
                {{ acuityBadge(t.assessment_acuity) }}
              </span>
            </div>

            <p v-if="t.location" class="mt-1.5 text-xs text-neutral-600 line-clamp-2 leading-snug">
              <Icon icon="lucide:map-pin" class="text-[11px] mr-1 inline-block align-[-1px]" />
              {{ t.location }}
            </p>

            <div class="mt-2 flex items-center justify-between text-[11px] text-neutral-500">
              <span v-if="col.key === 'waiting'" class="tabular-nums">
                {{ elapsed(t.created_at) }} tunggu
              </span>
              <span v-else-if="col.key === 'accepted' && t.accepted_at" class="tabular-nums">
                Terima {{ shortTime(t.accepted_at) }}
              </span>
              <span v-else-if="col.key === 'on_scene' && t.arrived_at" class="tabular-nums">
                Tiba {{ shortTime(t.arrived_at) }}
              </span>
              <span v-else-if="col.key === 'done_today' && t.completed_at" class="tabular-nums">
                Selesai {{ shortTime(t.completed_at) }}
              </span>
              <span
                v-if="t.previous_unit_name"
                class="inline-flex items-center gap-0.5 rounded-full bg-amber-50 text-amber-700 px-1.5 h-5 text-[10px] font-medium ring-1 ring-inset ring-amber-200"
                :title="'Dialihkan dari ' + t.previous_unit_name"
              >
                <Icon icon="lucide:arrow-left-right" class="text-[10px]" />
                dialihkan
              </span>
            </div>
          </article>
        </div>
      </section>
    </div>

    <p class="text-[11px] text-neutral-400 text-center pt-1">
      Seret kartu ke kolom berikutnya: Menunggu → Diterima → Di lokasi → Selesai.
    </p>

    <!-- Complete modal -->
    <UiModal v-model:open="showComplete" title="Selesaikan pesanan" size="md">
      <div class="space-y-3">
        <div v-if="completeTarget">
          <p class="text-sm font-semibold text-neutral-900">{{ completeTarget.requester_name || "Pelapor" }}</p>
          <p class="text-[11px] font-mono text-neutral-500">{{ completeTarget.ticket_number }}</p>
        </div>
        <UiFormField label="Nama petugas">
          <UiInput v-model="completeHandler" placeholder="Petugas lapangan" />
        </UiFormField>
        <UiFormField label="Catatan penanganan">
          <UiTextarea v-model="completeNotes" :rows="3" placeholder="Ringkasan singkat…" />
        </UiFormField>
      </div>
      <template #footer>
        <UiButton variant="secondary" :disabled="completing" @click="closeCompleteModal">Batal</UiButton>
        <UiButton :loading="completing" @click="submitComplete">Tandai selesai</UiButton>
      </template>
    </UiModal>
  </div>
</template>
