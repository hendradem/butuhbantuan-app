<script setup lang="ts">
import { Icon } from "@iconify/vue";

definePageMeta({ layout: false });

const { login: adminLogin } = useAuth();
const { login: unitLogin } = useUnitAuth();

const tab = ref<"admin" | "unit">("admin");

// Admin form
const adminKey = ref("");
const adminLoading = ref(false);
const adminError = ref("");

// Unit form
const unitUsername = ref("");
const unitPassword = ref("");
const unitLoading = ref(false);
const unitError = ref("");

async function submitAdmin() {
  if (!adminKey.value) return;
  adminLoading.value = true;
  adminError.value = "";
  try {
    await adminLogin(adminKey.value);
    await navigateTo("/");
  } catch {
    adminError.value = "Kunci admin tidak valid. Coba lagi.";
  } finally {
    adminLoading.value = false;
  }
}

async function submitUnit() {
  if (!unitUsername.value || !unitPassword.value) return;
  unitLoading.value = true;
  unitError.value = "";
  try {
    await unitLogin(unitUsername.value, unitPassword.value);
    await navigateTo("/unit/orders");
  } catch {
    unitError.value = "Username atau password salah.";
  } finally {
    unitLoading.value = false;
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
        <p class="text-sm text-neutral-500 mt-1">Dashboard</p>
      </div>

      <!-- Tabs -->
      <div class="flex gap-1 p-1 bg-neutral-100 rounded-xl mb-5">
        <button
          :class="['flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors', tab === 'admin' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700']"
          @click="tab = 'admin'"
        >
          Admin
        </button>
        <button
          :class="['flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors', tab === 'unit' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700']"
          @click="tab = 'unit'"
        >
          Unit Layanan
        </button>
      </div>

      <!-- Card -->
      <div class="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6">
        <!-- Admin login -->
        <template v-if="tab === 'admin'">
          <h2 class="text-base font-semibold text-neutral-900 mb-1">Masuk sebagai Admin</h2>
          <p class="text-sm text-neutral-500 mb-5">Masukkan kunci admin untuk melanjutkan.</p>
          <form class="space-y-4" @submit.prevent="submitAdmin">
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1.5">Kunci Admin</label>
              <input
                v-model="adminKey"
                type="password"
                placeholder="Masukkan kunci admin..."
                autofocus
                class="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                :class="{ 'border-emergency-500 focus:ring-emergency-500': adminError }"
              />
              <p v-if="adminError" class="mt-1.5 text-xs text-emergency-600 flex items-center gap-1">
                <Icon icon="lucide:alert-circle" class="text-sm" />
                {{ adminError }}
              </p>
            </div>
            <UiButton type="submit" class="w-full justify-center" :loading="adminLoading" :disabled="!adminKey">
              <Icon icon="lucide:log-in" class="text-sm" />
              Masuk
            </UiButton>
          </form>
        </template>

        <!-- Unit login -->
        <template v-else>
          <h2 class="text-base font-semibold text-neutral-900 mb-1">Masuk sebagai Unit</h2>
          <p class="text-sm text-neutral-500 mb-5">Gunakan kredensial unit layanan Anda.</p>
          <form class="space-y-4" @submit.prevent="submitUnit">
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1.5">Username</label>
              <input
                v-model="unitUsername"
                type="text"
                placeholder="Username unit..."
                autocomplete="username"
                class="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                :class="{ 'border-emergency-500': unitError }"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1.5">Password</label>
              <input
                v-model="unitPassword"
                type="password"
                placeholder="Password..."
                autocomplete="current-password"
                class="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                :class="{ 'border-emergency-500': unitError }"
              />
              <p v-if="unitError" class="mt-1.5 text-xs text-emergency-600 flex items-center gap-1">
                <Icon icon="lucide:alert-circle" class="text-sm" />
                {{ unitError }}
              </p>
            </div>
            <UiButton type="submit" class="w-full justify-center" :loading="unitLoading" :disabled="!unitUsername || !unitPassword">
              <Icon icon="lucide:log-in" class="text-sm" />
              Masuk
            </UiButton>
          </form>
        </template>
      </div>

      <p class="text-center text-xs text-neutral-400 mt-4">
        ButuhBantuan Dashboard &copy; {{ new Date().getFullYear() }}
      </p>
    </div>
  </div>
</template>
