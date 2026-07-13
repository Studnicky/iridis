<script setup lang="ts">
import { computed } from 'vue';

import { useIridis } from '~/composables/useIridis.ts';
import { contrastRatio } from '~/theme/ContrastRatio.ts';
import { Tokens } from '~/theme/Tokens.ts';

/**
 * One semantic alias's full 50→950 ramp plus sample components in that color.
 * Pure content — rendered by PaletteCarousel's grid, one card per alias.
 */
const props = defineProps<{ alias: { key: string; label: string } }>();

const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

const { roles, scales } = useIridis();

/** WCAG contrast ratio between each adjacent pair of shades in this alias's ramp — reveals the real perceptual "step" between consecutive stops. */
const adjacentRatios = computed<{ from: number; to: number; ratio: number }[]>(() => {
  const hexes = shades.map((s) => {return Tokens.resolveAliasShadeHex(roles.value, scales.value, props.alias.key, s);});
  const pairs: { from: number; to: number; ratio: number }[] = [];
  for (let i = 0; i < shades.length - 1; i++) {
    const a = hexes[i];
    const b = hexes[i + 1];
    if (a && b) {pairs.push({ 'from': shades[i]!, 'to': shades[i + 1]!, 'ratio': contrastRatio(a, b) });}
  }
  return pairs;
});
</script>

<template>
  <div
    class="glass scanlines h-full p-5"
    :style="{ '--glow': `var(--ui-color-${alias.key}-500)` }"
  >
    <div class="mb-3 flex items-center justify-between">
      <span
        class="font-display text-sm font-bold uppercase tracking-widest glow-text"
        :style="{ color: `var(--ui-color-${alias.key}-400)` }"
      >{{ alias.label }}</span>
      <span
        class="h-3 w-3 rounded-full pulse"
        :style="{ backgroundColor: `var(--ui-color-${alias.key}-500)` }"
      />
    </div>

    <div class="mb-4 grid grid-cols-11 gap-0.5 overflow-hidden rounded-lg">
      <div
        v-for="s in shades"
        :key="s"
        class="h-14"
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

    <div class="flex flex-wrap items-center gap-2">
      <UButton
        :color="alias.key === 'neutral' ? 'neutral' : (alias.key as never)"
        size="xs"
      >
        Solid
      </UButton>
      <UButton
        :color="alias.key === 'neutral' ? 'neutral' : (alias.key as never)"
        variant="soft"
        size="xs"
      >
        Soft
      </UButton>
      <UButton
        :color="alias.key === 'neutral' ? 'neutral' : (alias.key as never)"
        variant="outline"
        size="xs"
      >
        Line
      </UButton>
      <UBadge
        :color="alias.key === 'neutral' ? 'neutral' : (alias.key as never)"
        variant="soft"
        size="sm"
      >
        500
      </UBadge>
    </div>
  </div>
</template>
