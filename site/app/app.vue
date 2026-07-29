<script setup lang="ts">
import { computed, onMounted } from 'vue';

import { useHead } from '#imports';

import { useIridis } from '~/composables/useIridis.ts';
import { usePauseOffscreenAnimations } from '~/composables/usePauseOffscreenAnimations.ts';
import { Tokens } from '~/theme/Tokens.ts';
import { CodeSampleChrome } from '~/components/content/CodeSampleChrome.ts';

usePauseOffscreenAnimations();

/**
 * Booting the engine here, at the app root, means the theme is computed and
 * written into the SSR head before any page or component mounts — first paint
 * and post-hydration paint read the same tokens, so there is no visible re-theme.
 * Tokens.apply() (called from useIridis.ts's run()) is SSR-guarded — it writes
 * directly to `document.documentElement.style`, which doesn't exist on the
 * server — so without this `style` block the prerendered HTML would carry NO
 * --ui-* custom properties at all, leaving every CSS `var(--ui-x, #fallback)`
 * default as the actual, non-derived first-paint color. Tokens.toCssText()
 * renders the SAME engine-resolved tokens as a real <style> tag instead,
 * present from the very first byte of HTML — both SSR and client (this is a
 * reactive computed, so it also updates live as seeds/roles change,
 * redundantly with Tokens.apply()'s direct DOM write, which is harmless).
 */
const { framing, roles, scales } = useIridis();
const tokenCssText = computed(() => Tokens.toCssText(Tokens.mapFromEngine(roles.value, scales.value)));

useHead({
  'htmlAttrs': {
    'class': computed(() => {return framing.value === 'dark' ? 'dark' : '';}),
    'data-iridis-framing': framing
  },
  'bodyAttrs': {
    'class': 'preload'
  },
  'style': [{ 'innerHTML': tokenCssText, 'key': 'iridis-tokens' }]
});

onMounted(() => {
  // Wait a tick for hydration to finish, then enable transitions
  setTimeout(() => {
    document.body.classList.remove('preload');
  }, 50);

  CodeSampleChrome.install();
});
</script>

<template>
  <UApp>
    <AmbientBackground />
    <NuxtRouteAnnouncer />
    <CvdPreviewOverlay>
      <NuxtPage />
    </CvdPreviewOverlay>
  </UApp>
</template>

<style src="./components/content/viz/CodeSample.css"></style>
<style src="./components/content/viz/Dpad.css"></style>
<style src="./components/content/viz/ViewerActions.css"></style>
<style src="./components/content/viz/ViewerOverlay.css"></style>
<style src="./components/content/viz/ModalShell.css"></style>
<style src="./components/content/mermaid/explorer.css"></style>
