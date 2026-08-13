<script setup lang="ts">
import { Icon } from "@iconify/vue";

definePageMeta({ title: "Mock · Order Steps" });

type StepStatus = "done" | "active" | "todo";
type Scenario = "pending_accept" | "needs_share" | "enroute" | "arrived" | "completed";
type MobilePane = "steps" | "detail";
type DetailTab = "info" | "history";

const scenario = ref<Scenario>("needs_share");
const linkCreated = ref(false);
const mobilePane = ref<MobilePane>("steps");
const detailTab = ref<DetailTab>("info");
const toast = ref("");

const scenarios: { id: Scenario; label: string }[] = [
  { id: "pending_accept", label: "Belum terima" },
  { id: "needs_share", label: "Perlu link" },
  { id: "enroute", label: "Menuju" },
  { id: "arrived", label: "Tiba" },
  { id: "completed", label: "Selesai" },
];

watch(scenario, (s) => {
  linkCreated.value = ["enroute", "arrived", "completed"].includes(s);
  toast.value = "";
  // On mobile, jump to steps when scenario changes so action is visible
  if (import.meta.client && window.matchMedia("(max-width: 1023px)").matches) {
    mobilePane.value = "steps";
  }
});

type Step = {
  key: string;
  title: string;
  meta: string;
  status: StepStatus;
  body: "accept" | "share" | "arrive" | "complete" | "report" | null;
};

const steps = computed<Step[]>(() => {
  const s = scenario.value;
  const accepted = s !== "pending_accept";
  const shared = linkCreated.value;
  const arrived = s === "arrived" || s === "completed";
  const completed = s === "completed";
  const st = (done: boolean, active: boolean): StepStatus =>
    done ? "done" : active ? "active" : "todo";

  return [
    {
      key: "accept",
      title: "Terima pesanan",
      meta: accepted ? "Diterima · PMI Demo" : "Konfirmasi unit",
      status: st(accepted, s === "pending_accept"),
      body: s === "pending_accept" ? "accept" : null,
    },
    {
      key: "share",
      title: "Link lokasi petugas",
      meta: shared ? "Aktif · kirim ke HP lapangan" : "Wajib sebelum berangkat",
      status: st(shared, accepted && !shared),
      body: accepted && !arrived ? "share" : null,
    },
    {
      key: "arrive",
      title: "Tiba di lokasi",
      meta: arrived ? "Terkonfirmasi 20:41" : "Konfirmasi saat sampai",
      status: st(arrived, shared && !arrived),
      body: shared && !arrived ? "arrive" : null,
    },
    {
      key: "finish",
      title: "Selesai & laporan",
      meta: completed ? "Laporan tersimpan" : "Tutup kejadian",
      status: st(completed, arrived && !completed),
      body: arrived && !completed ? "complete" : completed ? "report" : null,
    },
  ];
});

const activeStep = computed(() => steps.value.find((x) => x.status === "active") ?? null);

const statusBadge = computed(() => {
  const map: Record<Scenario, { label: string; cls: string }> = {
    pending_accept: { label: "Menunggu", cls: "bg-amber-50 text-amber-800 border-amber-200" },
    needs_share: { label: "Diterima", cls: "bg-blue-50 text-blue-800 border-blue-200" },
    enroute: { label: "Diproses", cls: "bg-orange-50 text-orange-800 border-orange-200" },
    arrived: { label: "Di lokasi", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" },
    completed: { label: "Selesai", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  };
  return map[scenario.value];
});

const mockLink = "https://butuhbantuan.app/track/x7k2m9qp";
const progress = computed(() => {
  const done = steps.value.filter((s) => s.status === "done").length;
  return Math.round((done / steps.value.length) * 100);
});

function flash(msg: string) {
  toast.value = msg;
  window.setTimeout(() => {
    if (toast.value === msg) toast.value = "";
  }, 1800);
}

function createLink() {
  linkCreated.value = true;
  scenario.value = "enroute";
  flash("Link dibuat");
}

function nodeClass(st: StepStatus) {
  if (st === "done") return "bg-emerald-600 border-emerald-600 text-white";
  if (st === "active") return "bg-white border-neutral-900 text-neutral-900 shadow-[0_0_0_3px_rgba(23,23,23,0.06)]";
  return "bg-neutral-50 border-neutral-200 text-neutral-300";
}

function pill(st: StepStatus) {
  if (st === "done") return { label: "Selesai", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" };
  if (st === "active") return { label: "Sekarang", cls: "bg-neutral-900 text-white border-neutral-900" };
  return { label: "Berikutnya", cls: "bg-white text-neutral-400 border-neutral-200" };
}
</script>

<template>
  <div class="min-h-full bg-neutral-50">
    <!-- Sticky app header (real detail anatomy) -->
    <header class="sticky top-0 z-20 border-b border-neutral-200 bg-white/95 backdrop-blur">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-3">
        <div class="flex items-center gap-3">
          <NuxtLink
            to="/orders"
            class="flex items-center justify-center w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors shrink-0"
            aria-label="Kembali"
          >
            <Icon icon="lucide:arrow-left" class="text-neutral-700 text-sm" />
          </NuxtLink>

          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <h1 class="text-base sm:text-lg font-semibold text-neutral-900 font-mono tracking-tight">
                BB-2026-08421
              </h1>
              <span
                :class="[
                  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                  statusBadge.cls,
                ]"
              >
                {{ statusBadge.label }}
              </span>
            </div>
            <p class="text-xs text-neutral-400 mt-0.5">12 Agu 2026 · 20:14</p>
          </div>

          <button
            type="button"
            class="hidden sm:inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-800 shrink-0"
            @click="flash('Refresh')"
          >
            <Icon icon="lucide:refresh-cw" class="text-xs" />
            Refresh
          </button>
        </div>
      </div>

      <!-- Lab toolbar + mobile pane -->
      <div class="border-t border-neutral-100 bg-neutral-50/90">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 py-2 space-y-2">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p class="text-[11px] text-neutral-400 font-medium uppercase tracking-wide">
              Mock UI · tidak menyentuh data
            </p>
            <div class="flex gap-1 overflow-x-auto pb-0.5 -mx-1 px-1">
              <button
                v-for="opt in scenarios"
                :key="opt.id"
                type="button"
                :class="[
                  'shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors',
                  scenario === opt.id
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-100',
                ]"
                @click="scenario = opt.id"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>

          <p v-if="toast" class="text-xs font-medium text-emerald-700">{{ toast }}</p>

          <!-- Mobile: Langkah | Detail -->
          <div class="lg:hidden grid grid-cols-2 p-0.5 rounded-lg bg-neutral-200/70">
            <button
              type="button"
              :class="[
                'py-2 rounded-md text-sm font-medium transition-colors',
                mobilePane === 'steps' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500',
              ]"
              @click="mobilePane = 'steps'"
            >
              Langkah
            </button>
            <button
              type="button"
              :class="[
                'py-2 rounded-md text-sm font-medium transition-colors',
                mobilePane === 'detail' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500',
              ]"
              @click="mobilePane = 'detail'"
            >
              Detail
            </button>
          </div>
        </div>
      </div>
    </header>

    <div class="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
        <!-- ─── LEFT: Steps ─────────────────────────────────────────── -->
        <aside
          :class="[
            'lg:col-span-5 xl:col-span-4 lg:sticky lg:top-28',
            mobilePane === 'detail' ? 'hidden lg:block' : 'block',
          ]"
        >
          <div class="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <div class="px-4 py-3.5 border-b border-neutral-100">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <h2 class="text-sm font-semibold text-neutral-900">Langkah penanganan</h2>
                  <p class="text-xs text-neutral-500 mt-0.5">Kerjakan berurutan</p>
                </div>
                <span class="text-xs tabular-nums text-neutral-400">{{ progress }}%</span>
              </div>
              <div class="mt-2.5 h-1 rounded-full bg-neutral-100 overflow-hidden">
                <div
                  class="h-full rounded-full bg-neutral-900 transition-all duration-300"
                  :style="{ width: `${progress}%` }"
                />
              </div>
            </div>

            <ol class="p-3 sm:p-3.5 space-y-0">
              <li
                v-for="(step, idx) in steps"
                :key="step.key"
                class="relative flex gap-3"
              >
                <!-- Rail -->
                <div class="flex flex-col items-center w-7 shrink-0">
                  <div
                    :class="[
                      'w-7 h-7 rounded-full border-2 flex items-center justify-center text-[11px] font-semibold z-[1]',
                      nodeClass(step.status),
                    ]"
                  >
                    <Icon v-if="step.status === 'done'" icon="lucide:check" class="text-xs" />
                    <span v-else>{{ idx + 1 }}</span>
                  </div>
                  <div
                    v-if="idx < steps.length - 1"
                    class="w-px flex-1 min-h-[10px] my-1 bg-neutral-200"
                    :class="step.status === 'done' ? '!bg-emerald-300' : ''"
                  />
                </div>

                <!-- Step card -->
                <div
                  :class="[
                    'flex-1 mb-2 rounded-xl border transition-colors',
                    step.status === 'active'
                      ? 'border-neutral-200 bg-neutral-50/60 shadow-sm'
                      : 'border-neutral-100 bg-white',
                    step.status === 'todo' ? 'opacity-50' : '',
                  ]"
                >
                  <div class="px-3 py-2.5">
                    <div class="flex items-start justify-between gap-2">
                      <div class="min-w-0">
                        <p class="text-sm font-semibold text-neutral-900 leading-snug">
                          {{ step.title }}
                        </p>
                        <p class="text-xs text-neutral-500 mt-0.5 leading-snug">{{ step.meta }}</p>
                      </div>
                      <span
                        :class="[
                          'shrink-0 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium',
                          pill(step.status).cls,
                        ]"
                      >
                        {{ pill(step.status).label }}
                      </span>
                    </div>

                    <!-- Actions only on active step -->
                    <div
                      v-if="step.body && step.status === 'active'"
                      class="mt-3 pt-3 border-t border-dashed border-neutral-200 space-y-2"
                    >
                      <template v-if="step.body === 'accept'">
                        <p class="text-xs text-neutral-500 leading-relaxed">
                          Terima untuk mulai tangani, atau alihkan ke unit lain.
                        </p>
                        <button
                          type="button"
                          class="w-full h-11 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 active:scale-[0.99] transition"
                          @click="scenario = 'needs_share'"
                        >
                          Terima pesanan
                        </button>
                        <button
                          type="button"
                          class="w-full h-10 rounded-lg border border-neutral-200 bg-white text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                          @click="flash('Alihkan (mock)')"
                        >
                          Tidak bisa · alihkan
                        </button>
                      </template>

                      <template v-else-if="step.body === 'share'">
                        <p class="text-xs text-neutral-500 leading-relaxed">
                          Buat link GPS untuk HP lapangan. Pelapor melihat posisi di e-tiket.
                        </p>

                        <template v-if="!linkCreated">
                          <button
                            type="button"
                            class="w-full h-11 rounded-lg bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 active:scale-[0.99] transition"
                            @click="createLink"
                          >
                            Buat link share lokasi
                          </button>
                        </template>
                        <template v-else>
                          <div class="rounded-lg border border-neutral-200 bg-white px-3 py-2.5">
                            <div class="flex items-center justify-between gap-2">
                              <p class="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                                Link aktif
                              </p>
                              <span class="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700">
                                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Live
                              </span>
                            </div>
                            <p class="mt-1 text-xs font-mono text-neutral-800 break-all leading-snug">
                              {{ mockLink }}
                            </p>
                          </div>
                          <div class="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              class="h-10 inline-flex items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white text-xs font-semibold text-neutral-800 hover:bg-neutral-50"
                              @click="flash('Disalin')"
                            >
                              <Icon icon="lucide:copy" class="text-sm" />
                              Salin
                            </button>
                            <button
                              type="button"
                              class="h-10 inline-flex items-center justify-center gap-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700"
                              @click="flash('WhatsApp')"
                            >
                              <Icon icon="mdi:whatsapp" class="text-base" />
                              Kirim WA
                            </button>
                          </div>
                          <button
                            type="button"
                            class="w-full text-center text-xs font-medium text-neutral-400 hover:text-neutral-700 py-1"
                            @click="flash('Link diperbarui')"
                          >
                            Buat ulang link
                          </button>
                        </template>
                      </template>

                      <template v-else-if="step.body === 'arrive'">
                        <p class="text-xs text-neutral-500 leading-relaxed">
                          Tekan saat petugas sampai di lokasi pelapor.
                        </p>
                        <button
                          type="button"
                          class="w-full h-11 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
                          @click="scenario = 'arrived'"
                        >
                          Sudah sampai
                        </button>
                      </template>

                      <template v-else-if="step.body === 'complete'">
                        <p class="text-xs text-neutral-500 leading-relaxed">
                          Tutup kejadian setelah penanganan selesai.
                        </p>
                        <button
                          type="button"
                          class="w-full h-11 rounded-lg bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800"
                          @click="scenario = 'completed'"
                        >
                          Tandai selesai
                        </button>
                      </template>

                      <template v-else-if="step.body === 'report'">
                        <button
                          type="button"
                          class="w-full h-11 rounded-lg border border-neutral-200 bg-white text-sm font-semibold text-neutral-800 hover:bg-neutral-50 inline-flex items-center justify-center gap-2"
                          @click="flash('Buka laporan')"
                        >
                          <Icon icon="lucide:file-text" class="text-sm" />
                          Buka laporan
                        </button>
                      </template>
                    </div>
                  </div>
                </div>
              </li>
            </ol>
          </div>
        </aside>

        <!-- ─── RIGHT: Detail ───────────────────────────────────────── -->
        <section
          :class="[
            'lg:col-span-7 xl:col-span-8 space-y-4',
            mobilePane === 'steps' ? 'hidden lg:block' : 'block',
          ]"
        >
          <!-- Unit strip -->
          <div class="bg-white rounded-xl border border-neutral-200 px-4 sm:px-5 py-3.5 flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
              <Icon icon="mynaui:ambulance-solid" class="text-xl" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-neutral-900 truncate">PMI Demo Yogyakarta</p>
              <p class="text-xs text-neutral-500 mt-0.5 truncate">Ambulans · Dispatcher kab. · ETA ±12 mnt</p>
            </div>
            <span class="hidden sm:inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-800">
              Resmi
            </span>
          </div>

          <!-- Incident card (existing anatomy) -->
          <div class="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <div class="px-4 sm:px-5 py-3.5 border-b border-neutral-100">
              <p class="text-sm font-semibold text-neutral-900">Detail kejadian</p>
              <p class="text-sm text-neutral-500 mt-0.5 truncate">
                Budi Santoso · Jl. Malioboro No. 12, Yogyakarta
              </p>
            </div>

            <!-- Tabs -->
            <div class="px-4 sm:px-5 flex gap-1 border-b border-neutral-100">
              <button
                v-for="t in [
                  { id: 'info', label: 'Info' },
                  { id: 'history', label: 'Riwayat', count: 3 },
                ]"
                :key="t.id"
                type="button"
                :class="[
                  'px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                  detailTab === t.id
                    ? 'border-neutral-900 text-neutral-900'
                    : 'border-transparent text-neutral-400 hover:text-neutral-700',
                ]"
                @click="detailTab = t.id as DetailTab"
              >
                {{ t.label }}
                <span v-if="t.count" class="ml-1 text-xs text-neutral-400">{{ t.count }}</span>
              </button>
            </div>

            <div v-if="detailTab === 'info'">
              <!-- Preview rows -->
              <div class="px-4 sm:px-5 py-4 space-y-0 divide-y divide-neutral-100">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4">
                  <div>
                    <p class="text-xs font-medium text-neutral-400">Pelapor</p>
                    <p class="mt-1 text-sm font-medium text-neutral-900">Budi Santoso</p>
                    <p class="text-sm text-neutral-500">0812 3456 7891</p>
                  </div>
                  <div>
                    <p class="text-xs font-medium text-neutral-400">Kontak cepat</p>
                    <div class="mt-1.5 flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        class="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                        @click="flash('Telepon')"
                      >
                        <Icon icon="lucide:phone" class="text-sm" />
                        Telepon
                      </button>
                      <button
                        type="button"
                        class="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700"
                        @click="flash('WhatsApp')"
                      >
                        <Icon icon="mdi:whatsapp" class="text-sm" />
                        WA
                      </button>
                    </div>
                  </div>
                </div>

                <div class="py-4">
                  <p class="text-xs font-medium text-neutral-400">Kondisi / kejadian</p>
                  <p class="mt-1.5 text-sm text-neutral-800 leading-relaxed">
                    Korban jatuh dari motor di depan Malioboro Mall. Sadar, diduga patah lengan kanan.
                    Butuh ambulan segera. Ada 1 saksi di lokasi.
                  </p>
                </div>

                <div class="py-4">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <p class="text-xs font-medium text-neutral-400">Lokasi</p>
                      <p class="mt-1.5 text-sm text-neutral-800 leading-relaxed">
                        Jl. Malioboro No. 12, Gedong Tengen, Yogyakarta
                      </p>
                      <p class="mt-1 text-xs font-mono text-neutral-400">-7.7928, 110.3658</p>
                    </div>
                    <button
                      type="button"
                      class="shrink-0 inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                      @click="flash('Maps')"
                    >
                      <Icon icon="lucide:navigation" class="text-sm" />
                      Maps
                    </button>
                  </div>

                  <div class="mt-3 h-44 sm:h-52 rounded-lg border border-neutral-200 bg-neutral-100 relative overflow-hidden">
                    <div
                      class="absolute inset-0 opacity-40"
                      style="background-image: radial-gradient(#a3a3a3 1px, transparent 1px); background-size: 14px 14px;"
                    />
                    <div class="absolute inset-0 flex items-center justify-center">
                      <div class="flex flex-col items-center gap-2">
                        <div class="w-9 h-9 rounded-full bg-white border border-neutral-200 shadow-sm flex items-center justify-center">
                          <Icon icon="lucide:map-pin" class="text-emergency-600 text-base" />
                        </div>
                        <p class="text-[11px] text-neutral-500">Peta lokasi pelapor</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="pt-4">
                  <p class="text-xs font-medium text-neutral-400 mb-2">Foto laporan</p>
                  <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div class="aspect-[4/3] rounded-lg border border-neutral-200 bg-neutral-100 flex items-center justify-center">
                      <Icon icon="lucide:image" class="text-xl text-neutral-300" />
                    </div>
                    <div class="aspect-[4/3] rounded-lg border border-dashed border-neutral-200 bg-neutral-50 flex items-center justify-center text-[11px] text-neutral-400">
                      +1 foto
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="px-4 sm:px-5 py-4">
              <ol class="relative space-y-0">
                <li
                  v-for="(ev, i) in [
                    { t: '20:14', title: 'Pesanan dibuat', desc: 'Dari e-tiket warga' },
                    { t: '20:15', title: 'Ditawarkan ke PMI Demo', desc: 'Dispatch round 1' },
                    { t: '20:16', title: 'Diterima unit', desc: 'Siap berangkat' },
                  ]"
                  :key="i"
                  class="flex gap-3 pb-4 last:pb-0"
                >
                  <div class="w-11 shrink-0 text-xs tabular-nums text-neutral-400 pt-0.5">{{ ev.t }}</div>
                  <div class="relative flex flex-col items-center mr-1">
                    <span class="w-2 h-2 rounded-full bg-neutral-300 mt-1.5" />
                    <span v-if="i < 2" class="w-px flex-1 bg-neutral-200 mt-1" />
                  </div>
                  <div class="min-w-0 pb-1">
                    <p class="text-sm font-medium text-neutral-900">{{ ev.title }}</p>
                    <p class="text-xs text-neutral-500 mt-0.5">{{ ev.desc }}</p>
                  </div>
                </li>
              </ol>
            </div>
          </div>

          <p class="text-center lg:text-left text-[11px] text-neutral-400 px-1 pb-2">
            Desktop: 2 kolom · Mobile: tab Langkah / Detail
          </p>
        </section>
      </div>
    </div>
  </div>
</template>
