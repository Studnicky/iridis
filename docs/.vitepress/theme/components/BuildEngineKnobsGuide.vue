<script setup lang="ts">
/**
 * BuildEngineKnobsGuide.vue
 *
 * Reference panel that pairs with the Configuration-tab knob grid in
 * BuildPanel. One block per engine knob — framing, color space,
 * contrast algorithm, contrast level, envelope mode, role schema —
 * with the same shape as `BuildRoleSchemaGuide` and
 * `BuildImageOptionsGuide` so all three tabs read as one design.
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
    'leg':     'Framing',
    'summary': 'Dark vs light surface treatment.',
    'detail':  '"Dark" frames roles for a museum-style chrome (low-L surfaces, high-L text); "light" frames for a room-style (the opposite). Every emitter — CSS variables, Tailwind theme, VS Code JSON, Capacitor StatusBar — reads this slot to flip surface colours coherently.',
  },
  {
    'leg':     'Color space',
    'summary': 'sRGB vs Display-P3 wide-gamut output.',
    'detail':  'sRGB stays universally safe — every screen renders the same hex. Display-P3 lets wide-gamut emitters opt into the broader chroma OKLCH can hit; consumers without P3 support still get the sRGB fallback because every record carries both.',
  },
  {
    'leg':     'Algorithm',
    'summary': 'Which contrast model the engine enforces.',
    'detail':  'WCAG 2.1 — Rec. 709 luminance-ratio model with the 0.05 flare term. APCA — Accessible Perceptual Contrast Algorithm, the model WCAG 3 is built on; polarity-aware Lc magnitudes that match human perception better than the luminance ratio.',
    'href':    '/iridis/reference/apca',
  },
  {
    'leg':     'Contrast level',
    'summary': 'AA vs AAA threshold the engine lifts pairs to.',
    'detail':  'AA — 4.5:1 normal text / 3:1 large. AAA — 7:1 normal / 4.5:1 large (or APCA Lc 90 for body / 75 for fluent reading). enforce:contrast nudges OKLCH lightness in declared pairs until every pair clears this threshold.',
    'href':    '/iridis/reference/wcag',
  },
  {
    'leg':     'Envelope mode',
    'summary': 'Strict clamp vs loose warning on out-of-envelope seeds.',
    'detail':  'Strict — the engine always clamps every seed into the role\'s lightness/chroma envelope. Loose — envelopes still clamp, but the resolved-role cards flag any seed that landed outside its declared range. Useful when authoring schemas: you can see exactly which seeds the engine had to bend.',
  },
  {
    'leg':     'Role schema',
    'summary': 'Which schema the pipeline resolves against.',
    'detail':  'Built-in tiers nest: iridis-4 ⊂ iridis-8 ⊂ iridis-12 ⊂ iridis-16 ⊂ iridis-32. Each adds more roles (text variants, accents, status colours). The Role schema tab publishes `custom-<timestamp>` variants that live alongside the built-ins.',
    'href':    '/iridis/concepts/role-schemas',
  },
];
</script>

<template>
  <IridisCard variant="inset" class="build-engine-knobs-guide">
    <header class="build-engine-knobs-guide__head">
      <span class="build-engine-knobs-guide__eyebrow">Reference</span>
      <h3 class="build-engine-knobs-guide__title">Engine knobs</h3>
      <p class="build-engine-knobs-guide__hint">What every configuration field does. Hover for the long version.</p>
    </header>
    <ol class="build-engine-knobs-guide__list">
      <li
        v-for="f in FIELDS"
        :key="f.leg"
        class="build-engine-knobs-guide__item"
        :title="f.detail"
      >
        <div class="build-engine-knobs-guide__item-head">
          <span class="build-engine-knobs-guide__leg">{{ f.leg }}</span>
          <a v-if="f.href" :href="f.href" class="build-engine-knobs-guide__link" :title="`Open the ${f.leg} reference page`">docs →</a>
        </div>
        <p class="build-engine-knobs-guide__summary">{{ f.summary }}</p>
        <p class="build-engine-knobs-guide__detail">{{ f.detail }}</p>
      </li>
    </ol>
  </IridisCard>
</template>

<style scoped>
.build-engine-knobs-guide {
  height: 100%;
}
.build-engine-knobs-guide__head {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding-bottom: 0.6rem;
  margin-bottom: 0.75rem;
  border-bottom: 1px solid color-mix(in oklch, var(--vp-c-divider) 60%, transparent);
}
.build-engine-knobs-guide__eyebrow {
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
}
.build-engine-knobs-guide__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: -0.005em;
  color: var(--vp-c-text-1);
  border: 0;
  padding: 0;
}
.build-engine-knobs-guide__hint {
  margin: 0;
  font-size: 0.78rem;
  line-height: 1.5;
  color: var(--vp-c-text-2);
}
.build-engine-knobs-guide__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}
.build-engine-knobs-guide__item {
  padding: 0.6rem 0.75rem;
  border-radius: var(--iridis-radius, 6px);
  background: color-mix(in oklch, var(--vp-c-bg) 50%, transparent);
  border: 1px solid color-mix(in oklch, var(--vp-c-divider) 60%, transparent);
}
.build-engine-knobs-guide__item-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.6rem;
  margin-bottom: 0.2rem;
}
.build-engine-knobs-guide__leg {
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  letter-spacing: -0.005em;
}
.build-engine-knobs-guide__link {
  font-size: 0.7rem;
  color: var(--iridis-brand, var(--vp-c-brand-1));
  text-decoration: none;
}
.build-engine-knobs-guide__link:hover {
  text-decoration: underline;
}
.build-engine-knobs-guide__summary {
  margin: 0 0 0.25rem;
  font-size: 0.78rem;
  line-height: 1.45;
  color: var(--vp-c-text-2);
}
.build-engine-knobs-guide__detail {
  margin: 0;
  font-size: 0.72rem;
  line-height: 1.5;
  color: var(--vp-c-text-3);
}
</style>
