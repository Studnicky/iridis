import { createDefu } from "defu";
export * from "./files.js";
export const defu = createDefu((obj, key, value) => {
  if (Array.isArray(obj[key]) && Array.isArray(value)) {
    obj[key] = value;
    return true;
  }
});
export const createSingleton = (fn) => {
  let instance;
  return (_args) => {
    if (!instance) {
      instance = fn();
    }
    return instance;
  };
};
export function deepDelete(obj, newObj) {
  for (const key in obj) {
    const val = newObj[key];
    if (!(key in newObj)) {
      delete obj[key];
    }
    if (val !== null && typeof val === "object") {
      deepDelete(obj[key], newObj[key]);
    }
  }
}
export function deepAssign(obj, newObj) {
  for (const key in newObj) {
    const val = newObj[key];
    if (val === "_DELETED_") {
      delete obj[key];
      continue;
    }
    if (val !== null && typeof val === "object") {
      if (Array.isArray(val) && Array.isArray(obj[key])) {
        obj[key] = val;
      } else {
        obj[key] = obj[key] || {};
        deepAssign(obj[key], val);
      }
    } else {
      obj[key] = val;
    }
  }
}
export function parseSourceBase(source) {
  const [fixPart, ...rest] = source.include.includes("*") ? source.include.split("*") : ["", source.include];
  return {
    fixed: fixPart || "",
    dynamic: "*" + rest.join("*")
  };
}
export const formatDate = (date) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) {
    throw new TypeError(`Invalid date value: "${date}"`);
  }
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
};
export const formatDateTime = (datetime) => {
  const d = new Date(datetime);
  if (Number.isNaN(d.getTime())) {
    throw new TypeError(`Invalid datetime value: "${datetime}"`);
  }
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const seconds = d.getSeconds();
  return `${formatDate(datetime)} ${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};
