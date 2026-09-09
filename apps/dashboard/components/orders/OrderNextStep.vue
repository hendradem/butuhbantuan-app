<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { placeAnchoredMenu } from "~/utils/placeAnchoredMenu";
import { canAcceptTicket, type UnitProfile } from "~/composables/useUnitOps";

export type NextStepAction =
  | "accept"
  | "reject"
  | "reassign"
  | "escalate"
  | "cancel"
  | "start"
  | "arrive"
  | "complete"
  | "report";

type StepStatus = "done" | "active" | "todo";

const props = defineProps<{
  order: any;
  mode: "unit" | "admin";
  acting?: boolean;
  updating?: boolean;
  hasReport?: boolean;
}>();

const emit = defineEmits<{
  action: [NextStepAction];
  refreshed: [];
}>();

const { emergencyUUID } = useUnitAuth();
const { data: unitProfile } = useNuxtData<UnitProfile>("unit-profile");

const canAcceptOffer = computed(() => {
  if (props.mode === "admin") return true;
  const profile: UnitProfile = {
    ...(unitProfile.value || {}),
    emergency_uuid: unitProfile.value?.emergency_uuid || emergencyUUID.value || undefined,
  };
  return canAcceptTicket(profile, props.order);
});

const moreOpen = ref(false);
const morePos = ref({ top: 0, right: 0, openUp: false });

function toggleMore(e: MouseEvent) {
  if (moreOpen.value) {
    moreOpen.value = false;
    return;
  }
  const el = e.currentTarget as HTMLElement | null;
  if (!el) {
    moreOpen.value = true;
    return;
  }
  const rect = el.getBoundingClientRect();
  const pos = placeAnchoredMenu(rect, { menuHeight: 200, alignRight: true });
  morePos.value = { top: pos.top, right: pos.right, openUp: pos.openUp };
  moreOpen.value = true;
}

function closeMore() {
  moreOpen.value = false;
}

const trackActive = computed(() => {
  const enabled = props.order?.track_enabled_at;
  const expires = props.order?.track_expires_at;
  if (!enabled || !expires) return false;
  return new Date(expires).getTime() > Date.now();
});

function clockLabel(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

const checklist = computed(() => {
  const o = props.order;
  const status = o?.status || "";
  const accepted = !!o?.accepted_at || ["accepted", "in_progress", "completed"].includes(status);
  const arrived = !!o?.arrived_at;
  const completed = status === "completed";
  // Soft-close clears live expiry but keeps token/enabled_at; also treat arrived/completed
  // as past the share step so checklist never soft-locks on step 2.
  const trackDone =
    completed ||
    arrived ||
    trackActive.value ||
    !!o?.track_enabled_at ||
    !!o?.track_token;
  const unit = o?.unit_name ? ` · ${o.unit_name}` : "";

  return [
    {
      key: "accepted",
      label: "Terima pesanan",
      meta: accepted ? `Diterima${unit}` : "Konfirmasi unit",
      done: accepted,
    },
    {
      key: "track",
      label: "Link lokasi petugas",
      meta: trackDone
        ? trackActive.value
          ? "Live · petugas berbagi lokasi"
          : "Link dibuat"
        : "Wajib sebelum berangkat",
      done: trackDone,
      live: trackActive.value,
    },
    {
      key: "arrived",
      label: "Tiba di lokasi",
      meta: arrived
        ? trackActive.value
          ? `Di lokasi · GPS live${clockLabel(o?.arrived_at) ? ` · ${clockLabel(o.arrived_at)}` : ""}`
          : `Terkonfirmasi${clockLabel(o?.arrived_at) ? ` ${clockLabel(o.arrived_at)}` : ""}`
        : trackActive.value
          ? "Petugas dalam perjalanan"
          : "Konfirmasi saat sampai",
      done: arrived,
    },
    {
      key: "completed",
      label: "Selesai & laporan",
      meta: completed
        ? props.hasReport
          ? "Laporan tersimpan"
          : "Kejadian ditutup"
        : "Tutup kejadian",
      done: completed,
    },
  ];
});

type Phase = {
  key: string;
  title: string;
  hint: string;
  primary?: { action: NextStepAction; label: string; icon: string };
  /** Full share controls — only while creating the link. */
  showShare?: boolean;
  /** Compact Live status once link already exists. */
  showTrackStatus?: boolean;
  /** ShareTrackLink in copy-only row (arrive step) vs full create/WA. */
  shareCompact?: boolean;
  secondary: { action: NextStepAction; label: string }[];
};

const phase = computed<Phase>(() => {
  const o = props.order;
  const status = o?.status || "";
  const isUnit = props.mode === "unit";

  if (status === "cancelled") {
    return {
      key: "cancelled",
      title: "Pesanan dibatalkan",
      hint: "Tidak ada aksi lanjutan.",
      secondary: [],
    };
  }

  if (status === "completed") {
    return {
      key: "report",
      title: props.hasReport ? "Laporan siap" : "Tutup dengan laporan",
      hint: props.hasReport
        ? "Buka untuk cek atau lengkapi."
        : "Catat ringkas sebelum shift selesai.",
      primary: {
        action: "report",
        label: props.hasReport ? "Buka Laporan" : "Buat Laporan",
        icon: "lucide:file-text",
      },
      secondary: [],
    };
  }

  if (status === "pending") {
    if (isUnit && canAcceptOffer.value) {
      return {
        key: "accept",
        title: "Ambil pesanan ini?",
        hint: "Terima untuk tangani, atau cari unit lain.",
        primary: { action: "accept", label: "Terima", icon: "lucide:check" },
        secondary: [
          { action: "reject", label: "Tidak bisa · cari unit lain" },
          { action: "reassign", label: "Pilih unit manual" },
        ],
      };
    }
    if (isUnit) {
      return {
        key: "ops-pending-other",
        title: `Menunggu ${o?.unit_name || "unit ditawarkan"}`,
        hint: "Offer ini bukan untuk unit Anda. Alihkan atau tolak supaya cascade lanjut.",
        primary: { action: "reassign", label: "Alihkan", icon: "lucide:git-branch" },
        secondary: [
          { action: "reject", label: "Tolak & alihkan" },
        ],
      };
    }
    return {
      key: "supervise-pending",
      title: "Unit belum menerima",
      hint: "Pantau atau alihkan ke unit lain.",
      primary: { action: "reassign", label: "Cari unit lain", icon: "lucide:git-branch" },
      secondary: [
        { action: "accept", label: "Terima (override)" },
        { action: "reject", label: "Tolak & alihkan" },
        { action: "escalate", label: "Eskalasi PSC" },
        { action: "cancel", label: "Batalkan kejadian" },
      ],
    };
  }

  // Reassign only while pending/accepted — API rejects in_progress+.
  const canReassign = status === "pending" || status === "accepted";
  const reassignSecondary = canReassign
    ? ([{ action: "reassign" as const, label: isUnit ? "Alihkan ke unit lain" : "Alihkan unit" }])
    : [];

  if (!o?.arrived_at) {
    const needsShare = !trackActive.value;
    // Share step only — link controls live here; "Sudah Sampai" is the next checklist step.
    if (needsShare && (status === "accepted" || status === "in_progress")) {
      return {
        key: "share",
        title: "Bagikan lokasi petugas",
        hint: "Buat link GPS untuk HP lapangan. Pelapor melihat posisi di e-tiket.",
        showShare: true,
        secondary: isUnit
          ? reassignSecondary
          : [
              ...reassignSecondary,
              { action: "cancel", label: "Batalkan kejadian" },
            ],
      };
    }
    if (status === "accepted" && isUnit) {
      return {
        key: "dispatch",
        title: "Petugas menuju lokasi",
        hint: "Tekan Sudah Sampai saat di lokasi.",
        primary: { action: "arrive", label: "Sudah Sampai", icon: "lucide:map-pin-check" },
        showShare: true,
        shareCompact: true,
        showTrackStatus: trackActive.value,
        secondary: reassignSecondary,
      };
    }
    return {
      key: "enroute",
      title: "Petugas menuju lokasi",
      hint: isUnit
        ? "Tekan Sudah Sampai saat di lokasi."
        : "Konfirmasi saat unit tiba.",
      primary: isUnit
        ? { action: "arrive", label: "Sudah Sampai", icon: "lucide:map-pin-check" }
        : { action: "arrive", label: "Tandai sudah sampai", icon: "lucide:map-pin-check" },
      showShare: trackActive.value || !!o?.track_enabled_at || !!o?.track_token,
      shareCompact: true,
      showTrackStatus: trackActive.value,
      secondary: isUnit
        ? reassignSecondary
        : [
            ...reassignSecondary,
            { action: "cancel", label: "Batalkan kejadian" },
          ],
    };
  }

  return {
    key: "onsite",
    title: "Selesaikan",
    hint: isUnit
      ? "GPS petugas tetap live. Selesaikan di sini atau dari link lapangan."
      : "Unit di lokasi — pantau GPS hingga selesai (atau petugas tekan Selesai di link).",
    primary: isUnit
      ? { action: "complete", label: "Tandai Selesai", icon: "lucide:check-circle" }
      : canReassign
        ? { action: "reassign", label: "Alihkan (jika perlu)", icon: "lucide:git-branch" }
        : undefined,
    showTrackStatus: trackActive.value,
    secondary: isUnit ? [] : [{ action: "cancel", label: "Batalkan kejadian" }],
  };
});

const busy = computed(() => !!props.acting || !!props.updating);
const doneCount = computed(() => checklist.value.filter((c) => c.done).length);
const progress = computed(() =>
  checklist.value.length
    ? Math.round((doneCount.value / checklist.value.length) * 100)
    : 0,
);

/** First incomplete checklist item; when all done keep last step expandable if phase still has actions. */
const activeStepKey = computed(() => {
  const status = props.order?.status || "";
  if (status === "completed") {
    return "completed";
  }
  const first = checklist.value.find((c) => !c.done);
  if (first) return first.key;
  if (phase.value.primary) {
    return checklist.value[checklist.value.length - 1]?.key ?? null;
  }
  return null;
});

const steps = computed(() =>
  checklist.value.map((item) => {
    let status: StepStatus = "todo";
    if (item.key === activeStepKey.value) status = "active";
    else if (item.done) status = "done";
    return { ...item, status };
  }),
);

const showFieldActions = computed(() => {
  // Maps / WA / Tel only while en-route to the scene — not on complete/report.
  if (props.order?.arrived_at) return false;
  const s = props.order?.status;
  return s === "accepted" || s === "in_progress";
});

const hasFieldGps = computed(() => {
  const lat = Number(props.order?.responder_lat);
  const lng = Number(props.order?.responder_lng);
  return Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
});

const mapsUrl = computed(() => {
  const lat = Number(props.order?.requester_lat);
  const lng = Number(props.order?.requester_lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return "";
  return `https://www.google.com/maps?q=${lat},${lng}`;
});

const waUrl = computed(() => {
  const raw = String(props.order?.requester_phone || "").replace(/\D/g, "");
  if (!raw) return "";
  let digits = raw;
  if (digits.startsWith("0")) digits = "62" + digits.slice(1);
  else if (!digits.startsWith("62")) digits = "62" + digits;
  const name = props.order?.requester_name || "Pelapor";
  const ticket = props.order?.ticket_number || "";
  const loc = props.order?.location || "";
  const maps = mapsUrl.value;
  const text = [
    `Halo ${name}, kami dari unit darurat terkait tiket ${ticket}.`,
    loc ? `Lokasi: ${loc}` : null,
    maps ? `Maps: ${maps}` : null,
    "Mohon tetap di tempat yang aman.",
  ]
    .filter(Boolean)
    .join("\n");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
});

const telUrl = computed(() => {
  const raw = String(props.order?.requester_phone || "").replace(/\D/g, "");
  if (!raw) return "";
  return `tel:${raw}`;
});

const contactLinks = computed(() => {
  const links: { key: string; href: string; label: string; icon: string; iconClass?: string }[] = [];
  if (mapsUrl.value) {
    links.push({ key: "maps", href: mapsUrl.value, label: "Maps", icon: "lucide:navigation" });
  }
  if (waUrl.value) {
    links.push({
      key: "wa",
      href: waUrl.value,
      label: "WA",
      icon: "mdi:whatsapp",
      iconClass: "text-green-600",
    });
  }
  if (telUrl.value) {
    links.push({ key: "tel", href: telUrl.value, label: "Tel", icon: "lucide:phone" });
  }
  return links;
});

function nodeClass(st: StepStatus) {
  if (st === "done") return "bg-emerald-600 border-emerald-600 text-white";
  if (st === "active") {
    return "bg-white border-neutral-900 text-neutral-900 shadow-[0_0_0_3px_rgba(23,23,23,0.06)]";
  }
  return "bg-neutral-50 border-neutral-200 text-neutral-300";
}

function pill(st: StepStatus) {
  if (st === "done") {
    return { label: "Selesai", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" };
  }
  if (st === "active") {
    return { label: "Sekarang", cls: "bg-neutral-900 text-white border-neutral-900" };
  }
  return { label: "Berikutnya", cls: "bg-white text-neutral-400 border-neutral-200" };
}

function onPrimary() {
  if (!phase.value.primary || busy.value) return;
  emit("action", phase.value.primary.action);
}

function onSecondary(action: NextStepAction) {
  moreOpen.value = false;
  emit("action", action);
}
</script>

<template>
  <div
    v-if="order?.status !== 'cancelled'"
    class="bg-white rounded-xl border border-neutral-200 overflow-hidden"
  >
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
                <div class="flex items-center gap-2 min-w-0 flex-wrap">
                  <p class="text-sm font-semibold text-neutral-900 leading-snug">
                    {{ step.label }}
                  </p>
                  <span
                    v-if="step.key === 'track' && step.live"
                    class="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700"
                  >
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live
                  </span>
                </div>
                <p v-if="step.meta" class="text-xs text-neutral-500 mt-0.5 leading-snug">
                  {{ step.meta }}
                </p>
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
              v-if="step.status === 'active'"
              class="mt-3 pt-3 border-t border-dashed border-neutral-200 space-y-2"
            >
              <p class="text-xs text-neutral-500 leading-relaxed">
                {{ phase.hint }}
              </p>

              <div v-if="phase.primary" class="space-y-2">
                <button
                  type="button"
                  class="w-full h-11 rounded-lg bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 active:scale-[0.99] transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  :class="{
                    '!bg-emergency-600 hover:!bg-emergency-700': ['accept', 'arrive', 'complete'].includes(phase.primary.action),
                  }"
                  :disabled="busy"
                  @click="onPrimary"
                >
                  <Icon
                    :icon="busy ? 'lucide:loader-2' : phase.primary.icon"
                    :class="busy ? 'animate-spin text-sm' : 'text-base'"
                  />
                  {{ phase.primary.label }}
                </button>
              </div>

              <template v-if="phase.secondary.length">
                <button
                  v-if="phase.secondary.length === 1"
                  type="button"
                  class="w-full h-10 rounded-lg border border-neutral-200 bg-white text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                  :disabled="busy"
                  @click="onSecondary(phase.secondary[0].action)"
                >
                  {{ phase.secondary[0].label }}
                </button>
                <button
                  v-else
                  type="button"
                  class="w-full h-10 rounded-lg border border-neutral-200 bg-white text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                  :disabled="busy"
                  @click="toggleMore"
                >
                  Lainnya
                </button>
              </template>

              <div
                v-if="showFieldActions && contactLinks.length && !phase.showShare && !phase.showTrackStatus"
                class="flex gap-2"
              >
                <a
                  v-for="link in contactLinks"
                  :key="link.key"
                  :href="link.href"
                  :target="link.key === 'tel' ? undefined : '_blank'"
                  :rel="link.key === 'tel' ? undefined : 'noopener noreferrer'"
                  class="flex-1 inline-flex items-center justify-center gap-1.5 h-10 px-3 text-sm font-semibold text-neutral-700 bg-white rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors"
                >
                  <Icon :icon="link.icon" :class="['text-base', link.iconClass]" />
                  {{ link.label }}
                </a>
              </div>

              <!-- Share / copy link while creating OR after link is live (until arrived) -->
              <div v-if="phase.showShare">
                <ShareTrackLink
                  :order="order"
                  :mode="mode"
                  :compact="!!phase.shareCompact"
                  @refreshed="emit('refreshed')"
                />
              </div>
              <div
                v-else-if="phase.showTrackStatus && !hasFieldGps"
                class="rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 flex items-center gap-2"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <p class="text-[11px] font-medium text-emerald-800 leading-snug">
                  Menunggu GPS lapangan…
                </p>
              </div>
            </div>
          </div>
        </div>
      </li>
    </ol>

    <Teleport to="body">
      <div
        v-if="moreOpen"
        class="fixed inset-0 z-[998]"
        @click="closeMore"
      />
      <div
        v-if="moreOpen"
        class="fixed z-[999] min-w-[220px] bg-white border border-neutral-200 rounded-lg shadow-lg py-1"
        :style="{
          top: morePos.top + 'px',
          right: morePos.right + 'px',
          transform: morePos.openUp ? 'translateY(-100%)' : undefined,
        }"
        @click.stop
      >
        <button
          v-for="s in phase.secondary"
          :key="s.action"
          type="button"
          class="w-full text-left px-3 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50"
          @click="onSecondary(s.action)"
        >
          {{ s.label }}
        </button>
      </div>
    </Teleport>
  </div>
</template>
