const nuxtImportsUrl = `data:text/javascript,${encodeURIComponent(`
const TEST_NUXT_APP = Symbol.for('iridis.test.nuxt-app');
const fallbackNuxtApp = {};

export function useRuntimeConfig() {
  return { app: { baseURL: '/' } };
}

export function useNuxtApp() {
  const nuxtApp = globalThis[TEST_NUXT_APP];
  return typeof nuxtApp === 'object' && nuxtApp !== null
    ? nuxtApp
    : fallbackNuxtApp;
}
`)}`;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === '#imports') {
    return { 'shortCircuit': true, 'url': nuxtImportsUrl };
  }
  if (specifier.startsWith('~/')) {
    const appModuleUrl = new URL(`../../app/${specifier.slice(2)}`, import.meta.url);
    return await nextResolve(appModuleUrl.href, context);
  }
  return await nextResolve(specifier, context);
}
