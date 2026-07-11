import { defineNuxtPlugin } from "#imports";
export default defineNuxtPlugin((nuxtApp) => {
  const isCustomElement = nuxtApp.vueApp.config.compilerOptions.isCustomElement;
  nuxtApp.vueApp.config.compilerOptions.isCustomElement = (tag) => tag.startsWith("swiper-") || isCustomElement?.(tag) || false;
});
