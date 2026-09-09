<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { appToast } from "~/utils/appToast";

const reviewSheet = useReviewSheetStore();
const config = useRuntimeConfig();
const baseUrl = config.public.apiBaseUrl;
const toast = appToast();

const unitHelpful = ref<boolean | null>(null);
const appHelpful = ref<boolean | null>(null);
const comment = ref("");
const submitting = ref(false);
const submitted = ref(false);

watch(() => reviewSheet.isOpen, (v) => {
  if (v) {
    unitHelpful.value = null;
    appHelpful.value = null;
    comment.value = "";
    submitted.value = false;
  }
});

async function submit() {
  if (unitHelpful.value === null) return;
  submitting.value = true;
  toast.loading("Mengirim penilaian...");
  try {
    await $fetch(`${baseUrl}/api/v1/feedback/`, {
      method: "POST",
      body: {
        emergency_id: reviewSheet.emergencyId,
        unit_name: reviewSheet.unitName,
        unit_helpful: unitHelpful.value,
        app_helpful: appHelpful.value,
        call_type: reviewSheet.callType,
        comment: comment.value.trim(),
      },
    });
    toast.success("Terima kasih atas penilaianmu!");
    submitted.value = true;
    setTimeout(() => reviewSheet.onClose(), 1800);
  } catch {
    toast.error("Gagal mengirim penilaian");
    reviewSheet.onClose();
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <CoreSheet :is-open="reviewSheet.isOpen" :snap-points="[600, 0]" scrollable is-overlay @close="reviewSheet.onClose()">
    <template #header>
      <div class="ui-sheet-header">
        <h1 class="ui-sheet-title">Beri Penilaian</h1>
        <button type="button" class="ui-close-btn" @click="reviewSheet.onClose()">
          <Icon icon="ion:close" class="text-xl" />
        </button>
      </div>
    </template>

    <div class="px-4 py-4">
      <!-- Success state -->
      <div v-if="submitted" class="flex flex-col items-center justify-center py-8 gap-3 text-center">
        <div class="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
          <Icon icon="lucide:check-circle" class="text-green-500 text-3xl" />
        </div>
        <p class="font-semibold ui-text-primary">Terima kasih!</p>
        <p class="text-sm ui-text-secondary">Penilaianmu membantu kami berkembang.</p>
      </div>

      <!-- Review form -->
      <div v-else class="space-y-5">
        <p class="text-sm ui-text-secondary leading-relaxed">
          Semoga kamu baik-baik saja. Bantu kami dengan menjawab pertanyaan singkat berikut.
        </p>

        <!-- Unit helpful -->
        <div>
          <p class="text-sm font-semibold text-neutral-800 mb-3">
            Apakah
            <span class="text-red-500">{{ reviewSheet.unitName || 'unit ini' }}</span>
            membantu?
          </p>
          <div class="flex gap-3">
            <button
              :class="[
                'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-all',
                unitHelpful === true
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300',
              ]"
              @click="unitHelpful = true"
            >
              <Icon icon="lucide:thumbs-up" class="text-base" />
              Ya, membantu
            </button>
            <button
              :class="[
                'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-all',
                unitHelpful === false
                  ? 'border-red-400 bg-red-50 text-red-600'
                  : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300',
              ]"
              @click="unitHelpful = false"
            >
              <Icon icon="lucide:thumbs-down" class="text-base" />
              Tidak
            </button>
          </div>
        </div>

        <!-- App helpful -->
        <div>
          <p class="text-sm font-semibold text-neutral-800 mb-3">Apakah aplikasi ini berguna untukmu?</p>
          <div class="flex gap-2">
            <button
              :class="[
                'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 text-sm font-medium transition-all',
                appHelpful === true
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300',
              ]"
              @click="appHelpful = true"
            >
              <Icon icon="lucide:smile" class="text-base" />
              Ya
            </button>
            <button
              :class="[
                'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 text-sm font-medium transition-all',
                appHelpful === false
                  ? 'border-red-400 bg-red-50 text-red-600'
                  : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300',
              ]"
              @click="appHelpful = false"
            >
              <Icon icon="lucide:frown" class="text-base" />
              Tidak
            </button>
            <button
              :class="[
                'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 text-sm font-medium transition-all',
                appHelpful === null && unitHelpful !== null
                  ? 'border-neutral-200 bg-white text-neutral-600'
                  : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300',
              ]"
              @click="appHelpful = null"
            >
              <Icon icon="lucide:meh" class="text-base" />
              Biasa
            </button>
          </div>
        </div>

        <!-- Comment -->
        <div>
          <p class="text-sm font-semibold text-neutral-800 mb-2">Komentar <span class="font-normal text-neutral-400 text-xs">(opsional)</span></p>
          <textarea
            v-model="comment"
            rows="3"
            maxlength="500"
            placeholder="Ceritakan pengalamanmu..."
            class="ui-field resize-none"
          />
          <p class="text-right text-xs text-neutral-300 mt-1">{{ comment.length }}/500</p>
        </div>

        <!-- Submit -->
        <button
          :disabled="unitHelpful === null || submitting"
          class="w-full py-3 rounded-xl bg-red-500 text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-opacity"
          @click="submit"
        >
          <Icon v-if="submitting" icon="lucide:loader-2" class="animate-spin text-base" />
          Kirim Penilaian
        </button>

        <button
          class="w-full text-xs text-neutral-400 py-1"
          @click="reviewSheet.onClose()"
        >
          Lewati
        </button>
      </div>
    </div>
  </CoreSheet>
</template>
