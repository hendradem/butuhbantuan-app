<script setup lang="ts">
import { convertPhoneNumber } from "~/utils/convertPhoneNumber";

const props = defineProps<{ data: any }>();

const orderSheet = useOrderSheetStore();
const { rememberFromEmergency } = useRecentUnits();

const emergencyData = computed(() => props.data?.emergencyData);

function onHubungi() {
  rememberFromEmergency(props.data, "whatsapp");
  const wa =
    emergencyData.value?.contact?.whatsapp ||
    emergencyData.value?.contact?.phone ||
    "";
  orderSheet.open(
    String(emergencyData.value?.id ?? ""),
    emergencyData.value?.name ?? "",
    "whatsapp",
    wa,
  );
}

function onTelepon() {
  rememberFromEmergency(props.data, "phone");
  const phone = emergencyData.value?.contact?.phone;
  if (!phone) return;
  const digits = convertPhoneNumber(phone);
  window.location.href = `tel:+${digits}`;
}
</script>

<template>
  <div class="ui-list-stack pt-3">
    <EmergencyListCard
      :emergency="data"
      actions
      @hubungi="onHubungi"
      @telepon="onTelepon"
    />
  </div>
</template>
