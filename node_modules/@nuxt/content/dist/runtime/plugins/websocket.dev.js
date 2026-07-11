import { defineNuxtPlugin } from "nuxt/app";
import { refreshNuxtData } from "#imports";
export default defineNuxtPlugin(() => {
  if (!import.meta.hot || !import.meta.client) return;
  import("../internal/database.client.js").then(({ loadDatabaseAdapter }) => {
    ;
    import.meta.hot.on("nuxt-content:update", async (data) => {
      if (!data || !data.collection || !Array.isArray(data.queries)) return;
      try {
        const db = await loadDatabaseAdapter(data.collection);
        for (const sql of data.queries) {
          try {
            await db.exec(sql);
          } catch (err) {
            console.log(err);
          }
        }
        refreshNuxtData();
      } catch {
      }
    });
  });
});
