import { getRequestHeaders } from "h3";
import { checksums } from "#content/manifest";
async function fetchContent(event, collection, path, options) {
  const headers = event ? getRequestHeaders(event) : {};
  headers["accept-encoding"] = void 0;
  const url = `/__nuxt_content/${collection}/${path}`;
  const fetchOptions = {
    ...options,
    headers: {
      ...headers,
      ...options.headers
    },
    query: { v: checksums[String(collection)], t: import.meta.dev ? Date.now() : void 0 }
  };
  return event ? await event.$fetch(url, fetchOptions) : await $fetch(url, fetchOptions);
}
export async function fetchDatabase(event, collection) {
  return fetchContent(event, collection, "sql_dump.txt", {
    responseType: "text",
    headers: {
      "content-type": "text/plain"
    }
  });
}
export async function fetchQuery(event, collection, sql) {
  return fetchContent(event, collection, "query", {
    headers: {
      "content-type": "application/json"
    },
    method: "POST",
    body: {
      sql
    }
  });
}
