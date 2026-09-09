<script setup lang="ts">
import { Icon } from "@iconify/vue";

definePageMeta({ layout: false, ssr: false });

useHead({ title: "E-Tiket · ButuhBantuan" });

const route = useRoute();
const router = useRouter();

const viewToken = computed(() => String(route.params.token || "").trim());
const via = computed(() => String(route.query.via || "").trim());
const to = computed(() => String(route.query.to || "").trim());

const cardRef = ref<{
  softRefresh: () => void;
  shareTicket: () => void;
  isRefreshing: boolean;
  phoneVerified: boolean;
  pushVisible: boolean;
  pushSubscribed: boolean;
  pushLoading: boolean;
  pushSubscribe: () => void;
  pushUnsubscribe: () => void;
} | null>(null);

const showLeaveConfirm = ref(false);

function goHome() {
  void router.push("/");
}

function requestLeave() {
  showLeaveConfirm.value = true;
}

function cancelLeave() {
  showLeaveConfirm.value = false;
}

function confirmLeave() {
  showLeaveConfirm.value = false;
  goHome();
}

function onRefresh() {
  cardRef.value?.softRefresh();
}

function onShare() {
  cardRef.value?.shareTicket();
}

function onPushToggle() {
  if (!cardRef.value || cardRef.value.pushLoading) return;
  if (cardRef.value.pushSubscribed) {
    void cardRef.value.pushUnsubscribe();
  } else {
    void cardRef.value.pushSubscribe();
  }
}
</script>

<template>
  <div class="ui-page min-h-screen bg-neutral-50 eticket-ui">
    <OpenInAppBanner />
    <header class="sticky top-0 z-10 flex items-center gap-3 border-b border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur">
      <button
        type="button"
        class="ui-close-btn shrink-0"
        aria-label="Kembali"
        @click="requestLeave"
      >
        <Icon icon="lucide:arrow-left" class="text-lg" />
      </button>
      <div class="min-w-0 flex-1">
        <h1 class="m-0 eticket-title">E-Tiket Darurat</h1>
        <p class="m-0 mt-0.5 eticket-meta">Status permintaan bantuan</p>
      </div>
      <div class="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          class="ui-close-btn"
          aria-label="Muat ulang"
          :disabled="cardRef?.isRefreshing"
          @click="onRefresh"
        >
          <Icon
            icon="lucide:refresh-cw"
            class="text-lg"
            :class="cardRef?.isRefreshing && 'animate-spin'"
          />
        </button>
        <button
          v-if="cardRef?.pushVisible"
          type="button"
          class="ui-close-btn relative"
          :class="cardRef.pushSubscribed && !cardRef.pushLoading ? 'text-red-500' : ''"
          :aria-label="cardRef.pushSubscribed ? 'Matikan notifikasi' : 'Aktifkan notifikasi'"
          :disabled="cardRef.pushLoading"
          @click="onPushToggle"
        >
          <Icon
            :icon="cardRef.pushLoading ? 'lucide:loader-2' : cardRef.pushSubscribed ? 'lucide:bell-off' : 'lucide:bell'"
            class="text-lg"
            :class="cardRef.pushLoading && 'animate-spin'"
          />
          <span
            v-if="cardRef.pushSubscribed && !cardRef.pushLoading"
            class="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white"
          />
        </button>
        <button
          v-if="cardRef?.phoneVerified"
          type="button"
          class="ui-close-btn"
          aria-label="Bagikan e-tiket"
          @click="onShare"
        >
          <Icon icon="lucide:share-2" class="text-lg" />
        </button>
      </div>
    </header>

    <main class="px-4 py-4 pb-10 max-w-md mx-auto">
      <ETicketCard
        v-if="viewToken"
        ref="cardRef"
        :view-token="viewToken"
        :via="via"
        :to="to"
        @close="requestLeave"
      />
    </main>

    <Teleport to="body">
      <Transition name="overlay">
        <div
          v-if="showLeaveConfirm"
          class="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/40 sm:items-center"
          @click.self="cancelLeave"
        >
          <div
            class="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl eticket-ui"
            role="dialog"
            aria-labelledby="leave-eticket-title"
            aria-modal="true"
          >
            <h2 id="leave-eticket-title" class="eticket-title m-0">Keluar dari e-tiket?</h2>
            <p class="eticket-meta mt-2 mb-0 leading-relaxed">
              Yakin mau nitip e-tiket di sini? Kamu masih bisa buka lagi lewat link yang sama, atau bagikan ke keluarga dulu.
            </p>
            <div class="mt-5 flex gap-2">
              <button
                type="button"
                class="flex-1 py-2.5 rounded-xl border border-neutral-200 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                @click="cancelLeave"
              >
                Tetap di sini
              </button>
              <button
                type="button"
                class="flex-1 py-2.5 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors"
                @click="confirmLeave"
              >
                Ya, keluar
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
