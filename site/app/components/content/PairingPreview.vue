<script setup lang="ts">
import { usePairingPreview } from '~/composables/usePairingPreview.ts';

/**
 * Sample text-on-background blocks for the currently resolved palette — a
 * high-contrast light-on-dark pair, its dark-on-light inverse, and a
 * deliberately lower-contrast pair — so a non-technical viewer sees how the
 * colors read as real UI rather than a list of hex codes. Pass/fail is
 * always labelled as text alongside the swatch, never conveyed by color alone.
 */
const { pairings } = usePairingPreview();

function badgeColor(complianceLabel: string): 'success' | 'primary' | 'neutral' {
  if (complianceLabel.includes('AAA')) {return 'success';}
  if (complianceLabel.includes('AA')) {return 'primary';}
  return 'neutral';
}
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

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
            :color="badgeColor(p.complianceLabel)"
            variant="soft"
            size="xs"
          >
            {{ p.complianceLabel }}
          </UBadge>
        </div>
      </div>
    </div>
  </UCard>
</template>
