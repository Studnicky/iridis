<script setup lang="ts">
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

    <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
  </UCard>
</template>
