const nuxtImportsUrl = `data:text/javascript,${encodeURIComponent(`
const fallbackNuxtApp = {};

export function useRuntimeConfig() {
  return { app: { baseURL: '/' } };
}

export function useNuxtApp() {
  const nuxtApp = Reflect.get(globalThis, 'iridisTestNuxtApp');
  return typeof nuxtApp === 'object' && nuxtApp !== null
    ? nuxtApp
    : fallbackNuxtApp;
}
`)}`;

export function resolve(specifier, context, nextResolve) {
  if (specifier === '#imports') {
    return { 'shortCircuit': true, 'url': nuxtImportsUrl };
  }
  if (specifier.startsWith('~/')) {
    const appModuleUrl = new URL(`../../app/${specifier.slice(2)}`, import.meta.url);
    return nextResolve(appModuleUrl.href, context);
  }
  return nextResolve(specifier, context);
}
