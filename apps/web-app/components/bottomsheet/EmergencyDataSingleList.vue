<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { cityNameFormat } from "~/utils/cityNameFormat";
import { formatDistance } from "~/utils/geo";

function isOpenNow(op: any): boolean {
  if (!op) return true;
  if (!op.is_active) return false;
  if (op.is_24_hours) return true;
  const now = new Date();
  const [oh, om] = (op.open_time || "00:00").split(":").map(Number);
  const [ch, cm] = (op.close_time || "23:59").split(":").map(Number);
  const cur = now.getHours() * 60 + now.getMinutes();
  return cur >= oh * 60 + om && cur <= ch * 60 + cm;
}

const props = defineProps<{ data: any }>();

const orderSheet = useOrderSheetStore();

const emergencyData = computed(() => props.data?.emergencyData);
const tripData = computed(() => props.data?.trip);

function badgeClass(duration: number): string {
  if (duration <= 15) return "bg-green-500 text-white";
  if (duration <= 18) return "bg-orange-500 text-white";
  if (duration <= 20) return "bg-red-500 text-white";
  return "bg-black text-white";
}

function onContactClick(type: "whatsapp" | "phone", number: string, e: Event) {
  e.stopPropagation();
  orderSheet.open(
    String(emergencyData.value?.id ?? ""),
    emergencyData.value?.name ?? "",
    type,
    number
  );
}
</script>

<template>
  <div class="mx-3 mb-2">
    <div class="p-3 shadow-sm rounded-[10px] bg-white w-full border border-neutral-200">
      <div class="flex">
        <div class="w-[15%]">
          <div class="w-10 h-10 bg-white border border-neutral-100 p-1.5 rounded-lg flex items-center justify-center">
            <img
              v-if="emergencyData"
              :src="emergencyData.organization_logo"
              alt="logo"
              class="w-full h-full object-contain"
            />
          </div>
        </div>
        <div class="w-[85%]">
          <div class="flex justify-between items-center truncate">
            <h3 class="font-semibold truncate leading-none text-gray-900">
              {{ emergencyData?.name?.slice(0, 18) }}
            </h3>
            <div class="flex items-center gap-2">
              <span
                v-if="emergencyData?.is_dispatcher"
                class="badge badge-icon border-0 shadow-none bg-blue-500 text-white text-[11px] rounded-full px-1"
              >
                <Icon icon="fluent:person-call-16-filled" class="text-[15px]" />
              </span>
              <span
                v-if="tripData"
                :class="['badge badge-icon border-0 shadow-none text-[11px]', badgeClass(Math.floor(tripData.duration) * 2)]"
              >
                <Icon icon="heroicons:clock" class="mr-1 text-[15px]" />
                {{ Math.min(Math.floor(tripData.duration) * 2, 20) }} min
              </span>
              <span
                v-if="tripData"
                class="badge badge-icon border-0 shadow-none text-[11px] bg-neutral-100 text-neutral-600"
              >
                <Icon icon="mingcute:route-fill" class="mr-1 text-[15px]" />
                {{ formatDistance(tripData.distance ?? 0) }}
              </span>
            </div>
          </div>
          <p class="text-gray-500 leading-normal truncate text-sm">
            {{ emergencyData?.organization_name?.slice(0, 28) }}
          </p>
          <div class="flex mt-2 items-center text-gray-500 text-sm gap-1.5 flex-wrap">
            <span class="flex items-center gap-1 min-w-0 shrink truncate">
              <Icon icon="mingcute:location-fill" class="shrink-0" />
              <span class="leading-none truncate">{{ cityNameFormat(emergencyData?.address?.regency ?? "") }}</span>
            </span>
            <span
              :class="[
                'shrink-0 flex items-center gap-1 text-[10px] font-semibold px-2  rounded-full',
                isOpenNow(emergencyData?.operational) ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500',
              ]"
            >
              <Icon icon="lucide:clock" class="text-[10px]" />
              {{ isOpenNow(emergencyData?.operational) ? 'Buka' : 'Tutup' }}
              <template v-if="emergencyData?.operational?.is_24_hours"> · 24 Jam</template>
              <template v-else-if="emergencyData?.operational?.open_time"> · {{ emergencyData.operational.open_time }}–{{ emergencyData.operational.close_time }}</template>
            </span> 
            <span
                v-for="tipe in (emergencyData?.tipe_emergency ?? [])"
                :key="tipe"
                :class="['shrink-0 text-[10px] font-medium px-2 uppercase rounded-full tracking-wide', tipe === 'emergency' ? 'bg-red-50 text-neutral-600' : tipe === 'transport' ? 'bg-blue-50 text-neutral-600' : tipe === 'pemadam' ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-700']"
              >{{ tipe === 'pencarian dan pertolongan' ? 'SAR' : tipe }}</span>
          </div>
        </div>
      </div>

      <div class="card-footer mt-4">
        <div class="flex gap-2">
          <button
            :disabled="!emergencyData?.contact?.whatsapp"
            :class="['btn-whatsapp text-[15px]', !emergencyData?.contact?.whatsapp ? 'opacity-80 cursor-not-allowed' : '']"
            @click="onContactClick('whatsapp', emergencyData.contact.whatsapp, $event)"
          >
            <Icon icon="mingcute:chat-1-fill" class="w-5 h-5 mr-2" />
            Whatsapp
          </button>
          <button
            :disabled="!emergencyData?.contact?.phone"
            :class="['btn-call text-[15px]', !emergencyData?.contact?.phone ? 'opacity-80 cursor-not-allowed' : '']"
            @click="onContactClick('phone', emergencyData.contact.phone, $event)"
          >
            <Icon icon="mdi:phone" class="w-5 h-5 mr-2" />
            Telfon
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
