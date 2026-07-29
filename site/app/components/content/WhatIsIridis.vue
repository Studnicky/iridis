<script setup lang="ts">
import { useNavigationTargets } from '~/composables/useNavigationTargets.ts';

/**
 * The plain-language "what is this" on-ramp — rendered directly under the
 * hero, above the stage carousels, visible by default. Gives a first-time
 * visitor a one-sentence answer before any OKLCH/ΔE/schema jargon. "Read
 * more" scrolls to and expands the hoisted 01-what-is-iridis doc accordion
 * that index.vue renders right below this block (NARR-4).
 */
const props = withDefaults(defineProps<{
  targetId?: string;
}>(), {
  targetId: '01-what-is-iridis'
});

const { activateTarget } = useNavigationTargets();
</script>

<template>
  <section class="mx-auto max-w-2xl space-y-3 px-4 text-center">
    <!-- Sits directly over the fixed ambient starfield with no card behind
         it (CONTRAST-3): promoted to text-muted for a wider AA margin, plus
         a soft scrim tightly fit to the paragraph's own footprint that fades
         out at its edges so the starfield still shows through the rest of
         the section. -->
    <ScrimCopy
      strength="soft"
      class="mx-auto"
    >
      <p class="text-base text-muted sm:text-lg">
        iridis takes a handful of seed colors — or a photo — and turns them into
        a complete, accessible color palette for your app: every button, every
        block of text, every background, all guaranteed to read clearly
        together.
      </p>
    </ScrimCopy>
    <UButton
      variant="link"
      color="primary"
      trailing-icon="i-material-symbols-arrow-forward-rounded"
      @click="activateTarget(props.targetId)"
    >
      Read more
    </UButton>
  </section>
</template>
