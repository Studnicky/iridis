<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';

import { useColorStreamHistory } from '../../composables/useColorStreamHistory.ts';
import { useLivingBackground } from '../../composables/useLivingBackground.ts';
import { buildLiveMotionSwatches, EASE_PRESETS, NAMED_ANIMATIONS } from './motion/buildMotionShowcaseModel.ts';

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
const tuneMs = ref<number>(550);
const easeKey = ref<string>('Smooth (default)');
const reducedMotion = ref<boolean>(false);

useLivingBackground();
const colorStreamHistory = useColorStreamHistory();

/** Current (most recent) hex per decorative role, falling back to the role's static token when the history is still empty. */
const liveSwatches = computed(() => buildLiveMotionSwatches(colorStreamHistory));

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
</script>

<template>
  <UCard>
    <div class="space-y-5">
      <MotionTimingPanel
        :reduced-motion="reducedMotion"
        :tune-ms="tuneMs"
        :ease-key="easeKey"
        :ease-options="Object.keys(EASE_PRESETS)"
        @update:tune-ms="tuneMs = $event"
        @update:ease-key="easeKey = $event"
      />

      <ShowcasePlane
        label="Live engine swatches"
        help="These six swatches are engine-computed in real time — the same OKLCH curve evaluation driving the ambient background — not CSS keyframes."
      >
        <div class="flex flex-wrap gap-3">
          <div
            v-for="swatch in liveSwatches"
            :key="swatch.role"
            class="flex flex-col items-center gap-1"
          >
            <SwatchChip
              :hex="swatch.hex"
              class="h-6 w-6 rounded-full border border-default"
              :aria-label="`${swatch.role} ${swatch.hex}`"
            />
            <MicroNote>{{ swatch.role }}</MicroNote>
          </div>
        </div>
      </ShowcasePlane>

      <p class="text-xs text-muted">
        This card is a live demo of <strong class="text-highlighted">Living Color</strong> — the engine's
        palette-as-animated-vector layer, not just a static derivation. See
        <DocAnchorLink href="#living-color">Living Color</DocAnchorLink> for the underlying
        package (<code>iridis-anima</code>, <code>iridis-pulse</code>, <code>iridis-fsm</code>) that drives every
        transition here.
      </p>

      <ShowcasePlane label="Named animation library">
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <NamedAnimationSpecimen
            v-for="a in NAMED_ANIMATIONS"
            :key="a.label"
            :animation="a"
          />
        </div>
      </ShowcasePlane>
    </div>
  </UCard>
</template>
