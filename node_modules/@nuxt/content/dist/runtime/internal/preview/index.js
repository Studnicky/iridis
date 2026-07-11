import { createApp } from "vue";
import { withLeadingSlash } from "ufo";
import ContentPreviewMode from "../../components/ContentPreviewMode.vue";
import { loadDatabaseAdapter } from "../database.client.js";
import { v2ToV3ParsedFile } from "./compatibility.js";
import { getCollectionByFilePath, generateCollectionInsert, generateRecordDeletion, generateRecordSelectByColumn, generateRecordUpdate, getCollectionByRoutePath } from "./collection.js";
import { createSingleton, deepAssign, deepDelete, defu, generateStemFromPath, mergeDraft, PreviewConfigFiles, withoutRoot } from "./utils.js";
import { officialProviderUrls } from "./providers.js";
import { callWithNuxt, refreshNuxtData } from "#app";
import { useAppConfig, useNuxtApp, useRuntimeConfig, useRoute, useRouter, ref } from "#imports";
import { collections } from "#content/preview";
const dbReady = ref(false);
const initialAppConfig = createSingleton(() => JSON.parse(JSON.stringify(useAppConfig())));
const initializePreview = async (data) => {
  const mergedFiles = mergeDraft(data.files, data.additions, data.deletions);
  const contentFiles = mergedFiles.filter((item) => ![PreviewConfigFiles.appConfig, PreviewConfigFiles.appConfigV4, PreviewConfigFiles.nuxtConfig].includes(item.path));
  for (const collection of Object.values(collections)) {
    const db = loadDatabaseAdapter(collection.name);
    await db.exec(collection.tableDefinition);
  }
  for (const file of contentFiles) {
    await syncDraftFile(collections, file);
  }
  const appConfig = mergedFiles.find((item) => [PreviewConfigFiles.appConfig, PreviewConfigFiles.appConfigV4].includes(item.path));
  if (appConfig) {
    syncDraftAppConfig(appConfig.parsed);
  }
  refreshNuxtData();
  dbReady.value = true;
};
const syncDraftFile = async (collections2, file) => {
  const { collection, matchedSource } = getCollectionByFilePath(file.path, collections2);
  if (!collection || !matchedSource) {
    console.warn(`Content Preview: collection not found for file: ${file.path}, skipping insertion.`);
    return;
  }
  const db = loadDatabaseAdapter(collection.name);
  const v3File = v2ToV3ParsedFile(file, collection, matchedSource);
  const query = generateCollectionInsert(collection, v3File);
  await db.exec(query);
};
const syncDraftAppConfig = (appConfig) => {
  const nuxtApp = useNuxtApp();
  const _appConfig = callWithNuxt(nuxtApp, useAppConfig);
  deepAssign(_appConfig, defu(appConfig || {}, initialAppConfig));
  if (!appConfig) {
    deepDelete(_appConfig, initialAppConfig);
  }
};
export function mountPreviewUI() {
  const previewConfig = useRuntimeConfig().public.preview || {};
  const previewToken = window.sessionStorage.getItem("previewToken");
  const el = document.createElement("div");
  el.id = "__nuxt_preview_wrapper";
  document.body.appendChild(el);
  createApp(ContentPreviewMode, {
    previewToken,
    api: window.sessionStorage.getItem("previewAPI") || previewConfig?.api,
    initializePreview
  }).mount(el);
}
export function initIframeCommunication() {
  const nuxtApp = useNuxtApp();
  const previewConfig = useRuntimeConfig().public.preview;
  if (!window.parent || window.self === window.parent) {
    return;
  }
  const router = useRouter();
  const route = useRoute();
  window.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) {
      window.parent.postMessage({
        type: "nuxt-content:preview:keydown",
        payload: {
          key: e.key,
          metaKey: e.metaKey,
          ctrlKey: e.ctrlKey,
          shiftKey: e.shiftKey,
          altKey: e.altKey
        }
      }, "*");
    }
  });
  window.addEventListener("message", async (e) => {
    if (!dbReady.value) {
      return;
    }
    const allowedOrigins = previewConfig?.iframeMessagingAllowedOrigins?.split(",").map((origin) => origin.trim()) || [];
    if (![
      "http://localhost:3000",
      ...officialProviderUrls,
      ...allowedOrigins
    ].includes(e.origin)) {
      return;
    }
    const { type, payload = {}, navigate } = e.data || {};
    switch (type) {
      case "nuxt-content:editor:file-selected": {
        await handleFileSelection(payload.path);
        break;
      }
      case "nuxt-content:editor:file-changed":
      case "nuxt-content:editor:media-changed": {
        const { additions = [], deletions = [] } = payload;
        for (const addition of additions) {
          await handleFileUpdate(addition, navigate);
        }
        for (const deletion of deletions) {
          await handleFileDeletion(deletion.path);
        }
        rerenderPreview();
        break;
      }
      case "nuxt-content:config:file-changed": {
        const { additions = [], deletions = [] } = payload;
        const appConfig = additions.find((item) => [PreviewConfigFiles.appConfig, PreviewConfigFiles.appConfigV4].includes(item.path));
        if (appConfig) {
          syncDraftAppConfig(appConfig?.parsed);
        }
        const shouldRemoveAppConfig = deletions.find((item) => [PreviewConfigFiles.appConfig, PreviewConfigFiles.appConfigV4].includes(item.path));
        if (shouldRemoveAppConfig) {
          syncDraftAppConfig(void 0);
        }
      }
    }
    async function handleFileSelection(path) {
      if (!path) {
        return;
      }
      const { collection } = getCollectionByFilePath(withoutRoot(path), collections);
      if (!collection) {
        console.warn(`Content Preview: collection not found for file: ${path}, skipping navigation.`);
        return;
      }
      if (collection.type !== "page") {
        return;
      }
      const db = loadDatabaseAdapter(collection.name);
      const stem = generateStemFromPath(path);
      const query = generateRecordSelectByColumn(collection, "stem", stem);
      const file = await db.first(query);
      if (!file || !file.path) {
        return;
      }
      const resolvedRoute = router.resolve(file.path);
      if (!resolvedRoute || !resolvedRoute.matched || resolvedRoute.matched.length === 0) {
        return;
      }
      if (file.path !== route.path) {
        router.push(file.path);
      }
    }
    async function handleFileUpdate(file, navigate2) {
      const { collection, matchedSource } = getCollectionByFilePath(file.path, collections);
      if (!collection || !matchedSource) {
        console.warn(`Content Preview: collection not found for file: ${file.path}, skipping update.`);
        return;
      }
      const stem = generateStemFromPath(file.path);
      const v3File = v2ToV3ParsedFile({ path: file.path, parsed: file.parsed }, collection, matchedSource);
      const query = generateRecordUpdate(collection, stem, v3File);
      const db = loadDatabaseAdapter(collection.name);
      await db.exec(query);
      if (collection.type !== "page" || !file.pathRoute) {
        return;
      }
      const updatedPath = withLeadingSlash(file.pathRoute);
      if (navigate2 && updatedPath !== route.path) {
        const resolvedRoute = router.resolve(updatedPath);
        if (!resolvedRoute || !resolvedRoute.matched || resolvedRoute.matched.length === 0) {
          return;
        }
        router.push(updatedPath);
      }
    }
    async function handleFileDeletion(path) {
      const { collection } = getCollectionByFilePath(withoutRoot(path), collections);
      if (!collection) {
        console.warn(`Content Preview: collection not found for file: ${path}, skipping deletion.`);
        return;
      }
      const stem = generateStemFromPath(path);
      const query = generateRecordDeletion(collection, stem);
      const db = loadDatabaseAdapter(collection.name);
      await db.exec(query);
    }
  });
  async function sendNavigateMessage() {
    if (!dbReady.value) {
      return;
    }
    const routePath = route.path;
    const { collection } = getCollectionByRoutePath(routePath, collections);
    if (!collection || collection.type !== "page") {
      window.sendNavigateMessageInPreview(routePath, false);
      return;
    }
    const db = loadDatabaseAdapter(collection.name);
    const query = generateRecordSelectByColumn(collection, "path", routePath);
    const file = await db.first(query);
    window.sendNavigateMessageInPreview(routePath, !!file?.path);
  }
  nuxtApp.hook("page:finish", () => {
    sendNavigateMessage();
  });
  nuxtApp.hook("nuxt-content:preview:ready", () => {
    window.parent.postMessage({ type: "nuxt-content:preview:ready" }, "*");
  });
  window.sendNavigateMessageInPreview = (path, navigate) => {
    window.parent.postMessage({
      type: "nuxt-content:preview:navigate",
      payload: { path, navigate }
    }, "*");
  };
}
async function rerenderPreview() {
  await useNuxtApp().hooks.callHookParallel("app:data:refresh");
}
