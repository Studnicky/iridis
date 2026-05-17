<script setup lang="ts">
/**
 * BuildImageOptionsGuide.vue
 *
 * Reference panel that pairs with the image-extraction sliders in
 * ImageToTheme. One block per extraction knob — algorithm, palette
 * size (K), histogram bits-per-channel, ΔE input cap, harmonize
 * threshold, lightness range, chroma range. Static; owns no state,
 * mutates nothing. Mirrors `BuildRoleSchemaGuide` shape so the two
 * tabs read as one design system.
 *
 * Each block:
 *   - `leg`     short label that matches the slider's leg
 *   - `summary` one-line "what it is"
 *   - `detail`  longer "what it does", surfaced via title-tooltip
 *               on hover and rendered inline below the summary
 *   - `href`    optional drill-in into the reference docs
 */
import IridisCard from './base/IridisCard.vue';

interface FieldInterface {
  readonly 'leg':      string;
  readonly 'summary':  string;
  readonly 'detail':   string;
  readonly 'href'?:    string;
}

const FIELDS: readonly FieldInterface[] = [
  {
    'leg':     'Algorithm',
    'summary': 'Which clustering math reduces pixels to K dominant colours.',
    'detail':  'median-cut is the weighted Heckbert variant — O(N log N), fast, splits buckets by widest range × cumulative weight. delta-e is agglomerative ΔE2000 — O(N² log N), visually faithful, preserves perceptually similar clusters.',
  },
  {
    'leg':     'Palette size (K)',
    'summary': 'Number of dominant colours the extractor returns.',
    'detail':  'Lower K = broader strokes (good for hero / accent extraction); higher K = finer-grained (good for syntax-token-style palettes). Output records carry `hints.weight` so a small K still preserves the dominant-region signal from the histogram.',
  },
  {
    'leg':     'Histogram bpc',
    'summary': 'Bits per channel for the upstream pixel histogram.',
    'detail':  'Three to seven bits per RGB channel. 5 bpc = 32 768 bins, the default — collapses sensor noise while keeping perceptually distinct colours separate. Lower bpc smashes more pixels into the same bin (faster, less faithful); higher bpc lets near-duplicate sensor values fragment into separate clusters.',
  },
  {
    'leg':     'Δ-E input cap',
    'summary': 'Max records fed into the agglomerative ΔE reducer.',
    'detail':  'Active only when the algorithm is `delta-e`. The reducer is O(N² log N), so a raw photo histogram (thousands of non-empty bins) hangs the main thread. Pre-trims by descending weight: the merger still sees every visually important cluster first; the long tail of one-off pixels falls off.',
  },
  {
    'leg':     'Harmonize ΔE',
    'summary': 'Min ΔE distance the accent must keep from the frame.',
    'detail':  '`gallery:harmonize` shifts the accent\'s OKLCH hue if it lands within this distance of the frame — guarantees the accent reads as distinct against the surface it sits on. Zero disables harmonization; ten is the perceptual "noticeably different" threshold.',
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
      <p class="build-image-options-guide__hint">What every extractor knob does. Hover for the long version.</p>
    </header>
    <ol class="build-image-options-guide__list">
      <li
        v-for="f in FIELDS"
        :key="f.leg"
        class="build-image-options-guide__item"
        :title="f.detail"
      >
        <div class="build-image-options-guide__item-head">
          <span class="build-image-options-guide__leg">{{ f.leg }}</span>
          <a v-if="f.href" :href="f.href" class="build-image-options-guide__link" :title="`Open the ${f.leg} reference page`">docs →</a>
        </div>
        <p class="build-image-options-guide__summary">{{ f.summary }}</p>
        <p class="build-image-options-guide__detail">{{ f.detail }}</p>
      </li>
    </ol>
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
.build-image-options-guide__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}
.build-image-options-guide__item {
  padding: 0.6rem 0.75rem;
  border-radius: var(--iridis-radius, 6px);
  background: color-mix(in oklch, var(--vp-c-bg) 50%, transparent);
  border: 1px solid color-mix(in oklch, var(--vp-c-divider) 60%, transparent);
}
.build-image-options-guide__item-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.6rem;
  margin-bottom: 0.2rem;
}
.build-image-options-guide__leg {
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  letter-spacing: -0.005em;
}
.build-image-options-guide__link {
  font-size: 0.7rem;
  color: var(--iridis-brand, var(--vp-c-brand-1));
  text-decoration: none;
}
.build-image-options-guide__link:hover {
  text-decoration: underline;
}
.build-image-options-guide__summary {
  margin: 0 0 0.25rem;
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
</style>
