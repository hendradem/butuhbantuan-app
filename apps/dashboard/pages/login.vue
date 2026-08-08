<script setup lang="ts">
import { Icon } from "@iconify/vue";

definePageMeta({ layout: false });

const { login } = useAuth();
const key = ref("");
const loading = ref(false);
const error = ref("");

async function submit() {
  if (!key.value) return;
  loading.value = true;
  error.value = "";
  try {
    await login(key.value);
    await navigateTo("/");
  } catch {
    error.value = "Kunci admin tidak valid. Coba lagi.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
    <div class="w-full max-w-sm">
      <!-- Logo -->
      <div class="flex flex-col items-center mb-8">
        <div class="w-12 h-12 rounded-2xl bg-emergency-600 flex items-center justify-center mb-4 shadow-lg">
          <Icon icon="lucide:siren" class="text-white text-2xl" />
        </div>
        <h1 class="text-xl font-bold text-neutral-900">ButuhBantuan</h1>
        <p class="text-sm text-neutral-500 mt-1">Admin Panel</p>
      </div>

      <!-- Card -->
      <div class="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6">
        <h2 class="text-base font-semibold text-neutral-900 mb-1">Masuk ke Dashboard</h2>
        <p class="text-sm text-neutral-500 mb-5">Masukkan kunci admin untuk melanjutkan.</p>

        <form class="space-y-4" @submit.prevent="submit">
          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-1.5">Kunci Admin</label>
            <input
              v-model="key"
              type="password"
              placeholder="Masukkan kunci admin..."
              autofocus
              class="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              :class="{ 'border-emergency-500 focus:ring-emergency-500': error }"
            />
            <p v-if="error" class="mt-1.5 text-xs text-emergency-600 flex items-center gap-1">
              <Icon icon="lucide:alert-circle" class="text-sm" />
              {{ error }}
            </p>
          </div>

          <UiButton type="submit" class="w-full justify-center" :loading="loading" :disabled="!key">
            <Icon icon="lucide:log-in" class="text-sm" />
            Masuk
          </UiButton>
        </form>
      </div>

      <p class="text-center text-xs text-neutral-400 mt-4">
        ButuhBantuan Admin Panel &copy; {{ new Date().getFullYear() }}
      </p>
    </div>
  </div>
</template>
