<script setup lang="ts">
import { computed } from 'vue';

import { useIridis } from '~/composables/useIridis.ts';
import { buildScaleCardAdjacentRatios, SCALE_CARD_SHADES } from './scale/buildScaleCardModel.ts';

/**
 * One semantic alias's full 50→950 ramp plus sample components in that color.
 * Pure content — rendered by PaletteCarousel's grid, one card per alias.
 */
const props = defineProps<{ alias: { key: string; label: string } }>();

const { roles, scales } = useIridis();

/** WCAG contrast ratio between each adjacent pair of shades in this alias's ramp — reveals the real perceptual "step" between consecutive stops. */
const adjacentRatios = computed(() => buildScaleCardAdjacentRatios(roles.value, scales.value, props.alias.key));
</script>

<template>
  <GlowCard
    class="h-full"
    :glow="`var(--ui-color-${alias.key}-500)`"
    :pulse-color="`var(--ui-color-${alias.key}-500)`"
    :title="alias.label"
    :title-color="`var(--ui-color-${alias.key}-400)`"
  >
    <div class="mb-4 grid grid-cols-11 gap-0.5 overflow-hidden rounded-lg">
      <div
        v-for="s in SCALE_CARD_SHADES"
        :key="s"
        class="h-14 ring-1 ring-inset ring-(--ui-border)/70"
        :style="{ backgroundColor: `var(--ui-color-${alias.key}-${s})` }"
        :title="`${alias.key}-${s}`"
      />
    </div>

    <div
      v-if="adjacentRatios.length > 0"
      class="mb-3 flex flex-wrap gap-x-2 gap-y-0.5 font-mono text-[10px] leading-tight text-(--ui-text-dimmed)"
    >
      <span
        v-for="pair in adjacentRatios"
        :key="`${pair.from}-${pair.to}`"
        :title="`${alias.key}-${pair.from} vs ${alias.key}-${pair.to}`"
      >{{ pair.from }}↔{{ pair.to }}: {{ pair.ratio.toFixed(2) }}</span>
    </div>

    <ScaleSpecimenRow :alias-key="alias.key" />
  </GlowCard>
</template>
