<script setup lang="ts">
import { Icon } from "@iconify/vue";
import {
  assessmentSectionMeta,
  jenisPelayananOptionsForUnit,
  showJenisPelayananPicker,
} from "@butuhbantuan/utils";
import { closeAllSheets } from "~/utils/closeAllSheets";
import { appToast } from "~/utils/appToast";
import { displayEtaMinutes } from "~/utils/rankUnits";
import { saveUnitJobLink } from "~/utils/unitJobLink";
import { saveTicketAccess } from "~/utils/ticketAccess";
import { unitUsesWaDispatch } from "~/utils/waContact";
import {
  fallbackAssessmentTemplate,
  computeAcuity,
  type AssessmentValue,
} from "~/composables/useAssessmentTemplate";

type Section = "contact" | "triage" | "photo" | null;

const orderSheet = useOrderSheetStore();
const userLocation = useUserLocationStore();
const emergencyStore = useEmergencyStore();
const leaflet = useLeafletStore();
const config = useRuntimeConfig();
const toast = appToast();
const { name, phone, load: loadProfile, save: saveProfile } = useRequesterProfile();

const location = ref("");
const jenisPelayanan = ref("");
const assessmentAnswers = ref<Record<string, AssessmentValue>>({});
const assessmentNotes = ref("");
const submitting = ref(false);
const open = ref<Section>(null);
const nameInput = ref<HTMLInputElement | null>(null);
const photoInput = ref<HTMLInputElement | null>(null);
const checklistRef = ref<{
  buildPayload: () => {
    template_code: string;
    template_version: number;
    answers: Array<{ code: string; label: string; value: AssessmentValue }>;
    notes?: string;
  } | null;
  template: { category?: string; code?: string; indicators: Array<{ code: string; critical_if?: string; warn_if?: string }> } | null;
  section?: { title: string; notesRequired: boolean };
} | null>(null);

const { photoPreview, uploading: uploadingPhoto, uploadError, selectPhoto, uploadPhoto, removePhoto, hasPhoto, photoFile } =
  usePhotoUpload();

const selectedUnit = computed(() =>
  emergencyStore.filteredEmergency.find(
    (item: any) => String(item?.emergencyData?.id) === String(orderSheet.emergencyUUID),
  ),
);

const typeName = computed(
  () => String(selectedUnit.value?.emergencyData?.emergency_type?.name || "").trim(),
);
const typeIcon = computed(
  () => selectedUnit.value?.emergencyData?.emergency_type?.icon || "lucide:ambulance",
);

const unitModes = computed(() => {
  const raw = selectedUnit.value?.emergencyData?.tipe_emergency;
  return Array.isArray(raw) ? raw.map((t: string) => String(t || "").toLowerCase().trim()) : [];
});

const pelayananOptions = computed(() =>
  jenisPelayananOptionsForUnit(unitModes.value, typeName.value),
);

const showPelayananPicker = computed(
  () => showJenisPelayananPicker(typeName.value) && pelayananOptions.value.length > 0,
);

const needsPelayananChoice = computed(
  () => showPelayananPicker.value && pelayananOptions.value.length > 1,
);

const pelayananReady = computed(
  () => !showPelayananPicker.value || !!String(jenisPelayanan.value || "").trim(),
);

const canSubmit = computed(
  () =>
    !!String(name.value || "").trim() &&
    !!String(phone.value || "").trim() &&
    pelayananReady.value,
);

const etaMinutes = computed(() => {
  const sec = leaflet.routeTravel?.durationSec;
  if (sec != null && Number.isFinite(sec)) return Math.max(1, Math.round(sec / 60));
  return displayEtaMinutes(selectedUnit.value?.trip?.duration);
});

const contactSummary = computed(() => {
  const n = String(name.value || "").trim();
  const p = String(phone.value || "").trim();
  if (n && p) return `${n} · ${p}`;
  if (n) return n;
  if (p) return p;
  return "Ketuk untuk isi";
});

const effectiveJenis = computed(() => {
  if (jenisPelayanan.value) return jenisPelayanan.value;
  if (!showPelayananPicker.value) return "emergency";
  return "";
});

const assessmentSection = computed(() => {
  const tpl = checklistRef.value?.template;
  return assessmentSectionMeta(tpl?.category, tpl?.code ?? fallbackAssessmentTemplate(effectiveJenis.value).code);
});

const usesTriage = computed(() => assessmentSection.value.usesTriage);

const indicators = computed(
  () =>
    checklistRef.value?.template?.indicators ??
    fallbackAssessmentTemplate(effectiveJenis.value).indicators,
);

const acuity = computed(() =>
  computeAcuity(indicators.value, assessmentAnswers.value, assessmentSection.value.category),
);

const assessmentSummary = computed(() => {
  const filled = Object.values(assessmentAnswers.value).filter((v) => v === "yes" || v === "no").length;
  if (filled) return `${filled} jawaban · ${assessmentSection.value.title}`;
  if (assessmentNotes.value.trim()) return "Catatan diisi";
  return "Ketuk untuk isi";
});

const photoSummary = computed(() => (photoPreview.value ? "1 foto" : "Belum ada"));

const isWaOnly = computed(
  () => orderSheet.waDispatch || unitUsesWaDispatch(selectedUnit.value),
);

watch(
  () => orderSheet.isOpen,
  (v) => {
    if (v) {
      loadProfile();
      location.value = userLocation.fullAddress ?? "";
      assessmentAnswers.value = {};
      assessmentNotes.value = "";
      open.value = null;
      removePhoto();
      syncJenisPelayanan();
    }
  },
);

function syncJenisPelayanan() {
  const opts = pelayananOptions.value;
  if (!showPelayananPicker.value) {
    jenisPelayanan.value = "";
    return;
  }
  if (opts.length === 1) {
    jenisPelayanan.value = opts[0].code;
    return;
  }
  if (!opts.some((o) => o.code === jenisPelayanan.value)) {
    jenisPelayanan.value = "";
  }
}

watch(pelayananOptions, syncJenisPelayanan, { immediate: true });

function selectJenisPelayanan(code: string) {
  if (code === jenisPelayanan.value) return;
  jenisPelayanan.value = code;
  assessmentAnswers.value = {};
  assessmentNotes.value = "";
}

watch(effectiveJenis, (next, prev) => {
  if (next && prev && next !== prev) {
    assessmentAnswers.value = {};
    assessmentNotes.value = "";
  }
});

async function toggle(section: Exclude<Section, null>) {
  open.value = open.value === section ? null : section;
  if (section === "contact" && open.value === "contact") {
    await nextTick();
    nameInput.value?.focus();
  }
}

function cancel() {
  orderSheet.onClose();
}

async function submit() {
  if (!canSubmit.value) {
    if (!pelayananReady.value) {
      toast.error("Pilih jenis pelayanan");
      return;
    }
    toast.error("Lengkapi nama dan nomor HP");
    open.value = "contact";
    await nextTick();
    nameInput.value?.focus();
    return;
  }
  submitting.value = true;
  toast.loading("Membuat laporan...");
  try {
    let photoUrl: string | undefined;
    if (hasPhoto.value || photoFile.value) {
      const uploaded = await uploadPhoto(config.public.apiBaseUrl as string);
      if (!uploaded) {
        toast.dismiss();
        toast.error(uploadError.value || "Gagal mengunggah foto — coba foto lain (JPG/PNG)");
        return;
      }
      photoUrl = uploaded;
    }

    const assessment = checklistRef.value?.buildPayload() ?? undefined;
    if (assessmentSection.value.notesRequired && !String(assessmentNotes.value || "").trim()) {
      toast.dismiss();
      toast.error("Lengkapi lokasi & tujuan jenazah");
      open.value = "triage";
      return;
    }

    const res = await $fetch<{
      data: {
        ticket_number?: string;
        track_token?: string;
        public_token?: string;
        emergency_uuid?: string;
        wa_dispatch?: boolean;
      };
    }>(`${config.public.apiBaseUrl}/api/v1/order/`, {
      method: "POST",
      body: {
        emergency_uuid: orderSheet.emergencyUUID,
        unit_name: orderSheet.unitName,
        requester_name: name.value,
        requester_phone: phone.value,
        jenis_pelayanan: effectiveJenis.value || undefined,
        location: location.value,
        condition: assessment ? "" : assessmentNotes.value.trim(),
        assessment,
        photo_url: photoUrl,
        requester_lat: userLocation.lat,
        requester_lng: userLocation.long,
      },
    });
    toast.dismiss();
    saveProfile();

    const live = useEmergencyStore().filteredEmergency.find(
      (item: any) => String(item?.emergencyData?.id) === String(orderSheet.emergencyUUID),
    );
    if (live) {
      useRecentUnits().rememberFromEmergency(live, "order");
    } else if (orderSheet.emergencyUUID) {
      useRecentUnits().rememberFromEmergency(
        {
          emergencyData: {
            id: orderSheet.emergencyUUID,
            name: orderSheet.unitName,
            address: {
              regency_id: userLocation.currentRegion.regency.id,
              regency: userLocation.currentRegion.regency.name,
            },
          },
        },
        "order",
      );
    }

    const ticketNumber = res.data?.ticket_number ?? "";
    if (!ticketNumber) {
      toast.error("Tiket dibuat tapi nomor tidak diterima. Coba lagi.");
      return;
    }

    const token = String(res.data?.track_token || "").trim();
    const unitId = String(res.data?.emergency_uuid || orderSheet.emergencyUUID || "").trim();
    const publicToken = String(res.data?.public_token || "").trim();
    if (token) saveUnitJobLink(ticketNumber, token, unitId);

    const waOnly = isWaOnly.value || res.data?.wa_dispatch === true;

    closeAllSheets();
    toast.success(
      waOnly
        ? "Laporan terkirim. Kirim ke WhatsApp unit supaya petugas terima tugas."
        : "Laporan terkirim",
    );
    if (publicToken) {
      const query: Record<string, string> = {};
      if (orderSheet.callType === "whatsapp") query.via = "whatsapp";
      if (orderSheet.callNumber) query.to = orderSheet.callNumber;
      saveTicketAccess(publicToken, phone.value);
      await navigateTo({ path: `/ticket/${publicToken}`, query });
    } else {
      toast.error("Tiket dibuat tapi link tidak tersedia. Hubungi unit.");
    }
  } catch {
    toast.error("Gagal membuat laporan");
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <CoreSheet :is-open="orderSheet.isOpen" :snap-points="[0.78, 0]" scrollable is-overlay @close="cancel">
    <template #header>
      <div class="ui-sheet-header">
        <div class="flex gap-2 items-center min-w-0 flex-1">
          <div
            class="flex items-center justify-center w-8 h-8 shrink-0 ui-icon-well--danger"
            style="border-radius: 0.75rem"
          >
            <Icon icon="lucide:clipboard-pen" class="text-xl" />
          </div>
          <div class="min-w-0">
            <h1 class="ui-sheet-title">Buat laporan</h1>
            <p class="m-0 mt-0.5 leading-none text-[13px] ui-text-secondary">
              Isi laporan dengan benar
            </p>
          </div>
        </div>
        <button type="button" class="ui-close-btn" @click="cancel">
          <Icon icon="lucide:x" class="text-lg" />
        </button>
      </div>
    </template>

    <div class="px-4 pt-3 pb-3 flex flex-col min-h-full">
      <div class="text-center px-2">
        <p class="text-[13px] font-medium m-0" style="color: var(--bb-text-secondary)">
          Permintaan bantuan
        </p>
        <h2 class="m-0 mt-1 text-[22px] font-bold leading-tight tracking-tight" style="color: var(--bb-text)">
          {{ orderSheet.unitName }}
        </h2>
        <div class="mt-2 flex items-center justify-center gap-2 flex-wrap">
          <span
            v-if="typeName"
            class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold"
            style="background: var(--bb-bg-muted); color: var(--bb-text)"
          >
            <Icon :icon="typeIcon" class="text-sm shrink-0" />
            {{ typeName }}
          </span>
          <span
            v-if="etaMinutes != null"
            class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold bg-emerald-50 text-emerald-800"
          >
            <Icon icon="lucide:clock" class="text-sm shrink-0" />
            ±{{ etaMinutes }} menit
          </span>
        </div>
        <div class="bb-confirm-dash mt-3 mx-2" />
      </div>

      <div
        v-if="showPelayananPicker"
        class="mt-3 overflow-hidden"
        style="background: var(--bb-bg-muted); border-radius: var(--bb-radius-card)"
      >
        <div class="px-4 pt-3 pb-2.5">
          <p class="bb-acc-label">Jenis pelayanan</p>
          <p class="m-0 mt-0.5 text-[12px] leading-snug" style="color: var(--bb-text-secondary)">
            {{
              needsPelayananChoice
                ? "Pilih sesuai kebutuhan — unit hanya melayani mode yang dipilih."
                : "Unit melayani mode ini."
            }}
          </p>
          <div class="mt-2 flex flex-col gap-1.5">
            <button
              v-for="opt in pelayananOptions"
              :key="opt.code"
              type="button"
              class="flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors"
              :class="
                jenisPelayanan === opt.code
                  ? 'border-red-300 bg-white ring-1 ring-red-200'
                  : 'border-transparent bg-white/70 hover:bg-white'
              "
              @click="selectJenisPelayanan(opt.code)"
            >
              <span
                class="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
                :class="
                  jenisPelayanan === opt.code
                    ? 'bg-red-50 text-red-600'
                    : 'bg-neutral-100 text-neutral-500'
                "
              >
                <Icon :icon="opt.icon" class="text-xl" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block text-sm font-semibold leading-tight" style="color: var(--bb-text)">
                  {{ opt.label }}
                </span>
                <span
                  v-if="opt.description"
                  class="block mt-0.5 text-[12px] leading-snug"
                  style="color: var(--bb-text-secondary)"
                >
                  {{ opt.description }}
                </span>
              </span>
              <Icon
                v-if="jenisPelayanan === opt.code"
                icon="lucide:check-circle-2"
                class="text-lg shrink-0 text-red-500"
              />
            </button>
          </div>
        </div>
      </div>

      <div class="mt-3 overflow-hidden" style="background: var(--bb-bg-muted); border-radius: var(--bb-radius-card)">
        <button type="button" class="bb-acc-head" @click="toggle('contact')">
          <span class="min-w-0 flex-1 text-left">
            <span class="bb-acc-label">Pelapor</span>
            <span
              class="bb-acc-value"
              :class="canSubmit ? 'font-semibold' : 'font-medium'"
              :style="{ color: canSubmit ? 'var(--bb-text)' : 'var(--bb-text-tertiary)' }"
            >
              {{ contactSummary }}
            </span>
          </span>
          <Icon
            icon="lucide:chevron-right"
            class="bb-acc-chevron"
            :class="open === 'contact' && 'rotate-90'"
          />
        </button>
        <div v-show="open === 'contact'" class="px-4 pb-2.5 space-y-2.5">
          <label class="block">
            <span class="bb-acc-label">Nama</span>
            <input
              ref="nameInput"
              v-model="name"
              type="text"
              autocomplete="name"
              placeholder="Nama lengkap"
              class="bb-confirm-input mt-1.5"
            >
          </label>
          <label class="block">
            <span class="bb-acc-label">No. HP</span>
            <input
              v-model="phone"
              type="tel"
              inputmode="tel"
              autocomplete="tel"
              placeholder="08xxxxxxxxxx"
              class="bb-confirm-input mt-1.5"
            >
          </label>
        </div>

        <div class="bb-confirm-dash mx-4" />

        <button type="button" class="bb-acc-head" @click="toggle('triage')">
          <span class="min-w-0 flex-1 text-left">
            <span class="bb-acc-label">{{ assessmentSection.title }}</span>
            <TriageBadge v-if="usesTriage" class="mt-1.5" :acuity="acuity" />
            <span
              v-else
              class="bb-acc-value font-medium"
              :style="{ color: assessmentAnswers && Object.keys(assessmentAnswers).length ? 'var(--bb-text)' : 'var(--bb-text-tertiary)' }"
            >
              {{ assessmentSummary }}
            </span>
          </span>
          <Icon
            icon="lucide:chevron-right"
            class="bb-acc-chevron"
            :class="open === 'triage' && 'rotate-90'"
          />
        </button>
        <div v-show="open === 'triage'" class="px-4 pb-2.5">
          <p
            v-if="!effectiveJenis"
            class="m-0 text-[13px] leading-snug py-2"
            style="color: var(--bb-text-secondary)"
          >
            Pilih jenis pelayanan terlebih dahulu.
          </p>
          <AssessmentChecklist
            v-if="orderSheet.isOpen && effectiveJenis"
            ref="checklistRef"
            hide-head
            compact
            :emergency-uuid="orderSheet.emergencyUUID"
            :jenis-pelayanan="effectiveJenis"
            v-model:answers="assessmentAnswers"
            v-model:notes="assessmentNotes"
          />
        </div>

        <div class="bb-confirm-dash mx-4" />

        <button type="button" class="bb-acc-head" @click="toggle('photo')">
          <span class="min-w-0 flex-1 text-left">
            <span class="bb-acc-label">Foto</span>
            <span
              class="bb-acc-value"
              :class="photoPreview ? 'font-semibold' : 'font-medium'"
              :style="{ color: photoPreview ? 'var(--bb-text)' : 'var(--bb-text-tertiary)' }"
            >
              {{ photoSummary }}
            </span>
          </span>
          <Icon
            icon="lucide:chevron-right"
            class="bb-acc-chevron"
            :class="open === 'photo' && 'rotate-90'"
          />
        </button>
        <div v-show="open === 'photo'" class="px-4 pb-2.5">
          <div v-if="photoPreview" class="relative">
            <SkeletonImage
              :src="photoPreview"
              alt="Preview foto"
              wrapper-class="w-full h-28 rounded-xl overflow-hidden"
              img-class="w-full h-28 object-cover"
            />
            <button
              type="button"
              class="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center bg-black/50 text-white"
              aria-label="Hapus foto"
              @click="removePhoto"
            >
              <Icon icon="lucide:x" class="text-sm" />
            </button>
          </div>
          <label
            v-else
            class="flex items-center justify-center gap-2 w-full px-3 py-3 cursor-pointer text-sm"
            style="
              border: 1px dashed var(--bb-border-strong);
              border-radius: var(--bb-radius-control);
              background: var(--bb-bg-surface);
              color: var(--bb-text-secondary);
            "
          >
            <Icon icon="lucide:upload" class="text-base shrink-0" />
            Unggah foto
            <input
              ref="photoInput"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/*"
              class="sr-only"
              @change="selectPhoto"
            >
          </label>
          <p v-if="uploadError" class="text-sm text-emergency-600 mt-2">{{ uploadError }}</p>
        </div>
      </div>

      <div class="mt-auto pt-3 flex gap-2">
        <button
          type="button"
          class="btn-report text-sm !mb-0 flex-1"
          :disabled="!canSubmit || submitting || uploadingPhoto"
          @click="submit"
        >
          <Icon icon="lucide:send" class="w-4 h-4 mr-1.5" />
          {{ submitting || uploadingPhoto ? "Mengirim…" : "Melaporkan" }}
        </button>
        <button type="button" class="btn-call text-sm !mb-0 flex-1" :disabled="submitting" @click="cancel">
          <Icon icon="lucide:x" class="w-4 h-4 mr-1.5" />
          Batal
        </button>
      </div>
    </div>
  </CoreSheet>
</template>

<style scoped>
.bb-confirm-dash {
  border-top: 1px dashed var(--bb-border-strong);
}

.bb-acc-head {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  text-align: left;
  padding: 0.7rem 1rem;
}

.bb-acc-label {
  display: block;
  font-size: 11px;
  font-weight: 500;
  line-height: 1;
  color: var(--bb-text-tertiary);
}

.bb-acc-value {
  display: block;
  margin-top: 0.3rem;
  font-size: 15px;
  line-height: 1.35;
  color: var(--bb-text);
}

.bb-acc-chevron {
  flex-shrink: 0;
  font-size: 1.125rem;
  color: var(--bb-text-tertiary);
  transition: transform 0.15s ease;
}

.bb-confirm-input {
  display: block;
  width: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  outline: none;
  background: transparent;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.35;
  color: var(--bb-text);
  box-shadow: none;
}

.bb-confirm-input::placeholder {
  font-weight: 500;
  color: var(--bb-text-tertiary);
}
</style>
