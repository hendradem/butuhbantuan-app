<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { formatEta } from "~/utils/eta";

export type OrdersSortCol =
  | "ticket_number"
  | "requester_name"
  | "unit_name"
  | "created_at"
  | "status"
  | "assessment_acuity";

const props = withDefaults(
  defineProps<{
    orders: any[];
    loading?: boolean;
    variant: "admin" | "unit";
    sortCol: OrdersSortCol;
    sortDir: "asc" | "desc";
    detailBasePath: string;
    getEta?: (order: any) => number | null | undefined;
    wrapperClass?: string;
  }>(),
  {
    loading: false,
    getEta: undefined,
    wrapperClass: "",
  },
);

const emit = defineEmits<{
  sort: [col: OrdersSortCol];
}>();

const expandedId = ref<string | null>(null);

function toggleExpand(order: any) {
  const id = String(order?.id || "");
  if (!id) return;
  expandedId.value = expandedId.value === id ? null : id;
}

function isExpanded(order: any) {
  return expandedId.value === String(order?.id || "");
}

function sortIcon(col: OrdersSortCol) {
  if (props.sortCol !== col) return "lucide:chevrons-up-down";
  return props.sortDir === "asc" ? "lucide:chevron-up" : "lucide:chevron-down";
}

function sortClass(col: OrdersSortCol) {
  return props.sortCol === col ? "text-neutral-700" : "text-neutral-300";
}

function formatShortTime(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function detailPath(order: any) {
  const n = String(order?.ticket_number || "").trim();
  return n ? `${props.detailBasePath}/${encodeURIComponent(n)}` : props.detailBasePath;
}

function etaFor(order: any): number | null {
  const v = props.getEta?.(order);
  if (v == null || !Number.isFinite(v) || v <= 0) return null;
  return v;
}

/** chevron + pelapor + unit? + jenis + triase + eta + status + waktu + aksi */
const colCount = computed(() => (props.variant === "admin" ? 9 : 8));

watch(
  () => props.orders,
  () => {
    if (expandedId.value && !props.orders.some((o) => String(o.id) === expandedId.value)) {
      expandedId.value = null;
    }
  },
);
</script>

<template>
  <UiTable
    :wrapper-class="wrapperClass"
    table-class="ui-table--orders-v2"
    :min-width="variant === 'admin' ? '56rem' : '48rem'"
  >
    <thead>
      <tr>
        <th class="w-9" aria-hidden="true" />
        <th class="ui-th-sortable" @click="emit('sort', 'requester_name')">
          <span class="ui-th-label">
            Pelapor
            <Icon :icon="sortIcon('requester_name')" :class="['text-xs', sortClass('requester_name')]" />
          </span>
        </th>
        <th
          v-if="variant === 'admin'"
          class="ui-th-sortable hidden xl:table-cell"
          @click="emit('sort', 'unit_name')"
        >
          <span class="ui-th-label">
            Unit
            <Icon :icon="sortIcon('unit_name')" :class="['text-xs', sortClass('unit_name')]" />
          </span>
        </th>
        <th class="hidden sm:table-cell">Jenis</th>
        <th class="ui-th-sortable hidden sm:table-cell" @click="emit('sort', 'assessment_acuity')">
          <span class="ui-th-label">
            Triase
            <Icon :icon="sortIcon('assessment_acuity')" :class="['text-xs', sortClass('assessment_acuity')]" />
          </span>
        </th>
        <th class="ui-col-eta hidden md:table-cell">ETA</th>
        <th class="ui-th-sortable" @click="emit('sort', 'status')">
          <span class="ui-th-label">
            Status
            <Icon :icon="sortIcon('status')" :class="['text-xs', sortClass('status')]" />
          </span>
        </th>
        <th class="ui-th-sortable ui-col-time hidden lg:table-cell" @click="emit('sort', 'created_at')">
          <span class="ui-th-label">
            Waktu
            <Icon :icon="sortIcon('created_at')" :class="['text-xs', sortClass('created_at')]" />
          </span>
        </th>
        <th class="ui-th-right w-12"><span class="sr-only">Aksi</span></th>
      </tr>
    </thead>

    <tbody v-if="loading">
      <tr v-for="i in 5" :key="`skel-${i}`">
        <td><div class="soft-skel h-4 w-4 rounded" /></td>
        <td>
          <div class="space-y-1.5">
            <div class="soft-skel h-4 w-36" />
            <div class="soft-skel h-3 w-24" />
          </div>
        </td>
        <td v-if="variant === 'admin'" class="hidden xl:table-cell"><div class="soft-skel h-4 w-28" /></td>
        <td class="hidden sm:table-cell"><div class="soft-skel h-6 rounded-full w-16" /></td>
        <td class="hidden sm:table-cell"><div class="soft-skel h-6 rounded-full w-14" /></td>
        <td class="hidden md:table-cell"><div class="soft-skel h-4 w-12" /></td>
        <td><div class="soft-skel h-6 rounded-full w-16" /></td>
        <td class="hidden lg:table-cell"><div class="soft-skel h-3.5 w-20" /></td>
        <td><div class="soft-skel h-8 w-8 ml-auto rounded-lg" /></td>
      </tr>
    </tbody>

    <tbody v-else-if="!orders.length">
      <tr>
        <td :colspan="colCount">
          <UiEmptyState title="Tidak ada pesanan" description="Belum ada pesanan yang cocok dengan filter.">
            <template #icon>
              <Icon icon="lucide:inbox" class="text-neutral-400 text-2xl" />
            </template>
          </UiEmptyState>
        </td>
      </tr>
    </tbody>

    <template v-else>
      <tbody v-for="order in orders" :key="order.id">
        <tr
          class="orders-row group cursor-pointer"
          :class="{ 'is-expanded': isExpanded(order) }"
          @click="toggleExpand(order)"
        >
          <td class="!pl-3 !pr-0">
            <Icon
              icon="lucide:chevron-right"
              class="text-neutral-400 text-base transition-transform duration-200"
              :class="isExpanded(order) && 'rotate-90 text-neutral-600'"
            />
          </td>
          <td>
            <p class="text-sm font-medium text-neutral-900 truncate max-w-[12rem] sm:max-w-[14rem]">
              {{ order.requester_name || "—" }}
            </p>
            <div class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <NuxtLink
                :to="detailPath(order)"
                class="font-mono text-[11px] text-neutral-500 hover:text-primary-700 hover:underline"
                @click.stop
              >
                {{ order.ticket_number }}
              </NuxtLink>
              <span
                v-if="order.source === 'sos'"
                class="inline-flex rounded-full bg-emergency-50 px-1.5 py-px text-[10px] font-bold text-emergency-700 ring-1 ring-inset ring-emergency-200"
              >
                SOS
              </span>
              <span
                v-if="order.previous_unit_name"
                class="inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-px text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-200"
                :title="`Dialihkan dari ${order.previous_unit_name}`"
              >
                <Icon icon="lucide:arrow-left-right" class="text-[10px]" />
                {{ variant === "unit" ? "dialihkan ke unit Anda" : `dari ${order.previous_unit_name}` }}
              </span>
            </div>
            <!-- Badges on narrow screens where columns are hidden -->
            <div class="mt-1.5 flex flex-wrap items-center gap-1 sm:hidden">
              <OrderJenisBadge
                :code="order.jenis_pelayanan"
                :fallback="variant === 'unit' ? 'emergency' : undefined"
                show-empty
                compact
              />
              <OrderTriageBadge
                :acuity="order.assessment_acuity"
                :jenis-pelayanan="order.jenis_pelayanan"
                :emergency-only="variant === 'unit'"
                compact
              />
            </div>
          </td>
          <td v-if="variant === 'admin'" class="hidden xl:table-cell">
            <p class="text-sm text-neutral-700 truncate max-w-[11rem]">
              {{ order.unit_name || "—" }}
            </p>
            <p
              v-if="order.previous_unit_name"
              class="mt-0.5 flex items-center gap-1 text-[11px] text-amber-700 truncate max-w-[11rem]"
              :title="`Dialihkan dari ${order.previous_unit_name}`"
            >
              <Icon icon="lucide:arrow-left" class="text-[10px] shrink-0" />
              <span class="truncate">dari {{ order.previous_unit_name }}</span>
            </p>
          </td>
          <td class="hidden sm:table-cell">
            <OrderJenisBadge
              :code="order.jenis_pelayanan"
              :fallback="variant === 'unit' ? 'emergency' : undefined"
              show-empty
              compact
            />
          </td>
          <td class="hidden sm:table-cell">
            <OrderTriageBadge
              :acuity="order.assessment_acuity"
              :jenis-pelayanan="order.jenis_pelayanan"
              :emergency-only="variant === 'unit'"
              compact
            />
          </td>
          <td class="ui-col-eta hidden md:table-cell whitespace-nowrap">
            {{ etaFor(order) ? formatEta(etaFor(order)) : "—" }}
          </td>
          <td>
            <UiStatusBadge :status="order.status" size="sm" />
          </td>
          <td class="ui-col-time hidden lg:table-cell whitespace-nowrap">
            {{ formatShortTime(order.created_at) }}
          </td>
          <td class="ui-td-right ui-td-actions !pr-3" @click.stop>
            <slot name="row-actions" :order="order" />
          </td>
        </tr>
        <tr v-if="isExpanded(order)" class="orders-expand-row">
          <td :colspan="colCount">
            <OrderListExpandPanel
              :order="order"
              :variant="variant"
              :detail-path="detailPath(order)"
              :eta-minutes="etaFor(order)"
            >
              <template #actions="slotProps">
                <slot name="expand-actions" v-bind="slotProps" />
              </template>
            </OrderListExpandPanel>
          </td>
        </tr>
      </tbody>
    </template>
  </UiTable>
</template>
