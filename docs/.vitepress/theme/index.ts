import type { Theme } from 'vitepress';

import { h, watch }   from 'vue';
import DefaultTheme   from 'vitepress/theme';

import IridisConfig   from './components/IridisConfig.vue';
import IridisDemo     from './components/IridisDemo.vue';
import IridisCode     from './components/IridisCode.vue';
import SchemaForm     from './components/SchemaForm.vue';
import { configStore } from './stores/configStore.ts';
import { applyConfigToDocument } from './stores/applyConfigToDocument.ts';

import './palette.css';
import './base.css';

export const theme: Theme = {
  'extends': DefaultTheme,
  enhanceApp({ app }): void {
    app.component('IridisDemo',   IridisDemo);
    app.component('IridisCode',   IridisCode);
    app.component('SchemaForm',   SchemaForm);
    app.component('IridisConfig', IridisConfig);

    if (typeof window !== 'undefined') {
      // Initial application + reactive subscription. The config store is
      // the source of truth for visible theme tokens; iridis emits them.
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
      'sidebar-nav-after': () => h(IridisConfig),
    });
  },
};

export default theme;
