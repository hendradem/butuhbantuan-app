<script setup lang="ts">
import { Icon } from "@iconify/vue";

export type RejectReasonCode = "busy" | "out_of_area" | "wrong_type" | "other";

const open = defineModel<boolean>("open", { default: false });

defineProps<{
  unitName?: string;
}>();

const emit = defineEmits<{
  confirm: [payload: { reason: RejectReasonCode; note: string }];
}>();

const reason = ref<RejectReasonCode>("busy");
const note = ref("");

const options: { value: RejectReasonCode; label: string; hint: string }[] = [
  { value: "busy", label: "Sedang sibuk", hint: "Unit sedang menangani kasus lain" },
  { value: "out_of_area", label: "Di luar wilayah", hint: "Lokasi di luar jangkauan unit" },
  { value: "wrong_type", label: "Salah jenis", hint: "Bukan jenis layanan unit ini" },
  { value: "other", label: "Lainnya", hint: "Sebutkan singkat di catatan" },
];

watch(open, (v) => {
  if (v) {
    reason.value = "busy";
    note.value = "";
  }
});

function submit() {
  emit("confirm", { reason: reason.value, note: note.value.trim() });
  open.value = false;
}
</script>

<template>
  <UiModal v-model:open="open" title="Tolak & alihkan">
    <template #trigger><span /></template>
    <div class="space-y-4 text-sm">
      <p class="text-neutral-600 text-xs leading-relaxed">
        Tiket warga tetap hidup — sistem akan menawarkan ke unit lain yang cocok.
        <span v-if="unitName">Unit saat ini: <b>{{ unitName }}</b>.</span>
      </p>

      <div class="space-y-2">
        <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Alasan</p>
        <label
          v-for="opt in options"
          :key="opt.value"
          :class="[
            'flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors',
            reason === opt.value
              ? 'border-emergency-300 bg-emergency-50/60'
              : 'border-neutral-200 hover:bg-neutral-50',
          ]"
        >
          <input v-model="reason" type="radio" class="mt-1" :value="opt.value" />
          <span>
            <span class="block font-medium text-neutral-900">{{ opt.label }}</span>
            <span class="block text-[11px] text-neutral-500 mt-0.5">{{ opt.hint }}</span>
          </span>
        </label>
      </div>

      <div>
        <label class="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Catatan (opsional)</label>
        <textarea
          v-model="note"
          rows="2"
          maxlength="200"
          placeholder="Detail singkat…"
          class="mt-1.5 w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-emergency-200 resize-none"
        />
      </div>

      <div class="flex justify-end gap-2 pt-1">
        <UiButton variant="secondary" size="sm" @click="open = false">Batal</UiButton>
        <UiButton size="sm" class="!bg-emergency-600 hover:!bg-emergency-700" @click="submit">
          <Icon icon="lucide:x" class="text-sm" />
          Tolak & alihkan
        </UiButton>
      </div>
    </div>
  </UiModal>
</template>
