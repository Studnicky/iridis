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
 * The component is dumb: it owns no state, mutates nothing. It is a
 * static reference surface that pairs visually with the editor on
 * the right.
 */
import IridisCard from './base/IridisCard.vue';

interface FieldInterface {
  readonly 'leg':      string;
  readonly 'summary':  string;
  readonly 'detail':   string;
  readonly 'href':     string;
}

const FIELDS: readonly FieldInterface[] = [
  {
    'leg':     'Name',
    'summary': 'The string identifier for a role.',
    'detail':  'Becomes the suffix of the emitted CSS variable (--iridis-{name}) and the key contrast pairs reference. Lowercase kebab-case; stable across versions.',
    'href':    '/iridis/reference/role-schema/name',
  },
  {
    'leg':     'Intent',
    'summary': 'The ontology tag — what kind of role this is.',
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
    'detail':  'Controls how saturated the role is allowed to be. Neutrals near 0, accents 0.10–0.32. The upper bound matters most for sRGB emit targets — values above ~0.32 fall outside the gamut and get mapped back.',
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
      <p class="build-role-schema-guide__hint">Every per-role knob the editor exposes. Hover for the short description; tap the link for the full reference page.</p>
    </header>
    <ol class="build-role-schema-guide__list">
      <li
        v-for="f in FIELDS"
        :key="f.leg"
        class="build-role-schema-guide__item"
        :title="f.detail"
      >
        <div class="build-role-schema-guide__item-head">
          <span class="build-role-schema-guide__leg">{{ f.leg }}</span>
          <a :href="f.href" class="build-role-schema-guide__link" :title="`Open the ${f.leg} reference page`">docs →</a>
        </div>
        <p class="build-role-schema-guide__summary">{{ f.summary }}</p>
        <p class="build-role-schema-guide__detail">{{ f.detail }}</p>
      </li>
    </ol>
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
.build-role-schema-guide__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  counter-reset: schema-field;
}
.build-role-schema-guide__item {
  counter-increment: schema-field;
  padding: 0.6rem 0.75rem;
  border-radius: var(--iridis-radius, 6px);
  background: color-mix(in oklch, var(--vp-c-bg) 50%, transparent);
  border: 1px solid color-mix(in oklch, var(--vp-c-divider) 60%, transparent);
}
.build-role-schema-guide__item-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.6rem;
  margin-bottom: 0.2rem;
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
.build-role-schema-guide__link {
  font-size: 0.7rem;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-brand-1, var(--iridis-brand));
  text-decoration: none;
  white-space: nowrap;
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
