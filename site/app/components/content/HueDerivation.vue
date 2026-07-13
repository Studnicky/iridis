<script setup lang="ts">
import { computed, ref } from 'vue';
import { colorRecordFactory } from '@studnicky/iridis';
import { useIridis } from '~/composables/useIridis.ts';
import { getAnalogousHues, getCompoundHues, getSplitComplementaryHues, selectHueAlgorithm } from '~/utils/colorDerivation.ts';
import type { HueAlgorithm } from '~/composables/types/colorDerivation.ts';

/**
 * Live reference for the 8 hue-derivation algorithms Derivation Settings lets
 * you assign per role (primary/success/warning/etc.) — pick a seed role, drag
 * the spacing, and see every algorithm's actual output hues at once, instead
 * of having to flip a role's algorithm and re-read its swatch one at a time.
 * Swatches are rendered at a fixed L/C (0.68 / 0.15) so only the hue differs
 * — the same reason RoleMathCard's clamp math keeps L/C fixed when comparing
 * seed vs resolved hue.
 */
const { roleViews } = useIridis();
const roleNames = computed<string[]>(() => roleViews.value.map((r) => r.name));
const selectedRole = ref<string>('brand');
const spacing = ref<number>(30);

const baseHue = computed<number>(() => {
  const role = roleViews.value.find((r) => r.name === selectedRole.value) ?? roleViews.value.find((r) => r.name === 'brand') ?? roleViews.value[0];
  return role?.h ?? 0;
});

function hexAt(hue: number): string {
  return colorRecordFactory.fromOklch(0.68, 0.15, hue).hex;
}

const ALGORITHMS: { key: HueAlgorithm; label: string; description: string }[] = [
  { 'key': 'monochromatic', 'label': 'Monochromatic', 'description': 'No hue shift — every derived role reads as the same hue as the seed.' },
  { 'key': 'complementary', 'label': 'Complementary', 'description': 'One hue sitting exactly 180° from the seed, on the opposite side of the wheel.' },
  { 'key': 'analogous', 'label': 'Analogous', 'description': 'The seed plus two neighbours, spaced evenly on either side.' },
  { 'key': 'triadic', 'label': 'Triadic', 'description': 'Three hues spaced 120° apart — an equilateral triangle around the wheel.' },
  { 'key': 'tetradic', 'label': 'Tetradic', 'description': 'Four hues spaced 90° apart — a square around the wheel.' },
  { 'key': 'split-complementary', 'label': 'Split-complementary', 'description': 'The seed plus the two hues neighbouring its complement, rather than the complement itself.' },
  { 'key': 'compound', 'label': 'Compound', 'description': 'Analogous around the seed AND analogous around its complement — six hues total.' },
  { 'key': 'freeform', 'label': 'Freeform', 'description': 'User-specified hue offsets, set per role in Derivation Settings below — shown here with an illustrative default.' }
];

const FREEFORM_ILLUSTRATIVE_OFFSETS = [0, 45, 200];

/** analogous/split-complementary/compound take the spacing slider; the rest have a fixed geometric angle and ignore it. */
const derived = computed(() => {
  return ALGORITHMS.map((a) => {
    let hues: number[];
    if (a.key === 'analogous') hues = getAnalogousHues(baseHue.value, spacing.value);
    else if (a.key === 'split-complementary') hues = getSplitComplementaryHues(baseHue.value, spacing.value);
    else if (a.key === 'compound') hues = getCompoundHues(baseHue.value, spacing.value);
    else if (a.key === 'freeform') hues = selectHueAlgorithm('freeform', baseHue.value, FREEFORM_ILLUSTRATIVE_OFFSETS);
    else hues = selectHueAlgorithm(a.key, baseHue.value);
    return { ...a, hues };
  });
});
</script>

<template>
  <UCard>
    <div class="space-y-4">
      <p class="text-sm text-muted">
        Every non-monochromatic role in Derivation Settings picks its hue via one of these 8 algorithms, applied to a seed hue. Pick a seed role and watch all 8 update together.
      </p>

      <div class="flex items-center gap-3">
        <div
          class="h-10 w-10 flex-none rounded-md border border-default"
          :style="{ backgroundColor: hexAt(baseHue) }"
        />
        <USelect
          v-model="selectedRole"
          :items="roleNames"
          class="w-48"
        />
        <span class="font-mono text-xs text-muted">{{ Math.round(baseHue) }}°</span>
      </div>

      <UFormField :label="`Spacing (analogous / split-complementary / compound) · ${spacing}°`">
        <USlider
          v-model="spacing"
          :min="10"
          :max="60"
          :step="5"
        />
      </UFormField>

      <div class="grid gap-3 sm:grid-cols-2">
        <div
          v-for="a in derived"
          :key="a.key"
          class="space-y-1.5 rounded-lg border border-default p-2.5"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm font-medium text-highlighted">{{ a.label }}</span>
            <span class="text-[10px] text-dimmed">{{ a.hues.length }} hue{{ a.hues.length === 1 ? '' : 's' }}</span>
          </div>
          <div class="flex gap-1.5">
            <div
              v-for="(h, i) in a.hues"
              :key="i"
              class="h-8 w-8 rounded border border-default shadow-inner"
              :style="{ backgroundColor: hexAt(h) }"
              :title="`${Math.round(h)}°`"
            />
          </div>
          <p class="text-[11px] text-dimmed">
            {{ a.description }}
          </p>
        </div>
      </div>

      <LearnMoreSection
        title="Learn more: how these hue algorithms feed the derivation pipeline"
        value="hue-derivation-detail"
      >
        <p>
          Each algorithm above takes one seed hue and returns a fixed set of derived hues by angular offset —
          pure OKLCH hue math, no lightness or chroma involved. <code>Derivation Settings</code> (below the
          carousel) assigns one of these 8 algorithms to each of the 7 derivable roles
          (primary/success/warning/error/info/neutral/accent); <code>selectHueAlgorithm()</code> in
          <code>utils/colorDerivation.ts</code> is the single dispatch point every role's derivation goes
          through.
        </p>
        <p class="mt-2">
          The variation algorithms that turn one derived hue into a full tint/shade ramp — tints-shades,
          saturation-gradient, value-gradient — are a separate, second stage
          (<code>applyVariationAlgorithms()</code>), applied after hue selection, not shown on these swatches.
        </p>
      </LearnMoreSection>
    </div>
  </UCard>
</template>
