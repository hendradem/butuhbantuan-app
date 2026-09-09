<script setup lang="ts">
import { Icon } from "@iconify/vue";

const props = defineProps<{
  unitName?: string;
  requesterPhone?: string;
  escalationHotline?: string;
  escalationLabel?: string;
  dispatchStatus?: string;
  showReassign?: boolean;
  showEscalate?: boolean;
  escalating?: boolean;
  /** Tighter layout for queue/sla cards */
  compact?: boolean;
}>();

const emit = defineEmits<{
  reassign: [];
  escalate: [];
}>();

const isEscalated = computed(() => props.dispatchStatus === "escalated");

const telHref = computed(() => {
  const raw = String(props.escalationHotline || "").replace(/\D/g, "");
  if (!raw) return "";
  return `tel:${raw}`;
});

function waRequester() {
  const raw = String(props.requesterPhone || "").replace(/\D/g, "");
  if (!raw) return;
  let digits = raw;
  if (digits.startsWith("0")) digits = "62" + digits.slice(1);
  else if (!digits.startsWith("62")) digits = "62" + digits;
  const text = encodeURIComponent(
    "Halo, kami dari pusat bantuan. Tiket Anda belum mendapat respons unit. Mohon konfirmasi kondisi terkini."
  );
  window.open(`https://wa.me/${digits}?text=${text}`, "_blank", "noopener,noreferrer");
}
</script>

<template>
  <div
    :class="[
      'rounded-xl border border-amber-200 bg-amber-50/80 space-y-3',
      compact ? 'px-3 py-3' : 'px-4 py-3.5',
    ]"
  >
    <div class="flex items-start gap-3">
      <div
        :class="[
          'rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 ring-1 ring-amber-200',
          compact ? 'w-8 h-8' : 'w-9 h-9',
        ]"
      >
        <Icon :icon="isEscalated ? 'lucide:phone-call' : 'lucide:hourglass'" class="text-base" />
      </div>
      <div class="min-w-0">
        <p :class="compact ? 'text-xs font-semibold text-amber-900' : 'text-sm font-semibold text-amber-900'">
          {{ isEscalated ? "Dieskalasi ke pusat darurat" : "Dispatch habis — belum ada unit yang merespons" }}
        </p>
        <p class="text-xs text-amber-800/80 mt-0.5 leading-relaxed">
          <template v-if="isEscalated">
            Tiket tetap hidup.
            <span v-if="escalationLabel"> Hubungi {{ escalationLabel }}</span>
            <span v-if="escalationHotline"> · {{ escalationHotline }}</span>.
          </template>
          <template v-else>
            <template v-if="compact">
              Urutan: Alihkan → Eskalasi PSC → Hubungi pelapor
              <span v-if="unitName"> · terakhir {{ unitName }}</span>
            </template>
            <template v-else>
              Cascade lokal → dispatcher kab → provinsi → nearby sudah dijalankan
              <span v-if="unitName"> (terakhir: {{ unitName }})</span>.
              Lanjutkan manual atau eskalasi PSC agar warga tetap tertangani.
            </template>
          </template>
        </p>
      </div>
    </div>

    <ol v-if="!isEscalated && !compact" class="text-xs text-amber-900/90 space-y-1.5 list-decimal list-inside">
      <li>Alihkan ke unit lain (auto-recommend atau pilih manual)</li>
      <li>Eskalasi ke PSC / hotline pusat (tiket tetap pending)</li>
      <li>Hubungi pelapor via WhatsApp untuk update kondisi</li>
    </ol>

    <div class="flex flex-wrap gap-2 pt-0.5">
      <a
        v-if="telHref"
        :href="telHref"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700 text-white hover:bg-emerald-800 transition-colors"
      >
        <Icon icon="lucide:phone" class="text-sm" />
        Telpon {{ escalationHotline }}
      </a>
      <button
        v-if="showReassign && !isEscalated"
        type="button"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-700 text-white hover:bg-amber-800 transition-colors"
        @click="emit('reassign')"
      >
        <Icon icon="lucide:arrow-right-left" class="text-sm" />
        Alihkan unit
      </button>
      <button
        v-if="showEscalate && !isEscalated"
        type="button"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-amber-900 border border-amber-300 hover:bg-amber-100 transition-colors disabled:opacity-50"
        :disabled="escalating"
        @click="emit('escalate')"
      >
        <Icon icon="lucide:siren" class="text-sm" />
        Eskalasi PSC
      </button>
      <button
        v-if="requesterPhone"
        type="button"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-amber-900 border border-amber-300 hover:bg-amber-100 transition-colors"
        @click="waRequester"
      >
        <Icon icon="lucide:message-circle" class="text-sm" />
        WA pelapor
      </button>
    </div>
  </div>
</template>
