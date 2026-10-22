const nuxtImportsUrl = `data:text/javascript,${encodeURIComponent(`
const fallbackNuxtApp = {};
const stateByApp = new WeakMap();

export function useRuntimeConfig() {
  return { app: { baseURL: '/' } };
}

export function useState(key, init) {
  const nuxtApp = useNuxtApp();
  const states = stateByApp.get(nuxtApp) ?? new Map();
  stateByApp.set(nuxtApp, states);
  if (!states.has(key)) {
    states.set(key, { value: init() });
  }
  return states.get(key);
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
