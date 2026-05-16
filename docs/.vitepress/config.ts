import { defineConfig } from 'vitepress';
import { withMermaid }  from 'vitepress-plugin-mermaid';

import { iridisBrandPlugin } from './plugins/iridis-brand.mjs';
import { themeConfig }       from './theme.config.js';
import { iridisShikiTheme }  from './theme/shikiTheme.ts';

// ── Site identity — single source of truth for SEO, OG, JSON-LD ─────────
const SITE_TITLE           = 'iridis';
const SITE_TAGLINE         = 'chromatic pipeline for dynamic palettes';
const SITE_DESCRIPTION     = 'Chromatic pipeline for dynamic palette derivation. Pluggable, OKLCH-native, contrast-enforced.';
const SITE_DESCRIPTION_SHORT = 'Bring the colors. iridis assigns roles, enforces contrast, ships the palette.';
const SITE_URL             = 'https://studnicky.github.io/iridis/';
const SITE_BASE            = '/iridis/';
const SITE_OG_IMAGE        = `${SITE_URL}og-image.png`;
const SITE_THEME_COLOR     = '#7c3aed';
const SITE_KEYWORDS        = 'iridis, color palette, OKLCH, contrast, WCAG, APCA, accessibility, design tokens, palette generator, image to theme, color theory, dynamic theming, role-based palette, color pipeline, semantic colors, oklch palette, css variables, web design';
const SITE_AUTHOR_NAME     = 'Andrew Studnicky';
const SITE_AUTHOR_URL      = 'https://github.com/Studnicky';
const SITE_REPO            = 'https://github.com/Studnicky/iridis';

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
  'textarea',
  'accordion',
  'accordionpanel',
  'accordionheader',
  'accordioncontent',
  'tabs',
  'tablist',
  'tab',
  'tabpanels',
  'tabpanel',
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
      { 'link': '/build',           'text': 'Build'           },
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
  'mermaidPlugin':  { 'class': 'mermaid iridis-mermaid' },
  'base':           SITE_BASE,
  'lang':           'en-US',
  'title':          SITE_TITLE,
  'titleTemplate':  `:title | ${SITE_TITLE}`,
  'description':    SITE_DESCRIPTION,
  'cleanUrls':      true,
  'lastUpdated':    true,
  'srcDir':         '.',
  'srcExclude':     ['internal/**', 'internal/*.md'],
  'markdown':    {
    'config': (md) => { md.use(iridisBrandPlugin); },
    'theme':  { 'light': iridisShikiTheme as never, 'dark': iridisShikiTheme as never },
  },
  'sitemap': {
    /* VitePress generates sitemap.xml from every page rendered into
       /dist. Crawlers (Googlebot, Bingbot, DuckDuckGo) discover routes
       faster when the sitemap is published; GitHub Pages serves
       /iridis/sitemap.xml automatically since it's under the dist root. */
    'hostname': SITE_URL,
  },
  'head': [
    /* Favicon stack — every common form pointing at the same logo so the
       browser tab, iOS home-screen icon, and Android shortcut all resolve
       without 404s. The /iridis/ base is prepended by VitePress for any
       path beginning with `/`. */
    ['link',   { 'rel': 'icon',             'type': 'image/png',   'sizes': '32x32',   'href': '/logo.png' }],
    ['link',   { 'rel': 'icon',             'type': 'image/png',   'sizes': '192x192', 'href': '/logo.png' }],
    ['link',   { 'rel': 'shortcut icon',                                                'href': '/logo.png' }],
    ['link',   { 'rel': 'apple-touch-icon', 'sizes': '180x180',    'href': '/logo.png' }],
    ['link',   { 'rel': 'mask-icon',        'color': SITE_THEME_COLOR, 'href': '/logo.png' }],
    ['link',   { 'rel': 'sitemap',          'type': 'application/xml', 'href': `${SITE_BASE}sitemap.xml` }],
    ['meta',   { 'name': 'theme-color',                 'content': SITE_THEME_COLOR }],
    ['meta',   { 'name': 'color-scheme',                'content': 'dark light' }],
    ['meta',   { 'name': 'msapplication-TileColor',     'content': SITE_THEME_COLOR }],
    ['meta',   { 'name': 'msapplication-TileImage',     'content': `${SITE_BASE}logo.png` }],
    ['meta',   { 'name': 'apple-mobile-web-app-capable',           'content': 'yes' }],
    ['meta',   { 'name': 'apple-mobile-web-app-title',             'content': SITE_TITLE }],
    ['meta',   { 'name': 'apple-mobile-web-app-status-bar-style',  'content': 'black-translucent' }],

    /* SEO basics. `robots` carries the explicit indexable signal plus
       the modern hints (`max-snippet:-1`, `max-image-preview:large`,
       `max-video-preview:-1`) that surface richer search-result cards.
       `author` and `keywords` carry minor SEO weight; mostly there for
       human-readable previews and competitor-alias discovery. */
    ['meta',   { 'name': 'robots',           'content': 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1' }],
    ['meta',   { 'name': 'googlebot',        'content': 'index, follow' }],
    ['meta',   { 'name': 'author',           'content': SITE_AUTHOR_NAME }],
    ['meta',   { 'name': 'keywords',         'content': SITE_KEYWORDS }],
    ['meta',   { 'name': 'application-name', 'content': SITE_TITLE }],
    ['meta',   { 'name': 'generator',        'content': 'VitePress' }],

    /* Open Graph + Twitter — drive the unfurl card that Discord, Slack,
       iMessage, Twitter/X, and LinkedIn render when someone pastes the
       URL. `og:image` MUST be an absolute URL; Discord drops relative
       paths and falls back to the bare hostname. Per-page values are
       overridden via `transformPageData` below; these are the defaults.
       og:image points at the 1200×630 landscape PNG (`og-image.png`) so
       Twitter's `summary_large_image` card renders correctly. */
    ['meta',   { 'property': 'og:type',             'content': 'website' }],
    ['meta',   { 'property': 'og:site_name',        'content': SITE_TITLE }],
    ['meta',   { 'property': 'og:title',            'content': `${SITE_TITLE} — ${SITE_TAGLINE}` }],
    ['meta',   { 'property': 'og:description',      'content': SITE_DESCRIPTION }],
    ['meta',   { 'property': 'og:url',              'content': SITE_URL }],
    ['meta',   { 'property': 'og:image',            'content': SITE_OG_IMAGE }],
    ['meta',   { 'property': 'og:image:secure_url', 'content': SITE_OG_IMAGE }],
    ['meta',   { 'property': 'og:image:type',       'content': 'image/png' }],
    ['meta',   { 'property': 'og:image:alt',        'content': `${SITE_TITLE} — ${SITE_TAGLINE}` }],
    ['meta',   { 'property': 'og:image:width',      'content': '1200' }],
    ['meta',   { 'property': 'og:image:height',     'content': '630' }],
    ['meta',   { 'property': 'og:locale',           'content': 'en_US' }],
    ['meta',   { 'name':     'twitter:card',        'content': 'summary_large_image' }],
    ['meta',   { 'name':     'twitter:title',       'content': `${SITE_TITLE} — ${SITE_TAGLINE}` }],
    ['meta',   { 'name':     'twitter:description', 'content': SITE_DESCRIPTION_SHORT }],
    ['meta',   { 'name':     'twitter:image',       'content': SITE_OG_IMAGE }],
    ['meta',   { 'name':     'twitter:image:alt',   'content': `${SITE_TITLE} — ${SITE_TAGLINE}` }],

    /* JSON-LD structured data. Search engines parse this into a rich
       site card — name, description, author, repository — and link the
       resulting result to schema.org's SoftwareSourceCode + WebSite
       types so the site shows up in code-search and design-tool
       organic results. */
    ['script', { 'type': 'application/ld+json' }, JSON.stringify({
      '@context':            'https://schema.org',
      '@type':               'SoftwareSourceCode',
      'name':                SITE_TITLE,
      'description':         SITE_DESCRIPTION,
      'url':                 SITE_URL,
      'image':               SITE_OG_IMAGE,
      'license':             'https://opensource.org/licenses/MIT',
      'programmingLanguage': 'TypeScript',
      'runtimePlatform':     'Node.js >=24',
      'codeRepository':      SITE_REPO,
      'author': {
        '@type': 'Person',
        'name':  SITE_AUTHOR_NAME,
        'url':   SITE_AUTHOR_URL,
      },
      'keywords': SITE_KEYWORDS,
    })],
    ['script', { 'type': 'application/ld+json' }, JSON.stringify({
      '@context':    'https://schema.org',
      '@type':       'WebSite',
      'name':        SITE_TITLE,
      'url':         SITE_URL,
      'description': SITE_DESCRIPTION,
      'inLanguage':  'en-US',
    })],

    /* Import map MUST precede any module script so the browser resolves
       bare specifiers via the map. VitePress emits its script tags later
       in the head; native import maps are honoured when declared earlier
       in source order. */
    ['script', { 'type': 'importmap' }, buildImportMap()],
  ],
  /**
   * Per-page metadata. VitePress invokes this for every page during the
   * SSR pass; we use it to emit page-specific og:title / og:description /
   * og:url / canonical / twitter:title so social unfurls and SEO results
   * surface the page's own title and the page's own URL rather than the
   * site-level default. Without this, every Discord paste of any page
   * would show the iridis homepage card.
   */
  transformPageData(pageData): void {
    const relPath  = pageData.relativePath
      .replace(/\.md$/, '')
      .replace(/(^|\/)index$/, '/');
    const pageUrl  = `${SITE_URL}${relPath}`;
    const title    = (pageData.frontmatter['title'] as string | undefined)
      ?? pageData.title
      ?? SITE_TITLE;
    const description = (pageData.frontmatter['description'] as string | undefined)
      ?? pageData.description
      ?? SITE_DESCRIPTION;
    const displayTitle = title === SITE_TITLE ? SITE_TITLE : `${title} — ${SITE_TITLE}`;

    pageData.frontmatter['head'] = [
      ...(pageData.frontmatter['head'] as ReadonlyArray<readonly [string, Record<string, string>]> ?? []),
      ['link', { 'rel': 'canonical', 'href': pageUrl }],
      ['meta', { 'property': 'og:url',         'content': pageUrl }],
      ['meta', { 'property': 'og:title',       'content': displayTitle }],
      ['meta', { 'property': 'og:description', 'content': description }],
      ['meta', { 'name':     'twitter:title',       'content': displayTitle }],
      ['meta', { 'name':     'twitter:description', 'content': description }],
      ['meta', { 'name':     'description',         'content': description }],
    ];
  },
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
    'socialLinks': [{ 'icon': 'github', 'link': SITE_REPO }],
  },
}));
