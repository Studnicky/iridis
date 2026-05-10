import { defineConfig } from 'vitepress';
import { withMermaid }  from 'vitepress-plugin-mermaid';

import { iridisBrandPlugin } from './plugins/iridis-brand.mjs';
import { themeConfig }       from './theme.config.js';
import { iridisShikiTheme }  from './theme/shikiTheme.ts';

const sidebar = [
  {
    'text':  'Introduction',
    'items': [
      { 'link': '/',                'text': 'What it does'    },
      { 'link': '/getting-started', 'text': 'Getting started' },
      { 'link': '/try-it-out',      'text': 'Try it out'      },
      { 'link': '/v2-living-color', 'text': 'Living color'    },
    ],
  },
  {
    'text':  'Concepts',
    'items': [
      { 'link': '/concepts/pipeline',                  'text': 'Pipeline'                  },
      { 'link': '/concepts/role-schemas',              'text': 'Role schemas'              },
      { 'link': '/concepts/color-record',              'text': 'ColorRecord'               },
      { 'link': '/concepts/contrast',                  'text': 'Contrast'                  },
      { 'link': '/concepts/accessibility-calculations','text': 'Accessibility calculations'},
    ],
  },
  {
    'text':  'Recipes',
    'items': [
      { 'link': '/recipes/cli',                'text': 'CLI'                },
      { 'link': '/recipes/cascading-tokens',   'text': 'Cascading tokens'   },
      { 'link': '/recipes/vue-capacitor',      'text': 'Vue + Capacitor'    },
    ],
  },
  {
    'text':  'Reference',
    'items': [
      {
        'text':  'Color spaces',
        'items': [
          { 'link': '/reference/hex',   'text': 'Hex'   },
          { 'link': '/reference/rgb',   'text': 'RGB'   },
          { 'link': '/reference/hsv',   'text': 'HSV'   },
          { 'link': '/reference/cmyk',  'text': 'CMYK'  },
          { 'link': '/reference/oklch', 'text': 'OKLCH' },
        ],
      },
      {
        'text':  'Accessibility standards',
        'items': [
          { 'link': '/reference/wcag', 'text': 'WCAG 2.1' },
          { 'link': '/reference/apca', 'text': 'APCA'     },
        ],
      },
    ],
  },
];

export default withMermaid(defineConfig({
  'mermaid': {
    'theme': 'base',
    'themeVariables': {
      'fontFamily':    'var(--vp-font-family-mono)',
      'background':    'var(--iridis-bg-soft)',
      'primaryColor':  'var(--iridis-brand)',
      'primaryTextColor': 'var(--iridis-on-brand)',
      'lineColor':     'var(--iridis-divider)',
      'textColor':     'var(--iridis-text)',
    },
  },
  'mermaidPlugin': { 'class': 'mermaid iridis-mermaid' },
  'base':        '/iridis/',
  'title':       'iridis',
  'description': 'Chromatic pipeline for dynamic palette derivation. Pluggable, OKLCH-native, contrast-enforced.',
  'srcDir':      '.',
  'srcExclude':  ['internal/**', 'internal/*.md'],
  'markdown':    {
    'config': (md) => { md.use(iridisBrandPlugin); },
    'theme':  { 'light': iridisShikiTheme as never, 'dark': iridisShikiTheme as never },
  },
  'head': [
    ['link', { 'rel': 'icon',        'type': 'image/png',   'href': '/iridis/logo.png' }],
    ['meta', { 'name': 'theme-color', 'content': '#7c3aed' }],
    ['meta', { 'name': 'og:image',    'content': '/iridis/logo.png' }],
  ],
  'appearance':  themeConfig.appearance,
  'themeConfig': {
    ...themeConfig,
    'nav': [
      { 'link': '/',           'text': 'Docs' },
      { 'link': 'https://github.com/Studnicky/iridis', 'text': 'GitHub' },
    ],
    sidebar,
    'socialLinks': [{ 'icon': 'github', 'link': 'https://github.com/Studnicky/iridis' }],
  },
}));
