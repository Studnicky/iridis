<script setup lang="ts">
/**
 * NavBarMenu.vue
 *
 * Custom navbar menu that renders the four nav entries in this order:
 *
 *   PAGES toggle | Docs link | Example toggle | GitHub link
 *
 * The PAGES and Example entries are PrimeVue Button toggles imported
 * from the dedicated toggle components. The Docs and GitHub entries
 * are plain anchors. This component replaces VitePress's default
 * VPNavBarMenu (`themeConfig.nav` is cleared in config.ts), and is
 * mounted via the `nav-bar-content-before` slot; CSS `order` in
 * base.css positions it after `.search` and before `.appearance` so
 * the resulting layout is:
 *
 *   brand | search | PAGES | Docs | Example | GitHub | appearance | gh-icon
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
    <a
      class="iridis-nav-menu__link"
      href="/iridis/"
    >Docs</a>
    <NavBarBuilderToggle />
    <a
      class="iridis-nav-menu__link"
      href="https://github.com/Studnicky/iridis"
      target="_blank"
      rel="noopener noreferrer"
    >GitHub</a>
  </div>
</template>

<style scoped>
.iridis-nav-menu {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
.iridis-nav-menu__link {
  display: inline-flex;
  align-items: center;
  height: 2.4rem;
  padding: 0 0.35rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--vp-c-text-1);
  text-decoration: none;
  transition: color 0.25s ease;
}
.iridis-nav-menu__link:hover {
  color: var(--vp-c-brand-1);
}
@media (max-width: 767px) {
  .iridis-nav-menu {
    display: none;
  }
}
</style>
