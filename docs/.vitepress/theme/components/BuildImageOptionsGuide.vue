<script setup lang="ts">
/**
 * BuildImageOptionsGuide.vue
 *
 * Reference panel that pairs with the image-extraction sliders in
 * ImageToTheme. One Accordion panel per extraction knob: algorithm,
 * palette size (K), histogram bits-per-channel, ΔE input cap,
 * harmonize threshold, lightness range, chroma range. Single-select
 * (PrimeVue Accordion's default) so only one detail block is open at
 * a time, keeping the reference column compact. Mirrors
 * `BuildRoleSchemaGuide` shape so all three tab-guides read as one
 * design system.
 *
 * Each block:
 *   - `leg`     header label (left side, full row click target)
 *   - `summary` one-line "what it is": top of the expanded body
 *   - `detail`  longer "what it does": bottom of the expanded body
 *   - `href`    optional drill-in into the reference docs
 */
import { ref } from 'vue';

import Accordion        from 'primevue/accordion';
import AccordionPanel   from 'primevue/accordionpanel';
import AccordionHeader  from 'primevue/accordionheader';
import AccordionContent from 'primevue/accordioncontent';

import IridisCard from './base/IridisCard.vue';

interface FieldInterface {
  readonly 'leg':      string;
  readonly 'summary':  string;
  readonly 'detail':   string;
  readonly 'href'?:    string;
}

/* The currently-open accordion panel id (one of FIELDS[].leg). `null`
   collapses every panel. PrimeVue Accordion v-models a single value
   in single-select mode (its default) and lets the user collapse the
   open panel by clicking its header again. Initial state opens
   "Algorithm" so the panel is never empty on first paint. */
const openPanel = ref<string | null>('Algorithm');

const FIELDS: readonly FieldInterface[] = [
  {
    'leg':     'Algorithm',
    'summary': 'Which clustering math reduces pixels to K dominant colours.',
    'detail':  'median-cut is the weighted Heckbert variant: O(N log N), fast, splits buckets by widest range × cumulative weight. delta-e is agglomerative ΔE2000: O(N² log N), visually faithful, preserves perceptually similar clusters.',
  },
  {
    'leg':     'Palette size (K)',
    'summary': 'Number of dominant colours the extractor returns.',
    'detail':  'Lower K = broader strokes (good for hero / accent extraction); higher K = finer-grained (good for syntax-token-style palettes). Output records carry `hints.weight` so a small K still preserves the dominant-region signal from the histogram.',
  },
  {
    'leg':     'Histogram bpc',
    'summary': 'Bits per channel for the upstream pixel histogram.',
    'detail':  'Three to seven bits per RGB channel. 5 bpc = 32 768 bins, the default; collapses sensor noise while keeping perceptually distinct colours separate. Lower bpc smashes more pixels into the same bin (faster, less faithful); higher bpc lets near-duplicate sensor values fragment into separate clusters.',
  },
  {
    'leg':     'Δ-E input cap',
    'summary': 'Max records fed into the agglomerative ΔE reducer.',
    'detail':  'Active only when the algorithm is `delta-e`. The reducer is O(N² log N), so a raw photo histogram (thousands of non-empty bins) hangs the main thread. Pre-trims by descending weight: the merger still sees every visually important cluster first; the long tail of one-off pixels falls off.',
  },
  {
    'leg':     'Harmonize ΔE',
    'summary': 'Min ΔE distance the accent must keep from the frame.',
    'detail':  '`gallery:harmonize` shifts the accent\'s OKLCH hue if it lands within this distance of the frame, guaranteeing the accent reads as distinct against the surface it sits on. Zero disables harmonization; ten is the perceptual "noticeably different" threshold.',
  },
  {
    'leg':     'Lightness range',
    'summary': 'OKLCH L envelope the extractor clamps clusters into.',
    'detail':  'Drops pixels whose lightness sits outside `[min, max]` before clustering. Useful for ignoring blown-out highlights (cap max at ~0.95) or shadow noise (cap min at ~0.05) when the image has a long dynamic range.',
  },
  {
    'leg':     'Chroma range',
    'summary': 'OKLCH C envelope the extractor clamps clusters into.',
    'detail':  'Drops near-neutral pixels (set min > 0) or super-saturated outliers (cap max < 0.5) before clustering. The default `[0, 0.5]` admits the entire OKLCH chroma axis.',
  },
];
</script>

<template>
  <IridisCard variant="inset" class="build-image-options-guide">
    <header class="build-image-options-guide__head">
      <span class="build-image-options-guide__eyebrow">Reference</span>
      <h3 class="build-image-options-guide__title">Image options</h3>
      <p class="build-image-options-guide__hint">What every extractor knob does. Click a row to expand.</p>
    </header>
    <Accordion
      :value="openPanel"
      class="build-image-options-guide__accordion"
      @update:value="(v) => openPanel = v as string | null"
    >
      <AccordionPanel
        v-for="f in FIELDS"
        :key="f.leg"
        :value="f.leg"
        class="build-image-options-guide__panel"
      >
        <AccordionHeader class="build-image-options-guide__header">
          <span class="build-image-options-guide__leg">{{ f.leg }}</span>
        </AccordionHeader>
        <AccordionContent>
          <div class="build-image-options-guide__body">
            <p class="build-image-options-guide__summary">{{ f.summary }}</p>
            <p class="build-image-options-guide__detail">{{ f.detail }}</p>
            <a
              v-if="f.href"
              :href="f.href"
              class="build-image-options-guide__link"
              :title="`Open the ${f.leg} reference page`"
            >Open the {{ f.leg }} reference page →</a>
          </div>
        </AccordionContent>
      </AccordionPanel>
    </Accordion>
  </IridisCard>
</template>

<style scoped>
.build-image-options-guide {
  height: 100%;
}
.build-image-options-guide__head {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding-bottom: 0.6rem;
  margin-bottom: 0.75rem;
  border-bottom: 1px solid color-mix(in oklch, var(--vp-c-divider) 60%, transparent);
}
.build-image-options-guide__eyebrow {
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
}
.build-image-options-guide__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: -0.005em;
  color: var(--vp-c-text-1);
  border: 0;
  padding: 0;
}
.build-image-options-guide__hint {
  margin: 0;
  font-size: 0.78rem;
  line-height: 1.5;
  color: var(--vp-c-text-2);
}
/* PrimeVue Accordion overrides. The iridisPreset wires --p-* tokens
   to --iridis-* engine output but the accordion header has no preset
   override, so we paint it manually here. Header row: label on the
   left, indicator on the right (PrimeVue 4.x renders the toggle icon
   inline with text on the right by default; we just shape the row). */
.build-image-options-guide__accordion {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.build-image-options-guide__panel {
  border-radius: var(--iridis-radius, 6px);
  background: color-mix(in oklch, var(--vp-c-bg) 50%, transparent);
  border: 1px solid color-mix(in oklch, var(--vp-c-divider) 60%, transparent);
  overflow: hidden;
}
.build-image-options-guide__header :deep(button),
.build-image-options-guide__header :deep(.p-accordionheader) {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  padding: 0.55rem 0.75rem;
  background: transparent;
  border: 0;
  cursor: pointer;
  text-align: left;
  color: inherit;
  font: inherit;
}
.build-image-options-guide__leg {
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  letter-spacing: -0.005em;
}
.build-image-options-guide__body {
  padding: 0.1rem 0.75rem 0.7rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.build-image-options-guide__summary {
  margin: 0;
  font-size: 0.78rem;
  line-height: 1.45;
  color: var(--vp-c-text-2);
}
.build-image-options-guide__detail {
  margin: 0;
  font-size: 0.72rem;
  line-height: 1.5;
  color: var(--vp-c-text-3);
}
.build-image-options-guide__link {
  font-size: 0.7rem;
  color: var(--iridis-brand, var(--vp-c-brand-1));
  text-decoration: none;
  margin-top: 0.25rem;
}
.build-image-options-guide__link:hover {
  text-decoration: underline;
}
</style>
