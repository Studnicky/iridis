<script setup lang="ts">
/**
 * BuildEngineKnobsGuide.vue
 *
 * Reference panel that pairs with the Configuration-tab knob grid in
 * BuildPanel. One Accordion panel per engine knob (framing, color
 * space, contrast algorithm, contrast level, envelope mode, role
 * schema) sharing the same shape as `BuildRoleSchemaGuide` and
 * `BuildImageOptionsGuide` so all three tabs read as one design.
 *
 * Single-select PrimeVue Accordion (its default) keeps the reference
 * column compact: only one detail block is open at a time. Initial
 * state opens the first panel so first paint is never blank.
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

const openPanel = ref<string | null>('Framing');

const FIELDS: readonly FieldInterface[] = [
  {
    'leg':     'Framing',
    'summary': 'Dark vs light surface treatment.',
    'detail':  '"Dark" frames roles for a museum-style chrome (low-L surfaces, high-L text); "light" frames for a room-style (the opposite). Every emitter (CSS variables, Tailwind theme, VS Code JSON, Capacitor StatusBar) reads this slot to flip surface colours coherently.',
  },
  {
    'leg':     'Color space',
    'summary': 'sRGB vs Display-P3 wide-gamut output.',
    'detail':  'sRGB stays universally safe: every screen renders the same hex. Display-P3 lets wide-gamut emitters opt into the broader chroma OKLCH can hit; consumers without P3 support still get the sRGB fallback because every record carries both.',
  },
  {
    'leg':     'Algorithm',
    'summary': 'Which contrast model the engine enforces.',
    'detail':  'WCAG 2.1: Rec. 709 luminance-ratio model with the 0.05 flare term. APCA: Accessible Perceptual Contrast Algorithm, the model WCAG 3 is built on; polarity-aware Lc magnitudes that match human perception better than the luminance ratio.',
    'href':    '/iridis/reference/apca',
  },
  {
    'leg':     'Contrast level',
    'summary': 'AA vs AAA threshold the engine lifts pairs to.',
    'detail':  'AA: 4.5:1 normal text / 3:1 large. AAA: 7:1 normal / 4.5:1 large (or APCA Lc 90 for body / 75 for fluent reading). enforce:contrast nudges OKLCH lightness in declared pairs until every pair clears this threshold.',
    'href':    '/iridis/reference/wcag',
  },
  {
    'leg':     'Envelope mode',
    'summary': 'Strict clamp vs loose warning on out-of-envelope seeds.',
    'detail':  'Strict: the engine always clamps every seed into the role\'s lightness/chroma envelope. Loose: envelopes still clamp, but the resolved-role cards flag any seed that landed outside its declared range. Useful when authoring schemas: you can see exactly which seeds the engine had to bend.',
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
      <p class="build-engine-knobs-guide__hint">What every configuration field does. Click a row to expand.</p>
    </header>
    <Accordion
      :value="openPanel"
      class="build-engine-knobs-guide__accordion"
      @update:value="(v) => openPanel = v as string | null"
    >
      <AccordionPanel
        v-for="f in FIELDS"
        :key="f.leg"
        :value="f.leg"
        class="build-engine-knobs-guide__panel"
      >
        <AccordionHeader class="build-engine-knobs-guide__header">
          <span class="build-engine-knobs-guide__leg">{{ f.leg }}</span>
        </AccordionHeader>
        <AccordionContent>
          <div class="build-engine-knobs-guide__body">
            <p class="build-engine-knobs-guide__summary">{{ f.summary }}</p>
            <p class="build-engine-knobs-guide__detail">{{ f.detail }}</p>
            <a
              v-if="f.href"
              :href="f.href"
              class="build-engine-knobs-guide__link"
              :title="`Open the ${f.leg} reference page`"
            >Open the {{ f.leg }} reference page →</a>
          </div>
        </AccordionContent>
      </AccordionPanel>
    </Accordion>
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
.build-engine-knobs-guide__accordion {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.build-engine-knobs-guide__panel {
  border-radius: var(--iridis-radius, 6px);
  background: color-mix(in oklch, var(--vp-c-bg) 50%, transparent);
  border: 1px solid color-mix(in oklch, var(--vp-c-divider) 60%, transparent);
  overflow: hidden;
}
.build-engine-knobs-guide__header :deep(button),
.build-engine-knobs-guide__header :deep(.p-accordionheader) {
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
.build-engine-knobs-guide__leg {
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  letter-spacing: -0.005em;
}
.build-engine-knobs-guide__body {
  padding: 0.1rem 0.75rem 0.7rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.build-engine-knobs-guide__summary {
  margin: 0;
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
.build-engine-knobs-guide__link {
  font-size: 0.7rem;
  color: var(--iridis-brand, var(--vp-c-brand-1));
  text-decoration: none;
  margin-top: 0.25rem;
}
.build-engine-knobs-guide__link:hover {
  text-decoration: underline;
}
</style>
