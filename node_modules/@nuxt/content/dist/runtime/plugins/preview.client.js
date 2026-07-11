import { defineNuxtPlugin } from "#imports";
const previewPlugin = defineNuxtPlugin(async () => {
  return {
    provide: {
      content: {
        loadLocalDatabase: () => {
          return import("../internal/database.client.js").then((m) => m.loadDatabaseAdapter);
        }
      }
    }
  };
});
export default previewPlugin;
