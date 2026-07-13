<script setup lang="ts">
import { useIridis } from '~/composables/useIridis.ts';

/**
 * Contrast/compliance-focused role listing — name, ratio, AA/AAA/fail badge.
 * Raw OKLCH values (L/C/H) live in Resolved roles instead, so the two cards
 * split the same underlying role set by concern rather than both showing
 * everything. Sort state is shared (RoleSortControls / roleSortKeys) with
 * every other role listing on the page.
 */
const { sortedRoleContrastRows } = useIridis();
</script>

<template>
  <UCard>
    <div class="mb-3 flex items-start justify-between gap-2">
      <p class="text-sm text-muted">
        Same roles as Resolved roles, laid out for contrast scanning — sort by any field below.
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

    <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      <div
        v-for="role in sortedRoleContrastRows"
        :key="role.name"
        class="flex items-center gap-2 rounded-lg border border-default bg-elevated p-2 text-sm"
      >
        <span
          class="h-7 w-7 shrink-0 rounded border border-default"
          :style="{ backgroundColor: role.hex }"
        />
        <div class="min-w-0 flex-1">
          <div class="truncate text-xs font-semibold text-highlighted">
            {{ role.name }}
          </div>
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] text-muted">Ratio {{ role.ratio.toFixed(2) }}</span>
            <UBadge
              :color="role.compliance === 'AAA' ? 'success' : role.compliance === 'AA' ? 'primary' : 'neutral'"
              variant="soft"
              size="xs"
            >
              {{ role.compliance }}
            </UBadge>
          </div>
        </div>
      </div>
    </div>

    <p class="mt-3 text-xs text-muted">
      Ratio and Compliance are live WCAG 2.1 measurements, nudged into range by the engine's contrast enforcement —
      see <a
        href="#10-math-primitives-reference"
        class="text-primary hover:underline"
      >Math Primitives Reference</a>
      for the WCAG/APCA math and how `enforce:contrast` corrects a failing pair.
    </p>
  </UCard>
</template>
