import { defineNuxtPlugin, useCookie, useRoute, useRuntimeConfig, getAppManifest } from "#imports";
const previewWithApiPlugin = defineNuxtPlugin(async (nuxtApp) => {
  const previewConfig = useRuntimeConfig().public.preview || {};
  const route = useRoute();
  const previewToken = useCookie("previewToken", { sameSite: "none", secure: true });
  if (previewConfig.api) {
    if (Object.prototype.hasOwnProperty.call(route.query, "preview") && !route.query.preview) {
      return;
    }
    if (!route.query.preview && !previewToken.value) {
      return;
    }
    if (route.query.preview) {
      previewToken.value = String(route.query.preview);
    }
    window.sessionStorage.setItem("previewToken", String(previewToken.value));
    window.sessionStorage.setItem("previewAPI", typeof route.query.staging !== "undefined" && previewConfig.stagingApi ? previewConfig.stagingApi : previewConfig.api);
    const manifest = await getAppManifest();
    manifest.prerendered = [];
    nuxtApp.hook("app:mounted", async () => {
      await import("../internal/preview/index.js").then(({ mountPreviewUI, initIframeCommunication }) => {
        mountPreviewUI();
        initIframeCommunication();
      });
    });
  }
});
export default previewWithApiPlugin;
