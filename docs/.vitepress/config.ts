import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve }                                from 'node:path';
import { defineConfig } from 'vitepress';
import { withMermaid }  from 'vitepress-plugin-mermaid';

import { iridisBrandPlugin } from './plugins/iridis-brand.mjs';
import { themeConfig }       from './theme.config.js';
import { iridisShikiTheme }  from './theme/shikiTheme.ts';
import pkg                   from '../../package.json' with { type: 'json' };

/**
 * SEO tokens live in package.json under `iridis.seo`. All three values
 * are *explicitly designed to be public* — Google/Bing verification
 * meta tags are not credentials, they're property-ownership markers
 * the registry reads back to confirm the SC account that ships this
 * string owns this domain. Anyone can read them; nobody can abuse them.
 * The Twitter handle is the public-facing account.
 *
 * Empty string suppresses the corresponding head tag at build time —
 * we ship no orphaned meta tags pointing at unowned properties.
 */
interface IridisSeoConfig {
  readonly googleSiteVerification: string;
  readonly bingSiteVerification:   string;
  readonly twitterHandle:          string;
}
const seo: IridisSeoConfig = (pkg as { 'iridis'?: { 'seo'?: IridisSeoConfig } }).iridis?.seo ?? {
  googleSiteVerification: '',
  bingSiteVerification:   '',
  twitterHandle:          '',
};

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
const SITE_NPM             = 'https://www.npmjs.com/package/@studnicky/iridis';
const SITE_LOGO            = `${SITE_URL}logo.png`;

/* Verification tokens for search-console enrolment. Once you register
   the property at https://search.google.com/search-console (Google) +
   https://www.bing.com/webmasters (Bing), paste the verification value
   into `package.json` → `iridis.seo.{googleSiteVerification,
   bingSiteVerification}` so the next build ships the meta tag.
   Empty string (the default) suppresses the tag — we don't ship orphan
   tags pointing at unowned properties. */
const VERIFY_GOOGLE        = seo.googleSiteVerification;
const VERIFY_BING          = seo.bingSiteVerification;

/* Twitter / X handle for `twitter:site` + `twitter:creator` attribution
   in the unfurl card. Leave empty to omit — a missing handle is better
   than a wrong one, since Twitter's validator drops the entire card if
   `twitter:site` resolves to a deleted account. Set in `package.json`
   → `iridis.seo.twitterHandle` (include the `@`). */
const SITE_TWITTER_HANDLE  = seo.twitterHandle;

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
      { 'link': '/',                'text': 'Build'           },
      { 'link': '/about',           'text': 'About iridis'    },
      { 'link': '/getting-started', 'text': 'Getting started' },
      { 'link': '/try-it-out',      'text': 'Try it out'      },
      { 'link': '/image-to-theme',  'text': 'Image to theme'  },
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
      {
        'text':  'Role schema',
        'items': [
          { 'link': '/reference/role-schema/name',            'text': 'Name'            },
          { 'link': '/reference/role-schema/intent',          'text': 'Intent'          },
          { 'link': '/reference/role-schema/lightness-range', 'text': 'Lightness range' },
          { 'link': '/reference/role-schema/chroma-range',    'text': 'Chroma range'    },
          { 'link': '/reference/role-schema/derived-from',    'text': 'Derived roles'   },
          { 'link': '/reference/role-schema/hue-lock',        'text': 'Hue lock'        },
          { 'link': '/reference/role-schema/required',        'text': 'Required'        },
          { 'link': '/reference/role-schema/contrast-pairs',  'text': 'Contrast pairs'  },
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
    /* Favicon stack — the SVG is the canonical icon (modern browsers,
       crisp at every size, ~600 bytes). The PNG variants stay as
       fallbacks for crawlers and iOS home-screen / Android-shortcut
       use cases where SVG support is patchy. Order matters: browsers
       pick the first `rel=icon` they can render, so SVG goes first. */
    ['link',   { 'rel': 'icon',             'type': 'image/svg+xml',                       'href': `${SITE_BASE}favicon.svg` }],
    ['link',   { 'rel': 'icon',             'type': 'image/png',   'sizes': '32x32',       'href': `${SITE_BASE}logo.png` }],
    ['link',   { 'rel': 'icon',             'type': 'image/png',   'sizes': '192x192',     'href': `${SITE_BASE}logo.png` }],
    ['link',   { 'rel': 'shortcut icon',                                                   'href': `${SITE_BASE}favicon.svg` }],
    ['link',   { 'rel': 'apple-touch-icon', 'sizes': '180x180',                            'href': `${SITE_BASE}logo.png` }],
    ['link',   { 'rel': 'mask-icon',        'color': SITE_THEME_COLOR,                     'href': `${SITE_BASE}favicon.svg` }],
    ['link',   { 'rel': 'manifest',                                                        'href': `${SITE_BASE}manifest.webmanifest` }],
    ['link',   { 'rel': 'sitemap',          'type': 'application/xml',  'href': `${SITE_BASE}sitemap.xml` }],
    ['link',   { 'rel': 'alternate',        'type': 'application/rss+xml', 'title': `${SITE_TITLE} — changelog`, 'href': `${SITE_BASE}feed.xml` }],

    /* Cross-origin preconnect / dns-prefetch. The browser opens TCP +
       TLS to these hosts during HTML parsing, shaving ~100-300ms off
       the first PrimeVue/Vue/mermaid chunk download. Bing/Google grade
       this as a Core Web Vitals signal — LCP improves when third-party
       resources resolve faster. `dns-prefetch` is a no-op when
       `preconnect` already fired but stays as a fallback for browsers
       that ignore preconnect (older Safari). */
    ['link',   { 'rel': 'preconnect',   'href': 'https://esm.sh', 'crossorigin': '' }],
    ['link',   { 'rel': 'dns-prefetch', 'href': 'https://esm.sh' }],

    /* `hreflang` declares this is the en-US canonical of the site. With
       only one language variant published, `x-default` points at the
       same URL — harmless duplication that disambiguates intent for
       international search engines and avoids "language not declared"
       webmaster-tools warnings. */
    ['link',   { 'rel': 'alternate', 'hreflang': 'en-US',     'href': SITE_URL }],
    ['link',   { 'rel': 'alternate', 'hreflang': 'x-default', 'href': SITE_URL }],
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
    ['meta',   { 'name': 'bingbot',          'content': 'index, follow' }],
    ['meta',   { 'name': 'author',           'content': SITE_AUTHOR_NAME }],
    ['meta',   { 'name': 'keywords',         'content': SITE_KEYWORDS }],
    ['meta',   { 'name': 'application-name', 'content': SITE_TITLE }],
    ['meta',   { 'name': 'generator',        'content': 'VitePress' }],
    /* `referrer` policy. `origin-when-cross-origin` strips the path on
       outbound clicks (so external sites only see `https://studnicky.github.io/`
       in their analytics, not the specific docs page) while keeping the
       full URL on internal navigation. Good privacy posture; doesn't
       harm SEO. */
    ['meta',   { 'name': 'referrer',         'content': 'origin-when-cross-origin' }],

    /* Search-console verification meta tags. Empty content suppresses
       the tag at build time; once the verification value is in the env,
       the next deploy emits the tag and the property activates. */
    ...(VERIFY_GOOGLE !== '' ? [['meta', { 'name': 'google-site-verification', 'content': VERIFY_GOOGLE }] as const] : []),
    ...(VERIFY_BING   !== '' ? [['meta', { 'name': 'msvalidate.01',            'content': VERIFY_BING   }] as const] : []),

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
    ...(SITE_TWITTER_HANDLE !== '' ? [
      ['meta', { 'name': 'twitter:site',    'content': SITE_TWITTER_HANDLE }] as const,
      ['meta', { 'name': 'twitter:creator', 'content': SITE_TWITTER_HANDLE }] as const,
    ] : []),

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
    /* Organization schema powers the Google Knowledge Panel. `sameAs`
       lists the canonical accounts that represent this organization
       across the web — GitHub repo, npm registry — so search engines
       can disambiguate `iridis` from unrelated brands with the same
       name. `logo` is the square mark; absolute URL is mandatory. */
    ['script', { 'type': 'application/ld+json' }, JSON.stringify({
      '@context': 'https://schema.org',
      '@type':    'Organization',
      'name':     SITE_TITLE,
      'url':      SITE_URL,
      'logo':     SITE_LOGO,
      'sameAs':   [SITE_REPO, SITE_NPM, SITE_AUTHOR_URL],
      'founder': {
        '@type': 'Person',
        'name':  SITE_AUTHOR_NAME,
        'url':   SITE_AUTHOR_URL,
      },
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
    const relPath = pageData.relativePath
      .replace(/\.md$/, '')
      .replace(/(^|\/)index$/, '');
    const pageUrl = relPath === '' ? SITE_URL : `${SITE_URL}${relPath}`;
    /* VitePress sets `pageData.title` from the first H1 when no frontmatter
       title is present, and `pageData.description = ''` (empty string, not
       `undefined`) when no description is supplied. We OR-coalesce so empty
       strings fall through to the site-level defaults; ??-coalescing would
       leak empty `''` into `og:description` / `twitter:description`. */
    const frontmatterTitle = pageData.frontmatter['title'] as string | undefined;
    const frontmatterDescription = pageData.frontmatter['description'] as string | undefined;
    const title       = frontmatterTitle       || pageData.title       || SITE_TITLE;
    const description = frontmatterDescription || pageData.description || SITE_DESCRIPTION;
    const displayTitle = title === SITE_TITLE ? SITE_TITLE : `${title} — ${SITE_TITLE}`;
    /* Force VitePress's `<title>` resolution to honour the frontmatter
       title over a content-derived H1 (relevant when a page uses a custom
       hero with its own `<h1>` that differs from the frontmatter title —
       e.g. `about.md` renders `<h1>iridis</h1>` inside `<AuroraHero>` but
       the frontmatter title is "About iridis"). */
    if (frontmatterTitle !== undefined) pageData.title = frontmatterTitle;
    /* Suppress the `:title | iridis` template on any page whose title is
       already the site title — without this the home renders as `iridis
       | iridis` (the template appends unconditionally). VitePress reads
       `pageData.titleTemplate` (top-level, not under frontmatter) when
       composing the `<title>` element; `false` skips template expansion
       and yields the bare title. */
    if (title === SITE_TITLE) {
      (pageData as { titleTemplate?: string | false }).titleTemplate = false;
    }

    /* BreadcrumbList structured data. Google renders this as the
       "Home > Section > Page" trail above the SERP result, replacing
       the bare URL. Built from URL segments — root is always "iridis";
       each path segment becomes a position with a humanised label and
       its absolute URL. Schema.org spec: every list item carries its
       absolute `item` URL plus a sequential `position`. */
    const segments = relPath === '' ? [] : relPath.split('/');
    const crumbs: Array<{ '@type': 'ListItem'; 'position': number; 'name': string; 'item': string }> = [
      { '@type': 'ListItem', 'position': 1, 'name': SITE_TITLE, 'item': SITE_URL },
    ];
    let accumulated = '';
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i] as string;
      accumulated = accumulated === '' ? seg : `${accumulated}/${seg}`;
      const isLast = i === segments.length - 1;
      const label  = isLast
        ? title
        : seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      crumbs.push({
        '@type':    'ListItem',
        'position': i + 2,
        'name':     label,
        'item':     `${SITE_URL}${accumulated}`,
      });
    }
    const breadcrumb = {
      '@context':        'https://schema.org',
      '@type':           'BreadcrumbList',
      'itemListElement': crumbs,
    };

    /* Article timestamps when VitePress has resolved a `lastUpdated`
       value from git. `article:modified_time` is the freshness signal
       Google uses to rank time-sensitive content; absent timestamps
       default to "unknown freshness" which hurts ranking on docs that
       sit alongside dated competitors. ISO-8601 with timezone is the
       required format. */
    /* Uncommitted markdown files come back with `lastUpdated === 0` or
       NaN — guard both to avoid `Date(0).toISOString()` polluting the
       freshness signal with 1970, and to avoid the constructor throwing
       on NaN. */
    const lastUpdated = (typeof pageData.lastUpdated === 'number'
      && Number.isFinite(pageData.lastUpdated)
      && pageData.lastUpdated > 0)
      ? new Date(pageData.lastUpdated).toISOString()
      : undefined;

    /* HowTo structured data for /recipes/*. Each recipe is a procedural
       guide; the HowTo type powers a step-carousel rich-result variant
       in Google search. We emit a minimal shell here (name + URL +
       description + image); per-recipe `step` arrays would require
       parsing the markdown — that's a future enhancement. The shell
       alone is enough for Google to recognise the page as a HowTo and
       grant the rich-result eligibility. */
    const isRecipe = relPath.startsWith('recipes/');
    const howto = isRecipe ? {
      '@context':    'https://schema.org',
      '@type':       'HowTo',
      'name':        displayTitle,
      'description': description,
      'url':         pageUrl,
      'image':       SITE_OG_IMAGE,
    } : undefined;

    pageData.frontmatter['head'] = [
      ...(pageData.frontmatter['head'] as ReadonlyArray<readonly [string, Record<string, string>]> ?? []),
      ['link', { 'rel': 'canonical', 'href': pageUrl }],
      ['meta', { 'property': 'og:url',         'content': pageUrl }],
      ['meta', { 'property': 'og:title',       'content': displayTitle }],
      ['meta', { 'property': 'og:description', 'content': description }],
      ['meta', { 'name':     'twitter:title',       'content': displayTitle }],
      ['meta', { 'name':     'twitter:description', 'content': description }],
      ['meta', { 'name':     'description',         'content': description }],
      ...(lastUpdated !== undefined ? [
        ['meta', { 'property': 'article:modified_time', 'content': lastUpdated }] as const,
        ['meta', { 'property': 'article:author',        'content': SITE_AUTHOR_NAME }] as const,
      ] : []),
      ['script', { 'type': 'application/ld+json' }, JSON.stringify(breadcrumb)],
      ...(howto !== undefined ? [
        ['script', { 'type': 'application/ld+json' }, JSON.stringify(howto)] as const,
      ] : []),
    ];
  },
  /**
   * Build-end hook. Generates the changelog RSS feed by parsing
   * `CHANGELOG.md` once per build and writing `feed.xml` into the
   * VitePress dist root. RSS is still the standard discovery channel
   * for tooling integrators (npm release watchers, GitHub Action
   * notifiers, dependency-update bots); shipping a feed alongside the
   * docs costs almost nothing and gets cited from `<link rel="alternate"
   * type="application/rss+xml">` in the head for in-page auto-discovery.
   */
  buildEnd(siteConfig): void {
    const changelogPath = resolve(siteConfig.root, '..', 'CHANGELOG.md');
    if (!existsSync(changelogPath)) return;
    const md = readFileSync(changelogPath, 'utf-8');
    /* Match `## [version] - YYYY-MM-DD` headings; capture version, date,
       and the body until the next `## ` heading (or EOF). The Keep a
       Changelog format dictates this structure. */
    const re = /## \[([^\]]+)\][^\n]*?-\s*(\d{4}-\d{2}-\d{2})\n([\s\S]*?)(?=\n## |\n$)/g;
    interface FeedEntryInterface {
      readonly version: string;
      readonly date:    string;
      readonly body:    string;
    }
    const entries: FeedEntryInterface[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(md)) !== null) {
      entries.push({ 'version': m[1] as string, 'date': m[2] as string, 'body': (m[3] ?? '').trim() });
    }
    /* RFC 822 date format is the RSS 2.0 spec requirement (Sun, 10 Jan
       2026 00:00:00 GMT). VitePress's lastUpdated is millis since epoch;
       Keep a Changelog dates are YYYY-MM-DD — convert via `new Date(`...`)`
       at UTC noon to avoid timezone-drift backdating. */
    const rfc822 = (isoDate: string): string => new Date(`${isoDate}T12:00:00Z`).toUTCString();
    const escape = (s: string): string => s
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
    const items = entries.map((entry) => {
      const url = `${SITE_URL}#${entry.version.toLowerCase()}`;
      return [
        '    <item>',
        `      <title>${escape(SITE_TITLE)} ${escape(entry.version)}</title>`,
        `      <link>${escape(url)}</link>`,
        `      <guid isPermaLink="false">${escape(SITE_URL)}changelog/${escape(entry.version)}</guid>`,
        `      <pubDate>${rfc822(entry.date)}</pubDate>`,
        `      <description><![CDATA[${entry.body}]]></description>`,
        '    </item>',
      ].join('\n');
    }).join('\n');
    const feed = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
      '  <channel>',
      `    <title>${escape(SITE_TITLE)} — changelog</title>`,
      `    <link>${escape(SITE_URL)}</link>`,
      `    <description>${escape(SITE_DESCRIPTION)}</description>`,
      '    <language>en-US</language>',
      `    <atom:link href="${escape(SITE_URL)}feed.xml" rel="self" type="application/rss+xml" />`,
      items,
      '  </channel>',
      '</rss>',
      '',
    ].join('\n');
    writeFileSync(resolve(siteConfig.outDir, 'feed.xml'), feed);
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
