<script setup lang="ts">
/**
 * BuildRoleSchemaGuide.vue
 *
 * Left-column guide that sits next to RoleSchemaEditor. One block
 * per role-schema config option (name, intent, lightness range,
 * chroma range, derivedFrom, hueLock, required, contrastPairs).
 *
 * Each block: a one-line "what it is", a tooltipped "what it does"
 * paragraph, a link into the matching reference page in the docs
 * sidebar so designers can drill in.
 *
 * The component owns one bit of state: which Accordion panel is open
 * (single-select; PrimeVue's default). Initial state opens the first
 * panel so first paint is never blank.
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
  readonly 'href':     string;
}

const openPanel = ref<string | null>('Name');

const FIELDS: readonly FieldInterface[] = [
  {
    'leg':     'Name',
    'summary': 'The string identifier for a role.',
    'detail':  'Becomes the suffix of the emitted CSS variable (--iridis-{name}) and the key contrast pairs reference. Lowercase kebab-case; stable across versions.',
    'href':    '/iridis/reference/role-schema/name',
  },
  {
    'leg':     'Intent',
    'summary': 'The ontology tag: what kind of role this is.',
    'detail':  'Picked from a closed 10-member vocabulary: text, background, accent, muted, critical, positive, link, button, onAccent, onButton. Drives forced-colors mapping, APCA targets, WCAG ratio selection.',
    'href':    '/iridis/reference/role-schema/intent',
  },
  {
    'leg':     'Lightness range',
    'summary': 'The OKLCH L envelope, [min, max] in 0..1.',
    'detail':  'The engine clamps the resolved role into this range. Text roles use high L in dark framing / low L in light framing. Surface roles are the opposite. Authored per framing.',
    'href':    '/iridis/reference/role-schema/lightness-range',
  },
  {
    'leg':     'Chroma range',
    'summary': 'The OKLCH C envelope, [min, max] in 0..~0.5.',
    'detail':  'Controls how saturated the role is allowed to be. Neutrals near 0, accents 0.10–0.32. The upper bound matters most for sRGB emit targets; values above ~0.32 fall outside the gamut and get mapped back.',
    'href':    '/iridis/reference/role-schema/chroma-range',
  },
  {
    'leg':     'Derived from',
    'summary': 'Pin this role to another role + hue offset.',
    'detail':  'expand:family fills the derived role from the parent\'s lightness and chroma, rotating the hue by hueOffset. One brand seed produces an entire syntax-token family with this knob.',
    'href':    '/iridis/reference/role-schema/derived-from',
  },
  {
    'leg':     'Hue lock',
    'summary': 'Pin the OKLCH hue, ignoring the seed.',
    'detail':  'success = green (135°), error = red (25°), info = blue (220°). Lightness and chroma still come from the seed, but hue is forced. Mutually exclusive with derivedFrom.',
    'href':    '/iridis/reference/role-schema/hue-lock',
  },
  {
    'leg':     'Required',
    'summary': 'Must appear in the resolved palette.',
    'detail':  'Required roles get first-pick of seeds and never get auto-synthesised. Optional roles either resolve to a seed if there is one, or get synthesised via derivedFrom.',
    'href':    '/iridis/reference/role-schema/required',
  },
  {
    'leg':     'Contrast pairs',
    'summary': 'Foreground/background ratios the engine enforces.',
    'detail':  'Declares { foreground, background, minRatio, algorithm } per pair. enforce:contrast nudges colours in OKLCH until every pair clears. The schema\'s accessibility contract.',
    'href':    '/iridis/reference/role-schema/contrast-pairs',
  },
];
</script>

<template>
  <IridisCard variant="inset" class="build-role-schema-guide">
    <header class="build-role-schema-guide__head">
      <span class="build-role-schema-guide__eyebrow">Reference</span>
      <h3 class="build-role-schema-guide__title">Schema fields</h3>
      <p class="build-role-schema-guide__hint">Every per-role knob the editor exposes. Click a row to expand.</p>
    </header>
    <Accordion
      :value="openPanel"
      class="build-role-schema-guide__accordion"
      @update:value="(v) => openPanel = v as string | null"
    >
      <AccordionPanel
        v-for="f in FIELDS"
        :key="f.leg"
        :value="f.leg"
        class="build-role-schema-guide__panel"
      >
        <AccordionHeader class="build-role-schema-guide__header">
          <span class="build-role-schema-guide__leg">{{ f.leg }}</span>
        </AccordionHeader>
        <AccordionContent>
          <div class="build-role-schema-guide__body">
            <p class="build-role-schema-guide__summary">{{ f.summary }}</p>
            <p class="build-role-schema-guide__detail">{{ f.detail }}</p>
            <a
              :href="f.href"
              class="build-role-schema-guide__link"
              :title="`Open the ${f.leg} reference page`"
            >Open the {{ f.leg }} reference page →</a>
          </div>
        </AccordionContent>
      </AccordionPanel>
    </Accordion>
  </IridisCard>
</template>

<style scoped>
.build-role-schema-guide {
  height: 100%;
}
.build-role-schema-guide__head {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding-bottom: 0.6rem;
  margin-bottom: 0.75rem;
  border-bottom: 1px solid color-mix(in oklch, var(--vp-c-divider) 60%, transparent);
}
.build-role-schema-guide__eyebrow {
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
}
.build-role-schema-guide__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: -0.005em;
  color: var(--vp-c-text-1);
  border: 0;
  padding: 0;
}
.build-role-schema-guide__hint {
  margin: 0;
  font-size: 0.78rem;
  line-height: 1.5;
  color: var(--vp-c-text-2);
}
.build-role-schema-guide__accordion {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  counter-reset: schema-field;
}
.build-role-schema-guide__panel {
  counter-increment: schema-field;
  border-radius: var(--iridis-radius, 6px);
  background: color-mix(in oklch, var(--vp-c-bg) 50%, transparent);
  border: 1px solid color-mix(in oklch, var(--vp-c-divider) 60%, transparent);
  overflow: hidden;
}
.build-role-schema-guide__header :deep(button),
.build-role-schema-guide__header :deep(.p-accordionheader) {
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
.build-role-schema-guide__leg {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: var(--vp-c-text-1);
}
.build-role-schema-guide__leg::before {
  content: counter(schema-field, decimal-leading-zero) ' · ';
  color: var(--vp-c-text-3);
  font-weight: 500;
  font-family: var(--vp-font-family-mono);
  font-size: 0.72rem;
  letter-spacing: 0.02em;
}
.build-role-schema-guide__body {
  padding: 0.1rem 0.75rem 0.7rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.build-role-schema-guide__link {
  font-size: 0.7rem;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-brand-1, var(--iridis-brand));
  text-decoration: none;
  white-space: nowrap;
  margin-top: 0.25rem;
}
.build-role-schema-guide__link:hover {
  text-decoration: underline;
}
.build-role-schema-guide__summary {
  margin: 0 0 0.25rem;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--vp-c-text-1);
  line-height: 1.4;
}
.build-role-schema-guide__detail {
  margin: 0;
  font-size: 0.72rem;
  line-height: 1.55;
  color: var(--vp-c-text-2);
}
</style>
