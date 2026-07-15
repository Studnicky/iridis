<script setup lang="ts">
import { useDataLayout } from '~/composables/useDataLayout.ts';
import { useIridis } from '~/composables/useIridis.ts';
import { complianceBadgeColor } from '~/utils/complianceBadgeColor.ts';

/**
 * Contrast/compliance-focused role listing — name, ratio, AA/AAA/fail badge.
 * Raw OKLCH values (L/C/H) live in Resolved roles instead, so the two cards
 * split the same underlying role set by concern rather than both showing
 * everything. Sort state is shared (RoleSortControls / roleSortKeys) with
 * every other role listing on the page.
 */
const { sortedRoleContrastRows } = useIridis();
const { dataLayout } = useDataLayout();
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

    <div
      v-show="dataLayout === 'grid'"
      class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"
    >
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
              :color="complianceBadgeColor(role.compliance)"
              variant="soft"
              size="xs"
            >
              {{ role.compliance }}
            </UBadge>
          </div>
        </div>
      </div>
    </div>

    <div
      v-show="dataLayout === 'list'"
      class="flex flex-col gap-2"
    >
      <div
        v-for="role in sortedRoleContrastRows"
        :key="role.name"
        class="flex w-full items-center gap-3 rounded-lg border border-default bg-elevated p-2 text-sm"
      >
        <span
          class="h-7 w-7 shrink-0 rounded border border-default"
          :style="{ backgroundColor: role.hex }"
        />
        <div class="truncate text-xs font-semibold text-highlighted">
          {{ role.name }}
        </div>
        <span class="text-[10px] text-muted">Ratio {{ role.ratio.toFixed(2) }}</span>
        <UBadge
          :color="complianceBadgeColor(role.compliance)"
          variant="soft"
          size="xs"
          class="ml-auto"
        >
          {{ role.compliance }}
        </UBadge>
      </div>
    </div>

    <div
      v-show="dataLayout === 'pixel'"
      class="grid grid-cols-4 gap-1 sm:grid-cols-6 lg:grid-cols-8"
    >
      <div
        v-for="role in sortedRoleContrastRows"
        :key="role.name"
        class="flex flex-col items-center gap-1 rounded border border-default bg-elevated p-1 text-center"
      >
        <span
          class="h-10 w-10 shrink-0 rounded-sm border border-default"
          :style="{ backgroundColor: role.hex }"
        />
        <div class="w-full truncate text-[9px] font-semibold text-highlighted">
          {{ role.name }}
        </div>
        <div class="flex items-center gap-1">
          <span class="text-[8px] text-muted">{{ role.ratio.toFixed(2) }}</span>
          <UBadge
            :color="complianceBadgeColor(role.compliance)"
            variant="soft"
            size="xs"
          >
            {{ role.compliance }}
          </UBadge>
        </div>
      </div>
    </div>

    <table
      v-show="dataLayout === 'table'"
      class="w-full border-collapse text-sm"
    >
      <thead>
        <tr class="border-b border-default">
          <th class="p-2 text-left text-xs font-semibold text-muted">
            Swatch
          </th>
          <th class="p-2 text-left text-xs font-semibold text-muted">
            Name
          </th>
          <th class="p-2 text-left text-xs font-semibold text-muted">
            Ratio
          </th>
          <th class="p-2 text-left text-xs font-semibold text-muted">
            Compliance
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="role in sortedRoleContrastRows"
          :key="role.name"
          class="border-b border-default"
        >
          <td class="p-2">
            <span
              class="block h-5 w-5 rounded border border-default"
              :style="{ backgroundColor: role.hex }"
            />
          </td>
          <td class="p-2 text-xs font-semibold text-highlighted">
            {{ role.name }}
          </td>
          <td class="p-2 text-xs text-muted">
            {{ role.ratio.toFixed(2) }}
          </td>
          <td class="p-2">
            <UBadge
              :color="complianceBadgeColor(role.compliance)"
              variant="soft"
              size="xs"
            >
              {{ role.compliance }}
            </UBadge>
          </td>
        </tr>
      </tbody>
    </table>

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
