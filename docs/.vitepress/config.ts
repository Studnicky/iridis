import { defineConfig } from 'vitepress';
import { withMermaid }  from 'vitepress-plugin-mermaid';

import { iridisBrandPlugin } from './plugins/iridis-brand.mjs';
import { themeConfig }       from './theme.config.js';
import { iridisShikiTheme }  from './theme/shikiTheme.ts';

/**
 * CDN externalisation map. Heavy runtime dependencies that don't change
 * between deploys load from esm.sh at pinned versions instead of being
 * bundled into the docs theme chunk. Keeps the theme chunk under the
 * 500 KB Rollup advisory threshold.
 *
 * Pinned versions MUST match `package.json` exactly. Bumping a version
 * in `package.json` requires bumping the corresponding entry here.
 *
 * `?external=vue` forces every `primevue/*` and `@primeuix/themes` bundle
 * to leave its internal `import "vue"` as a bare specifier, so the
 * browser's import map can resolve it to the same Vue instance VitePress
 * itself uses. Single Vue instance is mandatory for Vue plugin install
 * + provide/inject + reactivity across PrimeVue components.
 */
const CDN_VERSIONS = {
  'vue':              '3.5.34',
  'primevue':         '4.5.5',
  'primeuixThemes':   '2.0.3',
  'mermaid':          '11.14.0',
} as const;

const CDN_PRIMEVUE_SUBPATHS = [
  'config',
  'button',
  'inputtext',
  'inputnumber',
  'select',
  'selectbutton',
  'slider',
  'checkbox',
  'card',
  'tag',
  'accordion',
  'accordionpanel',
  'accordionheader',
  'accordioncontent',
] as const;

function buildImportMap(): string {
  const imports: Record<string, string> = {
    'vue':                   `https://esm.sh/vue@${CDN_VERSIONS.vue}`,
    '@primeuix/themes':      `https://esm.sh/@primeuix/themes@${CDN_VERSIONS.primeuixThemes}?external=vue`,
    '@primeuix/themes/aura': `https://esm.sh/@primeuix/themes@${CDN_VERSIONS.primeuixThemes}/aura?external=vue`,
    'mermaid':               `https://esm.sh/mermaid@${CDN_VERSIONS.mermaid}`,
  };
  for (const subpath of CDN_PRIMEVUE_SUBPATHS) {
    imports[`primevue/${subpath}`] = `https://esm.sh/primevue@${CDN_VERSIONS.primevue}/${subpath}?external=vue`;
  }
  return JSON.stringify({ imports });
}

const CDN_EXTERNAL_PATTERNS: ReadonlyArray<RegExp | string> = [
  'vue',
  /^primevue($|\/)/,
  /^@primeuix\/themes($|\/)/,
  'mermaid',
];

/**
 * Detect production build vs dev server from process.argv. VitePress's
 * `vite` config is a static object shared between both, but we only want
 * to externalise heavy deps during `vitepress build` — the dev server
 * needs Vue + PrimeVue resolved locally so Vite's optimizer and HMR can
 * work. In dev, `optimizeDeps.exclude` for `vue` is forbidden because
 * VitePress itself depends on Vue at the entry point.
 */
const IS_BUILD = process.argv.includes('build');

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
    ['link',   { 'rel': 'icon',        'type': 'image/png',   'href': '/logo.png' }],
    ['meta',   { 'name': 'theme-color', 'content': '#7c3aed' }],
    ['meta',   { 'name': 'og:image',    'content': '/logo.png' }],
    /* Import map MUST precede any module script so the browser resolves
       bare specifiers via the map. VitePress emits its script tags later
       in the head; native import maps are honoured when declared earlier
       in source order. */
    ['script', { 'type': 'importmap' }, buildImportMap()],
  ],
  'vite': IS_BUILD ? {
    'build': {
      'rollupOptions': {
        /* Client build: leave these as bare specifiers in the output so
           the browser's import map resolves them to esm.sh at runtime.
           Drops ~400+ KB of PrimeVue + @primeuix/themes + ~600 KB of
           mermaid from the static client bundle. SSR build still
           resolves them from node_modules via Node's resolver, so
           server-rendered pages stay correct. */
        'external': CDN_EXTERNAL_PATTERNS as RegExp[] | string[],
      },
    },
  } : {},
  'appearance':  themeConfig.appearance,
  'themeConfig': {
    ...themeConfig,
    // VitePress's default nav menu is suppressed; the iridis-nav-menu
    // component (rendered into nav-bar-content-before) renders Docs and
    // GitHub interleaved with the PAGES and Example toggles. See
    // theme/components/NavBarMenu.vue.
    'nav': [],
    sidebar,
    'socialLinks': [{ 'icon': 'github', 'link': 'https://github.com/Studnicky/iridis' }],
  },
}));
