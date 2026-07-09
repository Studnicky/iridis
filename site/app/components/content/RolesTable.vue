<script setup lang="ts">
import { computed, h, resolveComponent } from 'vue';
import { useIridis } from '~/composables/useIridis.ts';
import { contrastRatio } from '~/theme/ContrastRatio.ts';

/**
 * Every resolved role as a sortable data table — the same roleViews/roles
 * ResolvedRoles.vue shows as a swatch grid, reformatted for a dense, scannable
 * read: click a column header to sort by lightness, chroma, hue, or contrast.
 */
const { roleViews, roles } = useIridis();
const UButton = resolveComponent('UButton');
const UBadge = resolveComponent('UBadge');

const bg = computed<string>(() => roles.value['background'] ?? '#000000');

type RowType = { 'name': string; 'hex': string; 'l': number; 'c': number; 'h': number; 'ratio': number; 'aa': boolean; 'aaa': boolean };

const data = computed<RowType[]>(() => roleViews.value.map((r) => {
  const ratio = contrastRatio(r.hex, bg.value);
  return { 'aa': ratio >= 4.5, 'aaa': ratio >= 7, 'c': r.c, 'h': r.h, 'hex': r.hex, 'l': r.l, 'name': r.name, 'ratio': ratio };
}));

type SortColumnType = { 'getIsSorted': () => false | 'asc' | 'desc'; 'toggleSorting': (desc?: boolean) => void };

function sortableHeader(label: string) {
  return ({ column }: { column: SortColumnType }) => {return h(UButton, {
    'color': 'neutral',
    'icon': column.getIsSorted() === 'asc' ? 'i-material-symbols-arrow-upward-rounded' : column.getIsSorted() === 'desc' ? 'i-material-symbols-arrow-downward-rounded' : 'i-material-symbols-unfold-more-rounded',
    'onClick': () => { column.toggleSorting(column.getIsSorted() === 'asc'); },
    'size': 'xs',
    'variant': 'ghost'
  }, () => label);};
}

const columns = [
  { 'accessorKey': 'name', 'header': sortableHeader('Role') },
  { 'accessorKey': 'hex', 'header': 'Hex' },
  { 'accessorKey': 'l', 'header': sortableHeader('L') },
  { 'accessorKey': 'c', 'header': sortableHeader('C') },
  { 'accessorKey': 'h', 'header': sortableHeader('H°') },
  { 'accessorKey': 'ratio', 'header': sortableHeader('Ratio') },
  { 'header': 'Compliance', 'id': 'compliance' }
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
    <div class="overflow-x-auto">
      <UTable
        :data="data"
        :columns="columns"
        class="min-w-[560px]"
      >
        <template #hex-cell="{ row }">
          <span class="inline-flex items-center gap-2">
            <span
              class="h-4 w-4 shrink-0 rounded border border-default"
              :style="{ backgroundColor: row.original.hex }"
            />
            <span class="font-mono text-xs">{{ row.original.hex }}</span>
          </span>
        </template>
        <template #l-cell="{ row }">
          {{ row.original.l.toFixed(3) }}
        </template>
        <template #c-cell="{ row }">
          {{ row.original.c.toFixed(3) }}
        </template>
        <template #h-cell="{ row }">
          {{ row.original.h.toFixed(1) }}°
        </template>
        <template #ratio-cell="{ row }">
          {{ row.original.ratio.toFixed(2) }}
        </template>
        <template #compliance-cell="{ row }">
          <UBadge
            :color="row.original.aaa ? 'success' : row.original.aa ? 'primary' : 'neutral'"
            variant="soft"
            size="xs"
          >
            {{ row.original.aaa ? 'AAA' : row.original.aa ? 'AA' : 'fail' }}
          </UBadge>
        </template>
      </UTable>
    </div>
  </UCard>
</template>
