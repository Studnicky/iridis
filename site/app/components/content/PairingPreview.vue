<script setup lang="ts">
import { usePairingPreview } from '~/composables/usePairingPreview.ts';
import { useDataLayout } from '~/composables/useDataLayout.ts';
import { complianceBadgeColor } from '~/utils/complianceBadgeColor.ts';

/**
 * Sample text-on-background blocks for the currently resolved palette — a
 * high-contrast light-on-dark pair, its dark-on-light inverse, and a
 * deliberately lower-contrast pair — so a non-technical viewer sees how the
 * colors read as real UI rather than a list of hex codes. Pass/fail is
 * always labelled as text alongside the swatch, never conveyed by color alone.
 */
const { pairings } = usePairingPreview();
const { dataLayout } = useDataLayout();
</script>

<template>
  <UCard>
    <div class="mb-3 flex items-start justify-between gap-2">
      <p class="text-sm text-muted">
        Sample text/background pairings drawn from the resolved roles above, so you can see how the palette actually reads as UI.
      </p>
      <UBadge
        color="neutral"
        variant="soft"
        class="flex-none"
      >
        {{ pairings.length }} pairings
      </UBadge>
    </div>

    <div
      v-show="dataLayout === 'grid'"
      class="grid grid-cols-1 gap-3 sm:grid-cols-3"
    >
      <div
        v-for="p in pairings"
        :key="p.key"
        class="overflow-hidden rounded-lg border border-default"
      >
        <div
          class="space-y-1 p-4"
          :style="{ backgroundColor: p.background.hex, color: p.foreground.hex }"
        >
          <p class="text-base font-semibold">
            {{ p.label }}
          </p>
          <p class="text-sm">
            The quick brown fox jumps over the lazy dog.
          </p>
        </div>
        <div class="flex flex-wrap items-center justify-between gap-1.5 border-t border-default bg-elevated px-3 py-2 text-xs">
          <span class="truncate text-muted">{{ p.foreground.name }} on {{ p.background.name }}</span>
          <UBadge
            :color="complianceBadgeColor(p.complianceLabel)"
            variant="soft"
            size="xs"
          >
            {{ p.complianceLabel }}
          </UBadge>
        </div>
      </div>
    </div>

    <div
      v-show="dataLayout === 'list'"
      class="grid grid-cols-1 gap-3"
    >
      <div
        v-for="p in pairings"
        :key="p.key"
        class="overflow-hidden rounded-lg border border-default"
      >
        <div
          class="space-y-1 p-4"
          :style="{ backgroundColor: p.background.hex, color: p.foreground.hex }"
        >
          <p class="text-base font-semibold">
            {{ p.label }}
          </p>
          <p class="text-sm">
            The quick brown fox jumps over the lazy dog.
          </p>
        </div>
        <div class="flex flex-wrap items-center justify-between gap-1.5 border-t border-default bg-elevated px-3 py-2 text-xs">
          <span class="truncate text-muted">{{ p.foreground.name }} on {{ p.background.name }}</span>
          <UBadge
            :color="complianceBadgeColor(p.complianceLabel)"
            variant="soft"
            size="xs"
          >
            {{ p.complianceLabel }}
          </UBadge>
        </div>
      </div>
    </div>

    <div
      v-show="dataLayout === 'pixel'"
      class="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6"
    >
      <div
        v-for="p in pairings"
        :key="p.key"
        class="overflow-hidden rounded-md border border-default"
      >
        <div
          class="p-2"
          :style="{ backgroundColor: p.background.hex, color: p.foreground.hex }"
        >
          <p class="truncate text-xs font-semibold">
            {{ p.label }}
          </p>
        </div>
        <div class="flex items-center justify-center border-t border-default bg-elevated px-1 py-1">
          <UBadge
            :color="complianceBadgeColor(p.complianceLabel)"
            variant="soft"
            size="xs"
          >
            {{ p.complianceLabel }}
          </UBadge>
        </div>
      </div>
    </div>

    <table
      v-show="dataLayout === 'table'"
      class="w-full border-collapse text-sm"
    >
      <thead>
        <tr class="border-b border-default text-left text-xs text-muted">
          <th class="px-3 py-2 font-medium">
            Pairing
          </th>
          <th class="px-3 py-2 font-medium">
            Label
          </th>
          <th class="px-3 py-2 font-medium">
            Compliance
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="p in pairings"
          :key="p.key"
          class="border-b border-default last:border-b-0"
        >
          <td class="px-3 py-2">
            <div
              class="h-6 w-10 rounded border border-default"
              :style="{ backgroundColor: p.background.hex, color: p.foreground.hex }"
            />
          </td>
          <td class="truncate px-3 py-2">
            {{ p.label }}
          </td>
          <td class="px-3 py-2">
            <UBadge
              :color="complianceBadgeColor(p.complianceLabel)"
              variant="soft"
              size="xs"
            >
              {{ p.complianceLabel }}
            </UBadge>
          </td>
        </tr>
      </tbody>
    </table>
  </UCard>
</template>
