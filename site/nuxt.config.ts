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
  css: ['~/assets/css/main.css'],
  googleFonts: {
    display: 'swap',
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
