// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: [
    '@nuxt/ui',
    '@nuxt/content',
    '@nuxtjs/google-fonts',
    '@formkit/auto-animate/nuxt',
    'nuxt-swiper',
  ],
  css: [
    '~/assets/css/main.css',
    '~/assets/css/theme-default.css'
  ],
  components: [
    { path: '~/components/content', pathPrefix: false },
    { path: '~/components/layout', pathPrefix: false },
  ],
  googleFonts: {
    display: 'block',
    preload: true,
    download: true,
    families: {
      Orbitron: [500, 700, 900],       // futuristic display
      'Space Grotesk': [400, 500, 700], // headings / body
      'JetBrains Mono': [400, 600],     // code / mono
    },
  },
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
  // The @studnicky/iridis* workspace packages ship source .ts files with
  // explicit .ts import extensions (bundler moduleResolution). Nuxt's
  // generated tsconfig doesn't enable this by default.
  typescript: {
    tsConfig: {
      compilerOptions: {
        allowImportingTsExtensions: true,
      },
    },
  },
})
