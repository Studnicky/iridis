<script setup lang="ts">
import { useDataLayout } from '~/composables/useDataLayout.ts';
import { useIridis } from '~/composables/useIridis.ts';

/**
 * Raw-value-focused role listing — name, hex, and the OKLCH breakdown
 * (L/C/H) the engine actually resolved. Contrast/compliance detail lives in
 * Roles table instead, so the two cards split the same underlying role set
 * by concern rather than both showing everything. Sort state is shared
 * (RoleSortControls / roleSortKeys) with every other role listing on the
 * page — sorting here by, say, Compliance reorders Roles table identically.
 */
const { sortedRoleContrastRows } = useIridis();
const { dataLayout } = useDataLayout();
</script>

<template>
  <UCard>
    <div class="mb-3 flex items-start justify-between gap-2">
      <p class="text-sm text-muted">
        Same roles as Roles table, laid out with their raw OKLCH values — sort by any field below.
      </p>
      <UBadge
        color="neutral"
        variant="soft"
        class="flex-none"
      >
        {{ sortedRoleContrastRows.length }} roles
      </UBadge>
    </div>

    <RoleSortControls class="mb-3" />

    <div
      v-show="dataLayout === 'grid'"
      class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3"
    >
      <div
        v-for="r in sortedRoleContrastRows"
        :key="r.name"
        class="flex items-center gap-2 rounded-lg border border-default p-2"
      >
        <div
          class="h-9 w-9 shrink-0 rounded-md border border-default"
          :style="{ backgroundColor: r.hex }"
        />
        <div class="min-w-0 flex-1">
          <div class="truncate text-xs font-medium text-highlighted">
            {{ r.name }}
          </div>
          <span class="truncate font-mono text-[10px] text-muted">{{ r.hex }}</span>
          <div class="grid grid-cols-3 gap-x-2 text-[10px] text-muted">
            <span>L {{ r.l.toFixed(2) }}</span>
            <span>C {{ r.c.toFixed(2) }}</span>
            <span>H {{ r.h.toFixed(0) }}°</span>
          </div>
        </div>
      </div>
    </div>

    <div
      v-show="dataLayout === 'list'"
      class="flex flex-col gap-2"
    >
      <div
        v-for="r in sortedRoleContrastRows"
        :key="r.name"
        class="flex items-center gap-3 rounded-lg border border-default p-2"
      >
        <div
          class="h-9 w-9 shrink-0 rounded-md border border-default"
          :style="{ backgroundColor: r.hex }"
        />
        <div class="min-w-0 flex-1 truncate text-xs font-medium text-highlighted">
          {{ r.name }}
        </div>
        <span class="shrink-0 font-mono text-[10px] text-muted">{{ r.hex }}</span>
        <div class="flex shrink-0 gap-x-2 text-[10px] text-muted">
          <span>L {{ r.l.toFixed(2) }}</span>
          <span>C {{ r.c.toFixed(2) }}</span>
          <span>H {{ r.h.toFixed(0) }}°</span>
        </div>
      </div>
    </div>

    <div
      v-show="dataLayout === 'pixel'"
      class="grid grid-cols-3 gap-1 sm:grid-cols-4 lg:grid-cols-6"
    >
      <div
        v-for="r in sortedRoleContrastRows"
        :key="r.name"
        class="flex flex-col items-center gap-0.5 rounded-md border border-default p-1"
      >
        <div
          class="h-10 w-full shrink-0 rounded-sm border border-default"
          :style="{ backgroundColor: r.hex }"
        />
        <div class="w-full truncate text-center text-[9px] font-medium text-highlighted">
          {{ r.name }}
        </div>
        <span class="truncate font-mono text-[8px] text-muted">{{ r.hex }}</span>
        <div class="flex gap-x-1 text-[8px] text-muted">
          <span>{{ r.l.toFixed(2) }}</span>
          <span>{{ r.c.toFixed(2) }}</span>
          <span>{{ r.h.toFixed(0) }}°</span>
        </div>
      </div>
    </div>

    <table
      v-show="dataLayout === 'table'"
      class="w-full border-collapse text-xs"
    >
      <thead>
        <tr class="border-b border-default text-left text-muted">
          <th class="p-2 font-medium">
            Swatch
          </th>
          <th class="p-2 font-medium">
            Name
          </th>
          <th class="p-2 font-medium">
            Hex
          </th>
          <th class="p-2 font-medium">
            L
          </th>
          <th class="p-2 font-medium">
            C
          </th>
          <th class="p-2 font-medium">
            H
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="r in sortedRoleContrastRows"
          :key="r.name"
          class="border-b border-default last:border-0"
        >
          <td class="p-2">
            <div
              class="h-5 w-5 rounded border border-default"
              :style="{ backgroundColor: r.hex }"
            />
          </td>
          <td class="p-2 font-medium text-highlighted">
            {{ r.name }}
          </td>
          <td class="p-2 font-mono text-muted">
            {{ r.hex }}
          </td>
          <td class="p-2 text-muted">
            {{ r.l.toFixed(2) }}
          </td>
          <td class="p-2 text-muted">
            {{ r.c.toFixed(2) }}
          </td>
          <td class="p-2 text-muted">
            {{ r.h.toFixed(0) }}°
          </td>
        </tr>
      </tbody>
    </table>
  </UCard>
</template>
