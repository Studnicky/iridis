<script setup lang="ts">
import { computed, ref } from 'vue';
import { useIridis } from '~/composables/useIridis.ts';
import {
  buildHueDerivationRoleNames,
  deriveHueSpecimens,
  hueHexAt,
  resolveBaseHue
} from './derivation/buildHueDerivationSpecimens.ts';

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
const roleNames = computed(() => buildHueDerivationRoleNames(roleViews.value));
const selectedRole = ref<string>('brand');
const spacing = ref<number>(30);

const baseHue = computed<number>(() => {
  return resolveBaseHue(roleViews.value, selectedRole.value);
});

/** analogous/split-complementary/compound take the spacing slider; the rest have a fixed geometric angle and ignore it. */
const derived = computed(() => {
  return deriveHueSpecimens(baseHue.value, spacing.value);
});
</script>

<template>
  <UCard>
    <div class="space-y-4">
      <SectionIntro body="Every non-monochromatic role in Derivation Settings picks its hue via one of these 8 algorithms, applied to a seed hue. Pick a seed role and watch all 8 update together." />

      <div class="flex items-center gap-3">
        <SwatchSummaryRow
          :hex="hueHexAt(baseHue)"
          aria-label="Selected seed hue"
          class="w-auto min-w-0"
        >
          <template #default />
        </SwatchSummaryRow>
        <AppSelect
          v-model="selectedRole"
          :items="roleNames"
          class="w-48"
        />
        <MutedMono>{{ Math.round(baseHue) }}°</MutedMono>
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
        <HueAlgorithmSpecimen
          v-for="a in derived"
          :key="a.key"
          :label="a.label"
          :description="a.description"
          :count-label="a.countLabel"
          :hues="a.hues"
          :hex-at="hueHexAt"
        />
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
          <code>utils/selectHueAlgorithm.ts</code> is the single dispatch point every role's derivation goes
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
