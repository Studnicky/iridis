<script setup lang="ts">
import { computed, onMounted } from 'vue';

import { useIridis } from '~/composables/useIridis.ts';
import { Tokens } from '~/theme/Tokens.ts';

/**
 * Booting the engine here, at the app root, means the theme is computed and
 * written into the SSR head before any page or component mounts — first paint
 * and post-hydration paint read the same tokens, so there is no visible re-theme.
 */
const { framing, roles, scales } = useIridis();

useHead({
  'htmlAttrs': {
    'class': computed(() => {return framing.value === 'dark' ? 'dark' : '';}),
    'data-iridis-framing': framing
  },
  'bodyAttrs': {
    'class': 'preload'
  }
});

onMounted(() => {
  // Wait a tick for hydration to finish, then enable transitions
  setTimeout(() => {
    document.body.classList.remove('preload');
  }, 50);
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
