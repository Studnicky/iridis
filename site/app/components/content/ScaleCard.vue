<script setup lang="ts">
/**
 * One semantic alias's full 50→950 ramp plus sample components in that color.
 * Pure content — reused by PaletteCarousel's Swiper slide and its no-JS static
 * fallback, so both render identical markup.
 */
defineProps<{ alias: { key: string; label: string } }>();

const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
</script>

<template>
  <div
    class="glass scanlines float h-full p-5"
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
