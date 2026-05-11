<script setup lang="ts">
/**
 * NavBarMenu.vue
 *
 * Custom navbar menu that renders the two toggle entries:
 *
 *   PAGES toggle | Example toggle
 *
 * Both are PrimeVue Button toggles imported from the dedicated toggle
 * components. This component replaces VitePress's default VPNavBarMenu
 * (`themeConfig.nav` is cleared in config.ts), and is mounted via the
 * `nav-bar-content-before` slot; CSS `order` in base.css positions it
 * after `.search` and before `.appearance` so the resulting layout is:
 *
 *   brand | search | PAGES | Example | appearance | gh-icon
 *
 * The Docs link was removed because the iridis brand title already
 * links to the docs home. The GitHub link was removed because the
 * GitHub icon in `themeConfig.socialLinks` already targets the repo;
 * the social-link icon is the idiomatic VitePress affordance for a
 * repository link in the navbar.
 *
 * PAGES is hidden at mobile (<=1099px) by its own component CSS; the
 * page tree is reachable via the VitePress mobile screen at narrow
 * widths.
 */

import NavBarBuilderToggle from './NavBarBuilderToggle.vue';
import NavBarSidebarToggle from './NavBarSidebarToggle.vue';
</script>

<template>
  <div class="iridis-nav-menu" role="navigation" aria-label="Primary">
    <NavBarSidebarToggle />
    <NavBarBuilderToggle />
  </div>
</template>

<style scoped>
.iridis-nav-menu {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
</style>
