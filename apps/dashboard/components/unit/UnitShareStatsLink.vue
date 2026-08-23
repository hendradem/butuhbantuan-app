<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { toast } from "~/utils/appToast";

const props = defineProps<{
  emergencyUuid?: string | null;
  unitName?: string | null;
}>();

const config = useRuntimeConfig();
const webAppUrl = (config.public.webAppUrl as string) || "http://localhost:3000";

function publicAppOrigin(): string {
  let base = String(webAppUrl || "http://localhost:3000").trim().replace(/\/$/, "");
  try {
    const u = new URL(base.includes("://") ? base : `http://${base}`);
    const host = u.hostname;
    if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")) {
      u.protocol = "http:";
    }
    return u.origin;
  } catch {
    return base.replace(/^https:\/\//i, "http://");
  }
}

const statsUrl = computed(() => {
  const id = String(props.emergencyUuid || "").trim();
  if (!id) return "";
  return `${publicAppOrigin()}/unit/${encodeURIComponent(id)}`;
});

const copied = ref(false);

async function copyLink() {
  if (!statsUrl.value) return;
  try {
    await navigator.clipboard.writeText(statsUrl.value);
    copied.value = true;
    toast.success("Link statistik disalin");
    setTimeout(() => { copied.value = false; }, 2000);
  } catch {
    toast.error("Gagal menyalin link");
  }
}

async function shareLink() {
  if (!statsUrl.value) return;
  if (navigator.share) {
    try {
      await navigator.share({
        title: props.unitName ? `Statistik ${props.unitName}` : "Statistik unit",
        text: "Lihat performa layanan unit di ButuhBantuan",
        url: statsUrl.value,
      });
      return;
    } catch {
      /* fall through */
    }
  }
  await copyLink();
}
</script>

<template>
  <div class="space-y-3">
    <p class="text-sm text-neutral-500 leading-relaxed">
      Bagikan ringkasan performa publik (tiket, respon, penilaian warga) tanpa data pribadi pelapor.
    </p>

    <div
      v-if="statsUrl"
      class="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5"
    >
      <Icon icon="lucide:link" class="text-neutral-400 text-sm shrink-0" />
      <p class="text-xs font-mono text-neutral-700 truncate flex-1 min-w-0">{{ statsUrl }}</p>
    </div>
    <p v-else class="text-sm text-neutral-400">UUID unit belum tersedia.</p>

    <div class="flex gap-2">
      <UiButton
        variant="secondary"
        class="flex-1 justify-center"
        :disabled="!statsUrl"
        @click="copyLink"
      >
        <Icon :icon="copied ? 'lucide:check' : 'lucide:copy'" class="text-sm" />
        {{ copied ? "Tersalin" : "Salin" }}
      </UiButton>
      <UiButton
        variant="primary"
        class="flex-1 justify-center"
        :disabled="!statsUrl"
        @click="shareLink"
      >
        <Icon icon="lucide:share" class="text-sm" />
        Bagikan
      </UiButton>
    </div>
  </div>
</template>
