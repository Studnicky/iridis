import type { Theme } from 'vitepress';

import { h }          from 'vue';
import DefaultTheme   from 'vitepress/theme';
import PrimeVue       from 'primevue/config';

import { iridisPreset } from './primevuePreset.ts';

import IridisCard      from './components/base/IridisCard.vue';
import IridisButton    from './components/base/IridisButton.vue';
import IridisInput     from './components/base/IridisInput.vue';
import IridisSelect    from './components/base/IridisSelect.vue';
import IridisChip      from './components/base/IridisChip.vue';

import IridisDemo      from './components/IridisDemo.vue';
import IridisCode      from './components/IridisCode.vue';
import SchemaForm      from './components/SchemaForm.vue';
import MultiOutputDemo from './components/MultiOutputDemo.vue';
import TryItOutForm    from './components/TryItOutForm.vue';
import RightPanel      from './components/RightPanel.vue';
import SidebarToc      from './components/SidebarToc.vue';
import SidebarToggle   from './components/SidebarToggle.vue';
import SidebarResize   from './components/SidebarResize.vue';
import InfiniteScroll  from './components/InfiniteScroll.vue';
import PaletteCTA      from './components/PaletteCTA.vue';
import { bootThemeDispatcher } from './stores/themeDispatcher.ts';

import './palette.css';
import './base.css';

/**
 * Renders the sidebar logo block: five concentric rounded boxes with the
 * brand image at center. CSS in base.css drives the ripple animation
 * and the colored borders sourced from --iridis-brand.
 */
function logoBlock(): unknown {
  return h('div', { 'class': 'iridis-loader', 'aria-hidden': 'true' }, [
    h('div', { 'class': 'iridis-loader__box' }),
    h('div', { 'class': 'iridis-loader__box' }),
    h('div', { 'class': 'iridis-loader__box' }),
    h('div', { 'class': 'iridis-loader__box' }),
    h('div', { 'class': 'iridis-loader__box' }),
    h('div', { 'class': 'iridis-loader__logo' }),
  ]);
}

/**
 * Custom VitePress theme. Extends the default theme with the iridis
 * component library, sidebar/right-panel layout slots, and the boot
 * hook for the theme-state dispatcher that drives every live demo.
 */
export const theme: Theme = {
  'extends': DefaultTheme,
  enhanceApp({ app }): void {
    /* PrimeVue install. The iridisPreset rewires --p-* design tokens
       to read from --iridis-* engine output; .dark on <html> selects
       the dark color scheme (VitePress writes this class on appearance
       toggle). All PrimeVue components used across the docs inherit
       this theme automatically. */
    app.use(PrimeVue, {
      'theme': {
        'preset':  iridisPreset,
        'options': {
          'darkModeSelector': '.dark',
          'cssLayer':         false,
        },
      },
    });

    // Globally registered so any markdown page can drop these in unprefixed.
    app.component('IridisCard',      IridisCard);
    app.component('IridisButton',    IridisButton);
    app.component('IridisInput',     IridisInput);
    app.component('IridisSelect',    IridisSelect);
    app.component('IridisChip',      IridisChip);
    app.component('IridisDemo',      IridisDemo);
    app.component('IridisCode',      IridisCode);
    app.component('SchemaForm',      SchemaForm);
    app.component('MultiOutputDemo', MultiOutputDemo);
    app.component('TryItOutForm',    TryItOutForm);
    app.component('PaletteCTA',      PaletteCTA);

    bootThemeDispatcher();
  },
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'sidebar-nav-before': () => logoBlock(),
      'sidebar-nav-after':  () => h(SidebarToc),
      'doc-after':          () => h(InfiniteScroll),
      'layout-top':         () => h('div', null, [h(SidebarToggle), h(SidebarResize), h(RightPanel)]),
    });
  },
};

export default theme;
