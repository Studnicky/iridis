import type { Theme } from 'vitepress';

import { h }         from 'vue';
import DefaultTheme  from 'vitepress/theme';

import './palette.css';
import './base.css';

export const theme: Theme = {
  'extends': DefaultTheme,
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
