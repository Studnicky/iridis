// https://nuxt.com/docs/api/configuration/nuxt-config
import { resolve } from 'node:path';
import { snippetImporter } from './app/build/SnippetImporter';

const REPO_ROOT = resolve(import.meta.dirname, '..');

export default defineNuxtConfig({
  hooks: {
    'content:file:beforeParse'(ctx) {
      ctx.file.body = snippetImporter.resolve(ctx.file.body, REPO_ROOT);
    },
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: true, // Prerendered per-route at build time via `nuxt generate`; no runtime server on GitHub Pages
  modules: [
    '@nuxt/ui',
    '@nuxt/content',
    '@formkit/auto-animate/nuxt',
    'nuxt-swiper',
  ],
  icon: {
    clientBundle: { scan: true },
    fallbackToApi: false,
    serverBundle: { collections: ['lucide', 'material-symbols'] },
  },
  css: [
    '~/assets/css/main.css',
  ],
  components: [
    { path: '~/components/content', pathPrefix: false },
    { path: '~/components/layout', pathPrefix: false },
  ],
  // GitHub Pages serves under /iridis/. Set NUXT_APP_BASE_URL=/iridis/ at build
  // time (env var, not just here) so _nuxt/* asset paths get the prefix.
  app: {
    baseURL: process.env.NUXT_APP_BASE_URL || '/',
    head: {
      link: [
        // Explicit despite Nuxt's /favicon.ico convention-based serving —
        // baseURL isn't applied to bare convention paths, only to entries
        // declared here, so this is what actually makes the icon resolve
        // correctly once deployed under /iridis/ on GitHub Pages.
        { rel: 'icon', type: 'image/x-icon', href: `${process.env.NUXT_APP_BASE_URL || '/'}favicon.ico` },
        { rel: 'apple-touch-icon', sizes: '180x180', href: `${process.env.NUXT_APP_BASE_URL || '/'}apple-touch-icon.png` },
      ],
    },
  },
  // Site modules and local workspace sources use explicit `.ts` extensions
  // during development. Nuxt's generated tsconfig does not enable them by default.
  typescript: {
    tsConfig: {
      compilerOptions: {
        allowImportingTsExtensions: true,
      },
    },
  },
  vite: {
    resolve: {
      // @cosmos.gl/graph imports gl-bench's default export. gl-bench's
      // package.json resolves the bare specifier to its "browser" build
      // (a UMD bundle with no ESM exports) under pnpm's isolated node_modules,
      // so pin the alias to its real ESM module build instead.
      alias: {
        'gl-bench': 'gl-bench/dist/gl-bench.module.js',
      },
    },
  },
})
