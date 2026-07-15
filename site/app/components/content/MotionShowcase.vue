<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';

import { ALIAS_COLOR_NAMES } from '../../theme/aliasColorNames.ts';
import { useColorStreamHistory } from '../../composables/useColorStreamHistory.ts';
import { useLivingBackground } from '../../composables/useLivingBackground.ts';

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
const EASE_PRESETS: Record<string, string> = {
  'Bouncy':          'cubic-bezier(0.68, -0.55, 0.27, 1.55)',
  'Ease in/out':     'ease-in-out',
  'Linear':          'linear',
  'Smooth (default)': 'cubic-bezier(0.33, 0, 0.2, 1)',
  'Snappy':          'cubic-bezier(0.16, 1, 0.3, 1)'
};

const tuneMs = ref<number>(550);
const easeKey = ref<string>('Smooth (default)');
const reducedMotion = ref<boolean>(false);

useLivingBackground();
const colorStreamHistory = useColorStreamHistory();

/** The decorative aliases whose engine-computed current hex we show live below — every alias except neutral, derived from the canonical list rather than a second hardcoded copy. */
const LIVE_ROLES: readonly string[] = ALIAS_COLOR_NAMES.filter((a) => a !== 'neutral');

/** Current (most recent) hex per decorative role, falling back to the role's static token when the history is still empty. */
const liveSwatches = computed(() => LIVE_ROLES.map((role) => {
  const samples = colorStreamHistory[role];
  const last = samples?.[samples.length - 1];
  return { role, 'hex': last?.hex ?? `var(--ui-color-${role}-500)` };
}));

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

/** `kind: 'dot'` swatches share one template (a colored dot inside a glass
 * circle); everything else renders its own markup below since a single
 * accent dot can't show off a multi-color technique. */
const NAMED_ANIMATIONS: { kind: 'dot' | 'orbit' | 'sonar' | 'radar' | 'chroma'; class?: string; duration: string; label: string; note: string }[] = [
  { 'kind': 'dot', 'class': 'pulse', 'duration': '3s', 'label': 'pulse-glow', 'note': 'carousel arrows, active dot' },
  { 'kind': 'dot', 'class': 'float', 'duration': '7s', 'label': 'float', 'note': 'hero logo, floating orbs' },
  { 'kind': 'dot', 'class': 'spin-slow', 'duration': '26s', 'label': 'spin', 'note': 'ambient background accent' },
  { 'kind': 'dot', 'class': 'glass', 'duration': '4s', 'label': 'sheen', 'note': 'every glass panel’s top edge' },
  { 'kind': 'orbit', 'duration': '2.2-3.8s', 'label': 'orbit', 'note': 'three roles, three independent rings' },
  { 'kind': 'sonar', 'duration': '2.4s', 'label': 'sonar', 'note': 'success/warning/error/primary in sequence' },
  { 'kind': 'radar', 'duration': '2.6s', 'label': 'radar', 'note': 'primary bleeding into secondary, one sweep' },
  { 'kind': 'chroma', 'duration': '4s', 'label': 'chroma', 'note': 'the accent hue cycling the full wheel' }
];
</script>

<template>
  <UCard>
    <UBadge
      v-if="reducedMotion"
      color="warning"
      variant="soft"
      class="mb-3"
    >
      prefers-reduced-motion is on
    </UBadge>

    <div class="space-y-5">
      <ControlPlane
        label="Timing"
        help="Drag the duration — every color transition on this page, not just the swatches below, runs on this same clock."
      >
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField :label="`Unison duration · ${tuneMs}ms`">
            <USlider
              v-model="tuneMs"
              :min="100"
              :max="1500"
              :step="50"
            />
          </UFormField>
          <UFormField label="Easing">
            <USelect
              v-model="easeKey"
              :items="Object.keys(EASE_PRESETS)"
              class="w-full"
            />
          </UFormField>
        </div>
      </ControlPlane>

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
            <span
              class="h-6 w-6 rounded-full border border-default"
              :style="{ backgroundColor: swatch.hex }"
            />
            <span class="text-[10px] text-dimmed">{{ swatch.role }}</span>
          </div>
        </div>
      </ShowcasePlane>

      <p class="text-xs text-muted">
        This card is a live demo of <strong class="text-highlighted">Living Color</strong> — the engine's
        palette-as-animated-vector layer, not just a static derivation. See
        <a
          href="#living-color"
          class="text-primary hover:underline"
        >Living Color</a> for the underlying
        package (<code>iridis-anima</code>, <code>iridis-pulse</code>, <code>iridis-fsm</code>) that drives every
        transition here.
      </p>

      <ShowcasePlane label="Named animation library">
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div
            v-for="a in NAMED_ANIMATIONS"
            :key="a.label"
            class="flex flex-col items-center gap-2 rounded-lg border border-default p-3 text-center"
          >
            <div class="relative flex h-14 w-14 items-center justify-center">
              <div
                v-if="a.kind === 'dot'"
                class="glass flex h-12 w-12 items-center justify-center rounded-full"
                :class="a.class !== 'glass' ? a.class : ''"
              >
                <span
                  class="h-3 w-3 rounded-full"
                  :style="{ backgroundColor: 'var(--ui-primary)' }"
                />
              </div>
              <div
                v-else-if="a.kind === 'orbit'"
                class="orbit-rig"
              >
                <div class="orbit-ring r1">
                  <span class="orbit-orb" />
                </div>
                <div class="orbit-ring r2">
                  <span class="orbit-orb" />
                </div>
                <div class="orbit-ring r3">
                  <span class="orbit-orb" />
                </div>
              </div>
              <template v-else-if="a.kind === 'sonar'">
                <span class="sonar-ring" />
                <span class="sonar-dot n" />
                <span class="sonar-dot e" />
                <span class="sonar-dot s" />
                <span class="sonar-dot w" />
              </template>
              <div
                v-else-if="a.kind === 'radar'"
                class="glass h-12 w-12 rounded-full"
              >
                <span class="radar-sweep" />
              </div>
              <div
                v-else-if="a.kind === 'chroma'"
                class="chroma-cycle"
              />
            </div>
            <div class="font-mono text-[11px] text-highlighted">
              {{ a.label }} · {{ a.duration }}
            </div>
            <div class="text-[10px] text-dimmed">
              {{ a.note }}
            </div>
          </div>
        </div>
      </ShowcasePlane>
    </div>
  </UCard>
</template>
