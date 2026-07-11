import { minimatch } from "minimatch";
import { joinURL, withoutLeadingSlash } from "ufo";
import { hash } from "ohash";
import { getOrderedSchemaKeys } from "../schema.js";
import { formatDate, formatDateTime, parseSourceBase } from "./utils.js";
import { withoutPrefixNumber, withoutRoot } from "./files.js";
export const getCollectionByFilePath = (path, collections) => {
  let matchedSource;
  const collection = Object.values(collections).find((collection2) => {
    if (!collection2.source || collection2.source.length === 0) {
      return;
    }
    const pathWithoutRoot = withoutRoot(path);
    const paths = pathWithoutRoot === "/" ? ["index.yml", "index.yaml", "index.md", "index.json"] : [pathWithoutRoot];
    return paths.some((p) => {
      matchedSource = collection2.source.find((source) => {
        const include = minimatch(p, source.include);
        const exclude = source.exclude?.some((exclude2) => minimatch(p, exclude2));
        return include && !exclude;
      });
      return matchedSource;
    });
  });
  return {
    collection,
    matchedSource
  };
};
export const getCollectionByRoutePath = (routePath, collections) => {
  let matchedSource;
  const collection = Object.values(collections).find((collection2) => {
    if (!collection2.source || collection2.source.length === 0) {
      return;
    }
    matchedSource = collection2.source.find((source) => {
      if (!source.prefix) {
        return;
      }
      const prefixWithoutPrefixNumber = withoutPrefixNumber(source.prefix, true);
      if (!routePath.startsWith(prefixWithoutPrefixNumber)) {
        return;
      }
      if (routePath === "/") {
        const indexFiles = ["index.yml", "index.yaml", "index.md", "index.json"];
        const files = routePath === "/" ? indexFiles : indexFiles.map((indexFile) => withoutLeadingSlash(joinURL(prefixWithoutPrefixNumber, indexFile)));
        return files.some((p) => {
          const include2 = minimatch(p, withoutPrefixNumber(source.include));
          const exclude2 = source.exclude?.some((exclude3) => minimatch(p, withoutPrefixNumber(exclude3)));
          return include2 && !exclude2;
        });
      }
      const { fixed } = parseSourceBase(source);
      const fixedWithoutPrefixNumber = withoutPrefixNumber(fixed || "");
      const pathWithoutPrefix = routePath.substring(prefixWithoutPrefixNumber.length);
      const path = joinURL(fixedWithoutPrefixNumber, pathWithoutPrefix);
      const removeExtension = (pattern) => {
        return pattern.replace(/\.[^/.]+$/, "");
      };
      const include = minimatch(path, removeExtension(withoutPrefixNumber(source.include)));
      const exclude = source.exclude?.some((exclude2) => minimatch(path, removeExtension(withoutPrefixNumber(exclude2))));
      return include && !exclude;
    });
    return matchedSource;
  });
  return {
    collection,
    matchedSource
  };
};
export function generateCollectionInsert(collection, data) {
  const values = computeValuesBasedOnCollectionSchema(collection, data);
  let index = 0;
  return `INSERT INTO ${collection.tableName} VALUES (${"?, ".repeat(values.length).slice(0, -2)})`.replace(/\?/g, () => values[index++]);
}
export function generateRecordUpdate(collection, stem, data) {
  const deleteQuery = generateRecordDeletion(collection, stem);
  const insertQuery = generateCollectionInsert(collection, data);
  return `${deleteQuery}; ${insertQuery}`;
}
export function generateRecordDeletion(collection, stem) {
  return `DELETE FROM ${collection.tableName} WHERE stem = '${stem}';`;
}
export function generateRecordSelectByColumn(collection, column, value) {
  return `SELECT * FROM ${collection.tableName} WHERE ${column} = '${value}';`;
}
function computeValuesBasedOnCollectionSchema(collection, data) {
  const fields = [];
  const values = [];
  const properties = collection.schema.definitions[collection.name].properties;
  const sortedKeys = getOrderedSchemaKeys(collection.schema);
  sortedKeys.forEach((key) => {
    const value = properties[key];
    const type = collection.fields[key];
    const defaultValue = value?.default !== void 0 ? value.default : "NULL";
    const valueToInsert = typeof data[key] !== "undefined" ? data[key] : defaultValue;
    fields.push(key);
    if (type === "json") {
      values.push(`'${JSON.stringify(valueToInsert).replace(/'/g, "''")}'`);
    } else if (type === "string" || ["string", "enum"].includes(value.type)) {
      if (value.format === "date") {
        values.push(valueToInsert !== "NULL" ? `'${formatDate(valueToInsert)}'` : defaultValue);
      } else if (value.format === "datetime") {
        values.push(valueToInsert !== "NULL" ? `'${formatDateTime(valueToInsert)}'` : defaultValue);
      } else {
        values.push(`'${String(valueToInsert).replace(/\n/g, "\\n").replace(/'/g, "''")}'`);
      }
    } else if (type === "boolean") {
      values.push(valueToInsert !== "NULL" ? !!valueToInsert : valueToInsert);
    } else {
      values.push(valueToInsert);
    }
  });
  values.push(`'${hash(values)}'`);
  return values;
}
