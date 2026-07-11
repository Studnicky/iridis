import { decompressSQLDump } from "./dump.js";
import { refineContentFields } from "./collection.js";
import { fetchDatabase } from "./api.js";
import { checksums, tables } from "#content/manifest";
let db;
const loadedCollections = /* @__PURE__ */ new Map();
const dbPromises = /* @__PURE__ */ new Map();
export function loadDatabaseAdapter(collection) {
  async function loadAdapter(collection2) {
    const collectionKey = String(collection2);
    if (!db) {
      if (!dbPromises.has("_")) {
        dbPromises.set("_", initializeDatabase());
      }
      db = await dbPromises.get("_");
      dbPromises.delete("_");
    }
    if (!loadedCollections.has(collectionKey)) {
      if (!dbPromises.has(collectionKey)) {
        dbPromises.set(collectionKey, loadCollectionDatabase(collection2));
      }
      await dbPromises.get(collectionKey);
      loadedCollections.set(collectionKey, "loaded");
      dbPromises.delete(collectionKey);
    }
    return db;
  }
  return {
    all: async (sql, params) => {
      await loadAdapter(collection);
      return db.exec({ sql, bind: params, rowMode: "object", returnValue: "resultRows" }).map((row) => refineContentFields(sql, row));
    },
    first: async (sql, params) => {
      await loadAdapter(collection);
      return refineContentFields(
        sql,
        db.exec({ sql, bind: params, rowMode: "object", returnValue: "resultRows" }).shift()
      );
    },
    exec: async (sql, params) => {
      await loadAdapter(collection);
      await db.exec({ sql, bind: params });
    }
  };
}
async function initializeDatabase() {
  if (!db) {
    const sqlite3InitModule = await import("@sqlite.org/sqlite-wasm").then((m) => m.default);
    globalThis.sqlite3ApiConfig = {
      // overriding default log function allows to avoid error when logger are dropped in build.
      // For example `nuxt-security` module drops logger in production build by default.
      silent: true,
      debug: (...args) => console.debug(...args),
      warn: (...args) => {
        if (String(args[0]).includes("OPFS sqlite3_vfs")) {
          return;
        }
        console.warn(...args);
      },
      error: (...args) => console.error(...args),
      log: (...args) => console.log(...args)
    };
    const sqlite3 = await sqlite3InitModule();
    db = new sqlite3.oo1.DB();
  }
  return db;
}
async function loadCollectionDatabase(collection) {
  if (window.sessionStorage.getItem("previewToken")) {
    return db;
  }
  let compressedDump = null;
  const checksumId = `checksum_${collection}`;
  const dumpId = `collection_${collection}`;
  let checksumState = "matched";
  try {
    const dbChecksum = db.exec({ sql: `SELECT * FROM ${tables.info} where id = '${checksumId}'`, rowMode: "object", returnValue: "resultRows" }).shift();
    if (dbChecksum?.version !== checksums[String(collection)]) {
      checksumState = "mismatch";
    }
  } catch {
    checksumState = "missing";
  }
  if (checksumState !== "matched") {
    if (!import.meta.dev) {
      const localCacheVersion = window.localStorage.getItem(`content_${checksumId}`);
      if (localCacheVersion === checksums[String(collection)]) {
        compressedDump = window.localStorage.getItem(`content_${dumpId}`);
      }
    }
    if (!compressedDump) {
      compressedDump = await fetchDatabase(void 0, String(collection));
      if (!import.meta.dev) {
        try {
          window.localStorage.setItem(`content_${checksumId}`, checksums[String(collection)]);
          window.localStorage.setItem(`content_${dumpId}`, compressedDump);
        } catch (error) {
          console.error("Database integrity check failed, rebuilding database", error);
        }
      }
    }
    const dump = await decompressSQLDump(compressedDump);
    await db.exec({ sql: `DROP TABLE IF EXISTS ${tables[String(collection)]}` });
    if (checksumState === "mismatch") {
      await db.exec({ sql: `DELETE FROM ${tables.info} WHERE id = '${checksumId}'` });
    }
    for (const command of dump) {
      try {
        await db.exec(command);
      } catch (error) {
        console.error("Error executing command", error);
      }
    }
  }
  return db;
}
