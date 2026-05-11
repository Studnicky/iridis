<script setup lang="ts">
/**
 * NavBarBrandLoader.vue
 *
 * Compact pulsing iridis loader for the topbar. Mounted via the
 * `nav-bar-title-before` slot so it renders INSIDE VitePress's
 * `<a class="title" href="/iridis/">` anchor — clicking the loader
 * therefore navigates to the docs home, matching the title text's
 * behaviour.
 *
 * Visibility is viewport-gated by CSS in base.css: hidden at desktop
 * (>=1100px) because the full-size loader lives inside the .VPSidebar
 * drawer there; shown at mobile (<=1099px) because the sidebar is a
 * collapsed drawer the user does not see by default, so the brand
 * identity needs a presence in the always-visible topbar.
 *
 * Markup mirrors the sidebar loader (five concentric ring boxes plus
 * a centered logo) and uses the same `.iridis-loader__*` class names.
 * The `.iridis-loader--compact` modifier scopes the smaller size and
 * the topbar-only positioning rules in base.css; it does not change
 * the animation or the gradient.
 */
</script>

<template>
  <span class="iridis-loader iridis-loader--compact" aria-hidden="true">
    <span class="iridis-loader__box" />
    <span class="iridis-loader__box" />
    <span class="iridis-loader__box" />
    <span class="iridis-loader__box" />
    <span class="iridis-loader__box" />
    <span class="iridis-loader__logo" />
  </span>
</template>
