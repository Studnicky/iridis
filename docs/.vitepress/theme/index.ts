import type { Theme } from 'vitepress';

import { h, watch }   from 'vue';
import DefaultTheme   from 'vitepress/theme';

import IridisDemo      from './components/IridisDemo.vue';
import IridisCode      from './components/IridisCode.vue';
import SchemaForm      from './components/SchemaForm.vue';
import MultiOutputDemo from './components/MultiOutputDemo.vue';
import TryItOutForm    from './components/TryItOutForm.vue';
import { configStore } from './stores/configStore.ts';
import { applyConfigToDocument } from './stores/applyConfigToDocument.ts';

import './palette.css';
import './base.css';

/**
 * Bidirectional bridge between vitepress's html.dark class (set by the
 * theme toggle in the navbar) and configStore.framing.
 *
 * - On html.dark mutation → set configStore.framing
 * - On configStore.framing mutation → toggle html.dark
 *
 * The two writers are guarded against re-entrant loops by checking the
 * current value before writing.
 */
function bindFramingToVitepressTheme(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const html = document.documentElement;

  // Initial sync: vitepress decides the framing on first load (system pref
  // or stored toggle); honor that, override the persisted iridis framing.
  configStore.framing = html.classList.contains('dark') ? 'dark' : 'light';

  // html.dark → configStore.framing
  const observer = new MutationObserver(() => {
    const next = html.classList.contains('dark') ? 'dark' : 'light';
    if (configStore.framing !== next) {
      configStore.framing = next;
    }
  });
  observer.observe(html, { 'attributes': true, 'attributeFilter': ['class'] });

  // configStore.framing → html.dark
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
      'sidebar-nav-before': () => h('div', {
        'class':       'iridis-sidebar-icon',
        'aria-hidden': 'true',
      }),
    });
  },
};

export default theme;
