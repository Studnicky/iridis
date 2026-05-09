import type { Theme } from 'vitepress';

import { h, watch }   from 'vue';
import DefaultTheme   from 'vitepress/theme';

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
import { configStore } from './stores/configStore.ts';
import { applyConfigToDocument } from './stores/applyConfigToDocument.ts';

import './palette.css';
import './base.css';

function bindFramingToVitepressTheme(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const html = document.documentElement;

  configStore.framing = html.classList.contains('dark') ? 'dark' : 'light';

  const observer = new MutationObserver(() => {
    const next = html.classList.contains('dark') ? 'dark' : 'light';
    if (configStore.framing !== next) {
      configStore.framing = next;
    }
  });
  observer.observe(html, { 'attributes': true, 'attributeFilter': ['class'] });

  watch(
    () => configStore.framing,
    (framing) => {
      const wantDark = framing === 'dark';
      const isDark   = html.classList.contains('dark');
      if (wantDark !== isDark) {
        html.classList.toggle('dark', wantDark);
      }
    },
  );
}

/**
 * Logo block: five concentric rounded boxes (per uiverse loader pattern)
 * with the brand image at the center. CSS in base.css drives the ripple
 * animation and the colored borders sourced from --iridis-brand.
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

export const theme: Theme = {
  'extends': DefaultTheme,
  enhanceApp({ app }): void {
    app.component('IridisDemo',      IridisDemo);
    app.component('IridisCode',      IridisCode);
    app.component('SchemaForm',      SchemaForm);
    app.component('MultiOutputDemo', MultiOutputDemo);
    app.component('TryItOutForm',    TryItOutForm);

    if (typeof window !== 'undefined') {
      bindFramingToVitepressTheme();
      applyConfigToDocument(configStore);
      watch(
        () => ({ ...configStore }),
        () => { applyConfigToDocument(configStore); },
        { 'deep': true },
      );
    }
  },
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'sidebar-nav-before': () => logoBlock(),
      'sidebar-nav-after':  () => h(SidebarToc),
      'aside-top':          () => h(RightPanel),
      'doc-after':          () => h(InfiniteScroll),
      'layout-top':         () => h('div', null, [h(SidebarToggle), h(SidebarResize)]),
    });
  },
};

export default theme;
