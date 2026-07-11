import { collectionQueryBuilder } from "./internal/query.js";
import { generateNavigationTree } from "./internal/navigation.js";
import { generateItemSurround } from "./internal/surround.js";
import { generateSearchSections, buildFTSIndex, queryFTS, resetFTSIndex } from "./internal/search.js";
import { fetchQuery } from "./internal/api.js";
import { ref, toValue, watch, tryUseNuxtApp } from "#imports";
export const queryCollection = (collection) => {
  const event = tryUseNuxtApp()?.ssrContext?.event;
  return collectionQueryBuilder(collection, (collection2, sql) => executeContentQuery(event, collection2, sql));
};
export function queryCollectionNavigation(collection, fields) {
  return chainablePromise(collection, (qb) => generateNavigationTree(qb, fields));
}
export function queryCollectionItemSurroundings(collection, path, opts) {
  return chainablePromise(collection, (qb) => generateItemSurround(qb, path, opts));
}
export function queryCollectionSearchSections(collection, opts) {
  return chainablePromise(collection, (qb) => generateSearchSections(qb, opts));
}
export function useSearchCollection(collection, opts) {
  const { immediate = true, ...indexOpts } = opts || {};
  const status = ref(immediate ? "loading" : "idle");
  let db;
  let initPromise;
  let indexedFor = [];
  function resolveCollections() {
    const val = toValue(collection);
    return (Array.isArray(val) ? val : [val]).map(String);
  }
  async function init() {
    const collections = resolveCollections();
    if (!collections.length) return initPromise ?? (db ? Promise.resolve(db) : Promise.reject(new Error("No collections to search")));
    const hasRemovedCollections = indexedFor.some((c) => !collections.includes(c));
    const newCollections = collections.filter((c) => !indexedFor.includes(c));
    if (!newCollections.length && !hasRemovedCollections && initPromise) return initPromise;
    status.value = "loading";
    initPromise = import("./internal/database.client.js").then((m) => m.loadDatabaseAdapter(collections[0])).then(async (_db) => {
      db = _db;
      if (hasRemovedCollections) {
        await resetFTSIndex(_db);
      }
      const toIndex = hasRemovedCollections ? collections : newCollections;
      await Promise.all(toIndex.map((col) => {
        const qb = queryCollection(col);
        return buildFTSIndex(_db, col, qb, indexOpts);
      }));
      indexedFor = [...collections];
      status.value = "ready";
      return _db;
    }).catch((err) => {
      status.value = "error";
      throw err;
    });
    return initPromise;
  }
  if (import.meta.client) {
    watch(() => toValue(collection), () => init(), { immediate });
  }
  async function search(query, searchOpts) {
    if (!db) {
      await init();
    }
    return queryFTS(db, indexedFor, query, searchOpts);
  }
  return { status, search, init };
}
async function executeContentQuery(event, collection, sql) {
  if (import.meta.client && window.WebAssembly) {
    return queryContentSqlClientWasm(collection, sql);
  } else {
    return fetchQuery(event, String(collection), sql);
  }
}
async function queryContentSqlClientWasm(collection, sql) {
  const rows = await import("./internal/database.client.js").then((m) => m.loadDatabaseAdapter(collection)).then((db) => db.all(sql));
  return rows;
}
function chainablePromise(collection, fn) {
  const queryBuilder = queryCollection(collection);
  const chainable = {
    where(field, operator, value) {
      queryBuilder.where(String(field), operator, value);
      return chainable;
    },
    andWhere(groupFactory) {
      queryBuilder.andWhere(groupFactory);
      return chainable;
    },
    orWhere(groupFactory) {
      queryBuilder.orWhere(groupFactory);
      return chainable;
    },
    order(field, direction) {
      queryBuilder.order(String(field), direction);
      return chainable;
    },
    then(onfulfilled, onrejected) {
      return fn(queryBuilder).then(onfulfilled, onrejected);
    },
    catch(onrejected) {
      return this.then(void 0, onrejected);
    },
    finally(onfinally) {
      return this.then(void 0, void 0).finally(onfinally);
    },
    get [Symbol.toStringTag]() {
      return "Promise";
    }
  };
  return chainable;
}
