// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/ui', '@nuxt/content'],
  css: ['~/assets/css/main.css'],
  // GitHub Pages serves under /iridis/. Set NUXT_APP_BASE_URL=/iridis/ at build
  // time (env var, not just here) so _nuxt/* asset paths get the prefix.
  app: {
    baseURL: process.env.NUXT_APP_BASE_URL || '/',
  },
})
