<script setup lang="ts">
import { computed } from 'vue';
import type { CvdType } from '@studnicky/iridis';
import { useIridis } from '~/composables/useIridis.ts';

/**
 * The CVD home: preview what the current palette looks like under each color
 * vision deficiency (a real SVG filter, see CvdPreviewOverlay.vue — display-only,
 * never touches the palette), plus what each condition actually is. Always
 * usable, no enable step — enforce:cvdSimulate itself runs unconditionally
 * (see useIridis.ts's REQUIRED_COLOR_STAGES), so there is nothing to switch on
 * here, only something to look at.
 */
const { cvdPreviewTypes, toggleCvdPreviewType, contrastReport } = useIridis();

const CVD_TYPES: { value: CvdType; label: string; prevalence: string; description: string }[] = [
  {
    'value':      'protanopia',
    'label':      'Protanopia',
    'prevalence': '~1% of men',
    'description': 'The L-cone (long-wavelength, red-sensitive) is absent. Reds appear darker and can be confused with black, greens, or browns.'
  },
  {
    'value':      'deuteranopia',
    'label':      'Deuteranopia',
    'prevalence': '~1% of men',
    'description': 'The M-cone (medium-wavelength, green-sensitive) is absent — the most common dichromacy. Reds and greens both shift toward a shared yellowish-brown.'
  },
  {
    'value':      'tritanopia',
    'label':      'Tritanopia',
    'prevalence': '<0.01% of people',
    'description': 'The S-cone (short-wavelength, blue-sensitive) is absent. Rare, and unlike the other two, affects men and women about equally. Blues and greens, or yellows and violets, become hard to tell apart.'
  },
  {
    'value':      'achromatopsia',
    'label':      'Achromatopsia',
    'prevalence': 'very rare',
    'description': 'Complete absence of color vision (rod monochromacy) — everything resolves to luminance only, the way a black-and-white photo does.'
  }
];

const cvdReport = computed(() => {
  const cvd = contrastReport.value.cvd as { 'warnings': unknown[]; 'corrections'?: { 'cvdTypesRemaining': string[] }[] } | undefined;
  if (cvd === undefined) {return undefined;}
  const corrected = cvd.corrections?.filter((c) => {return c.cvdTypesRemaining.length === 0;}).length ?? 0;
  const stillFailing = cvd.corrections?.filter((c) => {return c.cvdTypesRemaining.length > 0;}).length ?? Math.max(cvd.warnings.length, 0);
  return { 'corrected': corrected, 'stillFailing': stillFailing, 'warnings': cvd.warnings.length };
});
</script>

<template>
  <UCard>
    <template #header>
      <span class="block text-center font-semibold text-highlighted">CVD vision</span>
    </template>

    <div class="space-y-4">
      <p class="text-sm text-muted">
        Color vision deficiency (CVD) checking runs on every palette, always — see
        <code class="font-mono text-xs">enforce:cvdSimulate</code> in the Pipeline card. This card
        is where you actually look: pick any combination of conditions below to preview the
        <strong class="text-highlighted">current palette</strong> the way that vision would see
        it. This never modifies the palette — for that, see "Auto-correct CVD failures" in the
        Contrast target card above the carousel.
      </p>

      <div class="flex items-center justify-between gap-3">
        <span class="text-sm font-medium text-highlighted">Simulate CVD vision</span>
        <UButton
          v-if="cvdPreviewTypes.size > 0"
          label="Clear"
          color="neutral"
          variant="ghost"
          size="xs"
          @click="cvdPreviewTypes = new Set();"
        />
      </div>

      <div class="grid gap-3 sm:grid-cols-2">
        <div
          v-for="t in CVD_TYPES"
          :key="t.value"
          class="space-y-2 rounded-lg border p-3 transition-colors"
          :class="cvdPreviewTypes.has(t.value) ? 'border-primary bg-primary/10' : 'border-default'"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="font-medium text-highlighted">{{ t.label }}</span>
            <UButton
              :label="cvdPreviewTypes.has(t.value) ? 'Previewing' : 'Preview'"
              size="xs"
              :color="cvdPreviewTypes.has(t.value) ? 'primary' : 'neutral'"
              :variant="cvdPreviewTypes.has(t.value) ? 'solid' : 'soft'"
              class="min-w-[80px]"
              @click="toggleCvdPreviewType(t.value)"
            />
          </div>
          <p class="text-xs text-muted">
            {{ t.description }}
          </p>
          <p class="text-[10px] text-dimmed">
            {{ t.prevalence }}
          </p>
        </div>
      </div>

      <div
        v-if="cvdReport"
        class="flex flex-wrap items-center gap-1.5"
      >
        <UBadge
          :color="cvdReport.warnings === 0 ? 'success' : 'warning'"
          variant="soft"
          size="sm"
        >
          {{ cvdReport.warnings === 0 ? 'No contrast warnings under CVD' : `${cvdReport.warnings} warning${cvdReport.warnings === 1 ? '' : 's'}` }}
        </UBadge>
        <UBadge
          v-if="cvdReport.corrected > 0"
          color="primary"
          variant="soft"
          size="sm"
        >
          {{ cvdReport.corrected }} pair{{ cvdReport.corrected === 1 ? '' : 's' }} auto-corrected
        </UBadge>
      </div>

      <div class="space-y-1 border-t border-default pt-3 text-xs text-muted">
        <p>
          Pick any combination above — real CVD isn't always one condition, and previewing
          multiple at once chains their filters (see CvdPreviewOverlay.vue).
        </p>
        <div class="flex flex-wrap gap-x-4 gap-y-1">
          <a
            href="https://www.nei.nih.gov/learn-about-eye-health/eye-conditions-and-diseases/color-blindness"
            target="_blank"
            rel="noopener noreferrer"
            class="text-primary underline underline-offset-2 hover:text-primary/80"
          >
            National Eye Institute: Color Blindness ↗
          </a>
          <a
            href="https://www.colourblindawareness.org/colour-blindness/types-of-colour-blindness/"
            target="_blank"
            rel="noopener noreferrer"
            class="text-primary underline underline-offset-2 hover:text-primary/80"
          >
            Colour Blind Awareness: Types of Colour Blindness ↗
          </a>
        </div>
      </div>
    </div>
  </UCard>
</template>
