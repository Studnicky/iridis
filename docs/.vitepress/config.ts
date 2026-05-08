import { defineConfig } from 'vitepress';

import { iridisBrandPlugin } from './plugins/iridis-brand.mjs';
import { themeConfig }       from './theme.config.js';

const sidebar = [
  {
    'text':  'Introduction',
    'items': [
      { 'link': '/',                  'text': 'What it does' },
      { 'link': '/getting-started',   'text': 'Getting started' },
      { 'link': '/v2-living-color',   'text': 'Living color (v2 thesis)' },
    ],
  },
];

export default defineConfig({
  'base':        '/iridis/',
  'title':       'iridis',
  'description': 'Chromatic pipeline for dynamic palette derivation. Pluggable, OKLCH-native, contrast-enforced.',
  'srcDir':      '.',
  'markdown':    { 'config': (md) => { md.use(iridisBrandPlugin); } },
  'head': [
    ['link', { 'rel': 'icon',      'type': 'image/png', 'href': '/iridis/logo.png' }],
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
});
