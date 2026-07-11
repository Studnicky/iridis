import { eventHandler, getRouterParam, readBody } from "h3";
import loadDatabaseAdapter, { checkAndImportDatabaseIntegrity } from "../internal/database.server.js";
import { assertSafeQuery } from "../internal/security.js";
import { useRuntimeConfig } from "#imports";
export default eventHandler(async (event) => {
  const { sql } = await readBody(event);
  const collection = getRouterParam(event, "collection") || event.path?.split("/")?.[2] || "";
  assertSafeQuery(sql, collection);
  const conf = useRuntimeConfig().content;
  if (conf.integrityCheck) {
    await checkAndImportDatabaseIntegrity(event, collection, conf);
  }
  return loadDatabaseAdapter(conf).all(sql);
});
