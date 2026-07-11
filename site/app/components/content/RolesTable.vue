<script setup lang="ts">
import { computed, h, resolveComponent } from 'vue';
import { useIridis } from '~/composables/useIridis.ts';
import { contrastRatio } from '~/theme/ContrastRatio.ts';

const { roleViews, roles } = useIridis();
const UButton = resolveComponent('UButton');
const UBadge = resolveComponent('UBadge');

const bg = computed<string>(() => roles.value['background'] ?? '#000000');

type RowType = { 'name': string; 'hex': string; 'l': number; 'c': number; 'h': number; 'ratio': number; 'aa': boolean; 'aaa': boolean; 'compliance': string };

const data = computed<RowType[]>(() => roleViews.value.map((r) => {
  const ratio = contrastRatio(r.hex, bg.value);
  const aa = ratio >= 4.5;
  const aaa = ratio >= 7;
  return { 'aa': aa, 'aaa': aaa, 'c': r.c, 'compliance': aaa ? 'AAA' : aa ? 'AA' : 'fail', 'h': r.h, 'hex': r.hex, 'l': r.l, 'name': r.name, 'ratio': ratio };
}));

type SortColumnType = { 'getIsSorted': () => false | 'asc' | 'desc'; 'toggleSorting': (desc?: boolean) => void };

function sortableHeader(label: string) {
  return ({ column }: { column: SortColumnType }) => {return h(UButton, {
    'class': 'w-full justify-start',
    'color': 'neutral',
    'icon': column.getIsSorted() === 'asc' ? 'i-material-symbols-arrow-upward-rounded' : column.getIsSorted() === 'desc' ? 'i-material-symbols-arrow-downward-rounded' : 'i-material-symbols-unfold-more-rounded',
    'onClick': () => { column.toggleSorting(column.getIsSorted() === 'asc'); },
    'size': 'xs',
    'variant': 'ghost'
  }, () => label);};
}

const columns = [
  { 'accessorKey': 'name', 'header': sortableHeader('Role'), 'size': 140 },
  { 'accessorKey': 'hex', 'header': sortableHeader('Hex'), 'size': 100 },
  { 'accessorKey': 'l', 'header': sortableHeader('L'), 'size': 60 },
  { 'accessorKey': 'c', 'header': sortableHeader('C'), 'size': 60 },
  { 'accessorKey': 'h', 'header': sortableHeader('H°'), 'size': 70 },
  { 'accessorKey': 'ratio', 'header': sortableHeader('Ratio'), 'size': 70 },
  { 'accessorKey': 'compliance', 'header': sortableHeader('Compliance'), 'size': 100 }
];
</script>

<template>
  <UCard>
    <template #header>
      <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <span />
        <span class="text-center font-semibold text-highlighted">Roles table</span>
        <UBadge
          color="neutral"
          variant="soft"
          class="justify-self-end"
        >
          {{ data.length }} roles
        </UBadge>
      </div>
    </template>
    <p class="mb-3 text-sm text-muted">
      Same roles as the grid, laid out for sorting — click a header.
    </p>
    <div class="w-full overflow-hidden">
      <UTable
        :data="data"
        :columns="columns"
        class="w-full"
      >
        <template #hex-cell="{ row }">
          <span class="inline-flex items-center gap-1.5">
            <span
              class="h-3 w-3 shrink-0 rounded border border-default"
              :style="{ backgroundColor: row.original.hex }"
            />
            <span class="font-mono text-xs">{{ row.original.hex.slice(1) }}</span>
          </span>
        </template>
        <template #l-cell="{ row }">
          <span class="text-xs">{{ row.original.l.toFixed(2) }}</span>
        </template>
        <template #c-cell="{ row }">
          <span class="text-xs">{{ row.original.c.toFixed(2) }}</span>
        </template>
        <template #h-cell="{ row }">
          <span class="text-xs">{{ row.original.h.toFixed(0) }}°</span>
        </template>
        <template #ratio-cell="{ row }">
          <span class="text-xs">{{ row.original.ratio.toFixed(2) }}</span>
        </template>
        <template #compliance-cell="{ row }">
          <UBadge
            :color="row.original.aaa ? 'success' : row.original.aa ? 'primary' : 'neutral'"
            variant="soft"
            size="xs"
          >
            {{ row.original.compliance }}
          </UBadge>
        </template>
      </UTable>
    </div>
  </UCard>
</template>
