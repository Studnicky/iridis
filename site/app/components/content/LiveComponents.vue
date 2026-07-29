<script setup lang="ts">
/**
 * Live Nuxt UI component surface, themed by the engine's --ui-* tokens — and
 * genuinely functional, not decorative: each button fires a real UToast,
 * "Add alert" pushes a real dismissible UAlert, the table below reads the
 * actual resolved-role palette. Interactive/toggleable controls (switches,
 * radios, checkboxes, tabs, accordion, pagination) live in the separate
 * Interactables card instead of here. Laid out as a 2-column grid of
 * bordered sections so a wide card doesn't strand most of its width as
 * empty space.
 */
</script>

<template>
  <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
    <ToastLauncherPanel />

    <DismissibleAlertsPanel />

    <ButtonVariantsPanel />

    <LiveFormPanel />

    <ResolvedRoleTablePanel />

    <OverlayComponentsPanel />
  </div>
</template>
