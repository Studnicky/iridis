import { join } from "pathe";
import { parseSourceBase, withoutPrefixNumber } from "./utils.js";
export const v2ToV3ParsedFile = (file, collection, source) => {
  const { fixed } = parseSourceBase(source);
  if (!file.parsed) {
    return void 0;
  }
  const fixedWithoutPrefixNumber = withoutPrefixNumber(fixed || "");
  const prefixWithoutPrefix = withoutPrefixNumber(source?.prefix || "", true);
  const path = file.parsed._path.substring(fixedWithoutPrefixNumber.length);
  const pathInCollection = join(prefixWithoutPrefix, path);
  const mappedFile = {
    id: file.parsed._id,
    stem: file.parsed._stem,
    meta: {},
    extension: file.parsed._extension,
    path: pathInCollection
  };
  const properties = collection.schema.definitions[collection.name].properties;
  Object.keys(file.parsed).forEach((key) => {
    if (key in properties) {
      mappedFile[key] = file.parsed[key];
    } else {
      mappedFile.meta[key] = file.parsed[key];
    }
  });
  return mappedFile;
};
