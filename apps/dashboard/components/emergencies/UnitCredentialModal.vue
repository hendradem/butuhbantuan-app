<script setup lang="ts">
import { Icon } from "@iconify/vue";

const props = defineProps<{ emergencyUuid: string; unitName?: string }>();
const emit = defineEmits<{ close: []; success: [] }>();

const { post } = useApi();

const username = ref("");
const password = ref("");
const confirmPassword = ref("");
const loading = ref(false);
const error = ref("");

function reset() {
  username.value = "";
  password.value = "";
  confirmPassword.value = "";
  error.value = "";
}

onMounted(reset);

async function submit() {
  if (!username.value || !password.value) return;
  if (password.value !== confirmPassword.value) {
    error.value = "Password tidak cocok.";
    return;
  }
  loading.value = true;
  error.value = "";
  try {
    await post(`/api/v1/admin/units/${props.emergencyUuid}/credentials`, {
      unit_name: props.unitName ?? "",
      username: username.value,
      password: password.value,
    });
    emit("success");
    emit("close");
  } catch (err: any) {
    const msg = err?.data?.message ?? err?.message ?? "";
    if (msg === "username already taken") {
      error.value = "Username sudah digunakan oleh unit lain.";
    } else {
      error.value = msg || "Gagal menyimpan kredensial.";
    }
  } finally {
    loading.value = false;
  }
}

function onOverlayClick(e: MouseEvent) {
  if (e.target === e.currentTarget) emit("close");
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-neutral-950/40"
      @click="onOverlayClick"
    >
      <div class="w-full max-w-md bg-white rounded-2xl shadow-xl ring-1 ring-neutral-200/60 p-6" @click.stop>
        <!-- Header -->
        <div class="flex items-start justify-between gap-4 mb-4">
          <div>
            <p class="text-base font-semibold text-neutral-900">Set Akun Unit</p>
            <p class="text-sm text-neutral-500 mt-0.5">Atur username dan password untuk {{ props.unitName ?? "unit ini" }}</p>
          </div>
          <button
            class="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors"
            @click="emit('close')"
          >
            <Icon icon="lucide:x" class="text-lg" />
          </button>
        </div>

        <!-- Form -->
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-1.5">
              Username <span class="text-emergency-500">*</span>
            </label>
            <UiInput
              v-model="username"
              placeholder="Username untuk login unit..."
              autocomplete="off"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-1.5">
              Password <span class="text-emergency-500">*</span>
            </label>
            <UiInput
              v-model="password"
              type="password"
              placeholder="Password baru..."
              autocomplete="new-password"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-1.5">
              Konfirmasi Password <span class="text-emergency-500">*</span>
            </label>
            <UiInput
              v-model="confirmPassword"
              type="password"
              placeholder="Ulangi password..."
              autocomplete="new-password"
            />
          </div>

          <p v-if="error" class="text-xs text-emergency-600 flex items-center gap-1">
            <Icon icon="lucide:alert-circle" class="text-sm" />
            {{ error }}
          </p>
        </div>

        <!-- Footer -->
        <div class="mt-6 flex justify-end gap-3">
          <UiButton variant="secondary" size="sm" @click="emit('close')">Batal</UiButton>
          <UiButton
            size="sm"
            :loading="loading"
            :disabled="!username || !password || !confirmPassword"
            @click="submit"
          >
            <Icon icon="lucide:save" class="text-sm" />
            Simpan
          </UiButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>
