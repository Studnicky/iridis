<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';

/**
 * A "look and feel" motion page — the kind every design system ships one of —
 * but built on the site's OWN real motion tokens, not invented mockups. The
 * duration/easing sliders write directly to --iridis-tune/--iridis-ease, the
 * SAME two CSS variables main.css uses to animate every color transition on
 * the page in unison; drag one and the whole site's re-theme speed changes
 * live, not just this card's preview swatches. The named-animation swatches
 * below use the site's actual utility classes (.pulse/.float/.spin-slow/.glass)
 * — the same class instances every other card already uses, not copies.
 */
const EASE_PRESETS: Record<string, string> = {
  'Bouncy':          'cubic-bezier(0.68, -0.55, 0.27, 1.55)',
  'Ease in/out':     'ease-in-out',
  'Linear':          'linear',
  'Smooth (default)': 'cubic-bezier(0.33, 0, 0.2, 1)',
  'Snappy':          'cubic-bezier(0.16, 1, 0.3, 1)'
};

const tuneMs = ref<number>(550);
const easeKey = ref<string>('Smooth (default)');
const reducedMotion = ref<boolean>(false);

onMounted(() => {
  const styles = getComputedStyle(document.documentElement);
  const raw = styles.getPropertyValue('--iridis-tune').trim();
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isNaN(parsed)) {tuneMs.value = parsed;}
  reducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
});

watch(tuneMs, (ms) => {
  document.documentElement.style.setProperty('--iridis-tune', `${ms}ms`);
});
watch(easeKey, (key) => {
  document.documentElement.style.setProperty('--iridis-ease', EASE_PRESETS[key] ?? EASE_PRESETS['Smooth (default)']!);
});

const NAMED_ANIMATIONS = [
  { 'class': 'pulse', 'duration': '3s', 'label': 'pulse-glow', 'note': 'carousel arrows, active dot' },
  { 'class': 'float', 'duration': '7s', 'label': 'float', 'note': 'hero logo, floating orbs' },
  { 'class': 'spin-slow', 'duration': '26s', 'label': 'spin', 'note': 'ambient background accent' },
  { 'class': 'glass', 'duration': '4s', 'label': 'sheen', 'note': 'every glass panel’s top edge' }
];
</script>

<template>
  <UCard>
    <template #header>
      <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <span />
        <span class="text-center font-semibold text-highlighted">Motion</span>
        <UBadge
          v-if="reducedMotion"
          color="warning"
          variant="soft"
          class="justify-self-end"
        >
          prefers-reduced-motion is on
        </UBadge>
      </div>
    </template>

    <div class="space-y-5">
      <p class="text-sm text-muted">
        Drag the duration — every color transition on this page, not just the swatches below, runs on
        this same clock.
      </p>

      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField :label="`Unison duration · ${tuneMs}ms`">
          <USlider
            v-model="tuneMs"
            :min="100"
            :max="1500"
            :step="50"
          />
        </UFormField>
        <UFormField label="Easing">
          <USelect
            v-model="easeKey"
            :items="Object.keys(EASE_PRESETS)"
            class="w-full"
          />
        </UFormField>
      </div>

      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div
          v-for="a in NAMED_ANIMATIONS"
          :key="a.label"
          class="flex flex-col items-center gap-2 rounded-lg border border-default p-3 text-center"
        >
          <div
            class="glass flex h-12 w-12 items-center justify-center rounded-full"
            :class="a.class !== 'glass' ? a.class : ''"
          >
            <span
              class="h-3 w-3 rounded-full"
              :style="{ backgroundColor: 'var(--ui-primary)' }"
            />
          </div>
          <div class="font-mono text-[11px] text-highlighted">
            {{ a.label }} · {{ a.duration }}
          </div>
          <div class="text-[10px] text-dimmed">
            {{ a.note }}
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>
