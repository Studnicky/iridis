import process from 'node:process';globalThis._importMeta_=globalThis._importMeta_||{url:"file:///_entry.js",env:process.env};import http, { Server as Server$1 } from 'node:http';
import https, { Server } from 'node:https';
import { EventEmitter } from 'node:events';
import { Buffer as Buffer$1 } from 'node:buffer';
import { promises, existsSync, mkdirSync } from 'node:fs';
import { resolve as resolve$1, dirname as dirname$1, join } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { getIcons } from '@iconify/utils';
import { consola } from 'consola';
import Database from 'better-sqlite3';

const suspectProtoRx = /"(?:_|\\u0{2}5[Ff]){2}(?:p|\\u0{2}70)(?:r|\\u0{2}72)(?:o|\\u0{2}6[Ff])(?:t|\\u0{2}74)(?:o|\\u0{2}6[Ff])(?:_|\\u0{2}5[Ff]){2}"\s*:/;
const suspectConstructorRx = /"(?:c|\\u0063)(?:o|\\u006[Ff])(?:n|\\u006[Ee])(?:s|\\u0073)(?:t|\\u0074)(?:r|\\u0072)(?:u|\\u0075)(?:c|\\u0063)(?:t|\\u0074)(?:o|\\u006[Ff])(?:r|\\u0072)"\s*:/;
const JsonSigRx = /^\s*["[{]|^\s*-?\d{1,16}(\.\d{1,17})?([Ee][+-]?\d+)?\s*$/;
function jsonParseTransform(key, value) {
  if (key === "__proto__" || key === "constructor" && value && typeof value === "object" && "prototype" in value) {
    warnKeyDropped(key);
    return;
  }
  return value;
}
function warnKeyDropped(key) {
  console.warn(`[destr] Dropping "${key}" key to prevent prototype pollution.`);
}
function destr(value, options = {}) {
  if (typeof value !== "string") {
    return value;
  }
  if (value[0] === '"' && value[value.length - 1] === '"' && value.indexOf("\\") === -1) {
    return value.slice(1, -1);
  }
  const _value = value.trim();
  if (_value.length <= 9) {
    switch (_value.toLowerCase()) {
      case "true": {
        return true;
      }
      case "false": {
        return false;
      }
      case "undefined": {
        return void 0;
      }
      case "null": {
        return null;
      }
      case "nan": {
        return Number.NaN;
      }
      case "infinity": {
        return Number.POSITIVE_INFINITY;
      }
      case "-infinity": {
        return Number.NEGATIVE_INFINITY;
      }
    }
  }
  if (!JsonSigRx.test(value)) {
    if (options.strict) {
      throw new SyntaxError("[destr] Invalid JSON");
    }
    return value;
  }
  try {
    if (suspectProtoRx.test(value) || suspectConstructorRx.test(value)) {
      if (options.strict) {
        throw new Error("[destr] Possible prototype pollution");
      }
      return JSON.parse(value, jsonParseTransform);
    }
    return JSON.parse(value);
  } catch (error) {
    if (options.strict) {
      throw error;
    }
    return value;
  }
}

const HASH_RE = /#/g;
const AMPERSAND_RE = /&/g;
const SLASH_RE = /\//g;
const EQUAL_RE = /=/g;
const IM_RE = /\?/g;
const PLUS_RE = /\+/g;
const ENC_CARET_RE = /%5e/gi;
const ENC_BACKTICK_RE = /%60/gi;
const ENC_PIPE_RE = /%7c/gi;
const ENC_SPACE_RE = /%20/gi;
const ENC_SLASH_RE = /%2f/gi;
const ENC_ENC_SLASH_RE = /%252f/gi;
function encode(text) {
  return encodeURI("" + text).replace(ENC_PIPE_RE, "|");
}
function encodeQueryValue(input) {
  return encode(typeof input === "string" ? input : JSON.stringify(input)).replace(PLUS_RE, "%2B").replace(ENC_SPACE_RE, "+").replace(HASH_RE, "%23").replace(AMPERSAND_RE, "%26").replace(ENC_BACKTICK_RE, "`").replace(ENC_CARET_RE, "^").replace(SLASH_RE, "%2F");
}
function encodeQueryKey(text) {
  return encodeQueryValue(text).replace(EQUAL_RE, "%3D");
}
function encodePath(text) {
  return encode(text).replace(HASH_RE, "%23").replace(IM_RE, "%3F").replace(ENC_ENC_SLASH_RE, "%2F").replace(AMPERSAND_RE, "%26").replace(PLUS_RE, "%2B");
}
function decode(text = "") {
  try {
    return decodeURIComponent("" + text);
  } catch {
    return "" + text;
  }
}
function decodePath(text) {
  return decode(text.replace(ENC_SLASH_RE, "%252F"));
}
function decodeQueryKey(text) {
  return decode(text.replace(PLUS_RE, " "));
}
function decodeQueryValue(text) {
  return decode(text.replace(PLUS_RE, " "));
}

function parseQuery(parametersString = "") {
  const object = /* @__PURE__ */ Object.create(null);
  if (parametersString[0] === "?") {
    parametersString = parametersString.slice(1);
  }
  for (const parameter of parametersString.split("&")) {
    const s = parameter.match(/([^=]+)=?(.*)/) || [];
    if (s.length < 2) {
      continue;
    }
    const key = decodeQueryKey(s[1]);
    if (key === "__proto__" || key === "constructor") {
      continue;
    }
    const value = decodeQueryValue(s[2] || "");
    if (object[key] === void 0) {
      object[key] = value;
    } else if (Array.isArray(object[key])) {
      object[key].push(value);
    } else {
      object[key] = [object[key], value];
    }
  }
  return object;
}
function encodeQueryItem(key, value) {
  if (typeof value === "number" || typeof value === "boolean") {
    value = String(value);
  }
  if (!value) {
    return encodeQueryKey(key);
  }
  if (Array.isArray(value)) {
    return value.map(
      (_value) => `${encodeQueryKey(key)}=${encodeQueryValue(_value)}`
    ).join("&");
  }
  return `${encodeQueryKey(key)}=${encodeQueryValue(value)}`;
}
function stringifyQuery(query) {
  return Object.keys(query).filter((k) => query[k] !== void 0).map((k) => encodeQueryItem(k, query[k])).filter(Boolean).join("&");
}

const PROTOCOL_STRICT_REGEX = /^[\s\w\0+.-]{2,}:([/\\]{1,2})/;
const PROTOCOL_REGEX = /^[\s\w\0+.-]{2,}:([/\\]{2})?/;
const PROTOCOL_RELATIVE_REGEX = /^([/\\]\s*){2,}[^/\\]/;
const PROTOCOL_SCRIPT_RE = /^[\s\0]*(blob|data|javascript|vbscript):$/i;
const TRAILING_SLASH_RE = /\/$|\/\?|\/#/;
const JOIN_LEADING_SLASH_RE = /^\.?\//;
function hasProtocol(inputString, opts = {}) {
  if (typeof opts === "boolean") {
    opts = { acceptRelative: opts };
  }
  if (opts.strict) {
    return PROTOCOL_STRICT_REGEX.test(inputString);
  }
  return PROTOCOL_REGEX.test(inputString) || (opts.acceptRelative ? PROTOCOL_RELATIVE_REGEX.test(inputString) : false);
}
function isScriptProtocol(protocol) {
  return !!protocol && PROTOCOL_SCRIPT_RE.test(protocol);
}
function hasTrailingSlash(input = "", respectQueryAndFragment) {
  if (!respectQueryAndFragment) {
    return input.endsWith("/");
  }
  return TRAILING_SLASH_RE.test(input);
}
function withoutTrailingSlash(input = "", respectQueryAndFragment) {
  if (!respectQueryAndFragment) {
    return (hasTrailingSlash(input) ? input.slice(0, -1) : input) || "/";
  }
  if (!hasTrailingSlash(input, true)) {
    return input || "/";
  }
  let path = input;
  let fragment = "";
  const fragmentIndex = input.indexOf("#");
  if (fragmentIndex !== -1) {
    path = input.slice(0, fragmentIndex);
    fragment = input.slice(fragmentIndex);
  }
  const [s0, ...s] = path.split("?");
  const cleanPath = s0.endsWith("/") ? s0.slice(0, -1) : s0;
  return (cleanPath || "/") + (s.length > 0 ? `?${s.join("?")}` : "") + fragment;
}
function withTrailingSlash(input = "", respectQueryAndFragment) {
  if (!respectQueryAndFragment) {
    return input.endsWith("/") ? input : input + "/";
  }
  if (hasTrailingSlash(input, true)) {
    return input || "/";
  }
  let path = input;
  let fragment = "";
  const fragmentIndex = input.indexOf("#");
  if (fragmentIndex !== -1) {
    path = input.slice(0, fragmentIndex);
    fragment = input.slice(fragmentIndex);
    if (!path) {
      return fragment;
    }
  }
  const [s0, ...s] = path.split("?");
  return s0 + "/" + (s.length > 0 ? `?${s.join("?")}` : "") + fragment;
}
function hasLeadingSlash(input = "") {
  return input.startsWith("/");
}
function withLeadingSlash(input = "") {
  return hasLeadingSlash(input) ? input : "/" + input;
}
function withBase(input, base) {
  if (isEmptyURL(base) || hasProtocol(input)) {
    return input;
  }
  const _base = withoutTrailingSlash(base);
  if (input.startsWith(_base)) {
    const nextChar = input[_base.length];
    if (!nextChar || nextChar === "/" || nextChar === "?") {
      return input;
    }
  }
  return joinURL(_base, input);
}
function withoutBase(input, base) {
  if (isEmptyURL(base)) {
    return input;
  }
  const _base = withoutTrailingSlash(base);
  if (!input.startsWith(_base)) {
    return input;
  }
  const nextChar = input[_base.length];
  if (nextChar && nextChar !== "/" && nextChar !== "?") {
    return input;
  }
  const trimmed = input.slice(_base.length).replace(/^\/+/, "");
  return "/" + trimmed;
}
function withQuery(input, query) {
  const parsed = parseURL(input);
  const mergedQuery = { ...parseQuery(parsed.search), ...query };
  parsed.search = stringifyQuery(mergedQuery);
  return stringifyParsedURL(parsed);
}
function getQuery$1(input) {
  return parseQuery(parseURL(input).search);
}
function isEmptyURL(url) {
  return !url || url === "/";
}
function isNonEmptyURL(url) {
  return url && url !== "/";
}
function joinURL(base, ...input) {
  let url = base || "";
  for (const segment of input.filter((url2) => isNonEmptyURL(url2))) {
    if (url) {
      const _segment = segment.replace(JOIN_LEADING_SLASH_RE, "");
      url = withTrailingSlash(url) + _segment;
    } else {
      url = segment;
    }
  }
  return url;
}
function joinRelativeURL(..._input) {
  const JOIN_SEGMENT_SPLIT_RE = /\/(?!\/)/;
  const input = _input.filter(Boolean);
  const segments = [];
  let segmentsDepth = 0;
  for (const i of input) {
    if (!i || i === "/") {
      continue;
    }
    for (const [sindex, s] of i.split(JOIN_SEGMENT_SPLIT_RE).entries()) {
      if (!s || s === ".") {
        continue;
      }
      if (s === "..") {
        if (segments.length === 1 && hasProtocol(segments[0])) {
          continue;
        }
        segments.pop();
        segmentsDepth--;
        continue;
      }
      if (sindex === 1 && segments[segments.length - 1]?.endsWith(":/")) {
        segments[segments.length - 1] += "/" + s;
        continue;
      }
      segments.push(s);
      segmentsDepth++;
    }
  }
  let url = segments.join("/");
  if (segmentsDepth >= 0) {
    if (input[0]?.startsWith("/") && !url.startsWith("/")) {
      url = "/" + url;
    } else if (input[0]?.startsWith("./") && !url.startsWith("./")) {
      url = "./" + url;
    }
  } else {
    url = "../".repeat(-1 * segmentsDepth) + url;
  }
  if (input[input.length - 1]?.endsWith("/") && !url.endsWith("/")) {
    url += "/";
  }
  return url;
}

const protocolRelative = Symbol.for("ufo:protocolRelative");
function parseURL(input = "", defaultProto) {
  const _specialProtoMatch = input.match(
    /^[\s\0]*(blob:|data:|javascript:|vbscript:)(.*)/i
  );
  if (_specialProtoMatch) {
    const [, _proto, _pathname = ""] = _specialProtoMatch;
    return {
      protocol: _proto.toLowerCase(),
      pathname: _pathname,
      href: _proto + _pathname,
      auth: "",
      host: "",
      search: "",
      hash: ""
    };
  }
  if (!hasProtocol(input, { acceptRelative: true })) {
    return parsePath(input);
  }
  const [, protocol = "", auth, hostAndPath = ""] = input.replace(/\\/g, "/").match(/^[\s\0]*([\w+.-]{2,}:)?\/\/([^/@]+@)?(.*)/) || [];
  let [, host = "", path = ""] = hostAndPath.match(/([^#/?]*)(.*)?/) || [];
  if (protocol === "file:") {
    path = path.replace(/\/(?=[A-Za-z]:)/, "");
  }
  const { pathname, search, hash } = parsePath(path);
  return {
    protocol: protocol.toLowerCase(),
    auth: auth ? auth.slice(0, Math.max(0, auth.length - 1)) : "",
    host,
    pathname,
    search,
    hash,
    [protocolRelative]: !protocol
  };
}
function parsePath(input = "") {
  const [pathname = "", search = "", hash = ""] = (input.match(/([^#?]*)(\?[^#]*)?(#.*)?/) || []).splice(1);
  return {
    pathname,
    search,
    hash
  };
}
function stringifyParsedURL(parsed) {
  const pathname = parsed.pathname || "";
  const search = parsed.search ? (parsed.search.startsWith("?") ? "" : "?") + parsed.search : "";
  const hash = parsed.hash || "";
  const auth = parsed.auth ? parsed.auth + "@" : "";
  const host = parsed.host || "";
  const proto = parsed.protocol || parsed[protocolRelative] ? (parsed.protocol || "") + "//" : "";
  return proto + auth + host + pathname + search + hash;
}

const NODE_TYPES = {
  NORMAL: 0,
  WILDCARD: 1,
  PLACEHOLDER: 2
};

function createRouter$1(options = {}) {
  const ctx = {
    options,
    rootNode: createRadixNode(),
    staticRoutesMap: {}
  };
  const normalizeTrailingSlash = (p) => options.strictTrailingSlash ? p : p.replace(/\/$/, "") || "/";
  if (options.routes) {
    for (const path in options.routes) {
      insert(ctx, normalizeTrailingSlash(path), options.routes[path]);
    }
  }
  return {
    ctx,
    lookup: (path) => lookup(ctx, normalizeTrailingSlash(path)),
    insert: (path, data) => insert(ctx, normalizeTrailingSlash(path), data),
    remove: (path) => remove(ctx, normalizeTrailingSlash(path))
  };
}
function lookup(ctx, path) {
  const staticPathNode = ctx.staticRoutesMap[path];
  if (staticPathNode) {
    return staticPathNode.data;
  }
  const sections = path.split("/");
  const params = {};
  let paramsFound = false;
  let wildcardNode = null;
  let node = ctx.rootNode;
  let wildCardParam = null;
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    if (node.wildcardChildNode !== null) {
      wildcardNode = node.wildcardChildNode;
      wildCardParam = sections.slice(i).join("/");
    }
    const nextNode = node.children.get(section);
    if (nextNode === void 0) {
      if (node && node.placeholderChildren.length > 1) {
        const remaining = sections.length - i;
        node = node.placeholderChildren.find((c) => c.maxDepth === remaining) || null;
      } else {
        node = node.placeholderChildren[0] || null;
      }
      if (!node) {
        break;
      }
      if (node.paramName) {
        params[node.paramName] = section;
      }
      paramsFound = true;
    } else {
      node = nextNode;
    }
  }
  if ((node === null || node.data === null) && wildcardNode !== null) {
    node = wildcardNode;
    params[node.paramName || "_"] = wildCardParam;
    paramsFound = true;
  }
  if (!node) {
    return null;
  }
  if (paramsFound) {
    return {
      ...node.data,
      params: paramsFound ? params : void 0
    };
  }
  return node.data;
}
function insert(ctx, path, data) {
  let isStaticRoute = true;
  const sections = path.split("/");
  let node = ctx.rootNode;
  let _unnamedPlaceholderCtr = 0;
  const matchedNodes = [node];
  for (const section of sections) {
    let childNode;
    if (childNode = node.children.get(section)) {
      node = childNode;
    } else {
      const type = getNodeType(section);
      childNode = createRadixNode({ type, parent: node });
      node.children.set(section, childNode);
      if (type === NODE_TYPES.PLACEHOLDER) {
        childNode.paramName = section === "*" ? `_${_unnamedPlaceholderCtr++}` : section.slice(1);
        node.placeholderChildren.push(childNode);
        isStaticRoute = false;
      } else if (type === NODE_TYPES.WILDCARD) {
        node.wildcardChildNode = childNode;
        childNode.paramName = section.slice(
          3
          /* "**:" */
        ) || "_";
        isStaticRoute = false;
      }
      matchedNodes.push(childNode);
      node = childNode;
    }
  }
  for (const [depth, node2] of matchedNodes.entries()) {
    node2.maxDepth = Math.max(matchedNodes.length - depth, node2.maxDepth || 0);
  }
  node.data = data;
  if (isStaticRoute === true) {
    ctx.staticRoutesMap[path] = node;
  }
  return node;
}
function remove(ctx, path) {
  let success = false;
  const sections = path.split("/");
  let node = ctx.rootNode;
  for (const section of sections) {
    node = node.children.get(section);
    if (!node) {
      return success;
    }
  }
  if (node.data) {
    const lastSection = sections.at(-1) || "";
    node.data = null;
    if (Object.keys(node.children).length === 0 && node.parent) {
      node.parent.children.delete(lastSection);
      node.parent.wildcardChildNode = null;
      node.parent.placeholderChildren = [];
    }
    success = true;
  }
  return success;
}
function createRadixNode(options = {}) {
  return {
    type: options.type || NODE_TYPES.NORMAL,
    maxDepth: 0,
    parent: options.parent || null,
    children: /* @__PURE__ */ new Map(),
    data: options.data || null,
    paramName: options.paramName || null,
    wildcardChildNode: null,
    placeholderChildren: []
  };
}
function getNodeType(str) {
  if (str.startsWith("**")) {
    return NODE_TYPES.WILDCARD;
  }
  if (str[0] === ":" || str === "*") {
    return NODE_TYPES.PLACEHOLDER;
  }
  return NODE_TYPES.NORMAL;
}

function toRouteMatcher(router) {
  const table = _routerNodeToTable("", router.ctx.rootNode);
  return _createMatcher(table, router.ctx.options.strictTrailingSlash);
}
function _createMatcher(table, strictTrailingSlash) {
  return {
    ctx: { table },
    matchAll: (path) => _matchRoutes(path, table, strictTrailingSlash)
  };
}
function _createRouteTable() {
  return {
    static: /* @__PURE__ */ new Map(),
    wildcard: /* @__PURE__ */ new Map(),
    dynamic: /* @__PURE__ */ new Map()
  };
}
function _matchRoutes(path, table, strictTrailingSlash) {
  if (strictTrailingSlash !== true && path.endsWith("/")) {
    path = path.slice(0, -1) || "/";
  }
  const matches = [];
  for (const [key, value] of _sortRoutesMap(table.wildcard)) {
    if (path === key || path.startsWith(key + "/")) {
      matches.push(value);
    }
  }
  for (const [key, value] of _sortRoutesMap(table.dynamic)) {
    if (path.startsWith(key + "/")) {
      const subPath = "/" + path.slice(key.length).split("/").splice(2).join("/");
      matches.push(..._matchRoutes(subPath, value));
    }
  }
  const staticMatch = table.static.get(path);
  if (staticMatch) {
    matches.push(staticMatch);
  }
  return matches.filter(Boolean);
}
function _sortRoutesMap(m) {
  return [...m.entries()].sort((a, b) => a[0].length - b[0].length);
}
function _routerNodeToTable(initialPath, initialNode) {
  const table = _createRouteTable();
  function _addNode(path, node) {
    if (path) {
      if (node.type === NODE_TYPES.NORMAL && !(path.includes("*") || path.includes(":"))) {
        if (node.data) {
          table.static.set(path, node.data);
        }
      } else if (node.type === NODE_TYPES.WILDCARD) {
        table.wildcard.set(path.replace("/**", ""), node.data);
      } else if (node.type === NODE_TYPES.PLACEHOLDER) {
        const subTable = _routerNodeToTable("", node);
        if (node.data) {
          subTable.static.set("/", node.data);
        }
        table.dynamic.set(path.replace(/\/\*|\/:\w+/, ""), subTable);
        return;
      }
    }
    for (const [childPath, child] of node.children.entries()) {
      _addNode(`${path}/${childPath}`.replace("//", "/"), child);
    }
  }
  _addNode(initialPath, initialNode);
  return table;
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== null && prototype !== Object.prototype && Object.getPrototypeOf(prototype) !== null) {
    return false;
  }
  if (Symbol.iterator in value) {
    return false;
  }
  if (Symbol.toStringTag in value) {
    return Object.prototype.toString.call(value) === "[object Module]";
  }
  return true;
}

function _defu(baseObject, defaults, namespace = ".", merger) {
  if (!isPlainObject(defaults)) {
    return _defu(baseObject, {}, namespace, merger);
  }
  const object = { ...defaults };
  for (const key of Object.keys(baseObject)) {
    if (key === "__proto__" || key === "constructor") {
      continue;
    }
    const value = baseObject[key];
    if (value === null || value === void 0) {
      continue;
    }
    if (merger && merger(object, key, value, namespace)) {
      continue;
    }
    if (Array.isArray(value) && Array.isArray(object[key])) {
      object[key] = [...value, ...object[key]];
    } else if (isPlainObject(value) && isPlainObject(object[key])) {
      object[key] = _defu(
        value,
        object[key],
        (namespace ? `${namespace}.` : "") + key.toString(),
        merger
      );
    } else {
      object[key] = value;
    }
  }
  return object;
}
function createDefu(merger) {
  return (...arguments_) => (
    // eslint-disable-next-line unicorn/no-array-reduce
    arguments_.reduce((p, c) => _defu(p, c, "", merger), {})
  );
}
const defu = createDefu();
const defuFn = createDefu((object, key, currentValue) => {
  if (object[key] !== void 0 && typeof currentValue === "function") {
    object[key] = currentValue(object[key]);
    return true;
  }
});

function o(n){throw new Error(`${n} is not implemented yet!`)}let i$1 = class i extends EventEmitter{__unenv__={};readableEncoding=null;readableEnded=true;readableFlowing=false;readableHighWaterMark=0;readableLength=0;readableObjectMode=false;readableAborted=false;readableDidRead=false;closed=false;errored=null;readable=false;destroyed=false;static from(e,t){return new i(t)}constructor(e){super();}_read(e){}read(e){}setEncoding(e){return this}pause(){return this}resume(){return this}isPaused(){return  true}unpipe(e){return this}unshift(e,t){}wrap(e){return this}push(e,t){return  false}_destroy(e,t){this.removeAllListeners();}destroy(e){return this.destroyed=true,this._destroy(e),this}pipe(e,t){return {}}compose(e,t){throw new Error("Method not implemented.")}[Symbol.asyncDispose](){return this.destroy(),Promise.resolve()}async*[Symbol.asyncIterator](){throw o("Readable.asyncIterator")}iterator(e){throw o("Readable.iterator")}map(e,t){throw o("Readable.map")}filter(e,t){throw o("Readable.filter")}forEach(e,t){throw o("Readable.forEach")}reduce(e,t,r){throw o("Readable.reduce")}find(e,t){throw o("Readable.find")}findIndex(e,t){throw o("Readable.findIndex")}some(e,t){throw o("Readable.some")}toArray(e){throw o("Readable.toArray")}every(e,t){throw o("Readable.every")}flatMap(e,t){throw o("Readable.flatMap")}drop(e,t){throw o("Readable.drop")}take(e,t){throw o("Readable.take")}asIndexedPairs(e){throw o("Readable.asIndexedPairs")}};let l$1 = class l extends EventEmitter{__unenv__={};writable=true;writableEnded=false;writableFinished=false;writableHighWaterMark=0;writableLength=0;writableObjectMode=false;writableCorked=0;closed=false;errored=null;writableNeedDrain=false;writableAborted=false;destroyed=false;_data;_encoding="utf8";constructor(e){super();}pipe(e,t){return {}}_write(e,t,r){if(this.writableEnded){r&&r();return}if(this._data===void 0)this._data=e;else {const s=typeof this._data=="string"?Buffer$1.from(this._data,this._encoding||t||"utf8"):this._data,a=typeof e=="string"?Buffer$1.from(e,t||this._encoding||"utf8"):e;this._data=Buffer$1.concat([s,a]);}this._encoding=t,r&&r();}_writev(e,t){}_destroy(e,t){}_final(e){}write(e,t,r){const s=typeof t=="string"?this._encoding:"utf8",a=typeof t=="function"?t:typeof r=="function"?r:void 0;return this._write(e,s,a),true}setDefaultEncoding(e){return this}end(e,t,r){const s=typeof e=="function"?e:typeof t=="function"?t:typeof r=="function"?r:void 0;if(this.writableEnded)return s&&s(),this;const a=e===s?void 0:e;if(a){const u=t===s?void 0:t;this.write(a,u,s);}return this.writableEnded=true,this.writableFinished=true,this.emit("close"),this.emit("finish"),this}cork(){}uncork(){}destroy(e){return this.destroyed=true,delete this._data,this.removeAllListeners(),this}compose(e,t){throw new Error("Method not implemented.")}[Symbol.asyncDispose](){return Promise.resolve()}};const c$1=class c{allowHalfOpen=true;_destroy;constructor(e=new i$1,t=new l$1){Object.assign(this,e),Object.assign(this,t),this._destroy=m(e._destroy,t._destroy);}};function _(){return Object.assign(c$1.prototype,i$1.prototype),Object.assign(c$1.prototype,l$1.prototype),c$1}function m(...n){return function(...e){for(const t of n)t(...e);}}const g=_();class A extends g{__unenv__={};bufferSize=0;bytesRead=0;bytesWritten=0;connecting=false;destroyed=false;pending=false;localAddress="";localPort=0;remoteAddress="";remoteFamily="";remotePort=0;autoSelectFamilyAttemptedAddresses=[];readyState="readOnly";constructor(e){super();}write(e,t,r){return  false}connect(e,t,r){return this}end(e,t,r){return this}setEncoding(e){return this}pause(){return this}resume(){return this}setTimeout(e,t){return this}setNoDelay(e){return this}setKeepAlive(e,t){return this}address(){return {}}unref(){return this}ref(){return this}destroySoon(){this.destroy();}resetAndDestroy(){const e=new Error("ERR_SOCKET_CLOSED");return e.code="ERR_SOCKET_CLOSED",this.destroy(e),this}}class y extends i$1{aborted=false;httpVersion="1.1";httpVersionMajor=1;httpVersionMinor=1;complete=true;connection;socket;headers={};trailers={};method="GET";url="/";statusCode=200;statusMessage="";closed=false;errored=null;readable=false;constructor(e){super(),this.socket=this.connection=e||new A;}get rawHeaders(){const e=this.headers,t=[];for(const r in e)if(Array.isArray(e[r]))for(const s of e[r])t.push(r,s);else t.push(r,e[r]);return t}get rawTrailers(){return []}setTimeout(e,t){return this}get headersDistinct(){return p(this.headers)}get trailersDistinct(){return p(this.trailers)}}function p(n){const e={};for(const[t,r]of Object.entries(n))t&&(e[t]=(Array.isArray(r)?r:[r]).filter(Boolean));return e}class w extends l$1{statusCode=200;statusMessage="";upgrading=false;chunkedEncoding=false;shouldKeepAlive=false;useChunkedEncodingByDefault=false;sendDate=false;finished=false;headersSent=false;strictContentLength=false;connection=null;socket=null;req;_headers={};constructor(e){super(),this.req=e;}assignSocket(e){e._httpMessage=this,this.socket=e,this.connection=e,this.emit("socket",e),this._flush();}_flush(){this.flushHeaders();}detachSocket(e){}writeContinue(e){}writeHead(e,t,r){e&&(this.statusCode=e),typeof t=="string"&&(this.statusMessage=t,t=void 0);const s=r||t;if(s&&!Array.isArray(s))for(const a in s)this.setHeader(a,s[a]);return this.headersSent=true,this}writeProcessing(){}setTimeout(e,t){return this}appendHeader(e,t){e=e.toLowerCase();const r=this._headers[e],s=[...Array.isArray(r)?r:[r],...Array.isArray(t)?t:[t]].filter(Boolean);return this._headers[e]=s.length>1?s:s[0],this}setHeader(e,t){return this._headers[e.toLowerCase()]=t,this}setHeaders(e){for(const[t,r]of Object.entries(e))this.setHeader(t,r);return this}getHeader(e){return this._headers[e.toLowerCase()]}getHeaders(){return this._headers}getHeaderNames(){return Object.keys(this._headers)}hasHeader(e){return e.toLowerCase()in this._headers}removeHeader(e){delete this._headers[e.toLowerCase()];}addTrailers(e){}flushHeaders(){}writeEarlyHints(e,t){typeof t=="function"&&t();}}const E=(()=>{const n=function(){};return n.prototype=Object.create(null),n})();function R(n={}){const e=new E,t=Array.isArray(n)||H(n)?n:Object.entries(n);for(const[r,s]of t)if(s){if(e[r]===void 0){e[r]=s;continue}e[r]=[...Array.isArray(e[r])?e[r]:[e[r]],...Array.isArray(s)?s:[s]];}return e}function H(n){return typeof n?.entries=="function"}function v(n={}){if(n instanceof Headers)return n;const e=new Headers;for(const[t,r]of Object.entries(n))if(r!==void 0){if(Array.isArray(r)){for(const s of r)e.append(t,String(s));continue}e.set(t,String(r));}return e}const S=new Set([101,204,205,304]);async function b(n,e){const t=new y,r=new w(t);t.url=e.url?.toString()||"/";let s;if(!t.url.startsWith("/")){const d=new URL(t.url);s=d.host,t.url=d.pathname+d.search+d.hash;}t.method=e.method||"GET",t.headers=R(e.headers||{}),t.headers.host||(t.headers.host=e.host||s||"localhost"),t.connection.encrypted=t.connection.encrypted||e.protocol==="https",t.body=e.body||null,t.__unenv__=e.context,await n(t,r);let a=r._data;(S.has(r.statusCode)||t.method.toUpperCase()==="HEAD")&&(a=null,delete r._headers["content-length"]);const u={status:r.statusCode,statusText:r.statusMessage,headers:r._headers,body:a};return t.destroy(),r.destroy(),u}async function C(n,e,t={}){try{const r=await b(n,{url:e,...t});return new Response(r.body,{status:r.status,statusText:r.statusText,headers:v(r.headers)})}catch(r){return new Response(r.toString(),{status:Number.parseInt(r.statusCode||r.code)||500,statusText:r.statusText})}}

function hasProp(obj, prop) {
  try {
    return prop in obj;
  } catch {
    return false;
  }
}

class H3Error extends Error {
  static __h3_error__ = true;
  statusCode = 500;
  fatal = false;
  unhandled = false;
  statusMessage;
  data;
  cause;
  constructor(message, opts = {}) {
    super(message, opts);
    if (opts.cause && !this.cause) {
      this.cause = opts.cause;
    }
  }
  toJSON() {
    const obj = {
      message: this.message,
      statusCode: sanitizeStatusCode(this.statusCode, 500)
    };
    if (this.statusMessage) {
      obj.statusMessage = sanitizeStatusMessage(this.statusMessage);
    }
    if (this.data !== void 0) {
      obj.data = this.data;
    }
    return obj;
  }
}
function createError$1(input) {
  if (typeof input === "string") {
    return new H3Error(input);
  }
  if (isError(input)) {
    return input;
  }
  const err = new H3Error(input.message ?? input.statusMessage ?? "", {
    cause: input.cause || input
  });
  if (hasProp(input, "stack")) {
    try {
      Object.defineProperty(err, "stack", {
        get() {
          return input.stack;
        }
      });
    } catch {
      try {
        err.stack = input.stack;
      } catch {
      }
    }
  }
  if (input.data) {
    err.data = input.data;
  }
  if (input.statusCode) {
    err.statusCode = sanitizeStatusCode(input.statusCode, err.statusCode);
  } else if (input.status) {
    err.statusCode = sanitizeStatusCode(input.status, err.statusCode);
  }
  if (input.statusMessage) {
    err.statusMessage = input.statusMessage;
  } else if (input.statusText) {
    err.statusMessage = input.statusText;
  }
  if (err.statusMessage) {
    const originalMessage = err.statusMessage;
    const sanitizedMessage = sanitizeStatusMessage(err.statusMessage);
    if (sanitizedMessage !== originalMessage) {
      console.warn(
        "[h3] Please prefer using `message` for longer error messages instead of `statusMessage`. In the future, `statusMessage` will be sanitized by default."
      );
    }
  }
  if (input.fatal !== void 0) {
    err.fatal = input.fatal;
  }
  if (input.unhandled !== void 0) {
    err.unhandled = input.unhandled;
  }
  return err;
}
function sendError(event, error, debug) {
  if (event.handled) {
    return;
  }
  const h3Error = isError(error) ? error : createError$1(error);
  const responseBody = {
    statusCode: h3Error.statusCode,
    statusMessage: h3Error.statusMessage,
    stack: [],
    data: h3Error.data
  };
  if (debug) {
    responseBody.stack = (h3Error.stack || "").split("\n").map((l) => l.trim());
  }
  if (event.handled) {
    return;
  }
  const _code = Number.parseInt(h3Error.statusCode);
  setResponseStatus(event, _code, h3Error.statusMessage);
  event.node.res.setHeader("content-type", MIMES.json);
  event.node.res.end(JSON.stringify(responseBody, void 0, 2));
}
function isError(input) {
  return input?.constructor?.__h3_error__ === true;
}

function getQuery(event) {
  return getQuery$1(event.path || "");
}
function getRouterParams(event, opts = {}) {
  let params = event.context.params || {};
  if (opts.decode) {
    params = { ...params };
    for (const key in params) {
      params[key] = decode(params[key]);
    }
  }
  return params;
}
function getRouterParam(event, name, opts = {}) {
  const params = getRouterParams(event, opts);
  return params[name];
}
function isMethod(event, expected, allowHead) {
  if (typeof expected === "string") {
    if (event.method === expected) {
      return true;
    }
  } else if (expected.includes(event.method)) {
    return true;
  }
  return false;
}
function assertMethod(event, expected, allowHead) {
  if (!isMethod(event, expected)) {
    throw createError$1({
      statusCode: 405,
      statusMessage: "HTTP method is not allowed."
    });
  }
}
function getRequestHeaders(event) {
  const _headers = {};
  for (const key in event.node.req.headers) {
    const val = event.node.req.headers[key];
    _headers[key] = Array.isArray(val) ? val.filter(Boolean).join(", ") : val;
  }
  return _headers;
}
function getRequestHeader(event, name) {
  const headers = getRequestHeaders(event);
  const value = headers[name.toLowerCase()];
  return value;
}
function getRequestHost(event, opts = {}) {
  if (opts.xForwardedHost) {
    const _header = event.node.req.headers["x-forwarded-host"];
    const xForwardedHost = (_header || "").split(",").shift()?.trim();
    if (xForwardedHost) {
      return xForwardedHost;
    }
  }
  return event.node.req.headers.host || "localhost";
}
function getRequestProtocol(event, opts = {}) {
  if (opts.xForwardedProto !== false && event.node.req.headers["x-forwarded-proto"] === "https") {
    return "https";
  }
  return event.node.req.connection?.encrypted ? "https" : "http";
}
function getRequestURL(event, opts = {}) {
  const host = getRequestHost(event, opts);
  const protocol = getRequestProtocol(event, opts);
  const path = (event.node.req.originalUrl || event.path).replace(
    /^[/\\]+/g,
    "/"
  );
  return new URL(path, `${protocol}://${host}`);
}

const RawBodySymbol = Symbol.for("h3RawBody");
const ParsedBodySymbol = Symbol.for("h3ParsedBody");
const PayloadMethods$1 = ["PATCH", "POST", "PUT", "DELETE"];
function readRawBody(event, encoding = "utf8") {
  assertMethod(event, PayloadMethods$1);
  const _rawBody = event._requestBody || event.web?.request?.body || event.node.req[RawBodySymbol] || event.node.req.rawBody || event.node.req.body;
  if (_rawBody) {
    const promise2 = Promise.resolve(_rawBody).then((_resolved) => {
      if (Buffer.isBuffer(_resolved)) {
        return _resolved;
      }
      if (typeof _resolved.pipeTo === "function") {
        return new Promise((resolve, reject) => {
          const chunks = [];
          _resolved.pipeTo(
            new WritableStream({
              write(chunk) {
                chunks.push(chunk);
              },
              close() {
                resolve(Buffer.concat(chunks));
              },
              abort(reason) {
                reject(reason);
              }
            })
          ).catch(reject);
        });
      } else if (typeof _resolved.pipe === "function") {
        return new Promise((resolve, reject) => {
          const chunks = [];
          _resolved.on("data", (chunk) => {
            chunks.push(chunk);
          }).on("end", () => {
            resolve(Buffer.concat(chunks));
          }).on("error", reject);
        });
      }
      if (_resolved.constructor === Object) {
        return Buffer.from(JSON.stringify(_resolved));
      }
      if (_resolved instanceof URLSearchParams) {
        return Buffer.from(_resolved.toString());
      }
      if (_resolved instanceof FormData) {
        return new Response(_resolved).bytes().then((uint8arr) => Buffer.from(uint8arr));
      }
      return Buffer.from(_resolved);
    });
    return encoding ? promise2.then((buff) => buff.toString(encoding)) : promise2;
  }
  if (!Number.parseInt(event.node.req.headers["content-length"] || "") && !/\bchunked\b/i.test(
    String(event.node.req.headers["transfer-encoding"] ?? "")
  )) {
    return Promise.resolve(void 0);
  }
  const promise = event.node.req[RawBodySymbol] = new Promise(
    (resolve, reject) => {
      const bodyData = [];
      event.node.req.on("error", (err) => {
        reject(err);
      }).on("data", (chunk) => {
        bodyData.push(chunk);
      }).on("end", () => {
        resolve(Buffer.concat(bodyData));
      });
    }
  );
  const result = encoding ? promise.then((buff) => buff.toString(encoding)) : promise;
  return result;
}
async function readBody(event, options = {}) {
  const request = event.node.req;
  if (hasProp(request, ParsedBodySymbol)) {
    return request[ParsedBodySymbol];
  }
  const contentType = request.headers["content-type"] || "";
  const body = await readRawBody(event);
  let parsed;
  if (contentType === "application/json") {
    parsed = _parseJSON(body, options.strict ?? true);
  } else if (contentType.startsWith("application/x-www-form-urlencoded")) {
    parsed = _parseURLEncodedBody(body);
  } else if (contentType.startsWith("text/")) {
    parsed = body;
  } else {
    parsed = _parseJSON(body, options.strict ?? false);
  }
  request[ParsedBodySymbol] = parsed;
  return parsed;
}
function getRequestWebStream(event) {
  if (!PayloadMethods$1.includes(event.method)) {
    return;
  }
  const bodyStream = event.web?.request?.body || event._requestBody;
  if (bodyStream) {
    return bodyStream;
  }
  const _hasRawBody = RawBodySymbol in event.node.req || "rawBody" in event.node.req || "body" in event.node.req || "__unenv__" in event.node.req;
  if (_hasRawBody) {
    return new ReadableStream({
      async start(controller) {
        const _rawBody = await readRawBody(event, false);
        if (_rawBody) {
          controller.enqueue(_rawBody);
        }
        controller.close();
      }
    });
  }
  return new ReadableStream({
    start: (controller) => {
      event.node.req.on("data", (chunk) => {
        controller.enqueue(chunk);
      });
      event.node.req.on("end", () => {
        controller.close();
      });
      event.node.req.on("error", (err) => {
        controller.error(err);
      });
    }
  });
}
function _parseJSON(body = "", strict) {
  if (!body) {
    return void 0;
  }
  try {
    return destr(body, { strict });
  } catch {
    throw createError$1({
      statusCode: 400,
      statusMessage: "Bad Request",
      message: "Invalid JSON body"
    });
  }
}
function _parseURLEncodedBody(body) {
  const form = new URLSearchParams(body);
  const parsedForm = /* @__PURE__ */ Object.create(null);
  for (const [key, value] of form.entries()) {
    if (hasProp(parsedForm, key)) {
      if (!Array.isArray(parsedForm[key])) {
        parsedForm[key] = [parsedForm[key]];
      }
      parsedForm[key].push(value);
    } else {
      parsedForm[key] = value;
    }
  }
  return parsedForm;
}

function handleCacheHeaders(event, opts) {
  const cacheControls = ["public", ...opts.cacheControls || []];
  let cacheMatched = false;
  if (opts.maxAge !== void 0) {
    cacheControls.push(`max-age=${+opts.maxAge}`, `s-maxage=${+opts.maxAge}`);
  }
  if (opts.modifiedTime) {
    const modifiedTime = new Date(opts.modifiedTime);
    const ifModifiedSince = event.node.req.headers["if-modified-since"];
    event.node.res.setHeader("last-modified", modifiedTime.toUTCString());
    if (ifModifiedSince && new Date(ifModifiedSince) >= modifiedTime) {
      cacheMatched = true;
    }
  }
  if (opts.etag) {
    event.node.res.setHeader("etag", opts.etag);
    const ifNonMatch = event.node.req.headers["if-none-match"];
    if (ifNonMatch === opts.etag) {
      cacheMatched = true;
    }
  }
  event.node.res.setHeader("cache-control", cacheControls.join(", "));
  if (cacheMatched) {
    event.node.res.statusCode = 304;
    if (!event.handled) {
      event.node.res.end();
    }
    return true;
  }
  return false;
}

const MIMES = {
  html: "text/html",
  json: "application/json"
};

const DISALLOWED_STATUS_CHARS = /[^\u0009\u0020-\u007E]/g;
function sanitizeStatusMessage(statusMessage = "") {
  return statusMessage.replace(DISALLOWED_STATUS_CHARS, "");
}
function sanitizeStatusCode(statusCode, defaultStatusCode = 200) {
  if (!statusCode) {
    return defaultStatusCode;
  }
  if (typeof statusCode === "string") {
    statusCode = Number.parseInt(statusCode, 10);
  }
  if (statusCode < 100 || statusCode > 999) {
    return defaultStatusCode;
  }
  return statusCode;
}
function splitCookiesString(cookiesString) {
  if (Array.isArray(cookiesString)) {
    return cookiesString.flatMap((c) => splitCookiesString(c));
  }
  if (typeof cookiesString !== "string") {
    return [];
  }
  const cookiesStrings = [];
  let pos = 0;
  let start;
  let ch;
  let lastComma;
  let nextStart;
  let cookiesSeparatorFound;
  const skipWhitespace = () => {
    while (pos < cookiesString.length && /\s/.test(cookiesString.charAt(pos))) {
      pos += 1;
    }
    return pos < cookiesString.length;
  };
  const notSpecialChar = () => {
    ch = cookiesString.charAt(pos);
    return ch !== "=" && ch !== ";" && ch !== ",";
  };
  while (pos < cookiesString.length) {
    start = pos;
    cookiesSeparatorFound = false;
    while (skipWhitespace()) {
      ch = cookiesString.charAt(pos);
      if (ch === ",") {
        lastComma = pos;
        pos += 1;
        skipWhitespace();
        nextStart = pos;
        while (pos < cookiesString.length && notSpecialChar()) {
          pos += 1;
        }
        if (pos < cookiesString.length && cookiesString.charAt(pos) === "=") {
          cookiesSeparatorFound = true;
          pos = nextStart;
          cookiesStrings.push(cookiesString.slice(start, lastComma));
          start = pos;
        } else {
          pos = lastComma + 1;
        }
      } else {
        pos += 1;
      }
    }
    if (!cookiesSeparatorFound || pos >= cookiesString.length) {
      cookiesStrings.push(cookiesString.slice(start));
    }
  }
  return cookiesStrings;
}

const defer = typeof setImmediate === "undefined" ? (fn) => fn() : setImmediate;
function send(event, data, type) {
  if (type) {
    defaultContentType(event, type);
  }
  return new Promise((resolve) => {
    defer(() => {
      if (!event.handled) {
        event.node.res.end(data);
      }
      resolve();
    });
  });
}
function sendNoContent(event, code) {
  if (event.handled) {
    return;
  }
  if (!code && event.node.res.statusCode !== 200) {
    code = event.node.res.statusCode;
  }
  const _code = sanitizeStatusCode(code, 204);
  if (_code === 204) {
    event.node.res.removeHeader("content-length");
  }
  event.node.res.writeHead(_code);
  event.node.res.end();
}
function setResponseStatus(event, code, text) {
  if (code) {
    event.node.res.statusCode = sanitizeStatusCode(
      code,
      event.node.res.statusCode
    );
  }
  if (text) {
    event.node.res.statusMessage = sanitizeStatusMessage(text);
  }
}
function getResponseStatus(event) {
  return event.node.res.statusCode;
}
function getResponseStatusText(event) {
  return event.node.res.statusMessage;
}
function defaultContentType(event, type) {
  if (type && event.node.res.statusCode !== 304 && !event.node.res.getHeader("content-type")) {
    event.node.res.setHeader("content-type", type);
  }
}
function sendRedirect(event, location, code = 302) {
  event.node.res.statusCode = sanitizeStatusCode(
    code,
    event.node.res.statusCode
  );
  event.node.res.setHeader("location", location);
  const encodedLoc = location.replace(/"/g, "%22");
  const html = `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=${encodedLoc}"></head></html>`;
  return send(event, html, MIMES.html);
}
function getResponseHeader(event, name) {
  return event.node.res.getHeader(name);
}
function setResponseHeaders(event, headers) {
  for (const [name, value] of Object.entries(headers)) {
    event.node.res.setHeader(
      name,
      value
    );
  }
}
const setHeaders = setResponseHeaders;
function setResponseHeader(event, name, value) {
  event.node.res.setHeader(name, value);
}
const setHeader = setResponseHeader;
function appendResponseHeader(event, name, value) {
  let current = event.node.res.getHeader(name);
  if (!current) {
    event.node.res.setHeader(name, value);
    return;
  }
  if (!Array.isArray(current)) {
    current = [current.toString()];
  }
  event.node.res.setHeader(name, [...current, value]);
}
function removeResponseHeader(event, name) {
  return event.node.res.removeHeader(name);
}
function isStream(data) {
  if (!data || typeof data !== "object") {
    return false;
  }
  if (typeof data.pipe === "function") {
    if (typeof data._read === "function") {
      return true;
    }
    if (typeof data.abort === "function") {
      return true;
    }
  }
  if (typeof data.pipeTo === "function") {
    return true;
  }
  return false;
}
function isWebResponse(data) {
  return typeof Response !== "undefined" && data instanceof Response;
}
function sendStream(event, stream) {
  if (!stream || typeof stream !== "object") {
    throw new Error("[h3] Invalid stream provided.");
  }
  event.node.res._data = stream;
  if (!event.node.res.socket) {
    event._handled = true;
    return Promise.resolve();
  }
  if (hasProp(stream, "pipeTo") && typeof stream.pipeTo === "function") {
    return stream.pipeTo(
      new WritableStream({
        write(chunk) {
          event.node.res.write(chunk);
        }
      })
    ).then(() => {
      event.node.res.end();
    });
  }
  if (hasProp(stream, "pipe") && typeof stream.pipe === "function") {
    return new Promise((resolve, reject) => {
      stream.pipe(event.node.res);
      if (stream.on) {
        stream.on("end", () => {
          event.node.res.end();
          resolve();
        });
        stream.on("error", (error) => {
          reject(error);
        });
      }
      event.node.res.on("close", () => {
        if (stream.abort) {
          stream.abort();
        }
      });
    });
  }
  throw new Error("[h3] Invalid or incompatible stream provided.");
}
function sendWebResponse(event, response) {
  for (const [key, value] of response.headers) {
    if (key === "set-cookie") {
      event.node.res.appendHeader(key, splitCookiesString(value));
    } else {
      event.node.res.setHeader(key, value);
    }
  }
  if (response.status) {
    event.node.res.statusCode = sanitizeStatusCode(
      response.status,
      event.node.res.statusCode
    );
  }
  if (response.statusText) {
    event.node.res.statusMessage = sanitizeStatusMessage(response.statusText);
  }
  if (response.redirected) {
    event.node.res.setHeader("location", response.url);
  }
  if (!response.body) {
    event.node.res.end();
    return;
  }
  return sendStream(event, response.body);
}

const PayloadMethods = /* @__PURE__ */ new Set(["PATCH", "POST", "PUT", "DELETE"]);
const ignoredHeaders = /* @__PURE__ */ new Set([
  "transfer-encoding",
  "accept-encoding",
  "connection",
  "keep-alive",
  "upgrade",
  "expect",
  "host",
  "accept"
]);
async function proxyRequest(event, target, opts = {}) {
  let body;
  let duplex;
  if (PayloadMethods.has(event.method)) {
    if (opts.streamRequest) {
      body = getRequestWebStream(event);
      duplex = "half";
    } else {
      body = await readRawBody(event, false).catch(() => void 0);
    }
  }
  const method = opts.fetchOptions?.method || event.method;
  const fetchHeaders = mergeHeaders$1(
    getProxyRequestHeaders(event, { host: target.startsWith("/") }),
    opts.fetchOptions?.headers,
    opts.headers
  );
  return sendProxy(event, target, {
    ...opts,
    fetchOptions: {
      method,
      body,
      duplex,
      ...opts.fetchOptions,
      headers: fetchHeaders
    }
  });
}
async function sendProxy(event, target, opts = {}) {
  let response;
  try {
    response = await _getFetch(opts.fetch)(target, {
      headers: opts.headers,
      ignoreResponseError: true,
      // make $ofetch.raw transparent
      ...opts.fetchOptions
    });
  } catch (error) {
    throw createError$1({
      status: 502,
      statusMessage: "Bad Gateway",
      cause: error
    });
  }
  event.node.res.statusCode = sanitizeStatusCode(
    response.status,
    event.node.res.statusCode
  );
  event.node.res.statusMessage = sanitizeStatusMessage(response.statusText);
  const cookies = [];
  for (const [key, value] of response.headers.entries()) {
    if (key === "content-encoding") {
      continue;
    }
    if (key === "content-length") {
      continue;
    }
    if (key === "set-cookie") {
      cookies.push(...splitCookiesString(value));
      continue;
    }
    event.node.res.setHeader(key, value);
  }
  if (cookies.length > 0) {
    event.node.res.setHeader(
      "set-cookie",
      cookies.map((cookie) => {
        if (opts.cookieDomainRewrite) {
          cookie = rewriteCookieProperty(
            cookie,
            opts.cookieDomainRewrite,
            "domain"
          );
        }
        if (opts.cookiePathRewrite) {
          cookie = rewriteCookieProperty(
            cookie,
            opts.cookiePathRewrite,
            "path"
          );
        }
        return cookie;
      })
    );
  }
  if (opts.onResponse) {
    await opts.onResponse(event, response);
  }
  if (response._data !== void 0) {
    return response._data;
  }
  if (event.handled) {
    return;
  }
  if (opts.sendStream === false) {
    const data = new Uint8Array(await response.arrayBuffer());
    return event.node.res.end(data);
  }
  if (response.body) {
    for await (const chunk of response.body) {
      event.node.res.write(chunk);
    }
  }
  return event.node.res.end();
}
function getProxyRequestHeaders(event, opts) {
  const headers = /* @__PURE__ */ Object.create(null);
  const reqHeaders = getRequestHeaders(event);
  for (const name in reqHeaders) {
    if (!ignoredHeaders.has(name) || name === "host" && opts?.host) {
      headers[name] = reqHeaders[name];
    }
  }
  return headers;
}
function fetchWithEvent(event, req, init, options) {
  return _getFetch(options?.fetch)(req, {
    ...init,
    context: init?.context || event.context,
    headers: {
      ...getProxyRequestHeaders(event, {
        host: typeof req === "string" && req.startsWith("/")
      }),
      ...init?.headers
    }
  });
}
function _getFetch(_fetch) {
  if (_fetch) {
    return _fetch;
  }
  if (globalThis.fetch) {
    return globalThis.fetch;
  }
  throw new Error(
    "fetch is not available. Try importing `node-fetch-native/polyfill` for Node.js."
  );
}
function rewriteCookieProperty(header, map, property) {
  const _map = typeof map === "string" ? { "*": map } : map;
  return header.replace(
    new RegExp(`(;\\s*${property}=)([^;]+)`, "gi"),
    (match, prefix, previousValue) => {
      let newValue;
      if (previousValue in _map) {
        newValue = _map[previousValue];
      } else if ("*" in _map) {
        newValue = _map["*"];
      } else {
        return match;
      }
      return newValue ? prefix + newValue : "";
    }
  );
}
function mergeHeaders$1(defaults, ...inputs) {
  const _inputs = inputs.filter(Boolean);
  if (_inputs.length === 0) {
    return defaults;
  }
  const merged = new Headers(defaults);
  for (const input of _inputs) {
    const entries = Array.isArray(input) ? input : typeof input.entries === "function" ? input.entries() : Object.entries(input);
    for (const [key, value] of entries) {
      if (value !== void 0) {
        merged.set(key, value);
      }
    }
  }
  return merged;
}

class H3Event {
  "__is_event__" = true;
  // Context
  node;
  // Node
  web;
  // Web
  context = {};
  // Shared
  // Request
  _method;
  _path;
  _headers;
  _requestBody;
  // Response
  _handled = false;
  // Hooks
  _onBeforeResponseCalled;
  _onAfterResponseCalled;
  constructor(req, res) {
    this.node = { req, res };
  }
  // --- Request ---
  get method() {
    if (!this._method) {
      this._method = (this.node.req.method || "GET").toUpperCase();
    }
    return this._method;
  }
  get path() {
    return this._path || this.node.req.url || "/";
  }
  get headers() {
    if (!this._headers) {
      this._headers = _normalizeNodeHeaders(this.node.req.headers);
    }
    return this._headers;
  }
  // --- Respoonse ---
  get handled() {
    return this._handled || this.node.res.writableEnded || this.node.res.headersSent;
  }
  respondWith(response) {
    return Promise.resolve(response).then(
      (_response) => sendWebResponse(this, _response)
    );
  }
  // --- Utils ---
  toString() {
    return `[${this.method}] ${this.path}`;
  }
  toJSON() {
    return this.toString();
  }
  // --- Deprecated ---
  /** @deprecated Please use `event.node.req` instead. */
  get req() {
    return this.node.req;
  }
  /** @deprecated Please use `event.node.res` instead. */
  get res() {
    return this.node.res;
  }
}
function isEvent(input) {
  return hasProp(input, "__is_event__");
}
function createEvent(req, res) {
  return new H3Event(req, res);
}
function _normalizeNodeHeaders(nodeHeaders) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(nodeHeaders)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(name, item);
      }
    } else if (value) {
      headers.set(name, value);
    }
  }
  return headers;
}

function defineEventHandler(handler) {
  if (typeof handler === "function") {
    handler.__is_handler__ = true;
    return handler;
  }
  const _hooks = {
    onRequest: _normalizeArray(handler.onRequest),
    onBeforeResponse: _normalizeArray(handler.onBeforeResponse)
  };
  const _handler = (event) => {
    return _callHandler(event, handler.handler, _hooks);
  };
  _handler.__is_handler__ = true;
  _handler.__resolve__ = handler.handler.__resolve__;
  _handler.__websocket__ = handler.websocket;
  return _handler;
}
function _normalizeArray(input) {
  return input ? Array.isArray(input) ? input : [input] : void 0;
}
async function _callHandler(event, handler, hooks) {
  if (hooks.onRequest) {
    for (const hook of hooks.onRequest) {
      await hook(event);
      if (event.handled) {
        return;
      }
    }
  }
  const body = await handler(event);
  const response = { body };
  if (hooks.onBeforeResponse) {
    for (const hook of hooks.onBeforeResponse) {
      await hook(event, response);
    }
  }
  return response.body;
}
const eventHandler = defineEventHandler;
function isEventHandler(input) {
  return hasProp(input, "__is_handler__");
}
function toEventHandler(input, _, _route) {
  return input;
}
function defineLazyEventHandler(factory) {
  let _promise;
  let _resolved;
  const resolveHandler = () => {
    if (_resolved) {
      return Promise.resolve(_resolved);
    }
    if (!_promise) {
      _promise = Promise.resolve(factory()).then((r) => {
        const handler2 = r.default || r;
        if (typeof handler2 !== "function") {
          throw new TypeError(
            "Invalid lazy handler result. It should be a function:",
            handler2
          );
        }
        _resolved = { handler: toEventHandler(r.default || r) };
        return _resolved;
      });
    }
    return _promise;
  };
  const handler = eventHandler((event) => {
    if (_resolved) {
      return _resolved.handler(event);
    }
    return resolveHandler().then((r) => r.handler(event));
  });
  handler.__resolve__ = resolveHandler;
  return handler;
}
const lazyEventHandler = defineLazyEventHandler;

function createApp(options = {}) {
  const stack = [];
  const handler = createAppEventHandler(stack, options);
  const resolve = createResolver(stack);
  handler.__resolve__ = resolve;
  const getWebsocket = cachedFn(() => websocketOptions(resolve, options));
  const app = {
    // @ts-expect-error
    use: (arg1, arg2, arg3) => use(app, arg1, arg2, arg3),
    resolve,
    handler,
    stack,
    options,
    get websocket() {
      return getWebsocket();
    }
  };
  return app;
}
function use(app, arg1, arg2, arg3) {
  if (Array.isArray(arg1)) {
    for (const i of arg1) {
      use(app, i, arg2, arg3);
    }
  } else if (Array.isArray(arg2)) {
    for (const i of arg2) {
      use(app, arg1, i, arg3);
    }
  } else if (typeof arg1 === "string") {
    app.stack.push(
      normalizeLayer({ ...arg3, route: arg1, handler: arg2 })
    );
  } else if (typeof arg1 === "function") {
    app.stack.push(normalizeLayer({ ...arg2, handler: arg1 }));
  } else {
    app.stack.push(normalizeLayer({ ...arg1 }));
  }
  return app;
}
function createAppEventHandler(stack, options) {
  const spacing = options.debug ? 2 : void 0;
  return eventHandler(async (event) => {
    event.node.req.originalUrl = event.node.req.originalUrl || event.node.req.url || "/";
    const _rawReqUrl = event.node.req.url || "/";
    const _reqPath = _decodePath(event._path || _rawReqUrl);
    event._path = _reqPath;
    const _needsRawUrl = _reqPath !== _rawReqUrl;
    let _layerPath;
    if (options.onRequest) {
      await options.onRequest(event);
    }
    for (const layer of stack) {
      if (layer.route.length > 1) {
        if (!_reqPath.startsWith(layer.route)) {
          continue;
        }
        _layerPath = _reqPath.slice(layer.route.length) || "/";
      } else {
        _layerPath = _reqPath;
      }
      if (layer.match && !layer.match(_layerPath, event)) {
        continue;
      }
      event._path = _layerPath;
      event.node.req.url = _needsRawUrl ? layer.route.length > 1 ? _rawReqUrl.slice(layer.route.length) || "/" : _rawReqUrl : _layerPath;
      const val = await layer.handler(event);
      const _body = val === void 0 ? void 0 : await val;
      if (_body !== void 0) {
        const _response = { body: _body };
        if (options.onBeforeResponse) {
          event._onBeforeResponseCalled = true;
          await options.onBeforeResponse(event, _response);
        }
        await handleHandlerResponse(event, _response.body, spacing);
        if (options.onAfterResponse) {
          event._onAfterResponseCalled = true;
          await options.onAfterResponse(event, _response);
        }
        return;
      }
      if (event.handled) {
        if (options.onAfterResponse) {
          event._onAfterResponseCalled = true;
          await options.onAfterResponse(event, void 0);
        }
        return;
      }
    }
    if (!event.handled) {
      throw createError$1({
        statusCode: 404,
        statusMessage: `Cannot find any path matching ${event.path || "/"}.`
      });
    }
    if (options.onAfterResponse) {
      event._onAfterResponseCalled = true;
      await options.onAfterResponse(event, void 0);
    }
  });
}
function createResolver(stack) {
  return async (path) => {
    let _layerPath;
    for (const layer of stack) {
      if (layer.route === "/" && !layer.handler.__resolve__) {
        continue;
      }
      if (!path.startsWith(layer.route)) {
        continue;
      }
      _layerPath = path.slice(layer.route.length) || "/";
      if (layer.match && !layer.match(_layerPath, void 0)) {
        continue;
      }
      let res = { route: layer.route, handler: layer.handler };
      if (res.handler.__resolve__) {
        const _res = await res.handler.__resolve__(_layerPath);
        if (!_res) {
          continue;
        }
        res = {
          ...res,
          ..._res,
          route: joinURL(res.route || "/", _res.route || "/")
        };
      }
      return res;
    }
  };
}
function normalizeLayer(input) {
  let handler = input.handler;
  if (handler.handler) {
    handler = handler.handler;
  }
  if (input.lazy) {
    handler = lazyEventHandler(handler);
  } else if (!isEventHandler(handler)) {
    handler = toEventHandler(handler, void 0, input.route);
  }
  return {
    route: withoutTrailingSlash(input.route),
    match: input.match,
    handler
  };
}
function handleHandlerResponse(event, val, jsonSpace) {
  if (val === null) {
    return sendNoContent(event);
  }
  if (val) {
    if (isWebResponse(val)) {
      return sendWebResponse(event, val);
    }
    if (isStream(val)) {
      return sendStream(event, val);
    }
    if (val.buffer) {
      return send(event, val);
    }
    if (val.arrayBuffer && typeof val.arrayBuffer === "function") {
      return val.arrayBuffer().then((arrayBuffer) => {
        return send(event, Buffer.from(arrayBuffer), val.type);
      });
    }
    if (val instanceof Error) {
      throw createError$1(val);
    }
    if (typeof val.end === "function") {
      return true;
    }
  }
  const valType = typeof val;
  if (valType === "string") {
    return send(event, val, MIMES.html);
  }
  if (valType === "object" || valType === "boolean" || valType === "number") {
    return send(event, JSON.stringify(val, void 0, jsonSpace), MIMES.json);
  }
  if (valType === "bigint") {
    return send(event, val.toString(), MIMES.json);
  }
  throw createError$1({
    statusCode: 500,
    statusMessage: `[h3] Cannot send ${valType} as response.`
  });
}
function cachedFn(fn) {
  let cache;
  return () => {
    if (!cache) {
      cache = fn();
    }
    return cache;
  };
}
function _decodePath(url) {
  const qIndex = url.indexOf("?");
  const path = qIndex === -1 ? url : url.slice(0, qIndex);
  const query = qIndex === -1 ? "" : url.slice(qIndex);
  const decodedPath = path.includes("%25") ? decodePath(path.replace(/%25/g, "%2525")) : decodePath(path);
  return decodedPath + query;
}
function websocketOptions(evResolver, appOptions) {
  return {
    ...appOptions.websocket,
    async resolve(info) {
      const url = info.request?.url || info.url || "/";
      const { pathname } = typeof url === "string" ? parseURL(url) : url;
      const resolved = await evResolver(pathname);
      return resolved?.handler?.__websocket__ || {};
    }
  };
}

const RouterMethods = [
  "connect",
  "delete",
  "get",
  "head",
  "options",
  "post",
  "put",
  "trace",
  "patch"
];
function createRouter(opts = {}) {
  const _router = createRouter$1({});
  const routes = {};
  let _matcher;
  const router = {};
  const addRoute = (path, handler, method) => {
    let route = routes[path];
    if (!route) {
      routes[path] = route = { path, handlers: {} };
      _router.insert(path, route);
    }
    if (Array.isArray(method)) {
      for (const m of method) {
        addRoute(path, handler, m);
      }
    } else {
      route.handlers[method] = toEventHandler(handler);
    }
    return router;
  };
  router.use = router.add = (path, handler, method) => addRoute(path, handler, method || "all");
  for (const method of RouterMethods) {
    router[method] = (path, handle) => router.add(path, handle, method);
  }
  const matchHandler = (path = "/", method = "get") => {
    const qIndex = path.indexOf("?");
    if (qIndex !== -1) {
      path = path.slice(0, Math.max(0, qIndex));
    }
    const matched = _router.lookup(path);
    if (!matched || !matched.handlers) {
      return {
        error: createError$1({
          statusCode: 404,
          name: "Not Found",
          statusMessage: `Cannot find any route matching ${path || "/"}.`
        })
      };
    }
    let handler = matched.handlers[method] || matched.handlers.all;
    if (!handler) {
      if (!_matcher) {
        _matcher = toRouteMatcher(_router);
      }
      const _matches = _matcher.matchAll(path).reverse();
      for (const _match of _matches) {
        if (_match.handlers[method]) {
          handler = _match.handlers[method];
          matched.handlers[method] = matched.handlers[method] || handler;
          break;
        }
        if (_match.handlers.all) {
          handler = _match.handlers.all;
          matched.handlers.all = matched.handlers.all || handler;
          break;
        }
      }
    }
    if (!handler) {
      return {
        error: createError$1({
          statusCode: 405,
          name: "Method Not Allowed",
          statusMessage: `Method ${method} is not allowed on this route.`
        })
      };
    }
    return { matched, handler };
  };
  const isPreemptive = opts.preemptive || opts.preemtive;
  router.handler = eventHandler((event) => {
    const match = matchHandler(
      event.path,
      event.method.toLowerCase()
    );
    if ("error" in match) {
      if (isPreemptive) {
        throw match.error;
      } else {
        return;
      }
    }
    event.context.matchedRoute = match.matched;
    const params = match.matched.params || {};
    event.context.params = params;
    return Promise.resolve(match.handler(event)).then((res) => {
      if (res === void 0 && isPreemptive) {
        return null;
      }
      return res;
    });
  });
  router.handler.__resolve__ = async (path) => {
    path = withLeadingSlash(path);
    const match = matchHandler(path);
    if ("error" in match) {
      return;
    }
    let res = {
      route: match.matched.path,
      handler: match.handler
    };
    if (match.handler.__resolve__) {
      const _res = await match.handler.__resolve__(path);
      if (!_res) {
        return;
      }
      res = { ...res, ..._res };
    }
    return res;
  };
  return router;
}
function toNodeListener(app) {
  const toNodeHandle = async function(req, res) {
    const event = createEvent(req, res);
    try {
      await app.handler(event);
    } catch (_error) {
      const error = createError$1(_error);
      if (!isError(_error)) {
        error.unhandled = true;
      }
      setResponseStatus(event, error.statusCode, error.statusMessage);
      if (app.options.onError) {
        await app.options.onError(error, event);
      }
      if (event.handled) {
        return;
      }
      if (error.unhandled || error.fatal) {
        console.error("[h3]", error.fatal ? "[fatal]" : "[unhandled]", error);
      }
      if (app.options.onBeforeResponse && !event._onBeforeResponseCalled) {
        await app.options.onBeforeResponse(event, { body: error });
      }
      await sendError(event, error, !!app.options.debug);
      if (app.options.onAfterResponse && !event._onAfterResponseCalled) {
        await app.options.onAfterResponse(event, { body: error });
      }
    }
  };
  return toNodeHandle;
}

function flatHooks(configHooks, hooks = {}, parentName) {
  for (const key in configHooks) {
    const subHook = configHooks[key];
    const name = parentName ? `${parentName}:${key}` : key;
    if (typeof subHook === "object" && subHook !== null) {
      flatHooks(subHook, hooks, name);
    } else if (typeof subHook === "function") {
      hooks[name] = subHook;
    }
  }
  return hooks;
}
const defaultTask = { run: (function_) => function_() };
const _createTask = () => defaultTask;
const createTask = typeof console.createTask !== "undefined" ? console.createTask : _createTask;
function serialTaskCaller(hooks, args) {
  const name = args.shift();
  const task = createTask(name);
  return hooks.reduce(
    (promise, hookFunction) => promise.then(() => task.run(() => hookFunction(...args))),
    Promise.resolve()
  );
}
function parallelTaskCaller(hooks, args) {
  const name = args.shift();
  const task = createTask(name);
  return Promise.all(hooks.map((hook) => task.run(() => hook(...args))));
}
function callEachWith(callbacks, arg0) {
  for (const callback of [...callbacks]) {
    callback(arg0);
  }
}

class Hookable {
  constructor() {
    this._hooks = {};
    this._before = void 0;
    this._after = void 0;
    this._deprecatedMessages = void 0;
    this._deprecatedHooks = {};
    this.hook = this.hook.bind(this);
    this.callHook = this.callHook.bind(this);
    this.callHookWith = this.callHookWith.bind(this);
  }
  hook(name, function_, options = {}) {
    if (!name || typeof function_ !== "function") {
      return () => {
      };
    }
    const originalName = name;
    let dep;
    while (this._deprecatedHooks[name]) {
      dep = this._deprecatedHooks[name];
      name = dep.to;
    }
    if (dep && !options.allowDeprecated) {
      let message = dep.message;
      if (!message) {
        message = `${originalName} hook has been deprecated` + (dep.to ? `, please use ${dep.to}` : "");
      }
      if (!this._deprecatedMessages) {
        this._deprecatedMessages = /* @__PURE__ */ new Set();
      }
      if (!this._deprecatedMessages.has(message)) {
        console.warn(message);
        this._deprecatedMessages.add(message);
      }
    }
    if (!function_.name) {
      try {
        Object.defineProperty(function_, "name", {
          get: () => "_" + name.replace(/\W+/g, "_") + "_hook_cb",
          configurable: true
        });
      } catch {
      }
    }
    this._hooks[name] = this._hooks[name] || [];
    this._hooks[name].push(function_);
    return () => {
      if (function_) {
        this.removeHook(name, function_);
        function_ = void 0;
      }
    };
  }
  hookOnce(name, function_) {
    let _unreg;
    let _function = (...arguments_) => {
      if (typeof _unreg === "function") {
        _unreg();
      }
      _unreg = void 0;
      _function = void 0;
      return function_(...arguments_);
    };
    _unreg = this.hook(name, _function);
    return _unreg;
  }
  removeHook(name, function_) {
    if (this._hooks[name]) {
      const index = this._hooks[name].indexOf(function_);
      if (index !== -1) {
        this._hooks[name].splice(index, 1);
      }
      if (this._hooks[name].length === 0) {
        delete this._hooks[name];
      }
    }
  }
  deprecateHook(name, deprecated) {
    this._deprecatedHooks[name] = typeof deprecated === "string" ? { to: deprecated } : deprecated;
    const _hooks = this._hooks[name] || [];
    delete this._hooks[name];
    for (const hook of _hooks) {
      this.hook(name, hook);
    }
  }
  deprecateHooks(deprecatedHooks) {
    Object.assign(this._deprecatedHooks, deprecatedHooks);
    for (const name in deprecatedHooks) {
      this.deprecateHook(name, deprecatedHooks[name]);
    }
  }
  addHooks(configHooks) {
    const hooks = flatHooks(configHooks);
    const removeFns = Object.keys(hooks).map(
      (key) => this.hook(key, hooks[key])
    );
    return () => {
      for (const unreg of removeFns.splice(0, removeFns.length)) {
        unreg();
      }
    };
  }
  removeHooks(configHooks) {
    const hooks = flatHooks(configHooks);
    for (const key in hooks) {
      this.removeHook(key, hooks[key]);
    }
  }
  removeAllHooks() {
    for (const key in this._hooks) {
      delete this._hooks[key];
    }
  }
  callHook(name, ...arguments_) {
    arguments_.unshift(name);
    return this.callHookWith(serialTaskCaller, name, ...arguments_);
  }
  callHookParallel(name, ...arguments_) {
    arguments_.unshift(name);
    return this.callHookWith(parallelTaskCaller, name, ...arguments_);
  }
  callHookWith(caller, name, ...arguments_) {
    const event = this._before || this._after ? { name, args: arguments_, context: {} } : void 0;
    if (this._before) {
      callEachWith(this._before, event);
    }
    const result = caller(
      name in this._hooks ? [...this._hooks[name]] : [],
      arguments_
    );
    if (result instanceof Promise) {
      return result.finally(() => {
        if (this._after && event) {
          callEachWith(this._after, event);
        }
      });
    }
    if (this._after && event) {
      callEachWith(this._after, event);
    }
    return result;
  }
  beforeEach(function_) {
    this._before = this._before || [];
    this._before.push(function_);
    return () => {
      if (this._before !== void 0) {
        const index = this._before.indexOf(function_);
        if (index !== -1) {
          this._before.splice(index, 1);
        }
      }
    };
  }
  afterEach(function_) {
    this._after = this._after || [];
    this._after.push(function_);
    return () => {
      if (this._after !== void 0) {
        const index = this._after.indexOf(function_);
        if (index !== -1) {
          this._after.splice(index, 1);
        }
      }
    };
  }
}
function createHooks() {
  return new Hookable();
}

const s$1=globalThis.Headers,i=globalThis.AbortController,l=globalThis.fetch||(()=>{throw new Error("[node-fetch-native] Failed to fetch: `globalThis.fetch` is not available!")});

class FetchError extends Error {
  constructor(message, opts) {
    super(message, opts);
    this.name = "FetchError";
    if (opts?.cause && !this.cause) {
      this.cause = opts.cause;
    }
  }
}
function createFetchError(ctx) {
  const errorMessage = ctx.error?.message || ctx.error?.toString() || "";
  const method = ctx.request?.method || ctx.options?.method || "GET";
  const url = ctx.request?.url || String(ctx.request) || "/";
  const requestStr = `[${method}] ${JSON.stringify(url)}`;
  const statusStr = ctx.response ? `${ctx.response.status} ${ctx.response.statusText}` : "<no response>";
  const message = `${requestStr}: ${statusStr}${errorMessage ? ` ${errorMessage}` : ""}`;
  const fetchError = new FetchError(
    message,
    ctx.error ? { cause: ctx.error } : void 0
  );
  for (const key of ["request", "options", "response"]) {
    Object.defineProperty(fetchError, key, {
      get() {
        return ctx[key];
      }
    });
  }
  for (const [key, refKey] of [
    ["data", "_data"],
    ["status", "status"],
    ["statusCode", "status"],
    ["statusText", "statusText"],
    ["statusMessage", "statusText"]
  ]) {
    Object.defineProperty(fetchError, key, {
      get() {
        return ctx.response && ctx.response[refKey];
      }
    });
  }
  return fetchError;
}

const payloadMethods = new Set(
  Object.freeze(["PATCH", "POST", "PUT", "DELETE"])
);
function isPayloadMethod(method = "GET") {
  return payloadMethods.has(method.toUpperCase());
}
function isJSONSerializable(value) {
  if (value === void 0) {
    return false;
  }
  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean" || t === null) {
    return true;
  }
  if (t !== "object") {
    return false;
  }
  if (Array.isArray(value)) {
    return true;
  }
  if (value.buffer) {
    return false;
  }
  if (value instanceof FormData || value instanceof URLSearchParams) {
    return false;
  }
  return value.constructor && value.constructor.name === "Object" || typeof value.toJSON === "function";
}
const textTypes = /* @__PURE__ */ new Set([
  "image/svg",
  "application/xml",
  "application/xhtml",
  "application/html"
]);
const JSON_RE = /^application\/(?:[\w!#$%&*.^`~-]*\+)?json(;.+)?$/i;
function detectResponseType(_contentType = "") {
  if (!_contentType) {
    return "json";
  }
  const contentType = _contentType.split(";").shift() || "";
  if (JSON_RE.test(contentType)) {
    return "json";
  }
  if (contentType === "text/event-stream") {
    return "stream";
  }
  if (textTypes.has(contentType) || contentType.startsWith("text/")) {
    return "text";
  }
  return "blob";
}
function resolveFetchOptions(request, input, defaults, Headers) {
  const headers = mergeHeaders(
    input?.headers ?? request?.headers,
    defaults?.headers,
    Headers
  );
  let query;
  if (defaults?.query || defaults?.params || input?.params || input?.query) {
    query = {
      ...defaults?.params,
      ...defaults?.query,
      ...input?.params,
      ...input?.query
    };
  }
  return {
    ...defaults,
    ...input,
    query,
    params: query,
    headers
  };
}
function mergeHeaders(input, defaults, Headers) {
  if (!defaults) {
    return new Headers(input);
  }
  const headers = new Headers(defaults);
  if (input) {
    for (const [key, value] of Symbol.iterator in input || Array.isArray(input) ? input : new Headers(input)) {
      headers.set(key, value);
    }
  }
  return headers;
}
async function callHooks(context, hooks) {
  if (hooks) {
    if (Array.isArray(hooks)) {
      for (const hook of hooks) {
        await hook(context);
      }
    } else {
      await hooks(context);
    }
  }
}

const retryStatusCodes = /* @__PURE__ */ new Set([
  408,
  // Request Timeout
  409,
  // Conflict
  425,
  // Too Early (Experimental)
  429,
  // Too Many Requests
  500,
  // Internal Server Error
  502,
  // Bad Gateway
  503,
  // Service Unavailable
  504
  // Gateway Timeout
]);
const nullBodyResponses = /* @__PURE__ */ new Set([101, 204, 205, 304]);
function createFetch(globalOptions = {}) {
  const {
    fetch = globalThis.fetch,
    Headers = globalThis.Headers,
    AbortController = globalThis.AbortController
  } = globalOptions;
  async function onError(context) {
    const isAbort = context.error && context.error.name === "AbortError" && !context.options.timeout || false;
    if (context.options.retry !== false && !isAbort) {
      let retries;
      if (typeof context.options.retry === "number") {
        retries = context.options.retry;
      } else {
        retries = isPayloadMethod(context.options.method) ? 0 : 1;
      }
      const responseCode = context.response && context.response.status || 500;
      if (retries > 0 && (Array.isArray(context.options.retryStatusCodes) ? context.options.retryStatusCodes.includes(responseCode) : retryStatusCodes.has(responseCode))) {
        const retryDelay = typeof context.options.retryDelay === "function" ? context.options.retryDelay(context) : context.options.retryDelay || 0;
        if (retryDelay > 0) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
        return $fetchRaw(context.request, {
          ...context.options,
          retry: retries - 1
        });
      }
    }
    const error = createFetchError(context);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(error, $fetchRaw);
    }
    throw error;
  }
  const $fetchRaw = async function $fetchRaw2(_request, _options = {}) {
    const context = {
      request: _request,
      options: resolveFetchOptions(
        _request,
        _options,
        globalOptions.defaults,
        Headers
      ),
      response: void 0,
      error: void 0
    };
    if (context.options.method) {
      context.options.method = context.options.method.toUpperCase();
    }
    if (context.options.onRequest) {
      await callHooks(context, context.options.onRequest);
      if (!(context.options.headers instanceof Headers)) {
        context.options.headers = new Headers(
          context.options.headers || {}
          /* compat */
        );
      }
    }
    if (typeof context.request === "string") {
      if (context.options.baseURL) {
        context.request = withBase(context.request, context.options.baseURL);
      }
      if (context.options.query) {
        context.request = withQuery(context.request, context.options.query);
        delete context.options.query;
      }
      if ("query" in context.options) {
        delete context.options.query;
      }
      if ("params" in context.options) {
        delete context.options.params;
      }
    }
    if (context.options.body && isPayloadMethod(context.options.method)) {
      if (isJSONSerializable(context.options.body)) {
        const contentType = context.options.headers.get("content-type");
        if (typeof context.options.body !== "string") {
          context.options.body = contentType === "application/x-www-form-urlencoded" ? new URLSearchParams(
            context.options.body
          ).toString() : JSON.stringify(context.options.body);
        }
        if (!contentType) {
          context.options.headers.set("content-type", "application/json");
        }
        if (!context.options.headers.has("accept")) {
          context.options.headers.set("accept", "application/json");
        }
      } else if (
        // ReadableStream Body
        "pipeTo" in context.options.body && typeof context.options.body.pipeTo === "function" || // Node.js Stream Body
        typeof context.options.body.pipe === "function"
      ) {
        if (!("duplex" in context.options)) {
          context.options.duplex = "half";
        }
      }
    }
    let abortTimeout;
    if (!context.options.signal && context.options.timeout) {
      const controller = new AbortController();
      abortTimeout = setTimeout(() => {
        const error = new Error(
          "[TimeoutError]: The operation was aborted due to timeout"
        );
        error.name = "TimeoutError";
        error.code = 23;
        controller.abort(error);
      }, context.options.timeout);
      context.options.signal = controller.signal;
    }
    try {
      context.response = await fetch(
        context.request,
        context.options
      );
    } catch (error) {
      context.error = error;
      if (context.options.onRequestError) {
        await callHooks(
          context,
          context.options.onRequestError
        );
      }
      return await onError(context);
    } finally {
      if (abortTimeout) {
        clearTimeout(abortTimeout);
      }
    }
    const hasBody = (context.response.body || // https://github.com/unjs/ofetch/issues/324
    // https://github.com/unjs/ofetch/issues/294
    // https://github.com/JakeChampion/fetch/issues/1454
    context.response._bodyInit) && !nullBodyResponses.has(context.response.status) && context.options.method !== "HEAD";
    if (hasBody) {
      const responseType = (context.options.parseResponse ? "json" : context.options.responseType) || detectResponseType(context.response.headers.get("content-type") || "");
      switch (responseType) {
        case "json": {
          const data = await context.response.text();
          const parseFunction = context.options.parseResponse || destr;
          context.response._data = parseFunction(data);
          break;
        }
        case "stream": {
          context.response._data = context.response.body || context.response._bodyInit;
          break;
        }
        default: {
          context.response._data = await context.response[responseType]();
        }
      }
    }
    if (context.options.onResponse) {
      await callHooks(
        context,
        context.options.onResponse
      );
    }
    if (!context.options.ignoreResponseError && context.response.status >= 400 && context.response.status < 600) {
      if (context.options.onResponseError) {
        await callHooks(
          context,
          context.options.onResponseError
        );
      }
      return await onError(context);
    }
    return context.response;
  };
  const $fetch = async function $fetch2(request, options) {
    const r = await $fetchRaw(request, options);
    return r._data;
  };
  $fetch.raw = $fetchRaw;
  $fetch.native = (...args) => fetch(...args);
  $fetch.create = (defaultOptions = {}, customGlobalOptions = {}) => createFetch({
    ...globalOptions,
    ...customGlobalOptions,
    defaults: {
      ...globalOptions.defaults,
      ...customGlobalOptions.defaults,
      ...defaultOptions
    }
  });
  return $fetch;
}

function createNodeFetch() {
  const useKeepAlive = JSON.parse(process.env.FETCH_KEEP_ALIVE || "false");
  if (!useKeepAlive) {
    return l;
  }
  const agentOptions = { keepAlive: true };
  const httpAgent = new http.Agent(agentOptions);
  const httpsAgent = new https.Agent(agentOptions);
  const nodeFetchOptions = {
    agent(parsedURL) {
      return parsedURL.protocol === "http:" ? httpAgent : httpsAgent;
    }
  };
  return function nodeFetchWithKeepAlive(input, init) {
    return l(input, { ...nodeFetchOptions, ...init });
  };
}
const fetch = globalThis.fetch ? (...args) => globalThis.fetch(...args) : createNodeFetch();
const Headers$1 = globalThis.Headers || s$1;
const AbortController = globalThis.AbortController || i;
const ofetch = createFetch({ fetch, Headers: Headers$1, AbortController });
const $fetch$1 = ofetch;

function wrapToPromise(value) {
  if (!value || typeof value.then !== "function") {
    return Promise.resolve(value);
  }
  return value;
}
function asyncCall(function_, ...arguments_) {
  try {
    return wrapToPromise(function_(...arguments_));
  } catch (error) {
    return Promise.reject(error);
  }
}
function isPrimitive(value) {
  const type = typeof value;
  return value === null || type !== "object" && type !== "function";
}
function isPureObject(value) {
  const proto = Object.getPrototypeOf(value);
  return !proto || proto.isPrototypeOf(Object);
}
function stringify(value) {
  if (isPrimitive(value)) {
    return String(value);
  }
  if (isPureObject(value) || Array.isArray(value)) {
    return JSON.stringify(value);
  }
  if (typeof value.toJSON === "function") {
    return stringify(value.toJSON());
  }
  throw new Error("[unstorage] Cannot stringify value!");
}
const BASE64_PREFIX = "base64:";
function serializeRaw(value) {
  if (typeof value === "string") {
    return value;
  }
  return BASE64_PREFIX + base64Encode(value);
}
function deserializeRaw(value) {
  if (typeof value !== "string") {
    return value;
  }
  if (!value.startsWith(BASE64_PREFIX)) {
    return value;
  }
  return base64Decode(value.slice(BASE64_PREFIX.length));
}
function base64Decode(input) {
  if (globalThis.Buffer) {
    return Buffer.from(input, "base64");
  }
  return Uint8Array.from(
    globalThis.atob(input),
    (c) => c.codePointAt(0)
  );
}
function base64Encode(input) {
  if (globalThis.Buffer) {
    return Buffer.from(input).toString("base64");
  }
  return globalThis.btoa(String.fromCodePoint(...input));
}

const storageKeyProperties = [
  "has",
  "hasItem",
  "get",
  "getItem",
  "getItemRaw",
  "set",
  "setItem",
  "setItemRaw",
  "del",
  "remove",
  "removeItem",
  "getMeta",
  "setMeta",
  "removeMeta",
  "getKeys",
  "clear",
  "mount",
  "unmount"
];
function prefixStorage(storage, base) {
  base = normalizeBaseKey(base);
  if (!base) {
    return storage;
  }
  const nsStorage = { ...storage };
  for (const property of storageKeyProperties) {
    nsStorage[property] = (key = "", ...args) => (
      // @ts-ignore
      storage[property](base + key, ...args)
    );
  }
  nsStorage.getKeys = (key = "", ...arguments_) => storage.getKeys(base + key, ...arguments_).then((keys) => keys.map((key2) => key2.slice(base.length)));
  nsStorage.keys = nsStorage.getKeys;
  nsStorage.getItems = async (items, commonOptions) => {
    const prefixedItems = items.map(
      (item) => typeof item === "string" ? base + item : { ...item, key: base + item.key }
    );
    const results = await storage.getItems(prefixedItems, commonOptions);
    return results.map((entry) => ({
      key: entry.key.slice(base.length),
      value: entry.value
    }));
  };
  nsStorage.setItems = async (items, commonOptions) => {
    const prefixedItems = items.map((item) => ({
      key: base + item.key,
      value: item.value,
      options: item.options
    }));
    return storage.setItems(prefixedItems, commonOptions);
  };
  return nsStorage;
}
function normalizeKey$1(key) {
  if (!key) {
    return "";
  }
  return key.split("?")[0]?.replace(/[/\\]/g, ":").replace(/:+/g, ":").replace(/^:|:$/g, "") || "";
}
function joinKeys(...keys) {
  return normalizeKey$1(keys.join(":"));
}
function normalizeBaseKey(base) {
  base = normalizeKey$1(base);
  return base ? base + ":" : "";
}
function filterKeyByDepth(key, depth) {
  if (depth === void 0) {
    return true;
  }
  let substrCount = 0;
  let index = key.indexOf(":");
  while (index > -1) {
    substrCount++;
    index = key.indexOf(":", index + 1);
  }
  return substrCount <= depth;
}
function filterKeyByBase(key, base) {
  if (base) {
    return key.startsWith(base) && key[key.length - 1] !== "$";
  }
  return key[key.length - 1] !== "$";
}

function defineDriver$1(factory) {
  return factory;
}

const DRIVER_NAME$1 = "memory";
const memory = defineDriver$1(() => {
  const data = /* @__PURE__ */ new Map();
  return {
    name: DRIVER_NAME$1,
    getInstance: () => data,
    hasItem(key) {
      return data.has(key);
    },
    getItem(key) {
      return data.get(key) ?? null;
    },
    getItemRaw(key) {
      return data.get(key) ?? null;
    },
    setItem(key, value) {
      data.set(key, value);
    },
    setItemRaw(key, value) {
      data.set(key, value);
    },
    removeItem(key) {
      data.delete(key);
    },
    getKeys() {
      return [...data.keys()];
    },
    clear() {
      data.clear();
    },
    dispose() {
      data.clear();
    }
  };
});

function createStorage(options = {}) {
  const context = {
    mounts: { "": options.driver || memory() },
    mountpoints: [""],
    watching: false,
    watchListeners: [],
    unwatch: {}
  };
  const getMount = (key) => {
    for (const base of context.mountpoints) {
      if (key.startsWith(base)) {
        return {
          base,
          relativeKey: key.slice(base.length),
          driver: context.mounts[base]
        };
      }
    }
    return {
      base: "",
      relativeKey: key,
      driver: context.mounts[""]
    };
  };
  const getMounts = (base, includeParent) => {
    return context.mountpoints.filter(
      (mountpoint) => mountpoint.startsWith(base) || includeParent && base.startsWith(mountpoint)
    ).map((mountpoint) => ({
      relativeBase: base.length > mountpoint.length ? base.slice(mountpoint.length) : void 0,
      mountpoint,
      driver: context.mounts[mountpoint]
    }));
  };
  const onChange = (event, key) => {
    if (!context.watching) {
      return;
    }
    key = normalizeKey$1(key);
    for (const listener of context.watchListeners) {
      listener(event, key);
    }
  };
  const startWatch = async () => {
    if (context.watching) {
      return;
    }
    context.watching = true;
    for (const mountpoint in context.mounts) {
      context.unwatch[mountpoint] = await watch(
        context.mounts[mountpoint],
        onChange,
        mountpoint
      );
    }
  };
  const stopWatch = async () => {
    if (!context.watching) {
      return;
    }
    for (const mountpoint in context.unwatch) {
      await context.unwatch[mountpoint]();
    }
    context.unwatch = {};
    context.watching = false;
  };
  const runBatch = (items, commonOptions, cb) => {
    const batches = /* @__PURE__ */ new Map();
    const getBatch = (mount) => {
      let batch = batches.get(mount.base);
      if (!batch) {
        batch = {
          driver: mount.driver,
          base: mount.base,
          items: []
        };
        batches.set(mount.base, batch);
      }
      return batch;
    };
    for (const item of items) {
      const isStringItem = typeof item === "string";
      const key = normalizeKey$1(isStringItem ? item : item.key);
      const value = isStringItem ? void 0 : item.value;
      const options2 = isStringItem || !item.options ? commonOptions : { ...commonOptions, ...item.options };
      const mount = getMount(key);
      getBatch(mount).items.push({
        key,
        value,
        relativeKey: mount.relativeKey,
        options: options2
      });
    }
    return Promise.all([...batches.values()].map((batch) => cb(batch))).then(
      (r) => r.flat()
    );
  };
  const storage = {
    // Item
    hasItem(key, opts = {}) {
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      return asyncCall(driver.hasItem, relativeKey, opts);
    },
    getItem(key, opts = {}) {
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      return asyncCall(driver.getItem, relativeKey, opts).then(
        (value) => destr(value)
      );
    },
    getItems(items, commonOptions = {}) {
      return runBatch(items, commonOptions, (batch) => {
        if (batch.driver.getItems) {
          return asyncCall(
            batch.driver.getItems,
            batch.items.map((item) => ({
              key: item.relativeKey,
              options: item.options
            })),
            commonOptions
          ).then(
            (r) => r.map((item) => ({
              key: joinKeys(batch.base, item.key),
              value: destr(item.value)
            }))
          );
        }
        return Promise.all(
          batch.items.map((item) => {
            return asyncCall(
              batch.driver.getItem,
              item.relativeKey,
              item.options
            ).then((value) => ({
              key: item.key,
              value: destr(value)
            }));
          })
        );
      });
    },
    getItemRaw(key, opts = {}) {
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      if (driver.getItemRaw) {
        return asyncCall(driver.getItemRaw, relativeKey, opts);
      }
      return asyncCall(driver.getItem, relativeKey, opts).then(
        (value) => deserializeRaw(value)
      );
    },
    async setItem(key, value, opts = {}) {
      if (value === void 0) {
        return storage.removeItem(key);
      }
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      if (!driver.setItem) {
        return;
      }
      await asyncCall(driver.setItem, relativeKey, stringify(value), opts);
      if (!driver.watch) {
        onChange("update", key);
      }
    },
    async setItems(items, commonOptions) {
      await runBatch(items, commonOptions, async (batch) => {
        if (batch.driver.setItems) {
          return asyncCall(
            batch.driver.setItems,
            batch.items.map((item) => ({
              key: item.relativeKey,
              value: stringify(item.value),
              options: item.options
            })),
            commonOptions
          );
        }
        if (!batch.driver.setItem) {
          return;
        }
        await Promise.all(
          batch.items.map((item) => {
            return asyncCall(
              batch.driver.setItem,
              item.relativeKey,
              stringify(item.value),
              item.options
            );
          })
        );
      });
    },
    async setItemRaw(key, value, opts = {}) {
      if (value === void 0) {
        return storage.removeItem(key, opts);
      }
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      if (driver.setItemRaw) {
        await asyncCall(driver.setItemRaw, relativeKey, value, opts);
      } else if (driver.setItem) {
        await asyncCall(driver.setItem, relativeKey, serializeRaw(value), opts);
      } else {
        return;
      }
      if (!driver.watch) {
        onChange("update", key);
      }
    },
    async removeItem(key, opts = {}) {
      if (typeof opts === "boolean") {
        opts = { removeMeta: opts };
      }
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      if (!driver.removeItem) {
        return;
      }
      await asyncCall(driver.removeItem, relativeKey, opts);
      if (opts.removeMeta || opts.removeMata) {
        await asyncCall(driver.removeItem, relativeKey + "$", opts);
      }
      if (!driver.watch) {
        onChange("remove", key);
      }
    },
    // Meta
    async getMeta(key, opts = {}) {
      if (typeof opts === "boolean") {
        opts = { nativeOnly: opts };
      }
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      const meta = /* @__PURE__ */ Object.create(null);
      if (driver.getMeta) {
        Object.assign(meta, await asyncCall(driver.getMeta, relativeKey, opts));
      }
      if (!opts.nativeOnly) {
        const value = await asyncCall(
          driver.getItem,
          relativeKey + "$",
          opts
        ).then((value_) => destr(value_));
        if (value && typeof value === "object") {
          if (typeof value.atime === "string") {
            value.atime = new Date(value.atime);
          }
          if (typeof value.mtime === "string") {
            value.mtime = new Date(value.mtime);
          }
          Object.assign(meta, value);
        }
      }
      return meta;
    },
    setMeta(key, value, opts = {}) {
      return this.setItem(key + "$", value, opts);
    },
    removeMeta(key, opts = {}) {
      return this.removeItem(key + "$", opts);
    },
    // Keys
    async getKeys(base, opts = {}) {
      base = normalizeBaseKey(base);
      const mounts = getMounts(base, true);
      let maskedMounts = [];
      const allKeys = [];
      let allMountsSupportMaxDepth = true;
      for (const mount of mounts) {
        if (!mount.driver.flags?.maxDepth) {
          allMountsSupportMaxDepth = false;
        }
        const rawKeys = await asyncCall(
          mount.driver.getKeys,
          mount.relativeBase,
          opts
        );
        for (const key of rawKeys) {
          const fullKey = mount.mountpoint + normalizeKey$1(key);
          if (!maskedMounts.some((p) => fullKey.startsWith(p))) {
            allKeys.push(fullKey);
          }
        }
        maskedMounts = [
          mount.mountpoint,
          ...maskedMounts.filter((p) => !p.startsWith(mount.mountpoint))
        ];
      }
      const shouldFilterByDepth = opts.maxDepth !== void 0 && !allMountsSupportMaxDepth;
      return allKeys.filter(
        (key) => (!shouldFilterByDepth || filterKeyByDepth(key, opts.maxDepth)) && filterKeyByBase(key, base)
      );
    },
    // Utils
    async clear(base, opts = {}) {
      base = normalizeBaseKey(base);
      await Promise.all(
        getMounts(base, false).map(async (m) => {
          if (m.driver.clear) {
            return asyncCall(m.driver.clear, m.relativeBase, opts);
          }
          if (m.driver.removeItem) {
            const keys = await m.driver.getKeys(m.relativeBase || "", opts);
            return Promise.all(
              keys.map((key) => m.driver.removeItem(key, opts))
            );
          }
        })
      );
    },
    async dispose() {
      await Promise.all(
        Object.values(context.mounts).map((driver) => dispose(driver))
      );
    },
    async watch(callback) {
      await startWatch();
      context.watchListeners.push(callback);
      return async () => {
        context.watchListeners = context.watchListeners.filter(
          (listener) => listener !== callback
        );
        if (context.watchListeners.length === 0) {
          await stopWatch();
        }
      };
    },
    async unwatch() {
      context.watchListeners = [];
      await stopWatch();
    },
    // Mount
    mount(base, driver) {
      base = normalizeBaseKey(base);
      if (base && context.mounts[base]) {
        throw new Error(`already mounted at ${base}`);
      }
      if (base) {
        context.mountpoints.push(base);
        context.mountpoints.sort((a, b) => b.length - a.length);
      }
      context.mounts[base] = driver;
      if (context.watching) {
        Promise.resolve(watch(driver, onChange, base)).then((unwatcher) => {
          context.unwatch[base] = unwatcher;
        }).catch(console.error);
      }
      return storage;
    },
    async unmount(base, _dispose = true) {
      base = normalizeBaseKey(base);
      if (!base || !context.mounts[base]) {
        return;
      }
      if (context.watching && base in context.unwatch) {
        context.unwatch[base]?.();
        delete context.unwatch[base];
      }
      if (_dispose) {
        await dispose(context.mounts[base]);
      }
      context.mountpoints = context.mountpoints.filter((key) => key !== base);
      delete context.mounts[base];
    },
    getMount(key = "") {
      key = normalizeKey$1(key) + ":";
      const m = getMount(key);
      return {
        driver: m.driver,
        base: m.base
      };
    },
    getMounts(base = "", opts = {}) {
      base = normalizeKey$1(base);
      const mounts = getMounts(base, opts.parents);
      return mounts.map((m) => ({
        driver: m.driver,
        base: m.mountpoint
      }));
    },
    // Aliases
    keys: (base, opts = {}) => storage.getKeys(base, opts),
    get: (key, opts = {}) => storage.getItem(key, opts),
    set: (key, value, opts = {}) => storage.setItem(key, value, opts),
    has: (key, opts = {}) => storage.hasItem(key, opts),
    del: (key, opts = {}) => storage.removeItem(key, opts),
    remove: (key, opts = {}) => storage.removeItem(key, opts)
  };
  return storage;
}
function watch(driver, onChange, base) {
  return driver.watch ? driver.watch((event, key) => onChange(event, base + key)) : () => {
  };
}
async function dispose(driver) {
  if (typeof driver.dispose === "function") {
    await asyncCall(driver.dispose);
  }
}

const _assets = {

};

const normalizeKey = function normalizeKey(key) {
  if (!key) {
    return "";
  }
  return key.split("?")[0]?.replace(/[/\\]/g, ":").replace(/:+/g, ":").replace(/^:|:$/g, "") || "";
};

const assets$1 = {
  getKeys() {
    return Promise.resolve(Object.keys(_assets))
  },
  hasItem (id) {
    id = normalizeKey(id);
    return Promise.resolve(id in _assets)
  },
  getItem (id) {
    id = normalizeKey(id);
    return Promise.resolve(_assets[id] ? _assets[id].import() : null)
  },
  getMeta (id) {
    id = normalizeKey(id);
    return Promise.resolve(_assets[id] ? _assets[id].meta : {})
  }
};

function defineDriver(factory) {
  return factory;
}
function createError(driver, message, opts) {
  const err = new Error(`[unstorage] [${driver}] ${message}`, opts);
  if (Error.captureStackTrace) {
    Error.captureStackTrace(err, createError);
  }
  return err;
}
function createRequiredError(driver, name) {
  if (Array.isArray(name)) {
    return createError(
      driver,
      `Missing some of the required options ${name.map((n) => "`" + n + "`").join(", ")}`
    );
  }
  return createError(driver, `Missing required option \`${name}\`.`);
}

function ignoreNotfound(err) {
  return err.code === "ENOENT" || err.code === "EISDIR" ? null : err;
}
function ignoreExists(err) {
  return err.code === "EEXIST" ? null : err;
}
async function writeFile(path, data, encoding) {
  await ensuredir(dirname$1(path));
  return promises.writeFile(path, data, encoding);
}
function readFile(path, encoding) {
  return promises.readFile(path, encoding).catch(ignoreNotfound);
}
function unlink(path) {
  return promises.unlink(path).catch(ignoreNotfound);
}
function readdir(dir) {
  return promises.readdir(dir, { withFileTypes: true }).catch(ignoreNotfound).then((r) => r || []);
}
async function ensuredir(dir) {
  if (existsSync(dir)) {
    return;
  }
  await ensuredir(dirname$1(dir)).catch(ignoreExists);
  await promises.mkdir(dir).catch(ignoreExists);
}
async function readdirRecursive(dir, ignore, maxDepth) {
  if (ignore && ignore(dir)) {
    return [];
  }
  const entries = await readdir(dir);
  const files = [];
  await Promise.all(
    entries.map(async (entry) => {
      const entryPath = resolve$1(dir, entry.name);
      if (entry.isDirectory()) {
        if (maxDepth === void 0 || maxDepth > 0) {
          const dirFiles = await readdirRecursive(
            entryPath,
            ignore,
            maxDepth === void 0 ? void 0 : maxDepth - 1
          );
          files.push(...dirFiles.map((f) => entry.name + "/" + f));
        }
      } else {
        if (!(ignore && ignore(entry.name))) {
          files.push(entry.name);
        }
      }
    })
  );
  return files;
}
async function rmRecursive(dir) {
  const entries = await readdir(dir);
  await Promise.all(
    entries.map((entry) => {
      const entryPath = resolve$1(dir, entry.name);
      if (entry.isDirectory()) {
        return rmRecursive(entryPath).then(() => promises.rmdir(entryPath));
      } else {
        return promises.unlink(entryPath);
      }
    })
  );
}

const PATH_TRAVERSE_RE = /\.\.:|\.\.$/;
const DRIVER_NAME = "fs-lite";
const unstorage_47drivers_47fs_45lite = defineDriver((opts = {}) => {
  if (!opts.base) {
    throw createRequiredError(DRIVER_NAME, "base");
  }
  opts.base = resolve$1(opts.base);
  const r = (key) => {
    if (PATH_TRAVERSE_RE.test(key)) {
      throw createError(
        DRIVER_NAME,
        `Invalid key: ${JSON.stringify(key)}. It should not contain .. segments`
      );
    }
    const resolved = join(opts.base, key.replace(/:/g, "/"));
    return resolved;
  };
  return {
    name: DRIVER_NAME,
    options: opts,
    flags: {
      maxDepth: true
    },
    hasItem(key) {
      return existsSync(r(key));
    },
    getItem(key) {
      return readFile(r(key), "utf8");
    },
    getItemRaw(key) {
      return readFile(r(key));
    },
    async getMeta(key) {
      const { atime, mtime, size, birthtime, ctime } = await promises.stat(r(key)).catch(() => ({}));
      return { atime, mtime, size, birthtime, ctime };
    },
    setItem(key, value) {
      if (opts.readOnly) {
        return;
      }
      return writeFile(r(key), value, "utf8");
    },
    setItemRaw(key, value) {
      if (opts.readOnly) {
        return;
      }
      return writeFile(r(key), value);
    },
    removeItem(key) {
      if (opts.readOnly) {
        return;
      }
      return unlink(r(key));
    },
    getKeys(_base, topts) {
      return readdirRecursive(r("."), opts.ignore, topts?.maxDepth);
    },
    async clear() {
      if (opts.readOnly || opts.noClear) {
        return;
      }
      await rmRecursive(r("."));
    }
  };
});

const storage = createStorage({});

storage.mount('/assets', assets$1);

storage.mount('data', unstorage_47drivers_47fs_45lite({"driver":"fsLite","base":"./.data/kv"}));

function useStorage(base = "") {
  return base ? prefixStorage(storage, base) : storage;
}

function serialize$1(o){return typeof o=="string"?`'${o}'`:new c().serialize(o)}const c=/*@__PURE__*/function(){class o{#t=new Map;compare(t,r){const e=typeof t,n=typeof r;return e==="string"&&n==="string"?t.localeCompare(r):e==="number"&&n==="number"?t-r:String.prototype.localeCompare.call(this.serialize(t,true),this.serialize(r,true))}serialize(t,r){if(t===null)return "null";switch(typeof t){case "string":return r?t:`'${t}'`;case "bigint":return `${t}n`;case "object":return this.$object(t);case "function":return this.$function(t)}return String(t)}serializeObject(t){const r=Object.prototype.toString.call(t);if(r!=="[object Object]")return this.serializeBuiltInType(r.length<10?`unknown:${r}`:r.slice(8,-1),t);const e=t.constructor,n=e===Object||e===void 0?"":e.name;if(n!==""&&globalThis[n]===e)return this.serializeBuiltInType(n,t);if(typeof t.toJSON=="function"){const i=t.toJSON();return n+(i!==null&&typeof i=="object"?this.$object(i):`(${this.serialize(i)})`)}return this.serializeObjectEntries(n,Object.entries(t))}serializeBuiltInType(t,r){const e=this["$"+t];if(e)return e.call(this,r);if(typeof r?.entries=="function")return this.serializeObjectEntries(t,r.entries());throw new Error(`Cannot serialize ${t}`)}serializeObjectEntries(t,r){const e=Array.from(r).sort((i,a)=>this.compare(i[0],a[0]));let n=`${t}{`;for(let i=0;i<e.length;i++){const[a,l]=e[i];n+=`${this.serialize(a,true)}:${this.serialize(l)}`,i<e.length-1&&(n+=",");}return n+"}"}$object(t){let r=this.#t.get(t);return r===void 0&&(this.#t.set(t,`#${this.#t.size}`),r=this.serializeObject(t),this.#t.set(t,r)),r}$function(t){const r=Function.prototype.toString.call(t);return r.slice(-15)==="[native code] }"?`${t.name||""}()[native]`:`${t.name}(${t.length})${r.replace(/\s*\n\s*/g,"")}`}$Array(t){let r="[";for(let e=0;e<t.length;e++)r+=this.serialize(t[e]),e<t.length-1&&(r+=",");return r+"]"}$Date(t){try{return `Date(${t.toISOString()})`}catch{return "Date(null)"}}$ArrayBuffer(t){return `ArrayBuffer[${new Uint8Array(t).join(",")}]`}$Set(t){return `Set${this.$Array(Array.from(t).sort((r,e)=>this.compare(r,e)))}`}$Map(t){return this.serializeObjectEntries("Map",t.entries())}}for(const s of ["Error","RegExp","URL"])o.prototype["$"+s]=function(t){return `${s}(${t})`};for(const s of ["Int8Array","Uint8Array","Uint8ClampedArray","Int16Array","Uint16Array","Int32Array","Uint32Array","Float32Array","Float64Array"])o.prototype["$"+s]=function(t){return `${s}[${t.join(",")}]`};for(const s of ["BigInt64Array","BigUint64Array"])o.prototype["$"+s]=function(t){return `${s}[${t.join("n,")}${t.length>0?"n":""}]`};return o}();

function isEqual(object1, object2) {
  if (object1 === object2) {
    return true;
  }
  if (serialize$1(object1) === serialize$1(object2)) {
    return true;
  }
  return false;
}

const e=globalThis.process?.getBuiltinModule?.("crypto")?.hash,r="sha256",s="base64url";function digest(t){if(e)return e(r,t,s);const o=createHash(r).update(t);return globalThis.process?.versions?.webcontainer?o.digest().toString(s):o.digest(s)}

function hash$1(input) {
  return digest(serialize$1(input));
}

const Hasher = /* @__PURE__ */ (() => {
  class Hasher2 {
    buff = "";
    #context = /* @__PURE__ */ new Map();
    write(str) {
      this.buff += str;
    }
    dispatch(value) {
      const type = value === null ? "null" : typeof value;
      return this[type](value);
    }
    object(object) {
      if (object && typeof object.toJSON === "function") {
        return this.object(object.toJSON());
      }
      const objString = Object.prototype.toString.call(object);
      let objType = "";
      const objectLength = objString.length;
      objType = objectLength < 10 ? "unknown:[" + objString + "]" : objString.slice(8, objectLength - 1);
      objType = objType.toLowerCase();
      let objectNumber = null;
      if ((objectNumber = this.#context.get(object)) === void 0) {
        this.#context.set(object, this.#context.size);
      } else {
        return this.dispatch("[CIRCULAR:" + objectNumber + "]");
      }
      if (typeof Buffer !== "undefined" && Buffer.isBuffer && Buffer.isBuffer(object)) {
        this.write("buffer:");
        return this.write(object.toString("utf8"));
      }
      if (objType !== "object" && objType !== "function" && objType !== "asyncfunction") {
        if (this[objType]) {
          this[objType](object);
        } else {
          this.unknown(object, objType);
        }
      } else {
        const keys = Object.keys(object).sort();
        const extraKeys = [];
        this.write("object:" + (keys.length + extraKeys.length) + ":");
        const dispatchForKey = (key) => {
          this.dispatch(key);
          this.write(":");
          this.dispatch(object[key]);
          this.write(",");
        };
        for (const key of keys) {
          dispatchForKey(key);
        }
        for (const key of extraKeys) {
          dispatchForKey(key);
        }
      }
    }
    array(arr, unordered) {
      unordered = unordered === void 0 ? false : unordered;
      this.write("array:" + arr.length + ":");
      if (!unordered || arr.length <= 1) {
        for (const entry of arr) {
          this.dispatch(entry);
        }
        return;
      }
      const contextAdditions = /* @__PURE__ */ new Map();
      const entries = arr.map((entry) => {
        const hasher = new Hasher2();
        hasher.dispatch(entry);
        for (const [key, value] of hasher.#context) {
          contextAdditions.set(key, value);
        }
        return hasher.toString();
      });
      this.#context = contextAdditions;
      entries.sort();
      return this.array(entries, false);
    }
    date(date) {
      return this.write("date:" + date.toJSON());
    }
    symbol(sym) {
      return this.write("symbol:" + sym.toString());
    }
    unknown(value, type) {
      this.write(type);
      if (!value) {
        return;
      }
      this.write(":");
      if (value && typeof value.entries === "function") {
        return this.array(
          [...value.entries()],
          true
          /* ordered */
        );
      }
    }
    error(err) {
      return this.write("error:" + err.toString());
    }
    boolean(bool) {
      return this.write("bool:" + bool);
    }
    string(string) {
      this.write("string:" + string.length + ":");
      this.write(string);
    }
    function(fn) {
      this.write("fn:");
      if (isNativeFunction(fn)) {
        this.dispatch("[native]");
      } else {
        this.dispatch(fn.toString());
      }
    }
    number(number) {
      return this.write("number:" + number);
    }
    null() {
      return this.write("Null");
    }
    undefined() {
      return this.write("Undefined");
    }
    regexp(regex) {
      return this.write("regex:" + regex.toString());
    }
    arraybuffer(arr) {
      this.write("arraybuffer:");
      return this.dispatch(new Uint8Array(arr));
    }
    url(url) {
      return this.write("url:" + url.toString());
    }
    map(map) {
      this.write("map:");
      const arr = [...map];
      return this.array(arr, false);
    }
    set(set) {
      this.write("set:");
      const arr = [...set];
      return this.array(arr, false);
    }
    bigint(number) {
      return this.write("bigint:" + number.toString());
    }
  }
  for (const type of [
    "uint8array",
    "uint8clampedarray",
    "unt8array",
    "uint16array",
    "unt16array",
    "uint32array",
    "unt32array",
    "float32array",
    "float64array"
  ]) {
    Hasher2.prototype[type] = function(arr) {
      this.write(type + ":");
      return this.array([...arr], false);
    };
  }
  function isNativeFunction(f) {
    if (typeof f !== "function") {
      return false;
    }
    return Function.prototype.toString.call(f).slice(
      -15
      /* "[native code] }".length */
    ) === "[native code] }";
  }
  return Hasher2;
})();
function serialize(object) {
  const hasher = new Hasher();
  hasher.dispatch(object);
  return hasher.buff;
}
function hash(value) {
  return digest(typeof value === "string" ? value : serialize(value)).replace(/[-_]/g, "").slice(0, 10);
}

function defaultCacheOptions() {
  return {
    name: "_",
    base: "/cache",
    swr: true,
    maxAge: 1
  };
}
function defineCachedFunction(fn, opts = {}) {
  opts = { ...defaultCacheOptions(), ...opts };
  const pending = {};
  const group = opts.group || "nitro/functions";
  const name = opts.name || fn.name || "_";
  const integrity = opts.integrity || hash([fn, opts]);
  const validate = opts.validate || ((entry) => entry.value !== void 0);
  async function get(key, resolver, shouldInvalidateCache, event) {
    const cacheKey = [opts.base, group, name, key + ".json"].filter(Boolean).join(":").replace(/:\/$/, ":index");
    let entry = await useStorage().getItem(cacheKey).catch((error) => {
      console.error(`[cache] Cache read error.`, error);
      useNitroApp().captureError(error, { event, tags: ["cache"] });
    }) || {};
    if (typeof entry !== "object") {
      entry = {};
      const error = new Error("Malformed data read from cache.");
      console.error("[cache]", error);
      useNitroApp().captureError(error, { event, tags: ["cache"] });
    }
    const ttl = (opts.maxAge ?? 0) * 1e3;
    if (ttl) {
      entry.expires = Date.now() + ttl;
    }
    const expired = shouldInvalidateCache || entry.integrity !== integrity || ttl && Date.now() - (entry.mtime || 0) > ttl || validate(entry) === false;
    const _resolve = async () => {
      const isPending = pending[key];
      if (!isPending) {
        if (entry.value !== void 0 && (opts.staleMaxAge || 0) >= 0 && opts.swr === false) {
          entry.value = void 0;
          entry.integrity = void 0;
          entry.mtime = void 0;
          entry.expires = void 0;
        }
        pending[key] = Promise.resolve(resolver());
      }
      try {
        entry.value = await pending[key];
      } catch (error) {
        if (!isPending) {
          delete pending[key];
        }
        throw error;
      }
      if (!isPending) {
        entry.mtime = Date.now();
        entry.integrity = integrity;
        delete pending[key];
        if (validate(entry) !== false) {
          let setOpts;
          if (opts.maxAge && !opts.swr) {
            setOpts = { ttl: opts.maxAge };
          }
          const promise = useStorage().setItem(cacheKey, entry, setOpts).catch((error) => {
            console.error(`[cache] Cache write error.`, error);
            useNitroApp().captureError(error, { event, tags: ["cache"] });
          });
          if (event?.waitUntil) {
            event.waitUntil(promise);
          }
        }
      }
    };
    const _resolvePromise = expired ? _resolve() : Promise.resolve();
    if (entry.value === void 0) {
      await _resolvePromise;
    } else if (expired && event && event.waitUntil) {
      event.waitUntil(_resolvePromise);
    }
    if (opts.swr && validate(entry) !== false) {
      _resolvePromise.catch((error) => {
        console.error(`[cache] SWR handler error.`, error);
        useNitroApp().captureError(error, { event, tags: ["cache"] });
      });
      return entry;
    }
    return _resolvePromise.then(() => entry);
  }
  return async (...args) => {
    const shouldBypassCache = await opts.shouldBypassCache?.(...args);
    if (shouldBypassCache) {
      return fn(...args);
    }
    const key = await (opts.getKey || getKey)(...args);
    const shouldInvalidateCache = await opts.shouldInvalidateCache?.(...args);
    const entry = await get(
      key,
      () => fn(...args),
      shouldInvalidateCache,
      args[0] && isEvent(args[0]) ? args[0] : void 0
    );
    let value = entry.value;
    if (opts.transform) {
      value = await opts.transform(entry, ...args) || value;
    }
    return value;
  };
}
function cachedFunction(fn, opts = {}) {
  return defineCachedFunction(fn, opts);
}
function getKey(...args) {
  return args.length > 0 ? hash(args) : "";
}
function escapeKey(key) {
  return String(key).replace(/\W/g, "");
}
function defineCachedEventHandler(handler, opts = defaultCacheOptions()) {
  const variableHeaderNames = (opts.varies || []).filter(Boolean).map((h) => h.toLowerCase()).sort();
  const _opts = {
    ...opts,
    getKey: async (event) => {
      const customKey = await opts.getKey?.(event);
      if (customKey) {
        return escapeKey(customKey);
      }
      const _path = event.node.req.originalUrl || event.node.req.url || event.path;
      let _pathname;
      try {
        _pathname = escapeKey(decodeURI(parseURL(_path).pathname)).slice(0, 16) || "index";
      } catch {
        _pathname = "-";
      }
      const _hashedPath = `${_pathname}.${hash(_path)}`;
      const _headers = variableHeaderNames.map((header) => [header, event.node.req.headers[header]]).map(([name, value]) => `${escapeKey(name)}.${hash(value)}`);
      return [_hashedPath, ..._headers].join(":");
    },
    validate: (entry) => {
      if (!entry.value) {
        return false;
      }
      if (entry.value.code >= 400) {
        return false;
      }
      if (entry.value.body === void 0) {
        return false;
      }
      if (entry.value.headers.etag === "undefined" || entry.value.headers["last-modified"] === "undefined") {
        return false;
      }
      return true;
    },
    group: opts.group || "nitro/handlers",
    integrity: opts.integrity || hash([handler, opts])
  };
  const _cachedHandler = cachedFunction(
    async (incomingEvent) => {
      const variableHeaders = {};
      for (const header of variableHeaderNames) {
        const value = incomingEvent.node.req.headers[header];
        if (value !== void 0) {
          variableHeaders[header] = value;
        }
      }
      const reqProxy = cloneWithProxy(incomingEvent.node.req, {
        headers: variableHeaders
      });
      const resHeaders = {};
      let _resSendBody;
      const resProxy = cloneWithProxy(incomingEvent.node.res, {
        statusCode: 200,
        writableEnded: false,
        writableFinished: false,
        headersSent: false,
        closed: false,
        getHeader(name) {
          return resHeaders[name];
        },
        setHeader(name, value) {
          resHeaders[name] = value;
          return this;
        },
        getHeaderNames() {
          return Object.keys(resHeaders);
        },
        hasHeader(name) {
          return name in resHeaders;
        },
        removeHeader(name) {
          delete resHeaders[name];
        },
        getHeaders() {
          return resHeaders;
        },
        end(chunk, arg2, arg3) {
          if (typeof chunk === "string") {
            _resSendBody = chunk;
          }
          if (typeof arg2 === "function") {
            arg2();
          }
          if (typeof arg3 === "function") {
            arg3();
          }
          return this;
        },
        write(chunk, arg2, arg3) {
          if (typeof chunk === "string") {
            _resSendBody = chunk;
          }
          if (typeof arg2 === "function") {
            arg2(void 0);
          }
          if (typeof arg3 === "function") {
            arg3();
          }
          return true;
        },
        writeHead(statusCode, headers2) {
          this.statusCode = statusCode;
          if (headers2) {
            if (Array.isArray(headers2) || typeof headers2 === "string") {
              throw new TypeError("Raw headers  is not supported.");
            }
            for (const header in headers2) {
              const value = headers2[header];
              if (value !== void 0) {
                this.setHeader(
                  header,
                  value
                );
              }
            }
          }
          return this;
        }
      });
      const event = createEvent(reqProxy, resProxy);
      event.fetch = (url, fetchOptions) => fetchWithEvent(event, url, fetchOptions, {
        fetch: useNitroApp().localFetch
      });
      event.$fetch = (url, fetchOptions) => fetchWithEvent(event, url, fetchOptions, {
        fetch: globalThis.$fetch
      });
      event.waitUntil = incomingEvent.waitUntil;
      event.context = incomingEvent.context;
      event.context.cache = {
        options: _opts
      };
      const body = await handler(event) || _resSendBody;
      const headers = event.node.res.getHeaders();
      headers.etag = String(
        headers.Etag || headers.etag || `W/"${hash(body)}"`
      );
      headers["last-modified"] = String(
        headers["Last-Modified"] || headers["last-modified"] || (/* @__PURE__ */ new Date()).toUTCString()
      );
      const cacheControl = [];
      if (opts.swr) {
        if (opts.maxAge) {
          cacheControl.push(`s-maxage=${opts.maxAge}`);
        }
        if (opts.staleMaxAge) {
          cacheControl.push(`stale-while-revalidate=${opts.staleMaxAge}`);
        } else {
          cacheControl.push("stale-while-revalidate");
        }
      } else if (opts.maxAge) {
        cacheControl.push(`max-age=${opts.maxAge}`);
      }
      if (cacheControl.length > 0) {
        headers["cache-control"] = cacheControl.join(", ");
      }
      const cacheEntry = {
        code: event.node.res.statusCode,
        headers,
        body
      };
      return cacheEntry;
    },
    _opts
  );
  return defineEventHandler(async (event) => {
    if (opts.headersOnly) {
      if (handleCacheHeaders(event, { maxAge: opts.maxAge })) {
        return;
      }
      return handler(event);
    }
    const response = await _cachedHandler(
      event
    );
    if (event.node.res.headersSent || event.node.res.writableEnded) {
      return response.body;
    }
    if (handleCacheHeaders(event, {
      modifiedTime: new Date(response.headers["last-modified"]),
      etag: response.headers.etag,
      maxAge: opts.maxAge
    })) {
      return;
    }
    event.node.res.statusCode = response.code;
    for (const name in response.headers) {
      const value = response.headers[name];
      if (name === "set-cookie") {
        event.node.res.appendHeader(
          name,
          splitCookiesString(value)
        );
      } else {
        if (value !== void 0) {
          event.node.res.setHeader(name, value);
        }
      }
    }
    return response.body;
  });
}
function cloneWithProxy(obj, overrides) {
  return new Proxy(obj, {
    get(target, property, receiver) {
      if (property in overrides) {
        return overrides[property];
      }
      return Reflect.get(target, property, receiver);
    },
    set(target, property, value, receiver) {
      if (property in overrides) {
        overrides[property] = value;
        return true;
      }
      return Reflect.set(target, property, value, receiver);
    }
  });
}
const cachedEventHandler = defineCachedEventHandler;

function klona(x) {
	if (typeof x !== 'object') return x;

	var k, tmp, str=Object.prototype.toString.call(x);

	if (str === '[object Object]') {
		if (x.constructor !== Object && typeof x.constructor === 'function') {
			tmp = new x.constructor();
			for (k in x) {
				if (x.hasOwnProperty(k) && tmp[k] !== x[k]) {
					tmp[k] = klona(x[k]);
				}
			}
		} else {
			tmp = {}; // null
			for (k in x) {
				if (k === '__proto__') {
					Object.defineProperty(tmp, k, {
						value: klona(x[k]),
						configurable: true,
						enumerable: true,
						writable: true,
					});
				} else {
					tmp[k] = klona(x[k]);
				}
			}
		}
		return tmp;
	}

	if (str === '[object Array]') {
		k = x.length;
		for (tmp=Array(k); k--;) {
			tmp[k] = klona(x[k]);
		}
		return tmp;
	}

	if (str === '[object Set]') {
		tmp = new Set;
		x.forEach(function (val) {
			tmp.add(klona(val));
		});
		return tmp;
	}

	if (str === '[object Map]') {
		tmp = new Map;
		x.forEach(function (val, key) {
			tmp.set(klona(key), klona(val));
		});
		return tmp;
	}

	if (str === '[object Date]') {
		return new Date(+x);
	}

	if (str === '[object RegExp]') {
		tmp = new RegExp(x.source, x.flags);
		tmp.lastIndex = x.lastIndex;
		return tmp;
	}

	if (str === '[object DataView]') {
		return new x.constructor( klona(x.buffer) );
	}

	if (str === '[object ArrayBuffer]') {
		return x.slice(0);
	}

	// ArrayBuffer.isView(x)
	// ~> `new` bcuz `Buffer.slice` => ref
	if (str.slice(-6) === 'Array]') {
		return new x.constructor(x);
	}

	return x;
}

const defineAppConfig = (config) => config;

const appConfig0 = defineAppConfig({
  "ui": {
    // Engine-lit glass treatment for every card on the site.
    "card": {
      "slots": {
        "body": "p-4 sm:p-6",
        "footer": "p-4 sm:px-6",
        "header": "p-4 sm:px-6",
        "root": "iridis-card rounded-2xl"
      }
    },
    "button": {
      "variants": {
        "solid": "text-[var(--ui-primary-contrast,white)] dark:text-[var(--ui-primary-contrast,gray-900)]"
      }
    }
  }
});

const inlineAppConfig = {
  "nuxt": {},
  "ui": {
    "colors": {
      "primary": "green",
      "secondary": "blue",
      "success": "green",
      "info": "blue",
      "warning": "yellow",
      "error": "red",
      "neutral": "slate"
    },
    "icons": {
      "arrowDown": "i-lucide-arrow-down",
      "arrowLeft": "i-lucide-arrow-left",
      "arrowRight": "i-lucide-arrow-right",
      "arrowUp": "i-lucide-arrow-up",
      "caution": "i-lucide-circle-alert",
      "check": "i-lucide-check",
      "chevronDoubleLeft": "i-lucide-chevrons-left",
      "chevronDoubleRight": "i-lucide-chevrons-right",
      "chevronDown": "i-lucide-chevron-down",
      "chevronLeft": "i-lucide-chevron-left",
      "chevronRight": "i-lucide-chevron-right",
      "chevronUp": "i-lucide-chevron-up",
      "close": "i-lucide-x",
      "copy": "i-lucide-copy",
      "copyCheck": "i-lucide-copy-check",
      "dark": "i-lucide-moon",
      "drag": "i-lucide-grip-vertical",
      "ellipsis": "i-lucide-ellipsis",
      "error": "i-lucide-circle-x",
      "external": "i-lucide-arrow-up-right",
      "eye": "i-lucide-eye",
      "eyeOff": "i-lucide-eye-off",
      "file": "i-lucide-file",
      "folder": "i-lucide-folder",
      "folderOpen": "i-lucide-folder-open",
      "hash": "i-lucide-hash",
      "info": "i-lucide-info",
      "light": "i-lucide-sun",
      "loading": "i-lucide-loader-circle",
      "menu": "i-lucide-menu",
      "minus": "i-lucide-minus",
      "panelClose": "i-lucide-panel-left-close",
      "panelOpen": "i-lucide-panel-left-open",
      "plus": "i-lucide-plus",
      "reload": "i-lucide-rotate-ccw",
      "search": "i-lucide-search",
      "stop": "i-lucide-square",
      "success": "i-lucide-circle-check",
      "system": "i-lucide-monitor",
      "tip": "i-lucide-lightbulb",
      "upload": "i-lucide-upload",
      "warning": "i-lucide-triangle-alert"
    },
    "tv": {
      "twMergeConfig": {}
    }
  },
  "__swiper": {
    "bundled": true
  },
  "icon": {
    "provider": "server",
    "class": "",
    "aliases": {},
    "iconifyApiEndpoint": "https://api.iconify.design",
    "localApiEndpoint": "/api/_nuxt_icon",
    "fallbackToApi": true,
    "cssSelectorPrefix": "i-",
    "cssWherePseudo": true,
    "cssLayer": "base",
    "mode": "css",
    "attrs": {
      "aria-hidden": true
    },
    "collections": [
      "academicons",
      "akar-icons",
      "ant-design",
      "arcticons",
      "basil",
      "bi",
      "bitcoin-icons",
      "bpmn",
      "brandico",
      "bx",
      "bxl",
      "bxs",
      "bytesize",
      "carbon",
      "catppuccin",
      "cbi",
      "charm",
      "ci",
      "cib",
      "cif",
      "cil",
      "circle-flags",
      "circum",
      "clarity",
      "codex",
      "codicon",
      "covid",
      "cryptocurrency",
      "cryptocurrency-color",
      "cuida",
      "dashicons",
      "devicon",
      "devicon-plain",
      "dinkie-icons",
      "duo-icons",
      "ei",
      "el",
      "emojione",
      "emojione-monotone",
      "emojione-v1",
      "entypo",
      "entypo-social",
      "eos-icons",
      "ep",
      "et",
      "eva",
      "f7",
      "fa",
      "fa-brands",
      "fa-regular",
      "fa-solid",
      "fa6-brands",
      "fa6-regular",
      "fa6-solid",
      "fa7-brands",
      "fa7-regular",
      "fa7-solid",
      "fad",
      "famicons",
      "fe",
      "feather",
      "file-icons",
      "flag",
      "flagpack",
      "flat-color-icons",
      "flat-ui",
      "flowbite",
      "fluent",
      "fluent-color",
      "fluent-emoji",
      "fluent-emoji-flat",
      "fluent-emoji-high-contrast",
      "fluent-mdl2",
      "fontelico",
      "fontisto",
      "formkit",
      "foundation",
      "fxemoji",
      "gala",
      "game-icons",
      "garden",
      "geo",
      "gg",
      "gis",
      "gravity-ui",
      "gridicons",
      "grommet-icons",
      "guidance",
      "healthicons",
      "heroicons",
      "heroicons-outline",
      "heroicons-solid",
      "hugeicons",
      "humbleicons",
      "ic",
      "icomoon-free",
      "icon-park",
      "icon-park-outline",
      "icon-park-solid",
      "icon-park-twotone",
      "iconamoon",
      "iconoir",
      "icons8",
      "il",
      "ion",
      "iwwa",
      "ix",
      "jam",
      "la",
      "lets-icons",
      "line-md",
      "lineicons",
      "logos",
      "ls",
      "lsicon",
      "lucide",
      "lucide-lab",
      "mage",
      "majesticons",
      "maki",
      "map",
      "marketeq",
      "material-icon-theme",
      "material-symbols",
      "material-symbols-light",
      "mdi",
      "mdi-light",
      "medical-icon",
      "memory",
      "meteocons",
      "meteor-icons",
      "mi",
      "mingcute",
      "mono-icons",
      "mynaui",
      "nimbus",
      "nonicons",
      "noto",
      "noto-v1",
      "nrk",
      "octicon",
      "oi",
      "ooui",
      "openmoji",
      "oui",
      "pajamas",
      "pepicons",
      "pepicons-pencil",
      "pepicons-pop",
      "pepicons-print",
      "ph",
      "picon",
      "pixel",
      "pixelarticons",
      "prime",
      "proicons",
      "ps",
      "qlementine-icons",
      "quill",
      "radix-icons",
      "raphael",
      "ri",
      "rivet-icons",
      "roentgen",
      "si",
      "si-glyph",
      "sidekickicons",
      "simple-icons",
      "simple-line-icons",
      "skill-icons",
      "solar",
      "stash",
      "streamline",
      "streamline-block",
      "streamline-color",
      "streamline-cyber",
      "streamline-cyber-color",
      "streamline-emojis",
      "streamline-flex",
      "streamline-flex-color",
      "streamline-freehand",
      "streamline-freehand-color",
      "streamline-kameleon-color",
      "streamline-logos",
      "streamline-pixel",
      "streamline-plump",
      "streamline-plump-color",
      "streamline-sharp",
      "streamline-sharp-color",
      "streamline-stickies-color",
      "streamline-ultimate",
      "streamline-ultimate-color",
      "subway",
      "svg-spinners",
      "system-uicons",
      "tabler",
      "tdesign",
      "teenyicons",
      "temaki",
      "token",
      "token-branded",
      "topcoat",
      "twemoji",
      "typcn",
      "uil",
      "uim",
      "uis",
      "uit",
      "uiw",
      "unjs",
      "vaadin",
      "vs",
      "vscode-icons",
      "websymbol",
      "weui",
      "whh",
      "wi",
      "wpf",
      "zmdi",
      "zondicons"
    ],
    "fetchTimeout": 1500
  }
};

const appConfig = defuFn(appConfig0, inlineAppConfig);

const NUMBER_CHAR_RE = /\d/;
const STR_SPLITTERS = ["-", "_", "/", "."];
function isUppercase(char = "") {
  if (NUMBER_CHAR_RE.test(char)) {
    return void 0;
  }
  return char !== char.toLowerCase();
}
function splitByCase(str, separators) {
  const splitters = STR_SPLITTERS;
  const parts = [];
  if (!str || typeof str !== "string") {
    return parts;
  }
  let buff = "";
  let previousUpper;
  let previousSplitter;
  for (const char of str) {
    const isSplitter = splitters.includes(char);
    if (isSplitter === true) {
      parts.push(buff);
      buff = "";
      previousUpper = void 0;
      continue;
    }
    const isUpper = isUppercase(char);
    if (previousSplitter === false) {
      if (previousUpper === false && isUpper === true) {
        parts.push(buff);
        buff = char;
        previousUpper = isUpper;
        continue;
      }
      if (previousUpper === true && isUpper === false && buff.length > 1) {
        const lastChar = buff.at(-1);
        parts.push(buff.slice(0, Math.max(0, buff.length - 1)));
        buff = lastChar + char;
        previousUpper = isUpper;
        continue;
      }
    }
    buff += char;
    previousUpper = isUpper;
    previousSplitter = isSplitter;
  }
  parts.push(buff);
  return parts;
}
function upperFirst(str) {
  return str ? str[0].toUpperCase() + str.slice(1) : "";
}
function pascalCase(str, opts) {
  return str ? (Array.isArray(str) ? str : splitByCase(str)).map((p) => upperFirst(p)).join("") : "";
}
function kebabCase(str, joiner) {
  return str ? (Array.isArray(str) ? str : splitByCase(str)).map((p) => p.toLowerCase()).join(joiner ?? "-") : "";
}
function snakeCase(str) {
  return kebabCase(str || "", "_");
}

function getEnv(key, opts) {
  const envKey = snakeCase(key).toUpperCase();
  return destr(
    process.env[opts.prefix + envKey] ?? process.env[opts.altPrefix + envKey]
  );
}
function _isObject(input) {
  return typeof input === "object" && !Array.isArray(input);
}
function applyEnv(obj, opts, parentKey = "") {
  for (const key in obj) {
    const subKey = parentKey ? `${parentKey}_${key}` : key;
    const envValue = getEnv(subKey, opts);
    if (_isObject(obj[key])) {
      if (_isObject(envValue)) {
        obj[key] = { ...obj[key], ...envValue };
        applyEnv(obj[key], opts, subKey);
      } else if (envValue === void 0) {
        applyEnv(obj[key], opts, subKey);
      } else {
        obj[key] = envValue ?? obj[key];
      }
    } else {
      obj[key] = envValue ?? obj[key];
    }
    if (opts.envExpansion && typeof obj[key] === "string") {
      obj[key] = _expandFromEnv(obj[key]);
    }
  }
  return obj;
}
const envExpandRx = /\{\{([^{}]*)\}\}/g;
function _expandFromEnv(value) {
  return value.replace(envExpandRx, (match, key) => {
    return process.env[key] || match;
  });
}

const _inlineRuntimeConfig = {
  "app": {
    "baseURL": "/",
    "buildId": "8148c41e-d1f7-4c60-bc2e-a3b961bbe2bb",
    "buildAssetsDir": "/_nuxt/",
    "cdnURL": ""
  },
  "nitro": {
    "envPrefix": "NUXT_",
    "routeRules": {
      "/__nuxt_error": {
        "cache": false
      },
      "/__nuxt_content/**": {
        "robots": false,
        "cache": false
      },
      "/__nuxt_content/docs/sql_dump.txt": {
        "prerender": true
      },
      "/_nuxt/builds/meta/**": {
        "headers": {
          "cache-control": "public, max-age=31536000, immutable"
        }
      },
      "/_nuxt/builds/**": {
        "headers": {
          "cache-control": "public, max-age=1, immutable"
        }
      },
      "/_fonts/**": {
        "headers": {
          "cache-control": "public, max-age=31536000, immutable"
        }
      },
      "/_nuxt/**": {
        "headers": {
          "cache-control": "public, max-age=31536000, immutable"
        }
      }
    }
  },
  "public": {
    "mdc": {
      "components": {
        "prose": true,
        "map": {
          "accordion": "ProseAccordion",
          "accordion-item": "ProseAccordionItem",
          "badge": "ProseBadge",
          "callout": "ProseCallout",
          "card": "ProseCard",
          "card-group": "ProseCardGroup",
          "caution": "ProseCaution",
          "code-collapse": "ProseCodeCollapse",
          "code-group": "ProseCodeGroup",
          "code-icon": "ProseCodeIcon",
          "code-preview": "ProseCodePreview",
          "code-tree": "ProseCodeTree",
          "collapsible": "ProseCollapsible",
          "field": "ProseField",
          "field-group": "ProseFieldGroup",
          "icon": "ProseIcon",
          "kbd": "ProseKbd",
          "note": "ProseNote",
          "prompt": "ProsePrompt",
          "steps": "ProseSteps",
          "tabs": "ProseTabs",
          "tabs-item": "ProseTabsItem",
          "tip": "ProseTip",
          "warning": "ProseWarning"
        },
        "customElements": []
      },
      "headings": {
        "anchorLinks": {
          "h1": false,
          "h2": true,
          "h3": true,
          "h4": true,
          "h5": false,
          "h6": false
        }
      },
      "highlight": {
        "noApiRoute": true,
        "theme": {
          "light": "material-theme-lighter",
          "default": "material-theme",
          "dark": "material-theme-palenight"
        },
        "highlighter": "shiki",
        "shikiEngine": "oniguruma",
        "langs": [
          "js",
          "jsx",
          "json",
          "ts",
          "tsx",
          "vue",
          "css",
          "html",
          "bash",
          "md",
          "mdc",
          "yaml"
        ]
      }
    },
    "content": {
      "wsUrl": ""
    }
  },
  "icon": {
    "serverKnownCssClasses": []
  },
  "content": {
    "databaseVersion": "v3.5.0",
    "version": "3.15.0",
    "database": {
      "type": "sqlite",
      "filename": "./contents.sqlite"
    },
    "localDatabase": {
      "type": "sqlite",
      "filename": "/Users/studs/Workspace/iridis/site/.data/content/contents.sqlite"
    },
    "integrityCheck": true
  }
};
const envOptions = {
  prefix: "NITRO_",
  altPrefix: _inlineRuntimeConfig.nitro.envPrefix ?? process.env.NITRO_ENV_PREFIX ?? "_",
  envExpansion: _inlineRuntimeConfig.nitro.envExpansion ?? process.env.NITRO_ENV_EXPANSION ?? false
};
const _sharedRuntimeConfig = _deepFreeze(
  applyEnv(klona(_inlineRuntimeConfig), envOptions)
);
function useRuntimeConfig(event) {
  if (!event) {
    return _sharedRuntimeConfig;
  }
  if (event.context.nitro.runtimeConfig) {
    return event.context.nitro.runtimeConfig;
  }
  const runtimeConfig = klona(_inlineRuntimeConfig);
  applyEnv(runtimeConfig, envOptions);
  event.context.nitro.runtimeConfig = runtimeConfig;
  return runtimeConfig;
}
const _sharedAppConfig = _deepFreeze(klona(appConfig));
function useAppConfig(event) {
  {
    return _sharedAppConfig;
  }
}
function _deepFreeze(object) {
  const propNames = Object.getOwnPropertyNames(object);
  for (const name of propNames) {
    const value = object[name];
    if (value && typeof value === "object") {
      _deepFreeze(value);
    }
  }
  return Object.freeze(object);
}
new Proxy(/* @__PURE__ */ Object.create(null), {
  get: (_, prop) => {
    console.warn(
      "Please use `useRuntimeConfig()` instead of accessing config directly."
    );
    const runtimeConfig = useRuntimeConfig();
    if (prop in runtimeConfig) {
      return runtimeConfig[prop];
    }
    return void 0;
  }
});

function createContext(opts = {}) {
  let currentInstance;
  let isSingleton = false;
  const checkConflict = (instance) => {
    if (currentInstance && currentInstance !== instance) {
      throw new Error("Context conflict");
    }
  };
  let als;
  if (opts.asyncContext) {
    const _AsyncLocalStorage = opts.AsyncLocalStorage || globalThis.AsyncLocalStorage;
    if (_AsyncLocalStorage) {
      als = new _AsyncLocalStorage();
    } else {
      console.warn("[unctx] `AsyncLocalStorage` is not provided.");
    }
  }
  const _getCurrentInstance = () => {
    if (als) {
      const instance = als.getStore();
      if (instance !== void 0) {
        return instance;
      }
    }
    return currentInstance;
  };
  return {
    use: () => {
      const _instance = _getCurrentInstance();
      if (_instance === void 0) {
        throw new Error("Context is not available");
      }
      return _instance;
    },
    tryUse: () => {
      return _getCurrentInstance();
    },
    set: (instance, replace) => {
      if (!replace) {
        checkConflict(instance);
      }
      currentInstance = instance;
      isSingleton = true;
    },
    unset: () => {
      currentInstance = void 0;
      isSingleton = false;
    },
    call: (instance, callback) => {
      checkConflict(instance);
      currentInstance = instance;
      try {
        return als ? als.run(instance, callback) : callback();
      } finally {
        if (!isSingleton) {
          currentInstance = void 0;
        }
      }
    },
    async callAsync(instance, callback) {
      currentInstance = instance;
      const onRestore = () => {
        currentInstance = instance;
      };
      const onLeave = () => currentInstance === instance ? onRestore : void 0;
      asyncHandlers.add(onLeave);
      try {
        const r = als ? als.run(instance, callback) : callback();
        if (!isSingleton) {
          currentInstance = void 0;
        }
        return await r;
      } finally {
        asyncHandlers.delete(onLeave);
      }
    }
  };
}
function createNamespace(defaultOpts = {}) {
  const contexts = {};
  return {
    get(key, opts = {}) {
      if (!contexts[key]) {
        contexts[key] = createContext({ ...defaultOpts, ...opts });
      }
      return contexts[key];
    }
  };
}
const _globalThis = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : typeof global !== "undefined" ? global : {};
const globalKey = "__unctx__";
const defaultNamespace = _globalThis[globalKey] || (_globalThis[globalKey] = createNamespace());
const getContext = (key, opts = {}) => defaultNamespace.get(key, opts);
const asyncHandlersKey = "__unctx_async_handlers__";
const asyncHandlers = _globalThis[asyncHandlersKey] || (_globalThis[asyncHandlersKey] = /* @__PURE__ */ new Set());
function executeAsync(function_) {
  const restores = [];
  for (const leaveHandler of asyncHandlers) {
    const restore2 = leaveHandler();
    if (restore2) {
      restores.push(restore2);
    }
  }
  const restore = () => {
    for (const restore2 of restores) {
      restore2();
    }
  };
  let awaitable = function_();
  if (awaitable && typeof awaitable === "object" && "catch" in awaitable) {
    awaitable = awaitable.catch((error) => {
      restore();
      throw error;
    });
  }
  return [awaitable, restore];
}

getContext("nitro-app", {
  asyncContext: false,
  AsyncLocalStorage: void 0
});

function isPathInScope(pathname, base) {
  let canonical;
  try {
    const pre = pathname.replace(/%2f/gi, "/").replace(/%5c/gi, "\\");
    canonical = new URL(pre, "http://_").pathname;
  } catch {
    return false;
  }
  return !base || canonical === base || canonical.startsWith(base + "/");
}

const config = useRuntimeConfig();
const _routeRulesMatcher = toRouteMatcher(
  createRouter$1({ routes: config.nitro.routeRules })
);
function createRouteRulesHandler(ctx) {
  return eventHandler((event) => {
    const routeRules = getRouteRules(event);
    if (routeRules.headers) {
      setHeaders(event, routeRules.headers);
    }
    if (routeRules.redirect) {
      let target = routeRules.redirect.to;
      if (target.endsWith("/**")) {
        let targetPath = event.path;
        const strpBase = routeRules.redirect._redirectStripBase;
        if (strpBase) {
          if (!isPathInScope(event.path.split("?")[0], strpBase)) {
            throw createError$1({ statusCode: 400 });
          }
          targetPath = withoutBase(targetPath, strpBase);
        } else if (targetPath.startsWith("//")) {
          targetPath = targetPath.replace(/^\/+/, "/");
        }
        target = joinURL(target.slice(0, -3), targetPath);
      } else if (event.path.includes("?")) {
        const query = getQuery$1(event.path);
        target = withQuery(target, query);
      }
      return sendRedirect(event, target, routeRules.redirect.statusCode);
    }
    if (routeRules.proxy) {
      let target = routeRules.proxy.to;
      if (target.endsWith("/**")) {
        let targetPath = event.path;
        const strpBase = routeRules.proxy._proxyStripBase;
        if (strpBase) {
          if (!isPathInScope(event.path.split("?")[0], strpBase)) {
            throw createError$1({ statusCode: 400 });
          }
          targetPath = withoutBase(targetPath, strpBase);
        } else if (targetPath.startsWith("//")) {
          targetPath = targetPath.replace(/^\/+/, "/");
        }
        target = joinURL(target.slice(0, -3), targetPath);
      } else if (event.path.includes("?")) {
        const query = getQuery$1(event.path);
        target = withQuery(target, query);
      }
      return proxyRequest(event, target, {
        fetch: ctx.localFetch,
        ...routeRules.proxy
      });
    }
  });
}
function getRouteRules(event) {
  event.context._nitro = event.context._nitro || {};
  if (!event.context._nitro.routeRules) {
    event.context._nitro.routeRules = getRouteRulesForPath(
      withoutBase(event.path.split("?")[0], useRuntimeConfig().app.baseURL)
    );
  }
  return event.context._nitro.routeRules;
}
function getRouteRulesForPath(path) {
  return defu({}, ..._routeRulesMatcher.matchAll(path).reverse());
}

function _captureError(error, type) {
  console.error(`[${type}]`, error);
  useNitroApp().captureError(error, { tags: [type] });
}
function trapUnhandledNodeErrors() {
  process.on(
    "unhandledRejection",
    (error) => _captureError(error, "unhandledRejection")
  );
  process.on(
    "uncaughtException",
    (error) => _captureError(error, "uncaughtException")
  );
}
function joinHeaders(value) {
  return Array.isArray(value) ? value.join(", ") : String(value);
}
function normalizeFetchResponse(response) {
  if (!response.headers.has("set-cookie")) {
    return response;
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: normalizeCookieHeaders(response.headers)
  });
}
function normalizeCookieHeader(header = "") {
  return splitCookiesString(joinHeaders(header));
}
function normalizeCookieHeaders(headers) {
  const outgoingHeaders = new Headers();
  for (const [name, header] of headers) {
    if (name === "set-cookie") {
      for (const cookie of normalizeCookieHeader(header)) {
        outgoingHeaders.append("set-cookie", cookie);
      }
    } else {
      outgoingHeaders.set(name, joinHeaders(header));
    }
  }
  return outgoingHeaders;
}

function isJsonRequest(event) {
	
	if (hasReqHeader(event, "accept", "text/html")) {
		return false;
	}
	return hasReqHeader(event, "accept", "application/json") || hasReqHeader(event, "user-agent", "curl/") || hasReqHeader(event, "user-agent", "httpie/") || hasReqHeader(event, "sec-fetch-mode", "cors") || event.path.startsWith("/api/") || event.path.endsWith(".json");
}
function hasReqHeader(event, name, includes) {
	const value = getRequestHeader(event, name);
	return !!(value && typeof value === "string" && value.toLowerCase().includes(includes));
}

const errorHandler$0 = (async function errorhandler(error, event, { defaultHandler }) {
	if (event.handled || isJsonRequest(event)) {
		
		return;
	}
	
	const defaultRes = await defaultHandler(error, event, { json: true });
	
	const status = error.status || error.statusCode || 500;
	if (status === 404 && defaultRes.status === 302) {
		setResponseHeaders(event, defaultRes.headers);
		setResponseStatus(event, defaultRes.status, defaultRes.statusText);
		return send(event, JSON.stringify(defaultRes.body, null, 2));
	}
	const errorObject = defaultRes.body;
	
	const url = new URL(errorObject.url);
	errorObject.url = withoutBase(url.pathname, useRuntimeConfig(event).app.baseURL) + url.search + url.hash;
	
	errorObject.message = error.unhandled ? errorObject.message || "Server Error" : error.message || errorObject.message || "Server Error";
	
	errorObject.data ||= error.data;
	errorObject.statusText ||= error.statusText || error.statusMessage;
	delete defaultRes.headers["content-type"];
	delete defaultRes.headers["content-security-policy"];
	setResponseHeaders(event, defaultRes.headers);
	
	const reqHeaders = getRequestHeaders(event);
	
	const isRenderingError = event.path.startsWith("/__nuxt_error") || !!reqHeaders["x-nuxt-error"];
	
	const res = isRenderingError ? null : await useNitroApp().localFetch(withQuery(joinURL(useRuntimeConfig(event).app.baseURL, "/__nuxt_error"), errorObject), {
		headers: {
			...reqHeaders,
			"x-nuxt-error": "true"
		},
		redirect: "manual"
	}).catch(() => null);
	if (event.handled) {
		return;
	}
	
	if (!res) {
		const { template } = await import('../_/error-500.mjs');
		setResponseHeader(event, "Content-Type", "text/html;charset=UTF-8");
		return send(event, template(errorObject));
	}
	const html = await res.text();
	for (const [header, value] of res.headers.entries()) {
		if (header === "set-cookie") {
			appendResponseHeader(event, header, value);
			continue;
		}
		setResponseHeader(event, header, value);
	}
	setResponseStatus(event, res.status && res.status !== 200 ? res.status : defaultRes.status, res.statusText || defaultRes.statusText);
	return send(event, html);
});

function defineNitroErrorHandler(handler) {
  return handler;
}

const errorHandler$1 = defineNitroErrorHandler(
  function defaultNitroErrorHandler(error, event) {
    const res = defaultHandler(error, event);
    setResponseHeaders(event, res.headers);
    setResponseStatus(event, res.status, res.statusText);
    return send(event, JSON.stringify(res.body, null, 2));
  }
);
function defaultHandler(error, event, opts) {
  const isSensitive = error.unhandled || error.fatal;
  const statusCode = error.statusCode || 500;
  const statusMessage = error.statusMessage || "Server Error";
  const url = getRequestURL(event, { xForwardedHost: true, xForwardedProto: true });
  if (statusCode === 404) {
    const baseURL = "/";
    if (/^\/[^/]/.test(baseURL) && !url.pathname.startsWith(baseURL)) {
      const redirectTo = `${baseURL}${url.pathname.slice(1)}${url.search}`;
      return {
        status: 302,
        statusText: "Found",
        headers: { location: redirectTo },
        body: `Redirecting...`
      };
    }
  }
  if (isSensitive && !opts?.silent) {
    const tags = [error.unhandled && "[unhandled]", error.fatal && "[fatal]"].filter(Boolean).join(" ");
    console.error(`[request error] ${tags} [${event.method}] ${url}
`, error);
  }
  const headers = {
    "content-type": "application/json",
    // Prevent browser from guessing the MIME types of resources.
    "x-content-type-options": "nosniff",
    // Prevent error page from being embedded in an iframe
    "x-frame-options": "DENY",
    // Prevent browsers from sending the Referer header
    "referrer-policy": "no-referrer",
    // Disable the execution of any js
    "content-security-policy": "script-src 'none'; frame-ancestors 'none';"
  };
  setResponseStatus(event, statusCode, statusMessage);
  if (statusCode === 404 || !getResponseHeader(event, "cache-control")) {
    headers["cache-control"] = "no-cache";
  }
  const body = {
    error: true,
    url: url.href,
    statusCode,
    statusMessage,
    message: isSensitive ? "Server Error" : error.message,
    data: isSensitive ? void 0 : error.data
  };
  return {
    status: statusCode,
    statusText: statusMessage,
    headers,
    body
  };
}

const errorHandlers = [errorHandler$0, errorHandler$1];

async function errorHandler(error, event) {
  for (const handler of errorHandlers) {
    try {
      await handler(error, event, { defaultHandler });
      if (event.handled) {
        return; // Response handled
      }
    } catch(error) {
      // Handler itself thrown, log and continue
      console.error(error);
    }
  }
  // H3 will handle fallback
}

const script = "\"use strict\";(()=>{const o=window,e=document.documentElement,c=[\"dark\",\"light\"],s=getStorageValue(\"localStorage\",\"nuxt-color-mode\")||\"system\";let r=s===\"system\"?f():s;const l=e.getAttribute(\"data-color-mode-forced\");l&&(r=l),i(r),o[\"__NUXT_COLOR_MODE__\"]={preference:s,value:r,getColorScheme:f,addColorScheme:i,removeColorScheme:d};function i(t){const a=\"\"+t+\"\",n=\"\";e.classList?e.classList.add(a):e.className+=\" \"+a,n&&e.setAttribute(\"data-\"+n,t)}function d(t){const a=\"\"+t+\"\",n=\"\";e.classList?e.classList.remove(a):e.className=e.className.replace(new RegExp(a,\"g\"),\"\"),n&&e.removeAttribute(\"data-\"+n)}function u(t){return o.matchMedia(\"(prefers-color-scheme\"+t+\")\")}function f(){if(o.matchMedia&&u(\"\").media!==\"not all\"){for(const t of c)if(u(\":\"+t).matches)return t}return\"light\"}})();function getStorageValue(o,e){switch(o){case\"localStorage\":try{return window.localStorage.getItem(e)}catch{return null}case\"sessionStorage\":try{return window.sessionStorage.getItem(e)}catch{return null}case\"cookie\":try{return getCookie(e)}catch{return null}default:return null}}function getCookie(o){const c=(\"; \"+window.document.cookie).split(\"; \"+o+\"=\");if(c.length===2){const s=c.pop();return s?s.split(\";\").shift():null}}";

const _pb0SwXASAmF_eK4K7eJ1sZvtGrvmxQaEHK7SQQjAY = (function(nitro) {
  nitro.hooks.hook("render:html", (htmlContext) => {
    htmlContext.head.push(`<script>${script}<\/script>`);
  });
});

const plugins = [
  _pb0SwXASAmF_eK4K7eJ1sZvtGrvmxQaEHK7SQQjAY
];

const assets = {
  "/favicon.ico": {
    "type": "image/vnd.microsoft.icon",
    "etag": "\"7d26-m/z8ETT0TiygVHIsNG9A2uRNe+M\"",
    "mtime": "2026-07-11T00:08:25.577Z",
    "size": 32038,
    "path": "../public/favicon.ico"
  },
  "/robots.txt": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"18-j8OIsL9qGDmNZ+lHhp2tyH4XtaE\"",
    "mtime": "2026-07-11T00:08:25.577Z",
    "size": 24,
    "path": "../public/robots.txt"
  },
  "/apple-touch-icon.png": {
    "type": "image/png",
    "etag": "\"103de-OUP3DPYahV7fJpva0+HqvF/vWJs\"",
    "mtime": "2026-07-11T00:08:25.577Z",
    "size": 66526,
    "path": "../public/apple-touch-icon.png"
  },
  "/_fonts/1A__tf0ZS0Popmdoy0kDZjC9cmK73U4dP6MIlsd_mVE-zPz52wX6aUUJP2ax_uXZbgJ0eM8_rL4hFCIvGE44Ffk.woff2": {
    "type": "font/woff2",
    "etag": "\"1a90-SizOLrQ3v2WnpUbpVfMW/w2GCiE\"",
    "mtime": "2026-07-11T00:08:25.464Z",
    "size": 6800,
    "path": "../public/_fonts/1A__tf0ZS0Popmdoy0kDZjC9cmK73U4dP6MIlsd_mVE-zPz52wX6aUUJP2ax_uXZbgJ0eM8_rL4hFCIvGE44Ffk.woff2"
  },
  "/_fonts/7uOd3iVpdDqNvPdr7Ucjkz5YxLn-p5sROroyjNDR-H0-Uh8yU4TKTd4T8rG_0BkgUEJ6_h6rC6xbOCN0ToQJrPY.woff2": {
    "type": "font/woff2",
    "etag": "\"8148-HSG+k8dmL2Li0VAMuIm0B1KST9s\"",
    "mtime": "2026-07-11T00:08:25.464Z",
    "size": 33096,
    "path": "../public/_fonts/7uOd3iVpdDqNvPdr7Ucjkz5YxLn-p5sROroyjNDR-H0-Uh8yU4TKTd4T8rG_0BkgUEJ6_h6rC6xbOCN0ToQJrPY.woff2"
  },
  "/_fonts/3zHJNmqdAFbSygXFh60olvDMc9mZf_RpJHm5hhtqFXI-PBGlnsMtfLn7RnCxO5_jJe61l26CMDVuNLtfG9gtTlE.woff2": {
    "type": "font/woff2",
    "etag": "\"1c04-5WvTmLciYjNEKbLAMFwcYU7Yy+M\"",
    "mtime": "2026-07-11T00:08:25.464Z",
    "size": 7172,
    "path": "../public/_fonts/3zHJNmqdAFbSygXFh60olvDMc9mZf_RpJHm5hhtqFXI-PBGlnsMtfLn7RnCxO5_jJe61l26CMDVuNLtfG9gtTlE.woff2"
  },
  "/_fonts/E8cfqMw6EhdWSEj5PXdbh2J7u4m8j202JWUh3VNzOC8-e0c1w2KmhUNIOTE4pe8Jo3c0h2HmZyUQhs5p5_aOUl4.woff2": {
    "type": "font/woff2",
    "etag": "\"7a6c-NA5papVQRrAC8RHI3W4wMgtFYYQ\"",
    "mtime": "2026-07-11T00:08:25.464Z",
    "size": 31340,
    "path": "../public/_fonts/E8cfqMw6EhdWSEj5PXdbh2J7u4m8j202JWUh3VNzOC8-e0c1w2KmhUNIOTE4pe8Jo3c0h2HmZyUQhs5p5_aOUl4.woff2"
  },
  "/_fonts/F0v3UFNNkSF8o6EydjtyBS9QZk5NFsjcsZWz-W16j10-Bp_L2PtidhiMbYzb_qLNZQmx2gdqx3uvv8fxSYxAfpA.woff2": {
    "type": "font/woff2",
    "etag": "\"6b0-ZTiJyWk2hq/Kot3zMLKodM70hek\"",
    "mtime": "2026-07-11T00:08:25.464Z",
    "size": 1712,
    "path": "../public/_fonts/F0v3UFNNkSF8o6EydjtyBS9QZk5NFsjcsZWz-W16j10-Bp_L2PtidhiMbYzb_qLNZQmx2gdqx3uvv8fxSYxAfpA.woff2"
  },
  "/_fonts/I9T0LQ9YgnidA3gv2WqRNnupdjurYMRHUSozaf8YKS8-uzL4HEVJcWv7MNxyvQlTwCX1yJQUNRD9baZLI82Tb3A.woff2": {
    "type": "font/woff2",
    "etag": "\"22bc-Z2rEPYVGdg32Cp+fxceBLQ+Ap7k\"",
    "mtime": "2026-07-11T00:08:25.464Z",
    "size": 8892,
    "path": "../public/_fonts/I9T0LQ9YgnidA3gv2WqRNnupdjurYMRHUSozaf8YKS8-uzL4HEVJcWv7MNxyvQlTwCX1yJQUNRD9baZLI82Tb3A.woff2"
  },
  "/_fonts/HwwgQ0xcb747TjrGNPbpw4MPhVloigKstd_HelZeXpo-BJ4c5Tqyq7k5eL4x_CbxVi7wrtRXKLWPpqnw9vJ_9nY.woff2": {
    "type": "font/woff2",
    "etag": "\"1a74-nQIBUtKi93oKKuLBLvyTFS94pEw\"",
    "mtime": "2026-07-11T00:08:25.464Z",
    "size": 6772,
    "path": "../public/_fonts/HwwgQ0xcb747TjrGNPbpw4MPhVloigKstd_HelZeXpo-BJ4c5Tqyq7k5eL4x_CbxVi7wrtRXKLWPpqnw9vJ_9nY.woff2"
  },
  "/_fonts/M9APVqWeTzvVW4qPYRJCmF1rcePZ5S7SBngry5FFRPE-DUaVl8X_g2YsuAyoLBkA9NbbiOfIoAL_D57NjKMsqZ8.woff2": {
    "type": "font/woff2",
    "etag": "\"16f0-PS93/1kyCeu7IT5b4K4jaWHEBbQ\"",
    "mtime": "2026-07-11T00:08:25.465Z",
    "size": 5872,
    "path": "../public/_fonts/M9APVqWeTzvVW4qPYRJCmF1rcePZ5S7SBngry5FFRPE-DUaVl8X_g2YsuAyoLBkA9NbbiOfIoAL_D57NjKMsqZ8.woff2"
  },
  "/_fonts/JH-VglQSpGj5wNtl2VbAG337utVVc3Z-jN7YqyfhVJ4-TxNcdYV7HQpCiSm9Pgt39CSt6pv9a0WErDz5f5_sRA4.woff2": {
    "type": "font/woff2",
    "etag": "\"49ec-HvqHdjQZgmp6U3ahYW+hnU6bwuQ\"",
    "mtime": "2026-07-11T00:08:25.464Z",
    "size": 18924,
    "path": "../public/_fonts/JH-VglQSpGj5wNtl2VbAG337utVVc3Z-jN7YqyfhVJ4-TxNcdYV7HQpCiSm9Pgt39CSt6pv9a0WErDz5f5_sRA4.woff2"
  },
  "/_fonts/UKVJSdtvy1DoKG9D4b2rY5EnFdCWkUUg_Tk4LnF5HEI-m7Qjmpy7C_s6_2ueR3b13FuhqhfqTzOI3VPXjIBZ8kQ.woff2": {
    "type": "font/woff2",
    "etag": "\"2674-1YmcrW5HgRW4aWYn0J/0G9sq/iU\"",
    "mtime": "2026-07-11T00:08:25.464Z",
    "size": 9844,
    "path": "../public/_fonts/UKVJSdtvy1DoKG9D4b2rY5EnFdCWkUUg_Tk4LnF5HEI-m7Qjmpy7C_s6_2ueR3b13FuhqhfqTzOI3VPXjIBZ8kQ.woff2"
  },
  "/_fonts/l87PW7gYrQBvFuIlBDBBpuumCWPK0EySROFPoL9gSIo-hY8Q0hKlLTUrw_MzSSX1eDhdKj3f0XpPunu_3tMuPl8.woff2": {
    "type": "font/woff2",
    "etag": "\"1890-aytKPDH2k4tOt01FONbobtBXOjM\"",
    "mtime": "2026-07-11T00:08:25.465Z",
    "size": 6288,
    "path": "../public/_fonts/l87PW7gYrQBvFuIlBDBBpuumCWPK0EySROFPoL9gSIo-hY8Q0hKlLTUrw_MzSSX1eDhdKj3f0XpPunu_3tMuPl8.woff2"
  },
  "/_fonts/ZJX0G_frSa7aVOdboU5OqQi2dxDmQqfSTRdh6uJyMf4-Id0ZPbT1Vtaz_Vo_lhXBRMzAd3Nz9rSQGCIEBTMAtXM.woff2": {
    "type": "font/woff2",
    "etag": "\"30b4-KS4yXTv5ZVD+RSqrmz1QfQepWOk\"",
    "mtime": "2026-07-11T00:08:25.464Z",
    "size": 12468,
    "path": "../public/_fonts/ZJX0G_frSa7aVOdboU5OqQi2dxDmQqfSTRdh6uJyMf4-Id0ZPbT1Vtaz_Vo_lhXBRMzAd3Nz9rSQGCIEBTMAtXM.woff2"
  },
  "/_fonts/d_9_xcsozg-tYicFoS9kdd_kSP9qO5F-tsV1HOYOrHE-QGwxIgoAZb0u7XwlqFE30tZQnYSj3KurQRhAuEDN6_4.woff2": {
    "type": "font/woff2",
    "etag": "\"2d4c-fu0YPkGe9fMm+9OwyfoMtgRM/Uo\"",
    "mtime": "2026-07-11T00:08:25.465Z",
    "size": 11596,
    "path": "../public/_fonts/d_9_xcsozg-tYicFoS9kdd_kSP9qO5F-tsV1HOYOrHE-QGwxIgoAZb0u7XwlqFE30tZQnYSj3KurQRhAuEDN6_4.woff2"
  },
  "/_fonts/nASo_t82HLcFL0hjY2wGJIeDVSDhmGGSBHuQt1N7u8U-kdshFNu4PTvb1n8YiLDLxfZcX5vdvROSRvgHFcHUmfI.woff2": {
    "type": "font/woff2",
    "etag": "\"5730-y+5yNMHXU+fGP46pvbGch/U3i/s\"",
    "mtime": "2026-07-11T00:08:25.465Z",
    "size": 22320,
    "path": "../public/_fonts/nASo_t82HLcFL0hjY2wGJIeDVSDhmGGSBHuQt1N7u8U-kdshFNu4PTvb1n8YiLDLxfZcX5vdvROSRvgHFcHUmfI.woff2"
  },
  "/css/nuxt-google-fonts.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"2352-n4UAp7ZBuBj1T2/jD7TNoq4R+4Y\"",
    "mtime": "2026-07-11T00:08:25.456Z",
    "size": 9042,
    "path": "../public/css/nuxt-google-fonts.css"
  },
  "/_fonts/oNa6whS7MVbn65pKPXeJ2cWQibvBosy3ZAT0Dohs8I8-FwVnDt7T5Dh2owO1U2jDMuN8ln799r58Pl3hJjRV514.woff2": {
    "type": "font/woff2",
    "etag": "\"680-VWLpaDsPRIda6G1y7XsvdNRkvYg\"",
    "mtime": "2026-07-11T00:08:25.465Z",
    "size": 1664,
    "path": "../public/_fonts/oNa6whS7MVbn65pKPXeJ2cWQibvBosy3ZAT0Dohs8I8-FwVnDt7T5Dh2owO1U2jDMuN8ln799r58Pl3hJjRV514.woff2"
  },
  "/fonts/JetBrains_Mono-normal-400-cyrillic-ext.woff2": {
    "type": "font/woff2",
    "etag": "\"668-/q5XIShVD2LrOrPzUnYqfwzlWQM\"",
    "mtime": "2026-07-11T00:08:25.456Z",
    "size": 1640,
    "path": "../public/fonts/JetBrains_Mono-normal-400-cyrillic-ext.woff2"
  },
  "/_fonts/ze0Foh6luGygtL0NpxDqK3efBIRLH4KO2DVyn61nB6Q-FLcVRU_AraE1eA6WRQQCL1n0v956eOCl81fjzbCJng8.woff2": {
    "type": "font/woff2",
    "etag": "\"2df8-tSLE2RRtdcxcFC+Jot1DPPH8KX8\"",
    "mtime": "2026-07-11T00:08:25.465Z",
    "size": 11768,
    "path": "../public/_fonts/ze0Foh6luGygtL0NpxDqK3efBIRLH4KO2DVyn61nB6Q-FLcVRU_AraE1eA6WRQQCL1n0v956eOCl81fjzbCJng8.woff2"
  },
  "/fonts/JetBrains_Mono-normal-400-greek.woff2": {
    "type": "font/woff2",
    "etag": "\"1ab4-vO254uUoPBuIhSU0jLwsXwe94+w\"",
    "mtime": "2026-07-11T00:08:25.457Z",
    "size": 6836,
    "path": "../public/fonts/JetBrains_Mono-normal-400-greek.woff2"
  },
  "/fonts/JetBrains_Mono-normal-400-latin-ext.woff2": {
    "type": "font/woff2",
    "etag": "\"2d68-Bq02AAzYneyT5DmMW2JWWrHRseI\"",
    "mtime": "2026-07-11T00:08:25.456Z",
    "size": 11624,
    "path": "../public/fonts/JetBrains_Mono-normal-400-latin-ext.woff2"
  },
  "/fonts/JetBrains_Mono-normal-400-cyrillic.woff2": {
    "type": "font/woff2",
    "etag": "\"22a8-nY2y6MzZcjPCL0AMJxGhJCw1tRI\"",
    "mtime": "2026-07-11T00:08:25.457Z",
    "size": 8872,
    "path": "../public/fonts/JetBrains_Mono-normal-400-cyrillic.woff2"
  },
  "/logo.png": {
    "type": "image/png",
    "etag": "\"1be422-g/rBxF8A4izl3/5/vTL/OjYYfh4\"",
    "mtime": "2026-07-11T00:08:25.578Z",
    "size": 1827874,
    "path": "../public/logo.png"
  },
  "/fonts/JetBrains_Mono-normal-400-latin.woff2": {
    "type": "font/woff2",
    "etag": "\"7ac8-TycgbEscr4t4BVl/y8aSL/WAXao\"",
    "mtime": "2026-07-11T00:08:25.456Z",
    "size": 31432,
    "path": "../public/fonts/JetBrains_Mono-normal-400-latin.woff2"
  },
  "/fonts/JetBrains_Mono-normal-400-vietnamese.woff2": {
    "type": "font/woff2",
    "etag": "\"1700-MmqItN278TJfbGZhTwO2+NPcKys\"",
    "mtime": "2026-07-11T00:08:25.456Z",
    "size": 5888,
    "path": "../public/fonts/JetBrains_Mono-normal-400-vietnamese.woff2"
  },
  "/fonts/JetBrains_Mono-normal-600-cyrillic-ext.woff2": {
    "type": "font/woff2",
    "etag": "\"668-/q5XIShVD2LrOrPzUnYqfwzlWQM\"",
    "mtime": "2026-07-11T00:08:25.456Z",
    "size": 1640,
    "path": "../public/fonts/JetBrains_Mono-normal-600-cyrillic-ext.woff2"
  },
  "/fonts/JetBrains_Mono-normal-600-cyrillic.woff2": {
    "type": "font/woff2",
    "etag": "\"22a8-nY2y6MzZcjPCL0AMJxGhJCw1tRI\"",
    "mtime": "2026-07-11T00:08:25.456Z",
    "size": 8872,
    "path": "../public/fonts/JetBrains_Mono-normal-600-cyrillic.woff2"
  },
  "/fonts/JetBrains_Mono-normal-600-greek.woff2": {
    "type": "font/woff2",
    "etag": "\"1ab4-vO254uUoPBuIhSU0jLwsXwe94+w\"",
    "mtime": "2026-07-11T00:08:25.456Z",
    "size": 6836,
    "path": "../public/fonts/JetBrains_Mono-normal-600-greek.woff2"
  },
  "/fonts/JetBrains_Mono-normal-600-latin.woff2": {
    "type": "font/woff2",
    "etag": "\"7ac8-TycgbEscr4t4BVl/y8aSL/WAXao\"",
    "mtime": "2026-07-11T00:08:25.457Z",
    "size": 31432,
    "path": "../public/fonts/JetBrains_Mono-normal-600-latin.woff2"
  },
  "/fonts/JetBrains_Mono-normal-600-vietnamese.woff2": {
    "type": "font/woff2",
    "etag": "\"1700-MmqItN278TJfbGZhTwO2+NPcKys\"",
    "mtime": "2026-07-11T00:08:25.457Z",
    "size": 5888,
    "path": "../public/fonts/JetBrains_Mono-normal-600-vietnamese.woff2"
  },
  "/fonts/JetBrains_Mono-normal-600-latin-ext.woff2": {
    "type": "font/woff2",
    "etag": "\"2d68-Bq02AAzYneyT5DmMW2JWWrHRseI\"",
    "mtime": "2026-07-11T00:08:25.456Z",
    "size": 11624,
    "path": "../public/fonts/JetBrains_Mono-normal-600-latin-ext.woff2"
  },
  "/fonts/Orbitron-normal-500-latin.woff2": {
    "type": "font/woff2",
    "etag": "\"2e18-1obH8r/raTqRuvOqo7bnCqGlvMM\"",
    "mtime": "2026-07-11T00:08:25.457Z",
    "size": 11800,
    "path": "../public/fonts/Orbitron-normal-500-latin.woff2"
  },
  "/fonts/Orbitron-normal-700-latin.woff2": {
    "type": "font/woff2",
    "etag": "\"2e18-1obH8r/raTqRuvOqo7bnCqGlvMM\"",
    "mtime": "2026-07-11T00:08:25.457Z",
    "size": 11800,
    "path": "../public/fonts/Orbitron-normal-700-latin.woff2"
  },
  "/fonts/Orbitron-normal-900-latin.woff2": {
    "type": "font/woff2",
    "etag": "\"2e18-1obH8r/raTqRuvOqo7bnCqGlvMM\"",
    "mtime": "2026-07-11T00:08:25.457Z",
    "size": 11800,
    "path": "../public/fonts/Orbitron-normal-900-latin.woff2"
  },
  "/fonts/Space_Grotesk-normal-400-latin-ext.woff2": {
    "type": "font/woff2",
    "etag": "\"49fc-F0LVbRNUJhx55ziZ6erFdGulAH0\"",
    "mtime": "2026-07-11T00:08:25.457Z",
    "size": 18940,
    "path": "../public/fonts/Space_Grotesk-normal-400-latin-ext.woff2"
  },
  "/fonts/Space_Grotesk-normal-400-latin.woff2": {
    "type": "font/woff2",
    "etag": "\"5710-wHgeovKQE4JtweuNtA9NQA2d9xA\"",
    "mtime": "2026-07-11T00:08:25.457Z",
    "size": 22288,
    "path": "../public/fonts/Space_Grotesk-normal-400-latin.woff2"
  },
  "/fonts/Space_Grotesk-normal-400-vietnamese.woff2": {
    "type": "font/woff2",
    "etag": "\"1a38-xA/sTKWi+gmM69jUei5Rxd5DXqY\"",
    "mtime": "2026-07-11T00:08:25.457Z",
    "size": 6712,
    "path": "../public/fonts/Space_Grotesk-normal-400-vietnamese.woff2"
  },
  "/fonts/Space_Grotesk-normal-500-latin-ext.woff2": {
    "type": "font/woff2",
    "etag": "\"49fc-F0LVbRNUJhx55ziZ6erFdGulAH0\"",
    "mtime": "2026-07-11T00:08:25.457Z",
    "size": 18940,
    "path": "../public/fonts/Space_Grotesk-normal-500-latin-ext.woff2"
  },
  "/fonts/Space_Grotesk-normal-500-latin.woff2": {
    "type": "font/woff2",
    "etag": "\"5710-wHgeovKQE4JtweuNtA9NQA2d9xA\"",
    "mtime": "2026-07-11T00:08:25.457Z",
    "size": 22288,
    "path": "../public/fonts/Space_Grotesk-normal-500-latin.woff2"
  },
  "/fonts/Space_Grotesk-normal-700-latin-ext.woff2": {
    "type": "font/woff2",
    "etag": "\"49fc-F0LVbRNUJhx55ziZ6erFdGulAH0\"",
    "mtime": "2026-07-11T00:08:25.457Z",
    "size": 18940,
    "path": "../public/fonts/Space_Grotesk-normal-700-latin-ext.woff2"
  },
  "/fonts/Space_Grotesk-normal-700-latin.woff2": {
    "type": "font/woff2",
    "etag": "\"5710-wHgeovKQE4JtweuNtA9NQA2d9xA\"",
    "mtime": "2026-07-11T00:08:25.457Z",
    "size": 22288,
    "path": "../public/fonts/Space_Grotesk-normal-700-latin.woff2"
  },
  "/fonts/Space_Grotesk-normal-500-vietnamese.woff2": {
    "type": "font/woff2",
    "etag": "\"1a38-xA/sTKWi+gmM69jUei5Rxd5DXqY\"",
    "mtime": "2026-07-11T00:08:25.457Z",
    "size": 6712,
    "path": "../public/fonts/Space_Grotesk-normal-500-vietnamese.woff2"
  },
  "/fonts/Space_Grotesk-normal-700-vietnamese.woff2": {
    "type": "font/woff2",
    "etag": "\"1a38-xA/sTKWi+gmM69jUei5Rxd5DXqY\"",
    "mtime": "2026-07-11T00:08:25.457Z",
    "size": 6712,
    "path": "../public/fonts/Space_Grotesk-normal-700-vietnamese.woff2"
  },
  "/_nuxt/-30QC5Em.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"30ff-QB21Px5f9HaxTs766Fosy7DyORA\"",
    "mtime": "2026-07-11T00:08:25.573Z",
    "size": 12543,
    "path": "../public/_nuxt/-30QC5Em.js"
  },
  "/_nuxt/-71hrkjd.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"caf-QJtnbRdtshgtFh/vHENl7M1JID4\"",
    "mtime": "2026-07-11T00:08:25.573Z",
    "size": 3247,
    "path": "../public/_nuxt/-71hrkjd.js"
  },
  "/_nuxt/0BrjI7ue.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5897-ez1+5a0KYfTxDDOyUu2FLMTvdFg\"",
    "mtime": "2026-07-11T00:08:25.491Z",
    "size": 22679,
    "path": "../public/_nuxt/0BrjI7ue.js"
  },
  "/_nuxt/0tnnb70N.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"72393-0dDeHbTkw1JufHVIcsvFteegjTs\"",
    "mtime": "2026-07-11T00:08:25.491Z",
    "size": 467859,
    "path": "../public/_nuxt/0tnnb70N.js"
  },
  "/_nuxt/18nnIw3L.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5b23-0+LIlgd/9H6l41bnc5LwJGNjSdo\"",
    "mtime": "2026-07-11T00:08:25.491Z",
    "size": 23331,
    "path": "../public/_nuxt/18nnIw3L.js"
  },
  "/_nuxt/2V0Ap-uE.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2942-vmrQshSSN1my18bn7Wk5GyeP4ak\"",
    "mtime": "2026-07-11T00:08:25.491Z",
    "size": 10562,
    "path": "../public/_nuxt/2V0Ap-uE.js"
  },
  "/_nuxt/3e1v2bzS.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"244f-x//k8Ln2Mu2aG+nMmuAM/ZSHTfI\"",
    "mtime": "2026-07-11T00:08:25.491Z",
    "size": 9295,
    "path": "../public/_nuxt/3e1v2bzS.js"
  },
  "/_nuxt/3xVqZejG.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"990-Hlt1V2zfwpGD9qtoOw2FZ+/Qtiw\"",
    "mtime": "2026-07-11T00:08:25.491Z",
    "size": 2448,
    "path": "../public/_nuxt/3xVqZejG.js"
  },
  "/_nuxt/5LuOXUq_.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"941-uDzCEo95yMEqu18z48E0TV4rICs\"",
    "mtime": "2026-07-11T00:08:25.491Z",
    "size": 2369,
    "path": "../public/_nuxt/5LuOXUq_.js"
  },
  "/_nuxt/5VRXFx8D.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"291-26nFO1Pimt0/cJI9mIZIJDhW22A\"",
    "mtime": "2026-07-11T00:08:25.491Z",
    "size": 657,
    "path": "../public/_nuxt/5VRXFx8D.js"
  },
  "/_nuxt/727ZlQH0.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"bd92-eqknrr8A2eGD7JvLwaNuB8kS5Wg\"",
    "mtime": "2026-07-11T00:08:25.491Z",
    "size": 48530,
    "path": "../public/_nuxt/727ZlQH0.js"
  },
  "/_nuxt/7A4Fjokl.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"8b1-QLWy+rOMGxhTE+ERnnV+IFj++qM\"",
    "mtime": "2026-07-11T00:08:25.491Z",
    "size": 2225,
    "path": "../public/_nuxt/7A4Fjokl.js"
  },
  "/_nuxt/8jXJkYXT.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"196e-tVFZgvEJP9u6sS1zRf+JM9e+rUA\"",
    "mtime": "2026-07-11T00:08:25.491Z",
    "size": 6510,
    "path": "../public/_nuxt/8jXJkYXT.js"
  },
  "/_nuxt/6SJjfTtx.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1c524-2ohswFZcTLrRFkrxm8DlljKxCNI\"",
    "mtime": "2026-07-11T00:08:25.491Z",
    "size": 116004,
    "path": "../public/_nuxt/6SJjfTtx.js"
  },
  "/_nuxt/9C6ErRqt.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"8b88-XWtzjmo7KcTihMFHw1hzx43cmG8\"",
    "mtime": "2026-07-11T00:08:25.491Z",
    "size": 35720,
    "path": "../public/_nuxt/9C6ErRqt.js"
  },
  "/_nuxt/B-ZpsSJ7.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"8f-G68zRjJ3nyv0MaWKAYeJH8eeXj8\"",
    "mtime": "2026-07-11T00:08:25.491Z",
    "size": 143,
    "path": "../public/_nuxt/B-ZpsSJ7.js"
  },
  "/_nuxt/B-KVkF-I.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"a742-IG0CeU42Yh7sTu83VL40aIvJ3z4\"",
    "mtime": "2026-07-11T00:08:25.491Z",
    "size": 42818,
    "path": "../public/_nuxt/B-KVkF-I.js"
  },
  "/_nuxt/B-mgUFnI.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"224-asoOmDwAwiYAQ4pK/O1aryYsDYQ\"",
    "mtime": "2026-07-11T00:08:25.491Z",
    "size": 548,
    "path": "../public/_nuxt/B-mgUFnI.js"
  },
  "/_nuxt/B0XVJmRM.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"f76-CsdCyHhmts+bBOc+qOK8L5UQmAc\"",
    "mtime": "2026-07-11T00:08:25.491Z",
    "size": 3958,
    "path": "../public/_nuxt/B0XVJmRM.js"
  },
  "/_nuxt/B0m2ddpp.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"48ca-vlOlJTQln4FlkoNCT6son9MOgUc\"",
    "mtime": "2026-07-11T00:08:25.492Z",
    "size": 18634,
    "path": "../public/_nuxt/B0m2ddpp.js"
  },
  "/_nuxt/B0qRVHPH.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"4c7-bCo2e81Ha7jwjmZrwn7sAlSRkZ0\"",
    "mtime": "2026-07-11T00:08:25.492Z",
    "size": 1223,
    "path": "../public/_nuxt/B0qRVHPH.js"
  },
  "/_nuxt/B-_AxZdj.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"15cdd-MNDvB8fzDCc1ciwChdE4ycBNU7c\"",
    "mtime": "2026-07-11T00:08:25.491Z",
    "size": 89309,
    "path": "../public/_nuxt/B-_AxZdj.js"
  },
  "/_nuxt/B14Poo8t.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"187a-HFhu2XXol/08/TUSjZmogEcYe7E\"",
    "mtime": "2026-07-11T00:08:25.492Z",
    "size": 6266,
    "path": "../public/_nuxt/B14Poo8t.js"
  },
  "/_nuxt/B1bQXN8T.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2972-BRwlM60SLnBHGK3aBF5NLsVSB4o\"",
    "mtime": "2026-07-11T00:08:25.492Z",
    "size": 10610,
    "path": "../public/_nuxt/B1bQXN8T.js"
  },
  "/_nuxt/B3EhbZwq.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"11574-n0SW4Cz5qmiRycsFNZgx0rhrknA\"",
    "mtime": "2026-07-11T00:08:25.492Z",
    "size": 71028,
    "path": "../public/_nuxt/B3EhbZwq.js"
  },
  "/_nuxt/B3ZDOciz.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1974-HKAJmz8oM9Ow4TLrtYDUpCniZvo\"",
    "mtime": "2026-07-11T00:08:25.495Z",
    "size": 6516,
    "path": "../public/_nuxt/B3ZDOciz.js"
  },
  "/_nuxt/B430Bg39.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"a7e-s7+gJ3g+jU5Jc706I2cjYhKrPvo\"",
    "mtime": "2026-07-11T00:08:25.495Z",
    "size": 2686,
    "path": "../public/_nuxt/B430Bg39.js"
  },
  "/_nuxt/B48N-Iqd.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"18f2-/labr3PARfCXOkX/2kdjG7jZ7yA\"",
    "mtime": "2026-07-11T00:08:25.492Z",
    "size": 6386,
    "path": "../public/_nuxt/B48N-Iqd.js"
  },
  "/_nuxt/B5lbUyaz.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2274-05SYT5iCRUCd1F0IFC1yAYQc7Is\"",
    "mtime": "2026-07-11T00:08:25.495Z",
    "size": 8820,
    "path": "../public/_nuxt/B5lbUyaz.js"
  },
  "/_nuxt/B6U2uXNT.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"23a4-a7aOW7/idnEaVA4lIN11CgBvsPw\"",
    "mtime": "2026-07-11T00:08:25.495Z",
    "size": 9124,
    "path": "../public/_nuxt/B6U2uXNT.js"
  },
  "/_nuxt/B6p5osk3.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1e5-faDUV/fkZXdKV5GyrzTp/b5BeNE\"",
    "mtime": "2026-07-11T00:08:25.495Z",
    "size": 485,
    "path": "../public/_nuxt/B6p5osk3.js"
  },
  "/_nuxt/B6W0miNI.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"30860-clSlVRIEln5J0TKi23yN7Ppckyk\"",
    "mtime": "2026-07-11T00:08:25.495Z",
    "size": 198752,
    "path": "../public/_nuxt/B6W0miNI.js"
  },
  "/_nuxt/B7dNTLlj.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"350-0Q6ySqd+gTLmjR7BfNK1XFKhihA\"",
    "mtime": "2026-07-11T00:08:25.495Z",
    "size": 848,
    "path": "../public/_nuxt/B7dNTLlj.js"
  },
  "/_nuxt/B7mTdjB0.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"26d5-Zx7qpUhhqjqkejhteLDsh7vIk0c\"",
    "mtime": "2026-07-11T00:08:25.497Z",
    "size": 9941,
    "path": "../public/_nuxt/B7mTdjB0.js"
  },
  "/_nuxt/B9Djafry.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"428-DjRJdJgpH12vEZTSVcHHYY4ux8Q\"",
    "mtime": "2026-07-11T00:08:25.497Z",
    "size": 1064,
    "path": "../public/_nuxt/B9Djafry.js"
  },
  "/_nuxt/B9wLZaAG.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1ed2-TCk/Iq+iuge27FFP0qmL4dCR4xg\"",
    "mtime": "2026-07-11T00:08:25.497Z",
    "size": 7890,
    "path": "../public/_nuxt/B9wLZaAG.js"
  },
  "/_nuxt/BAxNRJcx.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1c91-7+OiQ2EYouSP/x9Vu6g4qDSB6vU\"",
    "mtime": "2026-07-11T00:08:25.499Z",
    "size": 7313,
    "path": "../public/_nuxt/BAxNRJcx.js"
  },
  "/_nuxt/BBT0u3iQ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5cd8-UasA4b1ZmjprIlqfcTbK3Al1BNc\"",
    "mtime": "2026-07-11T00:08:25.499Z",
    "size": 23768,
    "path": "../public/_nuxt/BBT0u3iQ.js"
  },
  "/_nuxt/BAng5TT0.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"31130-GUiGNuxza4CWadEWwPBI9YnCi60\"",
    "mtime": "2026-07-11T00:08:25.497Z",
    "size": 201008,
    "path": "../public/_nuxt/BAng5TT0.js"
  },
  "/_nuxt/BEBZ7ncR.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3177-p46lCR3NVE6Z8EGnmn+1cIjrrA4\"",
    "mtime": "2026-07-11T00:08:25.499Z",
    "size": 12663,
    "path": "../public/_nuxt/BEBZ7ncR.js"
  },
  "/_nuxt/BCMa2Tx6.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"e88d-OYG0gCBd4KaPr3OTQFlckaXBKcg\"",
    "mtime": "2026-07-11T00:08:25.497Z",
    "size": 59533,
    "path": "../public/_nuxt/BCMa2Tx6.js"
  },
  "/_nuxt/BDiHrqA7.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"dd72-wWnTgM8pKV3OBW0Co8vO61p4goY\"",
    "mtime": "2026-07-11T00:08:25.499Z",
    "size": 56690,
    "path": "../public/_nuxt/BDiHrqA7.js"
  },
  "/_nuxt/BEXe_H9E.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1e7-EaLOaQ+FyftIO3+DIMgu9s7ltG0\"",
    "mtime": "2026-07-11T00:08:25.500Z",
    "size": 487,
    "path": "../public/_nuxt/BEXe_H9E.js"
  },
  "/_nuxt/BElHTdrZ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"cde-Ay3+N8WWIdWSX6e00urWsS1UVR8\"",
    "mtime": "2026-07-11T00:08:25.500Z",
    "size": 3294,
    "path": "../public/_nuxt/BElHTdrZ.js"
  },
  "/_nuxt/BEldekNZ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"b7a-o1eimlHBN72zBs7Tsc66P3PJIzo\"",
    "mtime": "2026-07-11T00:08:25.499Z",
    "size": 2938,
    "path": "../public/_nuxt/BEldekNZ.js"
  },
  "/_nuxt/BFOHcciG.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"d4c-Vf2EQoiOX9yVgGeD+J3EcnXMjkA\"",
    "mtime": "2026-07-11T00:08:25.499Z",
    "size": 3404,
    "path": "../public/_nuxt/BFOHcciG.js"
  },
  "/_nuxt/BGefuGAX.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1c7-0/4o37nyfiphqISYw/tUtY2FXSE\"",
    "mtime": "2026-07-11T00:08:25.500Z",
    "size": 455,
    "path": "../public/_nuxt/BGefuGAX.js"
  },
  "/_nuxt/BGw8NMxW.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"e9e-QAGo3kzT43se8OUUUm8c23WP7zQ\"",
    "mtime": "2026-07-11T00:08:25.500Z",
    "size": 3742,
    "path": "../public/_nuxt/BGw8NMxW.js"
  },
  "/_nuxt/BH7q4OAL.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2aae-Vq1RI7tieeKLciNNsT6LQ8p1vW8\"",
    "mtime": "2026-07-11T00:08:25.500Z",
    "size": 10926,
    "path": "../public/_nuxt/BH7q4OAL.js"
  },
  "/_nuxt/BHyGnp0Z.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"152d-seFU9RVHpsX8P2T4XNqsODlpIfw\"",
    "mtime": "2026-07-11T00:08:25.500Z",
    "size": 5421,
    "path": "../public/_nuxt/BHyGnp0Z.js"
  },
  "/_nuxt/BHa5KS5U.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1ffbf-LurvoW2teAX513qZWhtUOGCXbe4\"",
    "mtime": "2026-07-11T00:08:25.500Z",
    "size": 131007,
    "path": "../public/_nuxt/BHa5KS5U.js"
  },
  "/_nuxt/BIVihCr_.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"71a6-Qk/QTScCA69hJSO8zh3ekF8jLPw\"",
    "mtime": "2026-07-11T00:08:25.500Z",
    "size": 29094,
    "path": "../public/_nuxt/BIVihCr_.js"
  },
  "/_nuxt/BK6fZMoA.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"229-H6nL38LwvNfwythqTe3AMx9tos0\"",
    "mtime": "2026-07-11T00:08:25.500Z",
    "size": 553,
    "path": "../public/_nuxt/BK6fZMoA.js"
  },
  "/_nuxt/BL8-f2kh.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1b12-1dHZm9YASWmabQARdJ3Ft/Pxf94\"",
    "mtime": "2026-07-11T00:08:25.500Z",
    "size": 6930,
    "path": "../public/_nuxt/BL8-f2kh.js"
  },
  "/_nuxt/BLCLeV30.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"ce9-HtrGwR2xcBidBKRf+i87+vQaGvk\"",
    "mtime": "2026-07-11T00:08:25.500Z",
    "size": 3305,
    "path": "../public/_nuxt/BLCLeV30.js"
  },
  "/_nuxt/BLmoVg8f.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"10a4-UpEyOfkQif5QySfBZ7Csh3FmT7E\"",
    "mtime": "2026-07-11T00:08:25.500Z",
    "size": 4260,
    "path": "../public/_nuxt/BLmoVg8f.js"
  },
  "/_nuxt/BMR_PYu6.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"e82-6Tn8gYRwl5AEDyusLBpHqJKNDV4\"",
    "mtime": "2026-07-11T00:08:25.500Z",
    "size": 3714,
    "path": "../public/_nuxt/BMR_PYu6.js"
  },
  "/_nuxt/BMj5Y0dO.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"b0c-rsarcEHiZnYMrAmKQkQ/i/2Kin4\"",
    "mtime": "2026-07-11T00:08:25.501Z",
    "size": 2828,
    "path": "../public/_nuxt/BMj5Y0dO.js"
  },
  "/_nuxt/BN_7HF1G.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"441-ZV8sW3gOP/trsjwfLG+C3bIiqms\"",
    "mtime": "2026-07-11T00:08:25.501Z",
    "size": 1089,
    "path": "../public/_nuxt/BN_7HF1G.js"
  },
  "/_nuxt/BNNjeUv4.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"9452-+CIkg5oCpNrPYpwRF1KqSIh30jg\"",
    "mtime": "2026-07-11T00:08:25.501Z",
    "size": 37970,
    "path": "../public/_nuxt/BNNjeUv4.js"
  },
  "/_nuxt/BNioltXt.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"10149-OZvvpFEK66mofZ+3oi0dLDaRaTE\"",
    "mtime": "2026-07-11T00:08:25.501Z",
    "size": 65865,
    "path": "../public/_nuxt/BNioltXt.js"
  },
  "/_nuxt/BPhBrDlE.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"d227-7oRpJucwQoOcqa/utG1Tc2TMc4s\"",
    "mtime": "2026-07-11T00:08:25.501Z",
    "size": 53799,
    "path": "../public/_nuxt/BPhBrDlE.js"
  },
  "/_nuxt/BQlqUABK.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"d6-reZgX5ViHowwX/BCQ8omZMjuSGw\"",
    "mtime": "2026-07-11T00:08:25.501Z",
    "size": 214,
    "path": "../public/_nuxt/BQlqUABK.js"
  },
  "/_nuxt/BR-em8mT.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"164-1cAYC9+r4gpWTeqDXuH3gqf2liY\"",
    "mtime": "2026-07-11T00:08:25.502Z",
    "size": 356,
    "path": "../public/_nuxt/BR-em8mT.js"
  },
  "/_nuxt/BR4n0CG2.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"18d14-dUEnHx5ePOPMRkLxAY3XcJ9Ho3I\"",
    "mtime": "2026-07-11T00:08:25.501Z",
    "size": 101652,
    "path": "../public/_nuxt/BR4n0CG2.js"
  },
  "/_nuxt/BSPKv24A.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2aa8-TPfNHlVAMsnoUcW16HbSurzGWQo\"",
    "mtime": "2026-07-11T00:08:25.502Z",
    "size": 10920,
    "path": "../public/_nuxt/BSPKv24A.js"
  },
  "/_nuxt/BSZK70gZ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1db-kwO7vWcGYk2qQQ/r/0YA+XokNfc\"",
    "mtime": "2026-07-11T00:08:25.502Z",
    "size": 475,
    "path": "../public/_nuxt/BSZK70gZ.js"
  },
  "/_nuxt/BTyfyO2D.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"249-IvBm4WADRGW2jMUIu726dlK9HXE\"",
    "mtime": "2026-07-11T00:08:25.502Z",
    "size": 585,
    "path": "../public/_nuxt/BTyfyO2D.js"
  },
  "/_nuxt/BSxZ-RaX.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"16371-aztFhFxt2yUng63YlKd+l1cCNI4\"",
    "mtime": "2026-07-11T00:08:25.502Z",
    "size": 90993,
    "path": "../public/_nuxt/BSxZ-RaX.js"
  },
  "/_nuxt/BVIdOyMO.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3c3-bBtQlUV6guBbHLM4OlNE6VIpgwI\"",
    "mtime": "2026-07-11T00:08:25.504Z",
    "size": 963,
    "path": "../public/_nuxt/BVIdOyMO.js"
  },
  "/_nuxt/BVqe9Hv-.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3d06-QlU8d0hmhJBuZyktEngYxFhDKnw\"",
    "mtime": "2026-07-11T00:08:25.504Z",
    "size": 15622,
    "path": "../public/_nuxt/BVqe9Hv-.js"
  },
  "/_nuxt/BW9cVz29.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"a3-GkaY3+M1+VVLjsGybnWMMCsVMXQ\"",
    "mtime": "2026-07-11T00:08:25.504Z",
    "size": 163,
    "path": "../public/_nuxt/BW9cVz29.js"
  },
  "/_nuxt/BWx0ALLs.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1a4de-LhnVG/T+V4xb39yD3Sd4XmjOoYM\"",
    "mtime": "2026-07-11T00:08:25.504Z",
    "size": 107742,
    "path": "../public/_nuxt/BWx0ALLs.js"
  },
  "/_nuxt/BXW1EomU.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"41d4-afRa1Af5ALuxquZ9J4ppG5EpLuo\"",
    "mtime": "2026-07-11T00:08:25.504Z",
    "size": 16852,
    "path": "../public/_nuxt/BXW1EomU.js"
  },
  "/_nuxt/BXkSAIEj.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5254-Axn1fQr9TF+GkmVdLvo6H+JJ8B8\"",
    "mtime": "2026-07-11T00:08:25.504Z",
    "size": 21076,
    "path": "../public/_nuxt/BXkSAIEj.js"
  },
  "/_nuxt/BXl-Qilg.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5082-V3rCSD+aLdU9UKo/5ptUr5wiblA\"",
    "mtime": "2026-07-11T00:08:25.504Z",
    "size": 20610,
    "path": "../public/_nuxt/BXl-Qilg.js"
  },
  "/_nuxt/BY-TUvya.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2caf-kNeZk1pQxeUhEolqA/pnTpYnalE\"",
    "mtime": "2026-07-11T00:08:25.504Z",
    "size": 11439,
    "path": "../public/_nuxt/BY-TUvya.js"
  },
  "/_nuxt/BYGMYjIz.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1afb5-dwyua/0/D9YfJK3cNvOycLsFtTk\"",
    "mtime": "2026-07-11T00:08:25.505Z",
    "size": 110517,
    "path": "../public/_nuxt/BYGMYjIz.js"
  },
  "/_nuxt/BX77sIaO.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"c4742-yOsnIvIUkWn2bG9UJ70auexRguo\"",
    "mtime": "2026-07-11T00:08:25.505Z",
    "size": 804674,
    "path": "../public/_nuxt/BX77sIaO.js"
  },
  "/_nuxt/BZ4qjH1z.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3d45-eo7xvd7AvLBvmBIPqY7OVBEcy3U\"",
    "mtime": "2026-07-11T00:08:25.505Z",
    "size": 15685,
    "path": "../public/_nuxt/BZ4qjH1z.js"
  },
  "/_nuxt/BZNqjX7T.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1072-j2yVqLnr3V4BwnakxCcbn9l49jQ\"",
    "mtime": "2026-07-11T00:08:25.505Z",
    "size": 4210,
    "path": "../public/_nuxt/BZNqjX7T.js"
  },
  "/_nuxt/B_7mSSNY.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"377f-i/qj0UU+KqBDkAtv487cOQaqlpY\"",
    "mtime": "2026-07-11T00:08:25.505Z",
    "size": 14207,
    "path": "../public/_nuxt/B_7mSSNY.js"
  },
  "/_nuxt/B_m7g4N7.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2e3-vD9JpGY0mKtBCmzkjdIj7UVuzls\"",
    "mtime": "2026-07-11T00:08:25.505Z",
    "size": 739,
    "path": "../public/_nuxt/B_m7g4N7.js"
  },
  "/_nuxt/Ba6QCfRf.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"21c1-ygmg66KM172kutD+AIsFI6Yv2OA\"",
    "mtime": "2026-07-11T00:08:25.505Z",
    "size": 8641,
    "path": "../public/_nuxt/Ba6QCfRf.js"
  },
  "/_nuxt/Bb3zte0I.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"6ea-xmCIf2AzQJbWWNU7ndpQ6lngkUM\"",
    "mtime": "2026-07-11T00:08:25.505Z",
    "size": 1770,
    "path": "../public/_nuxt/Bb3zte0I.js"
  },
  "/_nuxt/Bbt-fWo2.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1529-Er9ERPi46pPRXes0sddJfbtHx3M\"",
    "mtime": "2026-07-11T00:08:25.505Z",
    "size": 5417,
    "path": "../public/_nuxt/Bbt-fWo2.js"
  },
  "/_nuxt/BceOnUsB.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3b6-765eQJ6KC54vKPoedwpkFelvvcw\"",
    "mtime": "2026-07-11T00:08:25.505Z",
    "size": 950,
    "path": "../public/_nuxt/BceOnUsB.js"
  },
  "/_nuxt/BcOcwvcX.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"6cd-68IbxZPtS8UtKOhcJpPOx3Qxas4\"",
    "mtime": "2026-07-11T00:08:25.505Z",
    "size": 1741,
    "path": "../public/_nuxt/BcOcwvcX.js"
  },
  "/_nuxt/Bcj-8uw3.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1026-iOO/3EZ5SkiveuuyLHMasdEDWI0\"",
    "mtime": "2026-07-11T00:08:25.506Z",
    "size": 4134,
    "path": "../public/_nuxt/Bcj-8uw3.js"
  },
  "/_nuxt/Bea5r5my.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"790-a8zzTm7XFSj/cxDaFoDBXmV8qlc\"",
    "mtime": "2026-07-11T00:08:25.506Z",
    "size": 1936,
    "path": "../public/_nuxt/Bea5r5my.js"
  },
  "/_nuxt/BePggyXU.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"d7b-z8oHucw06v/w8JetMC1TeXP5jHU\"",
    "mtime": "2026-07-11T00:08:25.506Z",
    "size": 3451,
    "path": "../public/_nuxt/BePggyXU.js"
  },
  "/_nuxt/BekpkmYp.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"4c71-9NpXu4I48M/9td8eqd+PTX47LXw\"",
    "mtime": "2026-07-11T00:08:25.506Z",
    "size": 19569,
    "path": "../public/_nuxt/BekpkmYp.js"
  },
  "/_nuxt/BfHTSMKl.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"48c5-2KtadDLdcujxXy8y4Bt2hElnnOs\"",
    "mtime": "2026-07-11T00:08:25.506Z",
    "size": 18629,
    "path": "../public/_nuxt/BfHTSMKl.js"
  },
  "/_nuxt/BfivnA6A.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"e2e-1vSxfI5qn55fmHTjAfe3rPd6nPI\"",
    "mtime": "2026-07-11T00:08:25.506Z",
    "size": 3630,
    "path": "../public/_nuxt/BfivnA6A.js"
  },
  "/_nuxt/BfjtVDDH.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"37c3-xDmtEk31qK1Bh5UReLYFJAKxJ5I\"",
    "mtime": "2026-07-11T00:08:25.506Z",
    "size": 14275,
    "path": "../public/_nuxt/BfjtVDDH.js"
  },
  "/_nuxt/BfyMTAb-.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"f76-Atz+0LScbRXHYLN5TIyAXjKMOWA\"",
    "mtime": "2026-07-11T00:08:25.506Z",
    "size": 3958,
    "path": "../public/_nuxt/BfyMTAb-.js"
  },
  "/_nuxt/Bg-kzb6g.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"42cc-ZfEyzxkJqc0pjpjl3amzX4d7vVY\"",
    "mtime": "2026-07-11T00:08:25.506Z",
    "size": 17100,
    "path": "../public/_nuxt/Bg-kzb6g.js"
  },
  "/_nuxt/BgDCqdQA.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"d1f1-Hu9sPs6I5PgTPGWd3WR7nOwmRy8\"",
    "mtime": "2026-07-11T00:08:25.506Z",
    "size": 53745,
    "path": "../public/_nuxt/BgDCqdQA.js"
  },
  "/_nuxt/BhnmgLaA.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1b5-KkCskPZxmPh/fjPg+5kh87PyZp0\"",
    "mtime": "2026-07-11T00:08:25.506Z",
    "size": 437,
    "path": "../public/_nuxt/BhnmgLaA.js"
  },
  "/_nuxt/BgGcmPoh.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"26d2-LMvEVJeMJzyUSukM53nHZ7MB8/A\"",
    "mtime": "2026-07-11T00:08:25.506Z",
    "size": 9938,
    "path": "../public/_nuxt/BgGcmPoh.js"
  },
  "/_nuxt/Bi2Xjx-o.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5860-8g8nJ/Y+gPJI4dyS2VlU5x6LCcY\"",
    "mtime": "2026-07-11T00:08:25.507Z",
    "size": 22624,
    "path": "../public/_nuxt/Bi2Xjx-o.js"
  },
  "/_nuxt/Bid6LQhH.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1525-pwFNOEh4bBHlm7L4L63ahqwAoMI\"",
    "mtime": "2026-07-11T00:08:25.506Z",
    "size": 5413,
    "path": "../public/_nuxt/Bid6LQhH.js"
  },
  "/_nuxt/BixDBq5F.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"4cc2-q6mGSZMV6EsZB+Kzp64Pcwyqxec\"",
    "mtime": "2026-07-11T00:08:25.507Z",
    "size": 19650,
    "path": "../public/_nuxt/BixDBq5F.js"
  },
  "/_nuxt/BjABl1g7.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5f9-jBh85NrAGgqEDiS4a/QPtcdsy1M\"",
    "mtime": "2026-07-11T00:08:25.507Z",
    "size": 1529,
    "path": "../public/_nuxt/BjABl1g7.js"
  },
  "/_nuxt/Bjjh7dxw.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3cd7-b2oU9tgnsmDhNCBlcWBvR/sxko4\"",
    "mtime": "2026-07-11T00:08:25.507Z",
    "size": 15575,
    "path": "../public/_nuxt/Bjjh7dxw.js"
  },
  "/_nuxt/BkR1g5rb.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"9deb-W0UFYAdunwvxssF7OuzFts0DYVs\"",
    "mtime": "2026-07-11T00:08:25.507Z",
    "size": 40427,
    "path": "../public/_nuxt/BkR1g5rb.js"
  },
  "/_nuxt/BkAjWTeq.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1af-HVQySEneN2EOkQ2Kz106nJE5A1Q\"",
    "mtime": "2026-07-11T00:08:25.507Z",
    "size": 431,
    "path": "../public/_nuxt/BkAjWTeq.js"
  },
  "/_nuxt/BkXQ1mdx.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1b38-861YxgE8R02ax1QPQAxJBCgbWwQ\"",
    "mtime": "2026-07-11T00:08:25.507Z",
    "size": 6968,
    "path": "../public/_nuxt/BkXQ1mdx.js"
  },
  "/_nuxt/BknIz3MU.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"e18-13MAt3uHXNsH+CLV8pBjeujxdJE\"",
    "mtime": "2026-07-11T00:08:25.507Z",
    "size": 3608,
    "path": "../public/_nuxt/BknIz3MU.js"
  },
  "/_nuxt/Bkuqu6BP.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"356d-zBk2O671hcu14yjA5BaP8bRgML4\"",
    "mtime": "2026-07-11T00:08:25.509Z",
    "size": 13677,
    "path": "../public/_nuxt/Bkuqu6BP.js"
  },
  "/_nuxt/Bl1h29GH.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"6dda-KR7moiOSv5mmnY4RU5K0FwDZ51o\"",
    "mtime": "2026-07-11T00:08:25.507Z",
    "size": 28122,
    "path": "../public/_nuxt/Bl1h29GH.js"
  },
  "/_nuxt/Blx2zv3z.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"4b9f-m7lMX7snf2Y6OvFRwIq4mswzOlY\"",
    "mtime": "2026-07-11T00:08:25.509Z",
    "size": 19359,
    "path": "../public/_nuxt/Blx2zv3z.js"
  },
  "/_nuxt/BnLMxUhr.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5de0-msGNWm73GDpdj4J3+gIHER4DMVw\"",
    "mtime": "2026-07-11T00:08:25.509Z",
    "size": 24032,
    "path": "../public/_nuxt/BnLMxUhr.js"
  },
  "/_nuxt/Bm4kZqKn.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"175-VXUnvIEwHynhYkuKzujAuDiymME\"",
    "mtime": "2026-07-11T00:08:25.509Z",
    "size": 373,
    "path": "../public/_nuxt/Bm4kZqKn.js"
  },
  "/_nuxt/BnZ6J9ez.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"b83-X8zyVI1TQ3BmtINVQBSWTNgjjQA\"",
    "mtime": "2026-07-11T00:08:25.509Z",
    "size": 2947,
    "path": "../public/_nuxt/BnZ6J9ez.js"
  },
  "/_nuxt/Bn_MhANv.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"4eec-QTpbBu3t/qIZsrYIz4CZbwDoXmQ\"",
    "mtime": "2026-07-11T00:08:25.509Z",
    "size": 20204,
    "path": "../public/_nuxt/Bn_MhANv.js"
  },
  "/_nuxt/BoXegm-a.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"a805-uJ70b2/MAZJJv+j22+eZeodXKVE\"",
    "mtime": "2026-07-11T00:08:25.509Z",
    "size": 43013,
    "path": "../public/_nuxt/BoXegm-a.js"
  },
  "/_nuxt/Bp6g37R7.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"223-LScnQcrupWjGOHlgVTaKyfzcpy0\"",
    "mtime": "2026-07-11T00:08:25.509Z",
    "size": 547,
    "path": "../public/_nuxt/Bp6g37R7.js"
  },
  "/_nuxt/BsIVKMMn.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"151f-qJyXU28oPqRNBJXDTzPFltZPqlg\"",
    "mtime": "2026-07-11T00:08:25.513Z",
    "size": 5407,
    "path": "../public/_nuxt/BsIVKMMn.js"
  },
  "/_nuxt/BpWG_bgh.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"6e1d-0y2eGpCS5V1+2izLvykvaXM8sjg\"",
    "mtime": "2026-07-11T00:08:25.509Z",
    "size": 28189,
    "path": "../public/_nuxt/BpWG_bgh.js"
  },
  "/_nuxt/BthQWCQV.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"239d-LHMBsyUFh86qGFvM+u7t3WkZtbw\"",
    "mtime": "2026-07-11T00:08:25.509Z",
    "size": 9117,
    "path": "../public/_nuxt/BthQWCQV.js"
  },
  "/_nuxt/BuJUQPs5.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"256-2KAbd+9Z3F6hYVn17ust0d8pY2s\"",
    "mtime": "2026-07-11T00:08:25.513Z",
    "size": 598,
    "path": "../public/_nuxt/BuJUQPs5.js"
  },
  "/_nuxt/BuRtvsFT.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"305-QR1k83YkuJ1drfaRYAq4QRI6dBk\"",
    "mtime": "2026-07-11T00:08:25.513Z",
    "size": 773,
    "path": "../public/_nuxt/BuRtvsFT.js"
  },
  "/_nuxt/BukwYBQj.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"ba-NdhBcLsaCSCIHKhwMZ6plQYZFK4\"",
    "mtime": "2026-07-11T00:08:25.513Z",
    "size": 186,
    "path": "../public/_nuxt/BukwYBQj.js"
  },
  "/_nuxt/Bvotw-X0.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2336-GmoXUksPv3fKmcdAsQBdlR5ZpvU\"",
    "mtime": "2026-07-11T00:08:25.513Z",
    "size": 9014,
    "path": "../public/_nuxt/Bvotw-X0.js"
  },
  "/_nuxt/Bw1r3vCz.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"4d5-fi4zq1dVJ/dIvmyyxIGaWBfeDmU\"",
    "mtime": "2026-07-11T00:08:25.513Z",
    "size": 1237,
    "path": "../public/_nuxt/Bw1r3vCz.js"
  },
  "/_nuxt/Bw305WKR.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5125-tbBJwAwza6HClVoP6OvDw/UyczE\"",
    "mtime": "2026-07-11T00:08:25.513Z",
    "size": 20773,
    "path": "../public/_nuxt/Bw305WKR.js"
  },
  "/_nuxt/BxugDVxS.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"242c-oYJxBJIsnh0VI3dfBH28Di9xWyw\"",
    "mtime": "2026-07-11T00:08:25.513Z",
    "size": 9260,
    "path": "../public/_nuxt/BxugDVxS.js"
  },
  "/_nuxt/BzEH12SI.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"126d4-EVS+I5sq3gKoLw1+GYgk45+owmk\"",
    "mtime": "2026-07-11T00:08:25.514Z",
    "size": 75476,
    "path": "../public/_nuxt/BzEH12SI.js"
  },
  "/_nuxt/BzJJZx-M.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"524a-+n2NQF4pUrirtbVLSya0Zll9gp8\"",
    "mtime": "2026-07-11T00:08:25.514Z",
    "size": 21066,
    "path": "../public/_nuxt/BzJJZx-M.js"
  },
  "/_nuxt/C-_shW-Y.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"b235-IOuqdH140zmembMIabC2omrC0gk\"",
    "mtime": "2026-07-11T00:08:25.514Z",
    "size": 45621,
    "path": "../public/_nuxt/C-_shW-Y.js"
  },
  "/_nuxt/C0EvVcwJ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"16c3-HPBQBvOfT8pj16l6ANRFd2IaQ5E\"",
    "mtime": "2026-07-11T00:08:25.514Z",
    "size": 5827,
    "path": "../public/_nuxt/C0EvVcwJ.js"
  },
  "/_nuxt/C1YtDkjL.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"42bb-Br136LnHpDEJW6QGhAJe3HHLtRI\"",
    "mtime": "2026-07-11T00:08:25.515Z",
    "size": 17083,
    "path": "../public/_nuxt/C1YtDkjL.js"
  },
  "/_nuxt/C1w2a3ep.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3f65-5xZkaZ7PKJ06FHb3d2tWrPif7r8\"",
    "mtime": "2026-07-11T00:08:25.518Z",
    "size": 16229,
    "path": "../public/_nuxt/C1w2a3ep.js"
  },
  "/_nuxt/C39BiMTA.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"70f1-XkEMDsROL+KqTkmkI7vaY0QDB/s\"",
    "mtime": "2026-07-11T00:08:25.514Z",
    "size": 28913,
    "path": "../public/_nuxt/C39BiMTA.js"
  },
  "/_nuxt/C3FkfJm5.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"41933-Fh/YxcmFymhUio4gPBtyJ+1dPF4\"",
    "mtime": "2026-07-11T00:08:25.514Z",
    "size": 268595,
    "path": "../public/_nuxt/C3FkfJm5.js"
  },
  "/_nuxt/C3TFZlTA.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"7433-3XgzgOqVkahvookaKWLsNwUmwW0\"",
    "mtime": "2026-07-11T00:08:25.514Z",
    "size": 29747,
    "path": "../public/_nuxt/C3TFZlTA.js"
  },
  "/_nuxt/C3khCPGq.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"229d-3GfF78JdzfO32fqTvNakp2eNACA\"",
    "mtime": "2026-07-11T00:08:25.516Z",
    "size": 8861,
    "path": "../public/_nuxt/C3khCPGq.js"
  },
  "/_nuxt/C3mMm8J8.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2389-BXT9xKjaiqBfp3OCAewo89+9Wpg\"",
    "mtime": "2026-07-11T00:08:25.515Z",
    "size": 9097,
    "path": "../public/_nuxt/C3mMm8J8.js"
  },
  "/_nuxt/C3t2pwGQ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"120f0-X0q7J+fF1xguFqzweVaybx3UU88\"",
    "mtime": "2026-07-11T00:08:25.518Z",
    "size": 73968,
    "path": "../public/_nuxt/C3t2pwGQ.js"
  },
  "/_nuxt/C4-SGcC-.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"417d-VuVp9McrkS7IHf8dWg7wokVRT2w\"",
    "mtime": "2026-07-11T00:08:25.518Z",
    "size": 16765,
    "path": "../public/_nuxt/C4-SGcC-.js"
  },
  "/_nuxt/C5AohmeQ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"119a-naMnNAbj3hsp7yHVV+qsc4JMx2I\"",
    "mtime": "2026-07-11T00:08:25.518Z",
    "size": 4506,
    "path": "../public/_nuxt/C5AohmeQ.js"
  },
  "/_nuxt/C5wWYbrZ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"89df-Et79G3vB16QgsUONfD0LxirtsG4\"",
    "mtime": "2026-07-11T00:08:25.518Z",
    "size": 35295,
    "path": "../public/_nuxt/C5wWYbrZ.js"
  },
  "/_nuxt/C785mpWC.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"6bf-Sa0DGradVMvu7uaQ1YLzZeSUwRI\"",
    "mtime": "2026-07-11T00:08:25.518Z",
    "size": 1727,
    "path": "../public/_nuxt/C785mpWC.js"
  },
  "/_nuxt/C7L56vO4.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"6895-9ZLstt7ViE0xsW265mBWgmylcMs\"",
    "mtime": "2026-07-11T00:08:25.518Z",
    "size": 26773,
    "path": "../public/_nuxt/C7L56vO4.js"
  },
  "/_nuxt/C7gG9l05.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"6f50-UrhCrL/akz/yjJZGei8g9majuXQ\"",
    "mtime": "2026-07-11T00:08:25.520Z",
    "size": 28496,
    "path": "../public/_nuxt/C7gG9l05.js"
  },
  "/_nuxt/C8E1IXHE.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1648-tzItXCDPjfXM5ZS8ozwhuNChR3Q\"",
    "mtime": "2026-07-11T00:08:25.518Z",
    "size": 5704,
    "path": "../public/_nuxt/C8E1IXHE.js"
  },
  "/_nuxt/C5neKsAh.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"406d9-FB8nvrPRqW99bpNhe7qUXjOaD0Q\"",
    "mtime": "2026-07-11T00:08:25.518Z",
    "size": 263897,
    "path": "../public/_nuxt/C5neKsAh.js"
  },
  "/_nuxt/C8M2exoo.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"d1f4-DRqIliTj8jrkpY6QITy6jlt6T6w\"",
    "mtime": "2026-07-11T00:08:25.520Z",
    "size": 53748,
    "path": "../public/_nuxt/C8M2exoo.js"
  },
  "/_nuxt/C8lEn-DE.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3ea-+fq0/BxvZOQ+157ZaRNbUKWMmIo\"",
    "mtime": "2026-07-11T00:08:25.520Z",
    "size": 1002,
    "path": "../public/_nuxt/C8lEn-DE.js"
  },
  "/_nuxt/C9e09xm7.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"15491-YGHWLf1hlmHcf+rVQqa1WMIwxjs\"",
    "mtime": "2026-07-11T00:08:25.520Z",
    "size": 87185,
    "path": "../public/_nuxt/C9e09xm7.js"
  },
  "/_nuxt/CAQ2eGtk.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"35aa-xn6YzOl88ay0GRLqFdRKXQgD05E\"",
    "mtime": "2026-07-11T00:08:25.520Z",
    "size": 13738,
    "path": "../public/_nuxt/CAQ2eGtk.js"
  },
  "/_nuxt/CCQEdssC.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1a5ba-z+ujBiUo1i6Xt4hzwEFKqeYuGxw\"",
    "mtime": "2026-07-11T00:08:25.522Z",
    "size": 107962,
    "path": "../public/_nuxt/CCQEdssC.js"
  },
  "/_nuxt/CCbUEAxs.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"4857-p69C27cdmBTrnBI7J4wR/e+qMKI\"",
    "mtime": "2026-07-11T00:08:25.522Z",
    "size": 18519,
    "path": "../public/_nuxt/CCbUEAxs.js"
  },
  "/_nuxt/CDRvMr4B.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"43f0-NbLSJw10kd+L/dBVe39lPgUvo80\"",
    "mtime": "2026-07-11T00:08:25.522Z",
    "size": 17392,
    "path": "../public/_nuxt/CDRvMr4B.js"
  },
  "/_nuxt/CD_QflpE.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"b230-Ye6how9tyXomcJDGSeovtQzWAi8\"",
    "mtime": "2026-07-11T00:08:25.523Z",
    "size": 45616,
    "path": "../public/_nuxt/CD_QflpE.js"
  },
  "/_nuxt/CGz705tZ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"6d8-bfuvvytToTpRGrCPeRTln4KzBgU\"",
    "mtime": "2026-07-11T00:08:25.525Z",
    "size": 1752,
    "path": "../public/_nuxt/CGz705tZ.js"
  },
  "/_nuxt/CHVitPdg.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"b7eb-Usb5gaEDf7HtD+ykiA0WhLSW+lU\"",
    "mtime": "2026-07-11T00:08:25.523Z",
    "size": 47083,
    "path": "../public/_nuxt/CHVitPdg.js"
  },
  "/_nuxt/CJW1kSYD.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"845d-n5PM9xOMD8X473BZlQi3DB4TJLY\"",
    "mtime": "2026-07-11T00:08:25.525Z",
    "size": 33885,
    "path": "../public/_nuxt/CJW1kSYD.js"
  },
  "/_nuxt/CJaU5se_.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1731-2Wl7+oWWbokqxRmYBXtAS7fuaEM\"",
    "mtime": "2026-07-11T00:08:25.525Z",
    "size": 5937,
    "path": "../public/_nuxt/CJaU5se_.js"
  },
  "/_nuxt/CK08SILT.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"162-GizNb8GziR7IWV5Tp/dgxyRSFqw\"",
    "mtime": "2026-07-11T00:08:25.525Z",
    "size": 354,
    "path": "../public/_nuxt/CK08SILT.js"
  },
  "/_nuxt/CKf-BDER.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"a76-lh1bBzDgX3HDjth8xa4cNbiA/yA\"",
    "mtime": "2026-07-11T00:08:25.525Z",
    "size": 2678,
    "path": "../public/_nuxt/CKf-BDER.js"
  },
  "/_nuxt/CLEBXJYW.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"85a9-bGseSi0qyJy6b3gVQ2LDRwfwQno\"",
    "mtime": "2026-07-11T00:08:25.527Z",
    "size": 34217,
    "path": "../public/_nuxt/CLEBXJYW.js"
  },
  "/_nuxt/CM8KxXT1.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3a3e-eg75gM9fNZE2ZlazuDhbvvtr6SA\"",
    "mtime": "2026-07-11T00:08:25.527Z",
    "size": 14910,
    "path": "../public/_nuxt/CM8KxXT1.js"
  },
  "/_nuxt/COJ4H7py.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"b6dc-g40D9ZEhd2BB6LeWdxtoagXYba4\"",
    "mtime": "2026-07-11T00:08:25.527Z",
    "size": 46812,
    "path": "../public/_nuxt/COJ4H7py.js"
  },
  "/_nuxt/COl1u60l.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2cf8-L2zDYI4AngBjIAtn51pR3NPWDNI\"",
    "mtime": "2026-07-11T00:08:25.527Z",
    "size": 11512,
    "path": "../public/_nuxt/COl1u60l.js"
  },
  "/_nuxt/CPllO0oZ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"ec64-5cJfFAIRzGwLKInOL6xh55Da/P4\"",
    "mtime": "2026-07-11T00:08:25.527Z",
    "size": 60516,
    "path": "../public/_nuxt/CPllO0oZ.js"
  },
  "/_nuxt/COyJrUc7.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"f64-vwAIw/KRQPV6ZrAKHOqb8aBiL4o\"",
    "mtime": "2026-07-11T00:08:25.527Z",
    "size": 3940,
    "path": "../public/_nuxt/COyJrUc7.js"
  },
  "/_nuxt/CQ5q8R2W.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1936-1OHn4IqZBMA9qRfRDC3s+efsTpw\"",
    "mtime": "2026-07-11T00:08:25.529Z",
    "size": 6454,
    "path": "../public/_nuxt/CQ5q8R2W.js"
  },
  "/_nuxt/CQPZbkWf.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"8c9-+h3gqE0n2q7blHbeb7dKlIb6k7A\"",
    "mtime": "2026-07-11T00:08:25.529Z",
    "size": 2249,
    "path": "../public/_nuxt/CQPZbkWf.js"
  },
  "/_nuxt/CQjiPCtT.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"d3e-EJXPrP7qzhwcxCXB1vhQUTgP4K0\"",
    "mtime": "2026-07-11T00:08:25.529Z",
    "size": 3390,
    "path": "../public/_nuxt/CQjiPCtT.js"
  },
  "/_nuxt/CQwQbCjw.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1467a-8fWGnJazcm8FVUyUy8ZkdKx79Wo\"",
    "mtime": "2026-07-11T00:08:25.529Z",
    "size": 83578,
    "path": "../public/_nuxt/CQwQbCjw.js"
  },
  "/_nuxt/CR_dl2Bk.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"c3f-z0YDPojEZVHAOTaoBXx47qWtl6w\"",
    "mtime": "2026-07-11T00:08:25.529Z",
    "size": 3135,
    "path": "../public/_nuxt/CR_dl2Bk.js"
  },
  "/_nuxt/CS3Unz2-.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"82d6-aUEs94AcfLqjSVpnmdfYdfX5koA\"",
    "mtime": "2026-07-11T00:08:25.530Z",
    "size": 33494,
    "path": "../public/_nuxt/CS3Unz2-.js"
  },
  "/_nuxt/CSHBycmS.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"172c-kxgopLm8zX3Y22IwqLFyg+wwtvk\"",
    "mtime": "2026-07-11T00:08:25.530Z",
    "size": 5932,
    "path": "../public/_nuxt/CSHBycmS.js"
  },
  "/_nuxt/CSHvh9SD.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"12c5-OKkmxacX5yhejcqtA9UM8MHeuLo\"",
    "mtime": "2026-07-11T00:08:25.530Z",
    "size": 4805,
    "path": "../public/_nuxt/CSHvh9SD.js"
  },
  "/_nuxt/CG6Dc4jp.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"97f00-rYm+CybCMCqxOZ2Np2GsfIrREbo\"",
    "mtime": "2026-07-11T00:08:25.525Z",
    "size": 622336,
    "path": "../public/_nuxt/CG6Dc4jp.js"
  },
  "/_nuxt/CQeJNCZX.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"a1784-qlAs7rEpV04mDuIDeCsr4Ak87xQ\"",
    "mtime": "2026-07-11T00:08:25.530Z",
    "size": 661380,
    "path": "../public/_nuxt/CQeJNCZX.js"
  },
  "/_nuxt/CTRr51gU.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1b39-AV5b5gMlIyFBg8ZLVvBtodDGnYI\"",
    "mtime": "2026-07-11T00:08:25.530Z",
    "size": 6969,
    "path": "../public/_nuxt/CTRr51gU.js"
  },
  "/_nuxt/CUnW07Te.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1f3f-uv7wy8OK67PNsOcdBMbGSWcUkaA\"",
    "mtime": "2026-07-11T00:08:25.530Z",
    "size": 7999,
    "path": "../public/_nuxt/CUnW07Te.js"
  },
  "/_nuxt/CUvdOvpk.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"16a-zd9wOmEXhW4Bt3fowqHuWxCueYM\"",
    "mtime": "2026-07-11T00:08:25.530Z",
    "size": 362,
    "path": "../public/_nuxt/CUvdOvpk.js"
  },
  "/_nuxt/CVKAhlNI.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"74f-krMHZIgNQ7ufEsNg5KlvXhsZ3qg\"",
    "mtime": "2026-07-11T00:08:25.530Z",
    "size": 1871,
    "path": "../public/_nuxt/CVKAhlNI.js"
  },
  "/_nuxt/CVO1_9PV.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3530-TayDmxRMvy5Bv+gyldrxxN/vEUA\"",
    "mtime": "2026-07-11T00:08:25.530Z",
    "size": 13616,
    "path": "../public/_nuxt/CVO1_9PV.js"
  },
  "/_nuxt/CVw76BM1.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2a29-KfZDVnTHK+jue/V0/82ZqiEGVoQ\"",
    "mtime": "2026-07-11T00:08:25.530Z",
    "size": 10793,
    "path": "../public/_nuxt/CVw76BM1.js"
  },
  "/_nuxt/CWGUrYGm.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"a6a5-PqIf7HK5ce9AA0jaiPTCCz8oFn8\"",
    "mtime": "2026-07-11T00:08:25.530Z",
    "size": 42661,
    "path": "../public/_nuxt/CWGUrYGm.js"
  },
  "/_nuxt/CX-D33aM.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"20de-H6k5NhdX+HcC0te3LFodT1NdTpg\"",
    "mtime": "2026-07-11T00:08:25.530Z",
    "size": 8414,
    "path": "../public/_nuxt/CX-D33aM.js"
  },
  "/_nuxt/CWgbWrzg.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"a59e-R1X6WcCCDlIcSMEXd/eORS1pbtY\"",
    "mtime": "2026-07-11T00:08:25.531Z",
    "size": 42398,
    "path": "../public/_nuxt/CWgbWrzg.js"
  },
  "/_nuxt/CXkZqcqC.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2bae-8lOfx16GxedeATKzDgC8V3XWPfI\"",
    "mtime": "2026-07-11T00:08:25.531Z",
    "size": 11182,
    "path": "../public/_nuxt/CXkZqcqC.js"
  },
  "/_nuxt/CYJjRCEL.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"380-KYGTB09fJ9G4SqBzAPaHyznlXTE\"",
    "mtime": "2026-07-11T00:08:25.531Z",
    "size": 896,
    "path": "../public/_nuxt/CYJjRCEL.js"
  },
  "/_nuxt/CafNBF8u.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1893-d496H0Z60lAg57LiRH/wyqJ+BmM\"",
    "mtime": "2026-07-11T00:08:25.531Z",
    "size": 6291,
    "path": "../public/_nuxt/CafNBF8u.js"
  },
  "/_nuxt/CbNwcPz5.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1e6-5fCWp0YwZ68l7yFTtER93JkMcrg\"",
    "mtime": "2026-07-11T00:08:25.531Z",
    "size": 486,
    "path": "../public/_nuxt/CbNwcPz5.js"
  },
  "/_nuxt/CbfX1IO0.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"36d4-rw7+tMOmFbgQDhwnT0kx7VdqnBs\"",
    "mtime": "2026-07-11T00:08:25.531Z",
    "size": 14036,
    "path": "../public/_nuxt/CbfX1IO0.js"
  },
  "/_nuxt/Cbu_jgUK.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"7acb-QrJBH0l4Qa8a+75ma8daoHQkdpE\"",
    "mtime": "2026-07-11T00:08:25.531Z",
    "size": 31435,
    "path": "../public/_nuxt/Cbu_jgUK.js"
  },
  "/_nuxt/Cc5clBb7.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"b95-n50sONtIlLHqsuhIEACjNj6b16k\"",
    "mtime": "2026-07-11T00:08:25.531Z",
    "size": 2965,
    "path": "../public/_nuxt/Cc5clBb7.js"
  },
  "/_nuxt/CdMaYVVa.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"bf62-LPI9DWfvNCQIhgUpG3+1eK+0T/0\"",
    "mtime": "2026-07-11T00:08:25.531Z",
    "size": 48994,
    "path": "../public/_nuxt/CdMaYVVa.js"
  },
  "/_nuxt/CdO5JTpU.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1876-+TsIc4a10gYSvPYG0ceKZs9a0Vg\"",
    "mtime": "2026-07-11T00:08:25.531Z",
    "size": 6262,
    "path": "../public/_nuxt/CdO5JTpU.js"
  },
  "/_nuxt/CeaQPKDP.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"380f-Ffd3X6c3qtWZ4+YWRbfJRCQCDak\"",
    "mtime": "2026-07-11T00:08:25.531Z",
    "size": 14351,
    "path": "../public/_nuxt/CeaQPKDP.js"
  },
  "/_nuxt/CfQXZHmo.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"42e6-JdP/XjojKBbDVeNQlQVl/w8pfP0\"",
    "mtime": "2026-07-11T00:08:25.532Z",
    "size": 17126,
    "path": "../public/_nuxt/CfQXZHmo.js"
  },
  "/_nuxt/Cg69lM4A.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3ad0-uatg9vW4dgwifZtHlAJ8UlkfiEY\"",
    "mtime": "2026-07-11T00:08:25.532Z",
    "size": 15056,
    "path": "../public/_nuxt/Cg69lM4A.js"
  },
  "/_nuxt/Ch-W9Iql.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"363-iMY/1l4bgbNF1cVKVJ4uSx6yKQA\"",
    "mtime": "2026-07-11T00:08:25.532Z",
    "size": 867,
    "path": "../public/_nuxt/Ch-W9Iql.js"
  },
  "/_nuxt/CiNAsHKU.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2c3-0h0WNwHNgk5iQ7nNbDN7fezVTH8\"",
    "mtime": "2026-07-11T00:08:25.532Z",
    "size": 707,
    "path": "../public/_nuxt/CiNAsHKU.js"
  },
  "/_nuxt/CiSwCVQr.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1fd1-NfAxHelblprTNa2cPQ6cOcCaZ8g\"",
    "mtime": "2026-07-11T00:08:25.532Z",
    "size": 8145,
    "path": "../public/_nuxt/CiSwCVQr.js"
  },
  "/_nuxt/CjDtw9vr.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5509-RCWnxb+vl/IAW+9+6MTNAA59rgg\"",
    "mtime": "2026-07-11T00:08:25.532Z",
    "size": 21769,
    "path": "../public/_nuxt/CjDtw9vr.js"
  },
  "/_nuxt/CjTSRSzG.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"13dd7-mgjbEqbBbsBhMSXYUXo9jd77v7I\"",
    "mtime": "2026-07-11T00:08:25.532Z",
    "size": 81367,
    "path": "../public/_nuxt/CjTSRSzG.js"
  },
  "/_nuxt/CkXjmgJE.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"42e7-+hm358z2R6HWIP4VA2TRRR+lsAA\"",
    "mtime": "2026-07-11T00:08:25.532Z",
    "size": 17127,
    "path": "../public/_nuxt/CkXjmgJE.js"
  },
  "/_nuxt/Cksrkzhi.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"4177-10PsQsC4UfMGGZPDu2/j2M6elOM\"",
    "mtime": "2026-07-11T00:08:25.532Z",
    "size": 16759,
    "path": "../public/_nuxt/Cksrkzhi.js"
  },
  "/_nuxt/Cl11rDh_.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"aae7-hq7PLU7McqxIj+epFlUeKfu5GYI\"",
    "mtime": "2026-07-11T00:08:25.532Z",
    "size": 43751,
    "path": "../public/_nuxt/Cl11rDh_.js"
  },
  "/_nuxt/ClJifeiK.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"43f-bRkXxqmUNu+/Zhe+7xV/XGMw//A\"",
    "mtime": "2026-07-11T00:08:25.532Z",
    "size": 1087,
    "path": "../public/_nuxt/ClJifeiK.js"
  },
  "/_nuxt/CmCqftbK.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"54ff-h7t1IkAm9sZKUd73kBTFe7jRv4o\"",
    "mtime": "2026-07-11T00:08:25.532Z",
    "size": 21759,
    "path": "../public/_nuxt/CmCqftbK.js"
  },
  "/_nuxt/CpsxWMHF.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1f0-DWhofFxef8iaEEbM6A4GM8s08f0\"",
    "mtime": "2026-07-11T00:08:25.532Z",
    "size": 496,
    "path": "../public/_nuxt/CpsxWMHF.js"
  },
  "/_nuxt/CoZCJcx9.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1f0-KnxBObxPgmUO4lb5RkEKakto1Q4\"",
    "mtime": "2026-07-11T00:08:25.532Z",
    "size": 496,
    "path": "../public/_nuxt/CoZCJcx9.js"
  },
  "/_nuxt/CqIDqUUz.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1a1-UZ35+PTdNniE9FwCb1fPL488g28\"",
    "mtime": "2026-07-11T00:08:25.533Z",
    "size": 417,
    "path": "../public/_nuxt/CqIDqUUz.js"
  },
  "/_nuxt/CsSk9TLD.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"25f5-PXin5pdX7KfTSjs978avshZbkGQ\"",
    "mtime": "2026-07-11T00:08:25.533Z",
    "size": 9717,
    "path": "../public/_nuxt/CsSk9TLD.js"
  },
  "/_nuxt/Csfq5Kiy.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"48cb-tPSCpNF7svRHRSnrhMp7s2aYFJE\"",
    "mtime": "2026-07-11T00:08:25.532Z",
    "size": 18635,
    "path": "../public/_nuxt/Csfq5Kiy.js"
  },
  "/_nuxt/CuBvOTeI.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1619-oGgguh12kosqI9uCdcNq+uB9hdg\"",
    "mtime": "2026-07-11T00:08:25.534Z",
    "size": 5657,
    "path": "../public/_nuxt/CuBvOTeI.js"
  },
  "/_nuxt/CsiB4_CF.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"529a-A6GL99e1P+QQXJ+NZ4AICYc8KSE\"",
    "mtime": "2026-07-11T00:08:25.533Z",
    "size": 21146,
    "path": "../public/_nuxt/CsiB4_CF.js"
  },
  "/_nuxt/CucaAMjX.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"280a-Rz1HUKonELsBMnC2FOTsRQFq3Lw\"",
    "mtime": "2026-07-11T00:08:25.534Z",
    "size": 10250,
    "path": "../public/_nuxt/CucaAMjX.js"
  },
  "/_nuxt/Cuk6v7N8.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3863-ch+lyFS9QkuOdtlQcqnXQ5iOqcc\"",
    "mtime": "2026-07-11T00:08:25.534Z",
    "size": 14435,
    "path": "../public/_nuxt/Cuk6v7N8.js"
  },
  "/_nuxt/Cv9koXgw.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3a65-Q1j891KpAph3EWu90fhfuUDvR08\"",
    "mtime": "2026-07-11T00:08:25.534Z",
    "size": 14949,
    "path": "../public/_nuxt/Cv9koXgw.js"
  },
  "/_nuxt/Cw-qLnGV.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"294f-M2S1iQbovdSBNBVkLSBlccS1Vlo\"",
    "mtime": "2026-07-11T00:08:25.534Z",
    "size": 10575,
    "path": "../public/_nuxt/Cw-qLnGV.js"
  },
  "/_nuxt/CwjWoCRV.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"9008-LN0v7k5933TdJFpYP4i2BAy3Vf0\"",
    "mtime": "2026-07-11T00:08:25.534Z",
    "size": 36872,
    "path": "../public/_nuxt/CwjWoCRV.js"
  },
  "/_nuxt/CxNCsyoI.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"27ce-/ZpMNd5noDU2LpfKuUms7BFPBjM\"",
    "mtime": "2026-07-11T00:08:25.534Z",
    "size": 10190,
    "path": "../public/_nuxt/CxNCsyoI.js"
  },
  "/_nuxt/CxuMC2N6.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"268-GAbAQGcyAQrI54uMUM5OvSS+yOk\"",
    "mtime": "2026-07-11T00:08:25.534Z",
    "size": 616,
    "path": "../public/_nuxt/CxuMC2N6.js"
  },
  "/_nuxt/CyZx4btO.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"290d-nKQs75MUlUhRPt1bhdHhk3hfu/8\"",
    "mtime": "2026-07-11T00:08:25.534Z",
    "size": 10509,
    "path": "../public/_nuxt/CyZx4btO.js"
  },
  "/_nuxt/CyktbL80.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"48c5-38IV7Gj1pi36TR7qiSHzlCs9XIo\"",
    "mtime": "2026-07-11T00:08:25.534Z",
    "size": 18629,
    "path": "../public/_nuxt/CyktbL80.js"
  },
  "/_nuxt/CzSNsL8Z.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1b3-sNxQiRcBkyA87+bfYtdlgoKqN/Y\"",
    "mtime": "2026-07-11T00:08:25.534Z",
    "size": 435,
    "path": "../public/_nuxt/CzSNsL8Z.js"
  },
  "/_nuxt/CuKrBAXM.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"afc8b-TKQqPCPZkr7fm6pYITj5JxRcmPE\"",
    "mtime": "2026-07-11T00:08:25.533Z",
    "size": 720011,
    "path": "../public/_nuxt/CuKrBAXM.js"
  },
  "/_nuxt/CzouJOBO.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"17d57-jV/MLG4UV1KVhL1eo3oXI/Ag3F0\"",
    "mtime": "2026-07-11T00:08:25.535Z",
    "size": 97623,
    "path": "../public/_nuxt/CzouJOBO.js"
  },
  "/_nuxt/CzpNVLqv.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1c6de-U9VZFJxC1LzOlfdElPo/c6p9IT0\"",
    "mtime": "2026-07-11T00:08:25.535Z",
    "size": 116446,
    "path": "../public/_nuxt/CzpNVLqv.js"
  },
  "/_nuxt/D-2ljcwZ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"355b-ltA2RbrvMtKWMV4KgoBMozLYWVE\"",
    "mtime": "2026-07-11T00:08:25.534Z",
    "size": 13659,
    "path": "../public/_nuxt/D-2ljcwZ.js"
  },
  "/_nuxt/D-D4r7s1.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"672-f6s5dhxTnhDAO2yKhUxdy0UbTOo\"",
    "mtime": "2026-07-11T00:08:25.534Z",
    "size": 1650,
    "path": "../public/_nuxt/D-D4r7s1.js"
  },
  "/_nuxt/D08_rs9c.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"d00-PoCZeS48HaIZq7IK1itXEsBGTa8\"",
    "mtime": "2026-07-11T00:08:25.535Z",
    "size": 3328,
    "path": "../public/_nuxt/D08_rs9c.js"
  },
  "/_nuxt/D0JcoyTn.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"7791-9VuL2V6Z40ykHFrzaaRUKmx59YM\"",
    "mtime": "2026-07-11T00:08:25.535Z",
    "size": 30609,
    "path": "../public/_nuxt/D0JcoyTn.js"
  },
  "/_nuxt/D0VFX_zG.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"c12-siJwwgYinwdwh9DliHAPVI0CgWk\"",
    "mtime": "2026-07-11T00:08:25.535Z",
    "size": 3090,
    "path": "../public/_nuxt/D0VFX_zG.js"
  },
  "/_nuxt/D0r3Knsf.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"35bf-NpZrPk9jdEu6IxpilmRefOR1sKI\"",
    "mtime": "2026-07-11T00:08:25.536Z",
    "size": 13759,
    "path": "../public/_nuxt/D0r3Knsf.js"
  },
  "/_nuxt/D33VVPhb.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"42f7-lO6ufodq4KAw4CkGlp3+ru57Z1M\"",
    "mtime": "2026-07-11T00:08:25.536Z",
    "size": 17143,
    "path": "../public/_nuxt/D33VVPhb.js"
  },
  "/_nuxt/D3T736Ml.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"70ee-OY10WBbwr0cHq279BR04XAbqqMQ\"",
    "mtime": "2026-07-11T00:08:25.536Z",
    "size": 28910,
    "path": "../public/_nuxt/D3T736Ml.js"
  },
  "/_nuxt/D4aQ98Sh.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5dd1-ComSv5jhbEd0vvKhG0U23pANnAQ\"",
    "mtime": "2026-07-11T00:08:25.541Z",
    "size": 24017,
    "path": "../public/_nuxt/D4aQ98Sh.js"
  },
  "/_nuxt/D4h5O-jR.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1ecc-X4WIf5/MKovdXkpn2ucY2Fvz+nI\"",
    "mtime": "2026-07-11T00:08:25.540Z",
    "size": 7884,
    "path": "../public/_nuxt/D4h5O-jR.js"
  },
  "/_nuxt/D5J98z8l.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"23c-hSON1kC1U/ddZ4VMG9FbVzGB0Yk\"",
    "mtime": "2026-07-11T00:08:25.541Z",
    "size": 572,
    "path": "../public/_nuxt/D5J98z8l.js"
  },
  "/_nuxt/D5KoaKCx.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"48b7-CJZAUj4SYa7cWrWmLW1ca67ky3Y\"",
    "mtime": "2026-07-11T00:08:25.541Z",
    "size": 18615,
    "path": "../public/_nuxt/D5KoaKCx.js"
  },
  "/_nuxt/D5pLuqRj.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"6f5e-G7nHTfiwbstUfZh3q1SQWwPVJC8\"",
    "mtime": "2026-07-11T00:08:25.541Z",
    "size": 28510,
    "path": "../public/_nuxt/D5pLuqRj.js"
  },
  "/_nuxt/D5yFRyaz.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"690-/9u2BZTZNf/aHzmdzs0MHQHcks4\"",
    "mtime": "2026-07-11T00:08:25.541Z",
    "size": 1680,
    "path": "../public/_nuxt/D5yFRyaz.js"
  },
  "/_nuxt/D6rUQhPD.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"153e-WoWI11NulKZPO3QblBvjIsgfd1o\"",
    "mtime": "2026-07-11T00:08:25.541Z",
    "size": 5438,
    "path": "../public/_nuxt/D6rUQhPD.js"
  },
  "/_nuxt/D7oLnXFd.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"374c-u5ndhk1KsUHitkpMJ6KIbAiO+N0\"",
    "mtime": "2026-07-11T00:08:25.541Z",
    "size": 14156,
    "path": "../public/_nuxt/D7oLnXFd.js"
  },
  "/_nuxt/D8P4R8x9.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1c6e-0a85NbMW6rYZypC75RRGm/+mgmI\"",
    "mtime": "2026-07-11T00:08:25.541Z",
    "size": 7278,
    "path": "../public/_nuxt/D8P4R8x9.js"
  },
  "/_nuxt/DAi9KRSo.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2bb0-kCaePAc0SkqzEXT/m+0Gi8SfIkE\"",
    "mtime": "2026-07-11T00:08:25.541Z",
    "size": 11184,
    "path": "../public/_nuxt/DAi9KRSo.js"
  },
  "/_nuxt/DBPt_AfP.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"11477-qWF48biXSzPgSAYrNWjkvrRi0jk\"",
    "mtime": "2026-07-11T00:08:25.541Z",
    "size": 70775,
    "path": "../public/_nuxt/DBPt_AfP.js"
  },
  "/_nuxt/DBtIRQT_.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"833a-lKLx2n2d0MGWlN8n6/Qpw05utog\"",
    "mtime": "2026-07-11T00:08:25.541Z",
    "size": 33594,
    "path": "../public/_nuxt/DBtIRQT_.js"
  },
  "/_nuxt/DCE3LsBG.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"dd30-Yj6OGzkG+hDO8Bw4di62/RIPjww\"",
    "mtime": "2026-07-11T00:08:25.541Z",
    "size": 56624,
    "path": "../public/_nuxt/DCE3LsBG.js"
  },
  "/_nuxt/D5onhYUb.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"a59de-KK/4yQ9c3xvRLQye6TDobXula4E\"",
    "mtime": "2026-07-11T00:08:25.541Z",
    "size": 678366,
    "path": "../public/_nuxt/D5onhYUb.js"
  },
  "/_nuxt/DDhM2Lry.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"64b5-0IlwWbv2cxmIF7hpCV/P6X0hDVI\"",
    "mtime": "2026-07-11T00:08:25.542Z",
    "size": 25781,
    "path": "../public/_nuxt/DDhM2Lry.js"
  },
  "/_nuxt/DEEqWFGm.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"9c2-6jmej/kRyo5eeUY0AkpBEUyCr+c\"",
    "mtime": "2026-07-11T00:08:25.541Z",
    "size": 2498,
    "path": "../public/_nuxt/DEEqWFGm.js"
  },
  "/_nuxt/DEIpsLCJ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"7eb-re77T+9BfnvaYlymlHGmq0XHpwM\"",
    "mtime": "2026-07-11T00:08:25.542Z",
    "size": 2027,
    "path": "../public/_nuxt/DEIpsLCJ.js"
  },
  "/_nuxt/DERFIACx.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"a12-DqUlfWM3YgNzJKZU3xX7k57+Deg\"",
    "mtime": "2026-07-11T00:08:25.543Z",
    "size": 2578,
    "path": "../public/_nuxt/DERFIACx.js"
  },
  "/_nuxt/DFA2vldR.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"12ea2-Mb8zM48Lv8XeaCCgra/IBVQvxF0\"",
    "mtime": "2026-07-11T00:08:25.542Z",
    "size": 77474,
    "path": "../public/_nuxt/DFA2vldR.js"
  },
  "/_nuxt/DFAwn6Qs.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1538-yiIURTjp4ZVbURd5pPMT2ZB9cCs\"",
    "mtime": "2026-07-11T00:08:25.542Z",
    "size": 5432,
    "path": "../public/_nuxt/DFAwn6Qs.js"
  },
  "/_nuxt/DFERiEu9.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1f5e-lcMPnijeMEr83/c8XE8W+IHjFDw\"",
    "mtime": "2026-07-11T00:08:25.542Z",
    "size": 8030,
    "path": "../public/_nuxt/DFERiEu9.js"
  },
  "/_nuxt/DH5Ifo-i.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3861-ZsBIvSUlsHzh+aocazJKD4XzMVc\"",
    "mtime": "2026-07-11T00:08:25.543Z",
    "size": 14433,
    "path": "../public/_nuxt/DH5Ifo-i.js"
  },
  "/_nuxt/DHJKELXO.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2c8d-G52k5HF2RR+jOGOolyZJDXOaYjU\"",
    "mtime": "2026-07-11T00:08:25.542Z",
    "size": 11405,
    "path": "../public/_nuxt/DHJKELXO.js"
  },
  "/_nuxt/DHo0CJ0O.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1166-Xkb6x0uI62SJyjRdm2CfMLf2U+8\"",
    "mtime": "2026-07-11T00:08:25.543Z",
    "size": 4454,
    "path": "../public/_nuxt/DHo0CJ0O.js"
  },
  "/_nuxt/DIQXUDcF.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1e7-JtDSIxtVecgDzSYan4mXkVhL8BU\"",
    "mtime": "2026-07-11T00:08:25.544Z",
    "size": 487,
    "path": "../public/_nuxt/DIQXUDcF.js"
  },
  "/_nuxt/DJlmqQ1C.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"d78-GfCEw07mZcAVlpdq4Uc0qsfbLyE\"",
    "mtime": "2026-07-11T00:08:25.544Z",
    "size": 3448,
    "path": "../public/_nuxt/DJlmqQ1C.js"
  },
  "/_nuxt/DIhk_EGe.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"78d3-tSuzZf/VqDr7tQ17TgzoOLMaTdM\"",
    "mtime": "2026-07-11T00:08:25.543Z",
    "size": 30931,
    "path": "../public/_nuxt/DIhk_EGe.js"
  },
  "/_nuxt/DKOGybHv.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"6c5a-Y29k2m9EVBSN1MU25Qb9ICknxn4\"",
    "mtime": "2026-07-11T00:08:25.544Z",
    "size": 27738,
    "path": "../public/_nuxt/DKOGybHv.js"
  },
  "/_nuxt/DLPsmRzw.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"62ac-dfAOvw66Xg1r9qzJPQfWNQd/wb4\"",
    "mtime": "2026-07-11T00:08:25.544Z",
    "size": 25260,
    "path": "../public/_nuxt/DLPsmRzw.js"
  },
  "/_nuxt/DLbgOhZU.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"e6e-HjKchXJIUuHOAYTWw1w+Xe8C+uM\"",
    "mtime": "2026-07-11T00:08:25.544Z",
    "size": 3694,
    "path": "../public/_nuxt/DLbgOhZU.js"
  },
  "/_nuxt/DLdrzW0n.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"11ee-3bdnsu/F0Oep/w+75FHX2vzRQHo\"",
    "mtime": "2026-07-11T00:08:25.545Z",
    "size": 4590,
    "path": "../public/_nuxt/DLdrzW0n.js"
  },
  "/_nuxt/DM3D5tap.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5b59-2+IUlooIyu9VekePA7rnS+Cvs98\"",
    "mtime": "2026-07-11T00:08:25.544Z",
    "size": 23385,
    "path": "../public/_nuxt/DM3D5tap.js"
  },
  "/_nuxt/DNTbO5Kf.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"502c-V3KFfvnNBhgWu/K0kni+1wyu+DE\"",
    "mtime": "2026-07-11T00:08:25.544Z",
    "size": 20524,
    "path": "../public/_nuxt/DNTbO5Kf.js"
  },
  "/_nuxt/DPWDxuKt.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"7494-6XYMyk0+OWPyLMlepua3iUMhPIA\"",
    "mtime": "2026-07-11T00:08:25.544Z",
    "size": 29844,
    "path": "../public/_nuxt/DPWDxuKt.js"
  },
  "/_nuxt/DPvbFsQx.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"d0cb-bPPP3W8WFdxo0ihzrvkV//UrySs\"",
    "mtime": "2026-07-11T00:08:25.546Z",
    "size": 53451,
    "path": "../public/_nuxt/DPvbFsQx.js"
  },
  "/_nuxt/DRW-0cLl.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"b22e-xy+/TiCHaZs8UqctXSO5FKTjVQI\"",
    "mtime": "2026-07-11T00:08:25.546Z",
    "size": 45614,
    "path": "../public/_nuxt/DRW-0cLl.js"
  },
  "/_nuxt/DSbIaXrN.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"d9-ys+4iSIK55+8K1Ns1LLmbHqyZNA\"",
    "mtime": "2026-07-11T00:08:25.546Z",
    "size": 217,
    "path": "../public/_nuxt/DSbIaXrN.js"
  },
  "/_nuxt/DSgDnoKj.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"608-0himlcgnhazfrCk742kV+hgCkG8\"",
    "mtime": "2026-07-11T00:08:25.546Z",
    "size": 1544,
    "path": "../public/_nuxt/DSgDnoKj.js"
  },
  "/_nuxt/DSrUkfvF.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"7503-6TCGSBUjJrLs0UOpROu2tvn9iLk\"",
    "mtime": "2026-07-11T00:08:25.546Z",
    "size": 29955,
    "path": "../public/_nuxt/DSrUkfvF.js"
  },
  "/_nuxt/DTAJTTim.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"b22-YY7Y2BPr7TP+QrvrOYZBt3jPCNw\"",
    "mtime": "2026-07-11T00:08:25.546Z",
    "size": 2850,
    "path": "../public/_nuxt/DTAJTTim.js"
  },
  "/_nuxt/DUszq2jm.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2ceb-ePBMCAX7SG0Irjogl+g1U5DwooA\"",
    "mtime": "2026-07-11T00:08:25.546Z",
    "size": 11499,
    "path": "../public/_nuxt/DUszq2jm.js"
  },
  "/_nuxt/DVCQc3T3.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"d2e-0qcPGTWOwKiSt0djnZZYab7G2bQ\"",
    "mtime": "2026-07-11T00:08:25.551Z",
    "size": 3374,
    "path": "../public/_nuxt/DVCQc3T3.js"
  },
  "/_nuxt/DVMEJ2y_.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"83fb-0g5XhPG2uspENrUTMRB2oVJl2Ws\"",
    "mtime": "2026-07-11T00:08:25.549Z",
    "size": 33787,
    "path": "../public/_nuxt/DVMEJ2y_.js"
  },
  "/_nuxt/DViLp-vk.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"20eb-TZaeNfUHoZPCb2xAVa2tmUq626k\"",
    "mtime": "2026-07-11T00:08:25.549Z",
    "size": 8427,
    "path": "../public/_nuxt/DViLp-vk.js"
  },
  "/_nuxt/DWedfzmr.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"42e3-jnQVGWyfAUj5Bj6u8/SJs5K6KHQ\"",
    "mtime": "2026-07-11T00:08:25.549Z",
    "size": 17123,
    "path": "../public/_nuxt/DWedfzmr.js"
  },
  "/_nuxt/DWn-kkDV.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"29de-s6Yu9UBkjLFBEXzNuVK6Stsw5fc\"",
    "mtime": "2026-07-11T00:08:25.549Z",
    "size": 10718,
    "path": "../public/_nuxt/DWn-kkDV.js"
  },
  "/_nuxt/DXbdFlpD.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1abe-6NRBR7/r0g2IDmknK3kpzih1ojk\"",
    "mtime": "2026-07-11T00:08:25.549Z",
    "size": 6846,
    "path": "../public/_nuxt/DXbdFlpD.js"
  },
  "/_nuxt/DYJg4227.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"383-q7btH8RAM95bUrCHpjtSrpvDrJU\"",
    "mtime": "2026-07-11T00:08:25.549Z",
    "size": 899,
    "path": "../public/_nuxt/DYJg4227.js"
  },
  "/_nuxt/DYoNaHQp.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5ce8-VD6pQ1H7tj66J7zticC8y7ht6KE\"",
    "mtime": "2026-07-11T00:08:25.549Z",
    "size": 23784,
    "path": "../public/_nuxt/DYoNaHQp.js"
  },
  "/_nuxt/DZxXe0lz.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"9de0-GAbwtkf4/Dc6tiEryrW7mRpLsfs\"",
    "mtime": "2026-07-11T00:08:25.549Z",
    "size": 40416,
    "path": "../public/_nuxt/DZxXe0lz.js"
  },
  "/_nuxt/D_iqerNF.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1572-Kdb37O38EppCD9yZlcCGlzDurII\"",
    "mtime": "2026-07-11T00:08:25.549Z",
    "size": 5490,
    "path": "../public/_nuxt/D_iqerNF.js"
  },
  "/_nuxt/D_v-YyCB.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1a2-eghupVWqx1z5A+/mV9apSE0I9jc\"",
    "mtime": "2026-07-11T00:08:25.551Z",
    "size": 418,
    "path": "../public/_nuxt/D_v-YyCB.js"
  },
  "/_nuxt/Dayu4EKP.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"e26-vfdTPLy0K9wK7hGwyJk8k8AS2FM\"",
    "mtime": "2026-07-11T00:08:25.551Z",
    "size": 3622,
    "path": "../public/_nuxt/Dayu4EKP.js"
  },
  "/_nuxt/DaDNKYhP.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"eda1-c/6SxSDUbAf9CRQ4A073PTOF5DM\"",
    "mtime": "2026-07-11T00:08:25.549Z",
    "size": 60833,
    "path": "../public/_nuxt/DaDNKYhP.js"
  },
  "/_nuxt/DbcauaCG.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"26a3-OF0ti53MjKOZGhHnxPZrTJNwpgM\"",
    "mtime": "2026-07-11T00:08:25.551Z",
    "size": 9891,
    "path": "../public/_nuxt/DbcauaCG.js"
  },
  "/_nuxt/Dbxjm_CC.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3d04-P0PFpgeyiZSo6scs8LOJ8AyDDIw\"",
    "mtime": "2026-07-11T00:08:25.551Z",
    "size": 15620,
    "path": "../public/_nuxt/Dbxjm_CC.js"
  },
  "/_nuxt/Ddn3lr0y.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5a4-0JEDMHoV24FzcAmsxuOpSYIAAUc\"",
    "mtime": "2026-07-11T00:08:25.551Z",
    "size": 1444,
    "path": "../public/_nuxt/Ddn3lr0y.js"
  },
  "/_nuxt/Ddsy6ysF.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"fca-qYpk48QivzEMDtd/WLYH6bSytMs\"",
    "mtime": "2026-07-11T00:08:25.551Z",
    "size": 4042,
    "path": "../public/_nuxt/Ddsy6ysF.js"
  },
  "/_nuxt/Ddv68eIx.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"6863-kMtZ6hRkLXSKT61B4950edu4MjQ\"",
    "mtime": "2026-07-11T00:08:25.551Z",
    "size": 26723,
    "path": "../public/_nuxt/Ddv68eIx.js"
  },
  "/_nuxt/DhMKtDLN.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1e8a-xKqvlxsACkI+FJYhs89ziAnlgR0\"",
    "mtime": "2026-07-11T00:08:25.551Z",
    "size": 7818,
    "path": "../public/_nuxt/DhMKtDLN.js"
  },
  "/_nuxt/Dhn9LcZ4.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"9f94-ZrmUTMh5auzjdvSdIcxydxwUq9c\"",
    "mtime": "2026-07-11T00:08:25.551Z",
    "size": 40852,
    "path": "../public/_nuxt/Dhn9LcZ4.js"
  },
  "/_nuxt/Di2qiGIh.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1c2-h6hSoj6R+EYXa/ELRLfhxf15czg\"",
    "mtime": "2026-07-11T00:08:25.551Z",
    "size": 450,
    "path": "../public/_nuxt/Di2qiGIh.js"
  },
  "/_nuxt/Dj6nwHGl.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"33080-PHp9OtcBpJaL17dBPjYizkICOYA\"",
    "mtime": "2026-07-11T00:08:25.552Z",
    "size": 209024,
    "path": "../public/_nuxt/Dj6nwHGl.js"
  },
  "/_nuxt/DjCbjd0V.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"24c5-VQOE5SxdZRNPnHUEabodC2zGvYs\"",
    "mtime": "2026-07-11T00:08:25.551Z",
    "size": 9413,
    "path": "../public/_nuxt/DjCbjd0V.js"
  },
  "/_nuxt/DjP-tqRL.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"157f4-j/0Af0d/UEZe7jWqvnoyCtvnz0U\"",
    "mtime": "2026-07-11T00:08:25.552Z",
    "size": 88052,
    "path": "../public/_nuxt/DjP-tqRL.js"
  },
  "/_nuxt/DlaVQbPD.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"502c-Vi0MlAruxh7F+9CG3YWketywtHs\"",
    "mtime": "2026-07-11T00:08:25.552Z",
    "size": 20524,
    "path": "../public/_nuxt/DlaVQbPD.js"
  },
  "/_nuxt/DlqU7Mzb.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"371c-WeeXRPF9sYhP3W0b4Bs2TiO4K3U\"",
    "mtime": "2026-07-11T00:08:25.552Z",
    "size": 14108,
    "path": "../public/_nuxt/DlqU7Mzb.js"
  },
  "/_nuxt/DmLZ6w-C.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"b4-sb3a2iYKAFb8ak1DIU4o8DBNSzE\"",
    "mtime": "2026-07-11T00:08:25.552Z",
    "size": 180,
    "path": "../public/_nuxt/DmLZ6w-C.js"
  },
  "/_nuxt/Dn00JSTd.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"339b-eDgYgmZylp6cuLTa7fn/CGMPvKo\"",
    "mtime": "2026-07-11T00:08:25.552Z",
    "size": 13211,
    "path": "../public/_nuxt/Dn00JSTd.js"
  },
  "/_nuxt/DnAB7knh.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5d91-BqgL0y0Ddgz5Uu0bf3Et6vbx2fc\"",
    "mtime": "2026-07-11T00:08:25.552Z",
    "size": 23953,
    "path": "../public/_nuxt/DnAB7knh.js"
  },
  "/_nuxt/DnULxvSX.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"8a5e-lpZgdjKbVFHBYkOMCMZXYihb+Y0\"",
    "mtime": "2026-07-11T00:08:25.552Z",
    "size": 35422,
    "path": "../public/_nuxt/DnULxvSX.js"
  },
  "/_nuxt/Dp08fnRF.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1795-Q/ivHt9cBrixZ8LyWvRIatDRVGM\"",
    "mtime": "2026-07-11T00:08:25.552Z",
    "size": 6037,
    "path": "../public/_nuxt/Dp08fnRF.js"
  },
  "/_nuxt/DqDt7uUl.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3c8-yTxGWN7Xueiod1VXm9lviYY5mI4\"",
    "mtime": "2026-07-11T00:08:25.552Z",
    "size": 968,
    "path": "../public/_nuxt/DqDt7uUl.js"
  },
  "/_nuxt/DqwNpetd.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"24d7-BiRtKEQjWndnYLM1xGeXTGnUgo4\"",
    "mtime": "2026-07-11T00:08:25.552Z",
    "size": 9431,
    "path": "../public/_nuxt/DqwNpetd.js"
  },
  "/_nuxt/Ds-gbosJ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"550a-XzUApj4T28iKwTNlG8VmS8Brr0I\"",
    "mtime": "2026-07-11T00:08:25.552Z",
    "size": 21770,
    "path": "../public/_nuxt/Ds-gbosJ.js"
  },
  "/_nuxt/DsBKuouk.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"4984-WjmeY5tJutWdsMMiLereS1vmQyo\"",
    "mtime": "2026-07-11T00:08:25.552Z",
    "size": 18820,
    "path": "../public/_nuxt/DsBKuouk.js"
  },
  "/_nuxt/Dsw7FqZU.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"672-T4trd7thf8GBr5RR4u7CrefvqKs\"",
    "mtime": "2026-07-11T00:08:25.552Z",
    "size": 1650,
    "path": "../public/_nuxt/Dsw7FqZU.js"
  },
  "/_nuxt/DtDHHidc.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"91c-oABHVs2zupYy5sEm3uOvcqijfVI\"",
    "mtime": "2026-07-11T00:08:25.552Z",
    "size": 2332,
    "path": "../public/_nuxt/DtDHHidc.js"
  },
  "/_nuxt/DtFQj3wx.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"43c2-XgzrvrTJDqceNsCnQUW+EBjq+y4\"",
    "mtime": "2026-07-11T00:08:25.552Z",
    "size": 17346,
    "path": "../public/_nuxt/DtFQj3wx.js"
  },
  "/_nuxt/Dtn5OO9k.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"bdfa-Egvh0Z9iURAjHV9rniv6m938eLw\"",
    "mtime": "2026-07-11T00:08:25.552Z",
    "size": 48634,
    "path": "../public/_nuxt/Dtn5OO9k.js"
  },
  "/_nuxt/Du268qiB.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"f0bd-VbkpUDwod17aq/uVSpqoyY3WDT8\"",
    "mtime": "2026-07-11T00:08:25.553Z",
    "size": 61629,
    "path": "../public/_nuxt/Du268qiB.js"
  },
  "/_nuxt/Du5NY7AG.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3277-BBrRmXBCOilbUBbvldFJPXoUpFw\"",
    "mtime": "2026-07-11T00:08:25.553Z",
    "size": 12919,
    "path": "../public/_nuxt/Du5NY7AG.js"
  },
  "/_nuxt/Dw-Qmv_0.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"695a-/zNWv7X2FJeh5u+163P96tYSFW8\"",
    "mtime": "2026-07-11T00:08:25.553Z",
    "size": 26970,
    "path": "../public/_nuxt/Dw-Qmv_0.js"
  },
  "/_nuxt/DxSadP1t.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1ba5-XvQPAq6oZVbBOChSwmFF834qI3s\"",
    "mtime": "2026-07-11T00:08:25.553Z",
    "size": 7077,
    "path": "../public/_nuxt/DxSadP1t.js"
  },
  "/_nuxt/DyGSH8sA.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5e86-gxsKo59awYTC7AxjO+HQ/K+9H3U\"",
    "mtime": "2026-07-11T00:08:25.553Z",
    "size": 24198,
    "path": "../public/_nuxt/DyGSH8sA.js"
  },
  "/_nuxt/E3gJ1_iC.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3903-b1i07XzPpd3BHF9/vi4M4mGWen8\"",
    "mtime": "2026-07-11T00:08:25.553Z",
    "size": 14595,
    "path": "../public/_nuxt/E3gJ1_iC.js"
  },
  "/_nuxt/DpGQfXhQ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"aa49a-UKU+sSpuynvtmFmrwSuIdlc6BOY\"",
    "mtime": "2026-07-11T00:08:25.552Z",
    "size": 697498,
    "path": "../public/_nuxt/DpGQfXhQ.js"
  },
  "/_nuxt/ESmAQuLO.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3e4-RChZOAp9T9FpJnxqyH+A6syJO8k\"",
    "mtime": "2026-07-11T00:08:25.553Z",
    "size": 996,
    "path": "../public/_nuxt/ESmAQuLO.js"
  },
  "/_nuxt/ISJeQQUc.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2fb9-GRfG4hNxJy6vX1rhPRvGVxD62yQ\"",
    "mtime": "2026-07-11T00:08:25.553Z",
    "size": 12217,
    "path": "../public/_nuxt/ISJeQQUc.js"
  },
  "/_nuxt/IuBKFhSY.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"c8b-msGNmLHIaKzNcKoEjZB/drsLZTg\"",
    "mtime": "2026-07-11T00:08:25.554Z",
    "size": 3211,
    "path": "../public/_nuxt/IuBKFhSY.js"
  },
  "/_nuxt/J6VY04bS.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"c3ec-nC7IibneWSWU7matTnoI83c3cxI\"",
    "mtime": "2026-07-11T00:08:25.554Z",
    "size": 50156,
    "path": "../public/_nuxt/J6VY04bS.js"
  },
  "/_nuxt/JetBrains_Mono-normal-400-cyrillic.Buze_B52.woff2": {
    "type": "font/woff2",
    "etag": "\"22a8-nY2y6MzZcjPCL0AMJxGhJCw1tRI\"",
    "mtime": "2026-07-11T00:08:25.554Z",
    "size": 8872,
    "path": "../public/_nuxt/JetBrains_Mono-normal-400-cyrillic.Buze_B52.woff2"
  },
  "/_nuxt/JetBrains_Mono-normal-400-greek.D3oMJlXt.woff2": {
    "type": "font/woff2",
    "etag": "\"1ab4-vO254uUoPBuIhSU0jLwsXwe94+w\"",
    "mtime": "2026-07-11T00:08:25.554Z",
    "size": 6836,
    "path": "../public/_nuxt/JetBrains_Mono-normal-400-greek.D3oMJlXt.woff2"
  },
  "/_nuxt/JetBrains_Mono-normal-400-latin-ext.DIC32ArD.woff2": {
    "type": "font/woff2",
    "etag": "\"2d68-Bq02AAzYneyT5DmMW2JWWrHRseI\"",
    "mtime": "2026-07-11T00:08:25.554Z",
    "size": 11624,
    "path": "../public/_nuxt/JetBrains_Mono-normal-400-latin-ext.DIC32ArD.woff2"
  },
  "/_nuxt/JetBrains_Mono-normal-400-latin.6fWv1k7M.woff2": {
    "type": "font/woff2",
    "etag": "\"7ac8-TycgbEscr4t4BVl/y8aSL/WAXao\"",
    "mtime": "2026-07-11T00:08:25.554Z",
    "size": 31432,
    "path": "../public/_nuxt/JetBrains_Mono-normal-400-latin.6fWv1k7M.woff2"
  },
  "/_nuxt/JetBrains_Mono-normal-400-vietnamese.BehTv68k.woff2": {
    "type": "font/woff2",
    "etag": "\"1700-MmqItN278TJfbGZhTwO2+NPcKys\"",
    "mtime": "2026-07-11T00:08:25.555Z",
    "size": 5888,
    "path": "../public/_nuxt/JetBrains_Mono-normal-400-vietnamese.BehTv68k.woff2"
  },
  "/_nuxt/JqZropPD.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1052-lr+ZoPrGKVsqJM1QoHr029xJXr8\"",
    "mtime": "2026-07-11T00:08:25.555Z",
    "size": 4178,
    "path": "../public/_nuxt/JqZropPD.js"
  },
  "/_nuxt/L9t79GZl.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1950-bOSHs4QuofVjf2ggJ3A58EemLcc\"",
    "mtime": "2026-07-11T00:08:25.555Z",
    "size": 6480,
    "path": "../public/_nuxt/L9t79GZl.js"
  },
  "/_nuxt/LGGdnPYs.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"b22d-9HJY4AmCww6E1KE0oACg3a5+tEg\"",
    "mtime": "2026-07-11T00:08:25.556Z",
    "size": 45613,
    "path": "../public/_nuxt/LGGdnPYs.js"
  },
  "/_nuxt/LKU2TuZ1.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2179-66nxLzpa/D8qjlvdNJygXub6tgg\"",
    "mtime": "2026-07-11T00:08:25.556Z",
    "size": 8569,
    "path": "../public/_nuxt/LKU2TuZ1.js"
  },
  "/_nuxt/LejgSsiB.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"120c-2jhNKWrQkXZi7uu5+oDxFWNQm+s\"",
    "mtime": "2026-07-11T00:08:25.556Z",
    "size": 4620,
    "path": "../public/_nuxt/LejgSsiB.js"
  },
  "/_nuxt/NIwJEIwF.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"28a-cmQbAlwtnVGfXd+eDMf6sUpINC4\"",
    "mtime": "2026-07-11T00:08:25.556Z",
    "size": 650,
    "path": "../public/_nuxt/NIwJEIwF.js"
  },
  "/_nuxt/OloUOd6z.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"161-Do7UZAgMY86VWrU/rX89Tz1igho\"",
    "mtime": "2026-07-11T00:08:25.556Z",
    "size": 353,
    "path": "../public/_nuxt/OloUOd6z.js"
  },
  "/_nuxt/MxEea5SM.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"e371-OWhBIq3U6saii51zD/XCsFfKWic\"",
    "mtime": "2026-07-11T00:08:25.556Z",
    "size": 58225,
    "path": "../public/_nuxt/MxEea5SM.js"
  },
  "/_nuxt/Orbitron-normal-500-latin.Du7j2Vp2.woff2": {
    "type": "font/woff2",
    "etag": "\"2e18-1obH8r/raTqRuvOqo7bnCqGlvMM\"",
    "mtime": "2026-07-11T00:08:25.556Z",
    "size": 11800,
    "path": "../public/_nuxt/Orbitron-normal-500-latin.Du7j2Vp2.woff2"
  },
  "/_nuxt/Olw6fvns.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2981-YGEjp1eChLO0Sa0jvbm47xLwIHI\"",
    "mtime": "2026-07-11T00:08:25.556Z",
    "size": 10625,
    "path": "../public/_nuxt/Olw6fvns.js"
  },
  "/_nuxt/P8WR-435.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"135c-b+92fVp6VHZIgObDym+4UFSwyZw\"",
    "mtime": "2026-07-11T00:08:25.556Z",
    "size": 4956,
    "path": "../public/_nuxt/P8WR-435.js"
  },
  "/_nuxt/PoHY5YXO.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"62d2-RQN1eJvOzFVrdHrv5KOv5WHUyDo\"",
    "mtime": "2026-07-11T00:08:25.556Z",
    "size": 25298,
    "path": "../public/_nuxt/PoHY5YXO.js"
  },
  "/_nuxt/R5DMG1SI.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"44f8-2MOEoJYJWy1nXMbBEOk/SJ8LgAc\"",
    "mtime": "2026-07-11T00:08:25.556Z",
    "size": 17656,
    "path": "../public/_nuxt/R5DMG1SI.js"
  },
  "/_nuxt/RJ4jLoVH.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"f42-l7Vf5AACXqcHI6v9HLLQ5e/U1fI\"",
    "mtime": "2026-07-11T00:08:25.556Z",
    "size": 3906,
    "path": "../public/_nuxt/RJ4jLoVH.js"
  },
  "/_nuxt/RbhLOwME.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1ab-aSdZebTS5yfixpWFnYEwtgZreu0\"",
    "mtime": "2026-07-11T00:08:25.556Z",
    "size": 427,
    "path": "../public/_nuxt/RbhLOwME.js"
  },
  "/_nuxt/RvZl2ZSs.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"8610-P6/ZHcLmW7gt+fEeHg9hscp5BsY\"",
    "mtime": "2026-07-11T00:08:25.556Z",
    "size": 34320,
    "path": "../public/_nuxt/RvZl2ZSs.js"
  },
  "/_nuxt/SKMF96pI.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"18e6-kAXeqRkqTaTU+J0FprUWg2rGepE\"",
    "mtime": "2026-07-11T00:08:25.556Z",
    "size": 6374,
    "path": "../public/_nuxt/SKMF96pI.js"
  },
  "/_nuxt/SPD3sf1n.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5e1-kZWJw1xp4sKBLGtjY+rEi+oN/hM\"",
    "mtime": "2026-07-11T00:08:25.556Z",
    "size": 1505,
    "path": "../public/_nuxt/SPD3sf1n.js"
  },
  "/_nuxt/Space_Grotesk-normal-400-latin-ext.D9tNdqV9.woff2": {
    "type": "font/woff2",
    "etag": "\"49fc-F0LVbRNUJhx55ziZ6erFdGulAH0\"",
    "mtime": "2026-07-11T00:08:25.556Z",
    "size": 18940,
    "path": "../public/_nuxt/Space_Grotesk-normal-400-latin-ext.D9tNdqV9.woff2"
  },
  "/_nuxt/Space_Grotesk-normal-400-latin.BhU9QXUp.woff2": {
    "type": "font/woff2",
    "etag": "\"5710-wHgeovKQE4JtweuNtA9NQA2d9xA\"",
    "mtime": "2026-07-11T00:08:25.557Z",
    "size": 22288,
    "path": "../public/_nuxt/Space_Grotesk-normal-400-latin.BhU9QXUp.woff2"
  },
  "/_nuxt/Space_Grotesk-normal-400-vietnamese.D0rl6rjA.woff2": {
    "type": "font/woff2",
    "etag": "\"1a38-xA/sTKWi+gmM69jUei5Rxd5DXqY\"",
    "mtime": "2026-07-11T00:08:25.557Z",
    "size": 6712,
    "path": "../public/_nuxt/Space_Grotesk-normal-400-vietnamese.D0rl6rjA.woff2"
  },
  "/_nuxt/T-Tgc4AT.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3028-DA4AZoV8kS7daPMok97GQY/nYnU\"",
    "mtime": "2026-07-11T00:08:25.557Z",
    "size": 12328,
    "path": "../public/_nuxt/T-Tgc4AT.js"
  },
  "/_nuxt/UP2u2qKn.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"6461-1eKZOZVfwKK/IlDtWFDEQif0t10\"",
    "mtime": "2026-07-11T00:08:25.558Z",
    "size": 25697,
    "path": "../public/_nuxt/UP2u2qKn.js"
  },
  "/_nuxt/WlOKAcJ7.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"8a97-/bZEPnIAwFGcx2eG8vCZGNDwdSo\"",
    "mtime": "2026-07-11T00:08:25.557Z",
    "size": 35479,
    "path": "../public/_nuxt/WlOKAcJ7.js"
  },
  "/_nuxt/XBlWyCtg.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"10d4-fwacqXN/kcCdpVbNAzMSslPcgzg\"",
    "mtime": "2026-07-11T00:08:25.557Z",
    "size": 4308,
    "path": "../public/_nuxt/XBlWyCtg.js"
  },
  "/_nuxt/YJb9dmdj.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"721-HNGlxr+iVIyVY3dIAdNMbiXIOsI\"",
    "mtime": "2026-07-11T00:08:25.558Z",
    "size": 1825,
    "path": "../public/_nuxt/YJb9dmdj.js"
  },
  "/_nuxt/YSxxb8je.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"bdd-oYAH9EeicVEaG7E21/UeIorlEOY\"",
    "mtime": "2026-07-11T00:08:25.558Z",
    "size": 3037,
    "path": "../public/_nuxt/YSxxb8je.js"
  },
  "/_nuxt/ZkSfg9es.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1ff8-fCvoFUYaxXqqDLdni067eTvDymE\"",
    "mtime": "2026-07-11T00:08:25.558Z",
    "size": 8184,
    "path": "../public/_nuxt/ZkSfg9es.js"
  },
  "/_nuxt/a8RH-YUw.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"de3-4MJ4H3Xgn2FS0O1gBAyg9d+1VU4\"",
    "mtime": "2026-07-11T00:08:25.558Z",
    "size": 3555,
    "path": "../public/_nuxt/a8RH-YUw.js"
  },
  "/_nuxt/_aLgDkRu.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"110d6-YZpGOFUymyIhP4AOwCNxdS018TA\"",
    "mtime": "2026-07-11T00:08:25.560Z",
    "size": 69846,
    "path": "../public/_nuxt/_aLgDkRu.js"
  },
  "/_nuxt/aBZrgJR0.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2ad82-uNNuI4mQsIr7frh0EhvINDlWv7Y\"",
    "mtime": "2026-07-11T00:08:25.558Z",
    "size": 175490,
    "path": "../public/_nuxt/aBZrgJR0.js"
  },
  "/_nuxt/ahYVQIuB.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"560-OrS2RypxwvuKZz6RDMmWwUZOaFI\"",
    "mtime": "2026-07-11T00:08:25.560Z",
    "size": 1376,
    "path": "../public/_nuxt/ahYVQIuB.js"
  },
  "/_nuxt/ajMbGru0.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"d32-hNJ8nslsVzQ7NFcBKsR8yuBZXjA\"",
    "mtime": "2026-07-11T00:08:25.558Z",
    "size": 3378,
    "path": "../public/_nuxt/ajMbGru0.js"
  },
  "/_nuxt/bCA53EVm.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"12d7-gmCxpZILK9DxQPkJn6V8v2sOv1k\"",
    "mtime": "2026-07-11T00:08:25.563Z",
    "size": 4823,
    "path": "../public/_nuxt/bCA53EVm.js"
  },
  "/_nuxt/bN70gL4F.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1876-TIy/lDxhgGcsWEw99X2SyGsc2kY\"",
    "mtime": "2026-07-11T00:08:25.560Z",
    "size": 6262,
    "path": "../public/_nuxt/bN70gL4F.js"
  },
  "/_nuxt/cPjAOO0u.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"151b-k9mXGEMKkTJehEXOszSfmkygsdA\"",
    "mtime": "2026-07-11T00:08:25.560Z",
    "size": 5403,
    "path": "../public/_nuxt/cPjAOO0u.js"
  },
  "/_nuxt/eHy1PpK4.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2d4c-2AKXbk+YdTeYUYwuZgLT6ZQAmMI\"",
    "mtime": "2026-07-11T00:08:25.562Z",
    "size": 11596,
    "path": "../public/_nuxt/eHy1PpK4.js"
  },
  "/_nuxt/dNX12Hsu.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"30c55-LESY+22coGoi1z6e8eupCvuSVPI\"",
    "mtime": "2026-07-11T00:08:25.560Z",
    "size": 199765,
    "path": "../public/_nuxt/dNX12Hsu.js"
  },
  "/_nuxt/eS643EOH.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"258c4-eC0+xJZRxWT5kWQehfuG7rxJGEs\"",
    "mtime": "2026-07-11T00:08:25.562Z",
    "size": 153796,
    "path": "../public/_nuxt/eS643EOH.js"
  },
  "/_nuxt/eg146-Ew.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1576-3jpvkXs1HSwtufcIuLhwdgfc8Wk\"",
    "mtime": "2026-07-11T00:08:25.560Z",
    "size": 5494,
    "path": "../public/_nuxt/eg146-Ew.js"
  },
  "/_nuxt/error-404.B_PvSG-P.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"97e-UEdC8twI5EdlJIUm0sRaAkcS4Vs\"",
    "mtime": "2026-07-11T00:08:25.562Z",
    "size": 2430,
    "path": "../public/_nuxt/error-404.B_PvSG-P.css"
  },
  "/_nuxt/entry.DRW0Xgt5.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"44ab7-vV00iUZME9QGLlt+y+KHvKXETWY\"",
    "mtime": "2026-07-11T00:08:25.563Z",
    "size": 281271,
    "path": "../public/_nuxt/entry.DRW0Xgt5.css"
  },
  "/_nuxt/error-500.CghkKCEr.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"773-rENf0G78+oDokmnx1cQdgLL1N8U\"",
    "mtime": "2026-07-11T00:08:25.563Z",
    "size": 1907,
    "path": "../public/_nuxt/error-500.CghkKCEr.css"
  },
  "/_nuxt/fje9CFhw.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"32c0-T7XDvbbJHsWWK+PXfXK8ZFO9nI0\"",
    "mtime": "2026-07-11T00:08:25.563Z",
    "size": 12992,
    "path": "../public/_nuxt/fje9CFhw.js"
  },
  "/_nuxt/gL_7E1O_.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"163-r4vPYhi9l85daIvEPbFArT21Mv8\"",
    "mtime": "2026-07-11T00:08:25.563Z",
    "size": 355,
    "path": "../public/_nuxt/gL_7E1O_.js"
  },
  "/_nuxt/h08tkfKV.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"75b-stozZPxJHBoD4g06ce1aLRDsyBA\"",
    "mtime": "2026-07-11T00:08:25.563Z",
    "size": 1883,
    "path": "../public/_nuxt/h08tkfKV.js"
  },
  "/_nuxt/h8NAKzGe.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"175-VXUnvIEwHynhYkuKzujAuDiymME\"",
    "mtime": "2026-07-11T00:08:25.563Z",
    "size": 373,
    "path": "../public/_nuxt/h8NAKzGe.js"
  },
  "/_nuxt/ifBTmRxC.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1db5-VNcKgIsBqFnv0ab9XifijpH2SrM\"",
    "mtime": "2026-07-11T00:08:25.563Z",
    "size": 7605,
    "path": "../public/_nuxt/ifBTmRxC.js"
  },
  "/_nuxt/hegEt444.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"8b51-G3BXQ+3KNXzWihQj05Fol+jGA9g\"",
    "mtime": "2026-07-11T00:08:25.563Z",
    "size": 35665,
    "path": "../public/_nuxt/hegEt444.js"
  },
  "/_nuxt/index.DHt11l8K.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"169a-WdDOHMtQvuqs3b34KlNtN0aou3E\"",
    "mtime": "2026-07-11T00:08:25.564Z",
    "size": 5786,
    "path": "../public/_nuxt/index.DHt11l8K.css"
  },
  "/_nuxt/jY9aw0fr.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2864-72GW6jf5uxkWXQk2MSD5hoMKMH0\"",
    "mtime": "2026-07-11T00:08:25.563Z",
    "size": 10340,
    "path": "../public/_nuxt/jY9aw0fr.js"
  },
  "/_nuxt/jOnvO7K6.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"33b1e-aETHYcP1UFG50Egg/21KxVPeeBg\"",
    "mtime": "2026-07-11T00:08:25.563Z",
    "size": 211742,
    "path": "../public/_nuxt/jOnvO7K6.js"
  },
  "/_nuxt/kP2iUUCn.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1b13-/QzdWr0nVgTCfPIRgWH93OSTSn8\"",
    "mtime": "2026-07-11T00:08:25.564Z",
    "size": 6931,
    "path": "../public/_nuxt/kP2iUUCn.js"
  },
  "/_nuxt/k_46elR7.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1bc37-hN4anHTy1BWRgIfR6PWRCJ/ryaA\"",
    "mtime": "2026-07-11T00:08:25.565Z",
    "size": 113719,
    "path": "../public/_nuxt/k_46elR7.js"
  },
  "/_nuxt/lQ8yLf0j.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"173a-IbaYD4W65BLtbXZFgrlddf1GLOk\"",
    "mtime": "2026-07-11T00:08:25.565Z",
    "size": 5946,
    "path": "../public/_nuxt/lQ8yLf0j.js"
  },
  "/_nuxt/m4uW47V2.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"521a-w3MftddlFkYhYUzfHiiC8BO02Uc\"",
    "mtime": "2026-07-11T00:08:25.564Z",
    "size": 21018,
    "path": "../public/_nuxt/m4uW47V2.js"
  },
  "/_nuxt/mD5xMClh.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"14a4-vXcdla3GRVvYE7Ap/mWUzN+L5LQ\"",
    "mtime": "2026-07-11T00:08:25.567Z",
    "size": 5284,
    "path": "../public/_nuxt/mD5xMClh.js"
  },
  "/_nuxt/mjjvL3DB.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"a23c-VIIs7WbV2E9zlvLjy5/Cbpkly5k\"",
    "mtime": "2026-07-11T00:08:25.565Z",
    "size": 41532,
    "path": "../public/_nuxt/mjjvL3DB.js"
  },
  "/_nuxt/nieuV3Ka.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1a2-eWUNHddX5eMuc/Nm85vE02UFRMc\"",
    "mtime": "2026-07-11T00:08:25.565Z",
    "size": 418,
    "path": "../public/_nuxt/nieuV3Ka.js"
  },
  "/_nuxt/otdIdbsQ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"20d3-jbFQeQy7FkX5X3MjnYx2imssXJk\"",
    "mtime": "2026-07-11T00:08:25.567Z",
    "size": 8403,
    "path": "../public/_nuxt/otdIdbsQ.js"
  },
  "/_nuxt/p59vI2QV.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1d5-lECC6+hwJ1eeY9MjoJ6Zu3YtLJY\"",
    "mtime": "2026-07-11T00:08:25.567Z",
    "size": 469,
    "path": "../public/_nuxt/p59vI2QV.js"
  },
  "/_nuxt/qVXJnTkO.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2fd1-wQcw2hEjPFBZYsRqnI8qB3pOOeg\"",
    "mtime": "2026-07-11T00:08:25.567Z",
    "size": 12241,
    "path": "../public/_nuxt/qVXJnTkO.js"
  },
  "/_nuxt/qmhIZ77x.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2496-FiY08L1rPm5OgVgDS34Ly8PnwQQ\"",
    "mtime": "2026-07-11T00:08:25.567Z",
    "size": 9366,
    "path": "../public/_nuxt/qmhIZ77x.js"
  },
  "/_nuxt/rAlqSFiP.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"40e4-QY45UtIn4NCI5stsGRC8ysT9XrA\"",
    "mtime": "2026-07-11T00:08:25.567Z",
    "size": 16612,
    "path": "../public/_nuxt/rAlqSFiP.js"
  },
  "/_nuxt/hKy0BSqu.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"8c55a-Bg6340tlLYTv0QWa16g+Wn01Q7Y\"",
    "mtime": "2026-07-11T00:08:25.563Z",
    "size": 574810,
    "path": "../public/_nuxt/hKy0BSqu.js"
  },
  "/_nuxt/s0gpj0oJ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"463f-7nkILS2l/q37DvKhZm7uhAe2i7I\"",
    "mtime": "2026-07-11T00:08:25.567Z",
    "size": 17983,
    "path": "../public/_nuxt/s0gpj0oJ.js"
  },
  "/_nuxt/sY1Cc3Se.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"127d-NOSYRoOc7FAmHph+IBabW1F64Zs\"",
    "mtime": "2026-07-11T00:08:25.567Z",
    "size": 4733,
    "path": "../public/_nuxt/sY1Cc3Se.js"
  },
  "/_nuxt/sdHcTMYB.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"22448-7Vo9q7xgAaixy8sQ9taS8XQ7viI\"",
    "mtime": "2026-07-11T00:08:25.567Z",
    "size": 140360,
    "path": "../public/_nuxt/sdHcTMYB.js"
  },
  "/_nuxt/sqlite3-opfs-async-proxy-C_otN2ZJ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"24eb-/FBLK7guMdffqRNvJNbJgk4Zwss\"",
    "mtime": "2026-07-11T00:08:25.568Z",
    "size": 9451,
    "path": "../public/_nuxt/sqlite3-opfs-async-proxy-C_otN2ZJ.js"
  },
  "/_nuxt/sqlite3-worker1-bundler-friendly-Bv6ABw9v.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"30103-GOxHNTh2sTNh/exLYlR0tZpazpY\"",
    "mtime": "2026-07-11T00:08:25.568Z",
    "size": 196867,
    "path": "../public/_nuxt/sqlite3-worker1-bundler-friendly-Bv6ABw9v.js"
  },
  "/_nuxt/sqlite3-DBpDb1lf.wasm": {
    "type": "application/wasm",
    "etag": "\"d117f-DZ/FD4oW3SqSLEuDOEQ4+vXRNGQ\"",
    "mtime": "2026-07-11T00:08:25.569Z",
    "size": 856447,
    "path": "../public/_nuxt/sqlite3-DBpDb1lf.wasm"
  },
  "/_nuxt/tSKsxhiT.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1a10-nu7TNEZ2uAyfxV4a91Ir4B2SBcc\"",
    "mtime": "2026-07-11T00:08:25.569Z",
    "size": 6672,
    "path": "../public/_nuxt/tSKsxhiT.js"
  },
  "/_nuxt/ulE5f4OK.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"f85-TUqi2mYX5iIEBlkFqIFPod8ZiyI\"",
    "mtime": "2026-07-11T00:08:25.570Z",
    "size": 3973,
    "path": "../public/_nuxt/ulE5f4OK.js"
  },
  "/_nuxt/tpHetfZQ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"11171-Yb9heu3v3jjgRaFJO6KtJteP1zA\"",
    "mtime": "2026-07-11T00:08:25.569Z",
    "size": 70001,
    "path": "../public/_nuxt/tpHetfZQ.js"
  },
  "/_nuxt/wBtHFjVO.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"16c-Ly7/qGYF54FSZ8NN1y2GvcOdFgQ\"",
    "mtime": "2026-07-11T00:08:25.573Z",
    "size": 364,
    "path": "../public/_nuxt/wBtHFjVO.js"
  },
  "/_nuxt/xI-RfyKK.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"6b5d-OMKyZe2D973PUPV/aZKhPsT/zYQ\"",
    "mtime": "2026-07-11T00:08:25.570Z",
    "size": 27485,
    "path": "../public/_nuxt/xI-RfyKK.js"
  },
  "/_nuxt/xNFBkepQ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"7be-qKztZ0OIPW3wZ6JhjyYaVbpVgE0\"",
    "mtime": "2026-07-11T00:08:25.568Z",
    "size": 1982,
    "path": "../public/_nuxt/xNFBkepQ.js"
  },
  "/_nuxt/xWjpatw_.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"24e-QfnVxqgduQ0OwA7LBaWBSOrr1+k\"",
    "mtime": "2026-07-11T00:08:25.573Z",
    "size": 590,
    "path": "../public/_nuxt/xWjpatw_.js"
  },
  "/_nuxt/xW4inM5L.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"13d3-+jLmvRMc01/9WPYkOy2r3CiPCCw\"",
    "mtime": "2026-07-11T00:08:25.573Z",
    "size": 5075,
    "path": "../public/_nuxt/xW4inM5L.js"
  },
  "/_nuxt/yNdrVPqT.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1a1a-PfMSNPF8XjzWBP2x+zARao8kpOw\"",
    "mtime": "2026-07-11T00:08:25.573Z",
    "size": 6682,
    "path": "../public/_nuxt/yNdrVPqT.js"
  },
  "/_nuxt/z307i-ZX.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"908-cQWLmkhreyETmHcpPfzyVCZFFGI\"",
    "mtime": "2026-07-11T00:08:25.573Z",
    "size": 2312,
    "path": "../public/_nuxt/z307i-ZX.js"
  },
  "/_nuxt/ySlJ1b_l.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3058f-oEJdxvDuqoCyHeAjBlw0Zu0Ayag\"",
    "mtime": "2026-07-11T00:08:25.573Z",
    "size": 198031,
    "path": "../public/_nuxt/ySlJ1b_l.js"
  },
  "/_nuxt/zocC4JxJ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"19ae-LuR/1VuHdYt78lN9mdxOxmxX2Xk\"",
    "mtime": "2026-07-11T00:08:25.573Z",
    "size": 6574,
    "path": "../public/_nuxt/zocC4JxJ.js"
  },
  "/__nuxt_content/docs/sql_dump.txt": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"29e0-i8tQHoi75v/e7DdVkbnVgGrr0aY\"",
    "mtime": "2026-07-11T00:08:25.401Z",
    "size": 10720,
    "path": "../public/__nuxt_content/docs/sql_dump.txt"
  },
  "/_nuxt/builds/latest.json": {
    "type": "application/json",
    "etag": "\"47-VjOonS+2kcu6c5z9GBBV2IJ6Soc\"",
    "mtime": "2026-07-11T00:08:25.454Z",
    "size": 71,
    "path": "../public/_nuxt/builds/latest.json"
  },
  "/_nuxt/builds/meta/8148c41e-d1f7-4c60-bc2e-a3b961bbe2bb.json": {
    "type": "application/json",
    "etag": "\"58-odtSKGQoEL7JF3NZ9JwBKRCj8xU\"",
    "mtime": "2026-07-11T00:08:25.453Z",
    "size": 88,
    "path": "../public/_nuxt/builds/meta/8148c41e-d1f7-4c60-bc2e-a3b961bbe2bb.json"
  },
  "/_nuxt/sqlite3.DBpDb1lf.wasm": {
    "type": "application/wasm",
    "etag": "\"d117f-DZ/FD4oW3SqSLEuDOEQ4+vXRNGQ\"",
    "mtime": "2026-07-11T00:08:25.570Z",
    "size": 856447,
    "path": "../public/_nuxt/sqlite3.DBpDb1lf.wasm"
  }
};

const _DRIVE_LETTER_START_RE = /^[A-Za-z]:\//;
function normalizeWindowsPath(input = "") {
  if (!input) {
    return input;
  }
  return input.replace(/\\/g, "/").replace(_DRIVE_LETTER_START_RE, (r) => r.toUpperCase());
}
const _IS_ABSOLUTE_RE = /^[/\\](?![/\\])|^[/\\]{2}(?!\.)|^[A-Za-z]:[/\\]/;
const _DRIVE_LETTER_RE = /^[A-Za-z]:$/;
function cwd() {
  if (typeof process !== "undefined" && typeof process.cwd === "function") {
    return process.cwd().replace(/\\/g, "/");
  }
  return "/";
}
const resolve = function(...arguments_) {
  arguments_ = arguments_.map((argument) => normalizeWindowsPath(argument));
  let resolvedPath = "";
  let resolvedAbsolute = false;
  for (let index = arguments_.length - 1; index >= -1 && !resolvedAbsolute; index--) {
    const path = index >= 0 ? arguments_[index] : cwd();
    if (!path || path.length === 0) {
      continue;
    }
    resolvedPath = `${path}/${resolvedPath}`;
    resolvedAbsolute = isAbsolute(path);
  }
  resolvedPath = normalizeString(resolvedPath, !resolvedAbsolute);
  if (resolvedAbsolute && !isAbsolute(resolvedPath)) {
    return `/${resolvedPath}`;
  }
  return resolvedPath.length > 0 ? resolvedPath : ".";
};
function normalizeString(path, allowAboveRoot) {
  let res = "";
  let lastSegmentLength = 0;
  let lastSlash = -1;
  let dots = 0;
  let char = null;
  for (let index = 0; index <= path.length; ++index) {
    if (index < path.length) {
      char = path[index];
    } else if (char === "/") {
      break;
    } else {
      char = "/";
    }
    if (char === "/") {
      if (lastSlash === index - 1 || dots === 1) ; else if (dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res[res.length - 1] !== "." || res[res.length - 2] !== ".") {
          if (res.length > 2) {
            const lastSlashIndex = res.lastIndexOf("/");
            if (lastSlashIndex === -1) {
              res = "";
              lastSegmentLength = 0;
            } else {
              res = res.slice(0, lastSlashIndex);
              lastSegmentLength = res.length - 1 - res.lastIndexOf("/");
            }
            lastSlash = index;
            dots = 0;
            continue;
          } else if (res.length > 0) {
            res = "";
            lastSegmentLength = 0;
            lastSlash = index;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          res += res.length > 0 ? "/.." : "..";
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0) {
          res += `/${path.slice(lastSlash + 1, index)}`;
        } else {
          res = path.slice(lastSlash + 1, index);
        }
        lastSegmentLength = index - lastSlash - 1;
      }
      lastSlash = index;
      dots = 0;
    } else if (char === "." && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}
const isAbsolute = function(p) {
  return _IS_ABSOLUTE_RE.test(p);
};
const dirname = function(p) {
  const segments = normalizeWindowsPath(p).replace(/\/$/, "").split("/").slice(0, -1);
  if (segments.length === 1 && _DRIVE_LETTER_RE.test(segments[0])) {
    segments[0] += "/";
  }
  return segments.join("/") || (isAbsolute(p) ? "/" : ".");
};

function readAsset (id) {
  const serverDir = dirname(fileURLToPath(globalThis._importMeta_.url));
  return promises.readFile(resolve(serverDir, assets[id].path))
}

const publicAssetBases = {"/_nuxt/builds/meta/":{"maxAge":31536000},"/_nuxt/builds/":{"maxAge":1},"/_fonts/":{"maxAge":31536000},"/_nuxt/":{"maxAge":31536000}};

function isPublicAssetURL(id = '') {
  if (assets[id]) {
    return true
  }
  for (const base in publicAssetBases) {
    if (id.startsWith(base)) { return true }
  }
  return false
}

function getAsset (id) {
  return assets[id]
}

const METHODS = /* @__PURE__ */ new Set(["HEAD", "GET"]);
const EncodingMap = { gzip: ".gz", br: ".br" };
const _ggZAi3 = eventHandler((event) => {
  if (event.method && !METHODS.has(event.method)) {
    return;
  }
  let id = decodePath(
    withLeadingSlash(withoutTrailingSlash(parseURL(event.path).pathname))
  );
  let asset;
  const encodingHeader = String(
    getRequestHeader(event, "accept-encoding") || ""
  );
  const encodings = [
    ...encodingHeader.split(",").map((e) => EncodingMap[e.trim()]).filter(Boolean).sort(),
    ""
  ];
  for (const encoding of encodings) {
    for (const _id of [id + encoding, joinURL(id, "index.html" + encoding)]) {
      const _asset = getAsset(_id);
      if (_asset) {
        asset = _asset;
        id = _id;
        break;
      }
    }
  }
  if (!asset) {
    if (isPublicAssetURL(id)) {
      removeResponseHeader(event, "Cache-Control");
      throw createError$1({ statusCode: 404 });
    }
    return;
  }
  if (asset.encoding !== void 0) {
    appendResponseHeader(event, "Vary", "Accept-Encoding");
  }
  const ifNotMatch = getRequestHeader(event, "if-none-match") === asset.etag;
  if (ifNotMatch) {
    setResponseStatus(event, 304, "Not Modified");
    return "";
  }
  const ifModifiedSinceH = getRequestHeader(event, "if-modified-since");
  const mtimeDate = new Date(asset.mtime);
  if (ifModifiedSinceH && asset.mtime && new Date(ifModifiedSinceH) >= mtimeDate) {
    setResponseStatus(event, 304, "Not Modified");
    return "";
  }
  if (asset.type && !getResponseHeader(event, "Content-Type")) {
    setResponseHeader(event, "Content-Type", asset.type);
  }
  if (asset.etag && !getResponseHeader(event, "ETag")) {
    setResponseHeader(event, "ETag", asset.etag);
  }
  if (asset.mtime && !getResponseHeader(event, "Last-Modified")) {
    setResponseHeader(event, "Last-Modified", mtimeDate.toUTCString());
  }
  if (asset.encoding && !getResponseHeader(event, "Content-Encoding")) {
    setResponseHeader(event, "Content-Encoding", asset.encoding);
  }
  if (asset.size > 0 && !getResponseHeader(event, "Content-Length")) {
    setResponseHeader(event, "Content-Length", asset.size);
  }
  return readAsset(id);
});

function defineRenderHandler(render) {
  const runtimeConfig = useRuntimeConfig();
  return eventHandler(async (event) => {
    const nitroApp = useNitroApp();
    const ctx = { event, render, response: void 0 };
    await nitroApp.hooks.callHook("render:before", ctx);
    if (!ctx.response) {
      if (event.path === `${runtimeConfig.app.baseURL}favicon.ico`) {
        setResponseHeader(event, "Content-Type", "image/x-icon");
        return send(
          event,
          "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
        );
      }
      ctx.response = await ctx.render(event);
      if (!ctx.response) {
        const _currentStatus = getResponseStatus(event);
        setResponseStatus(event, _currentStatus === 200 ? 500 : _currentStatus);
        return send(
          event,
          "No response returned from render handler: " + event.path
        );
      }
    }
    await nitroApp.hooks.callHook("render:response", ctx.response, ctx);
    if (ctx.response.headers) {
      setResponseHeaders(event, ctx.response.headers);
    }
    if (ctx.response.statusCode || ctx.response.statusMessage) {
      setResponseStatus(
        event,
        ctx.response.statusCode,
        ctx.response.statusMessage
      );
    }
    return ctx.response.body;
  });
}

function baseURL() {
	
	return useRuntimeConfig().app.baseURL;
}
function buildAssetsDir() {
	
	return useRuntimeConfig().app.buildAssetsDir;
}
function buildAssetsURL(...path) {
	return joinRelativeURL(publicAssetsURL(), buildAssetsDir(), ...path);
}
function publicAssetsURL(...path) {
	
	const app = useRuntimeConfig().app;
	const publicBase = app.cdnURL || app.baseURL;
	return path.length ? joinRelativeURL(publicBase, ...path) : publicBase;
}

const checksums = {
  "docs": "v3.5.0--tJKkz522pazf9KPO8IsLOCK1BOVXgATAfqrp3z-o3ZM"
};
const checksumsStructure = {
  "docs": "quFkNIUZZFAwcn0ok74-KsIERem9u0p5DW-cqEgxrPA"
};

const tables = {
  "docs": "_content_docs",
  "info": "_content_info"
};

const contentManifest = {
  "docs": {
    "type": "page",
    "fields": {
      "id": "string",
      "title": "string",
      "body": "json",
      "description": "string",
      "extension": "string",
      "meta": "json",
      "navigation": "json",
      "path": "string",
      "seo": "json",
      "stem": "string"
    }
  },
  "info": {
    "type": "data",
    "fields": {}
  }
};

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
    query: { v: checksums[String(collection)], t: void 0 }
  };
  return event ? await event.$fetch(url, fetchOptions) : await $fetch(url, fetchOptions);
}
async function fetchDatabase(event, collection) {
  return fetchContent(event, collection, "sql_dump.txt", {
    responseType: "text",
    headers: {
      "content-type": "text/plain"
    }
  });
}

const collections = {
  'lucide': () => import('../_/icons.mjs').then(m => m.default),
  'material-symbols': () => import('../_/icons2.mjs').then(m => m.default),
  'simple-icons': () => import('../_/icons3.mjs').then(m => m.default),
};

const DEFAULT_ENDPOINT = "https://api.iconify.design";
const _sFKBXg = defineCachedEventHandler(async (event) => {
  const options = useAppConfig().icon;
  const collectionName = event.context.params?.collection?.replace(/\.json$/, "");
  const collection = collectionName && Object.hasOwn(collections, collectionName) ? await collections[collectionName]?.() : null;
  const apiEndPoint = options.iconifyApiEndpoint || DEFAULT_ENDPOINT;
  const icons = String(parseQuery(parsePath(event.path).search).icons || "").split(",");
  if (!collectionName) return createError$1({ status: 400, message: "No collection specified" });
  if (!icons.length) return createError$1({ status: 400, message: "No icons specified" });
  if (collection) {
    const data = getIcons(
      collection,
      icons
    );
    consola.debug(`[Icon] serving ${icons.map((i) => "`" + collectionName + ":" + i + "`").join(",")} from bundled collection`);
    return data;
  }
  if (options.fallbackToApi === true || options.fallbackToApi === "server-only") {
    const apiUrl = new URL(`./${collectionName}.json?icons=${icons.join(",")}`, apiEndPoint);
    consola.debug(`[Icon] fetching ${icons.map((i) => "`" + collectionName + ":" + i + "`").join(",")} from iconify api`);
    if (apiUrl.host !== new URL(apiEndPoint).host) {
      return createError$1({ status: 400, message: "Invalid icon request" });
    }
    try {
      const data = await $fetch(apiUrl.href);
      return data;
    } catch (e) {
      consola.error(e);
      if (e.status === 404)
        return createError$1({ status: 404 });
      else
        return createError$1({ status: 500, message: "Failed to fetch fallback icon" });
    }
  }
  return createError$1({ status: 404 });
}, {
  group: "nuxt",
  name: "icon",
  getKey(event) {
    const collection = event.context.params?.collection?.replace(/\.json$/, "") || "unknown";
    const icons = String(parseQuery(parsePath(event.path).search).icons || "").split(",");
    return `${collection}_${icons[0]}_${icons.length}_${hash$1(icons.join(","))}`;
  },
  swr: true,
  maxAge: 60 * 60 * 24 * 7
  // 1 week
});

const _bFkJck = eventHandler(async (event) => {
  const collection = getRouterParam(event, "collection") || event.path?.split("/")?.[2] || "";
  setHeader(event, "Content-Type", "text/plain");
  const data = await useStorage().getItem(`build:content:database.compressed.mjs`) || "";
  if (data) {
    const lineStart = `export const ${collection} = "`;
    const content = String(data).split("\n").find((line) => line.startsWith(lineStart));
    if (content) {
      return content.substring(lineStart.length, content.length - 1);
    }
  }
  return await import('../build/database.compressed.mjs').then((m) => m[collection]);
});

const _SxA8c9 = defineEventHandler(() => {});

async function decompressSQLDump(base64Str, compressionType = "gzip") {
  let binaryData;
  if (typeof Buffer !== "undefined") {
    const buffer = Buffer.from(base64Str, "base64");
    binaryData = Uint8Array.from(buffer);
  } else if (typeof atob !== "undefined") {
    binaryData = Uint8Array.from(atob(base64Str), (c) => c.charCodeAt(0));
  } else {
    throw new TypeError("No base64 decoding method available");
  }
  const response = new Response(new Blob([binaryData]));
  const decompressedStream = response.body?.pipeThrough(new DecompressionStream(compressionType));
  const text = await new Response(decompressedStream).text();
  return JSON.parse(text);
}

function refineContentFields(sql, doc) {
  const fields = findCollectionFields(sql);
  const item = { ...doc };
  for (const key in item) {
    if (fields[key] === "json" && item[key] && item[key] !== "undefined") {
      item[key] = JSON.parse(item[key]);
    }
    if (fields[key] === "boolean" && item[key] !== "undefined") {
      item[key] = Boolean(item[key]);
    }
  }
  for (const key in item) {
    if (item[key] === "NULL") {
      item[key] = void 0;
    }
  }
  return item;
}
function findCollectionFields(sql) {
  const table = sql.match(/FROM\s+(\w+)/);
  if (!table) {
    return {};
  }
  const info = contentManifest[getCollectionName(table[1])];
  return info?.fields || {};
}
function getCollectionName(table) {
  return table.replace(/^_content_/, "");
}

class BoundableStatement {
	_statement;
	constructor(rawStmt) {
		this._statement = rawStmt;
	}
	bind(...params) {
		return new BoundStatement(this, params);
	}
}
class BoundStatement {
	#statement;
	#params;
	constructor(statement, params) {
		this.#statement = statement;
		this.#params = params;
	}
	bind(...params) {
		return new BoundStatement(this.#statement, params);
	}
	all() {
		return this.#statement.all(...this.#params);
	}
	run() {
		return this.#statement.run(...this.#params);
	}
	get() {
		return this.#statement.get(...this.#params);
	}
}

function sqliteConnector(opts) {
	let _db;
	const getDB = () => {
		if (_db) {
			return _db;
		}
		if (opts.name === ":memory:") {
			_db = new Database(":memory:");
			return _db;
		}
		const filePath = resolve$1(opts.cwd || ".", opts.path || `.data/${opts.name || "db"}.sqlite3`);
		mkdirSync(dirname$1(filePath), { recursive: true });
		_db = new Database(filePath);
		return _db;
	};
	return {
		name: "sqlite",
		dialect: "sqlite",
		getInstance: () => getDB(),
		exec: (sql) => getDB().exec(sql),
		prepare: (sql) => new StatementWrapper(() => getDB().prepare(sql)),
		dispose: () => {
			_db?.close?.();
			_db = undefined;
		}
	};
}
class StatementWrapper extends BoundableStatement {
	async all(...params) {
		return this._statement().all(...params);
	}
	async run(...params) {
		const res = this._statement().run(...params);
		return {
			success: res.changes > 0,
			...res
		};
	}
	async get(...params) {
		return this._statement().get(...params);
	}
}

let db;
function loadDatabaseAdapter(config) {
  const { database, localDatabase } = config;
  if (!db) {
    if (["nitro-prerender", "nitro-dev"].includes("node-server")) {
      db = sqliteConnector(refineDatabaseConfig(localDatabase));
    } else {
      db = sqliteConnector(refineDatabaseConfig(database));
    }
  }
  return {
    all: async (sql, params = []) => {
      return db.prepare(sql).all(...params).then((result) => (result || []).map((item) => refineContentFields(sql, item)));
    },
    first: async (sql, params = []) => {
      return db.prepare(sql).get(...params).then((item) => item ? refineContentFields(sql, item) : item);
    },
    exec: async (sql, params = []) => {
      return db.prepare(sql).run(...params);
    }
  };
}
const checkDatabaseIntegrity = /* @__PURE__ */ new Map();
const integrityCheckPromise = /* @__PURE__ */ new Map();
async function checkAndImportDatabaseIntegrity(event, collection, config) {
  if (checkDatabaseIntegrity.get(collection) !== false) {
    checkDatabaseIntegrity.set(collection, false);
    if (!integrityCheckPromise.has(collection)) {
      const _integrityCheck = _checkAndImportDatabaseIntegrity(event, collection, checksums[collection], checksumsStructure[collection], config).then((isValid) => {
        checkDatabaseIntegrity.set(collection, !isValid);
      }).catch((error) => {
        console.error("Database integrity check failed", error);
        checkDatabaseIntegrity.set(collection, true);
        integrityCheckPromise.delete(collection);
      });
      integrityCheckPromise.set(collection, _integrityCheck);
    }
  }
  if (integrityCheckPromise.has(collection)) {
    await integrityCheckPromise.get(collection);
  }
}
async function _checkAndImportDatabaseIntegrity(event, collection, integrityVersion, structureIntegrityVersion, config) {
  const db2 = loadDatabaseAdapter(config);
  const before = await db2.first(`SELECT * FROM ${tables.info} WHERE id = ?`, [`checksum_${collection}`]).catch(() => null);
  if (before?.version && !String(before.version)?.startsWith(`${config.databaseVersion}--`)) {
    await db2.exec(`DROP TABLE IF EXISTS ${tables.info}`);
    before.version = "";
  }
  const unchangedStructure = before?.structureVersion === structureIntegrityVersion;
  if (before?.version) {
    if (before.version === integrityVersion) {
      if (before.ready) {
        return true;
      }
      await waitUntilDatabaseIsReady(db2, collection);
      return true;
    }
    await db2.exec(`DELETE FROM ${tables.info} WHERE id = ?`, [`checksum_${collection}`]);
    if (!unchangedStructure) {
      await db2.exec(`DROP TABLE IF EXISTS ${tables[collection]}`);
    }
  }
  const dump = await loadDatabaseDump(event, collection).then(decompressSQLDump);
  const dumpLinesHash = dump.map((row) => row.split(" -- ").pop());
  let hashesInDb = /* @__PURE__ */ new Set();
  if (unchangedStructure) {
    const hashListFromTheDump = new Set(dumpLinesHash);
    const hashesInDbRecords = await db2.all(`SELECT __hash__ FROM ${tables[collection]}`).catch(() => []);
    hashesInDb = new Set(hashesInDbRecords.map((r) => r.__hash__));
    const hashesToDelete = hashesInDb.difference(hashListFromTheDump);
    if (hashesToDelete.size) {
      await db2.exec(`DELETE FROM ${tables[collection]} WHERE __hash__ IN (${Array(hashesToDelete.size).fill("?").join(",")})`, Array.from(hashesToDelete));
    }
  }
  await dump.reduce(async (prev, sql, index) => {
    await prev;
    const hash = dumpLinesHash[index];
    const statement = sql.substring(0, sql.length - hash.length - 4);
    if (unchangedStructure) {
      if (hash === "structure") {
        return Promise.resolve();
      }
      if (hashesInDb.has(hash)) {
        return Promise.resolve();
      }
    }
    await db2.exec(statement).catch((err) => {
      const message = err.message || "Unknown error";
      console.error(`Failed to execute SQL ${sql}: ${message}`);
    });
  }, Promise.resolve());
  const after = await db2.first(`SELECT version FROM ${tables.info} WHERE id = ?`, [`checksum_${collection}`]).catch(() => ({ version: "" }));
  return after?.version === integrityVersion;
}
const REQUEST_TIMEOUT = 90;
async function waitUntilDatabaseIsReady(db2, collection) {
  let iterationCount = 0;
  let interval;
  await new Promise((resolve, reject) => {
    interval = setInterval(async () => {
      const row = await db2.first(`SELECT ready FROM ${tables.info} WHERE id = ?`, [`checksum_${collection}`]).catch(() => ({ ready: true }));
      if (row?.ready) {
        clearInterval(interval);
        resolve(0);
      }
      if (iterationCount++ > REQUEST_TIMEOUT) {
        clearInterval(interval);
        reject(new Error("Waiting for another database initialization timed out"));
      }
    }, 1e3);
  }).catch((e) => {
    throw e;
  }).finally(() => {
    if (interval) {
      clearInterval(interval);
    }
  });
}
async function loadDatabaseDump(event, collection) {
  return await fetchDatabase(event, collection).catch((e) => {
    console.error("Failed to fetch compressed dump", e);
    return "";
  });
}
function refineDatabaseConfig(config) {
  if (config.type === "d1") {
    return { ...config, bindingName: config.bindingName || config.binding };
  }
  if (config.type === "sqlite") {
    const _config = { ...config };
    if (config.filename === ":memory:") {
      return { name: ":memory:" };
    }
    if ("filename" in config) {
      const filename = isAbsolute(config?.filename || "") || config?.filename === ":memory:" ? config?.filename : new URL(config.filename, globalThis._importMeta_.url).pathname;
      _config.path = process.platform === "win32" && filename.startsWith("/") ? filename.slice(1) : filename;
    }
    return _config;
  }
  if (config.type === "pglite") {
    return {
      dataDir: config.dataDir,
      // Pass through any other PGlite-specific options
      ...config
    };
  }
  return config;
}

const SQL_COMMANDS = /SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|\$/i;
const SQL_COUNT_REGEX = /^COUNT\((DISTINCT )?([a-z_]\w+|\*)\) as count$/i;
const SQL_SELECT_REGEX = /^SELECT (.*) FROM (\w+)( WHERE .*)? ORDER BY (["\w,\s]+) (ASC|DESC)( LIMIT \d+)?( OFFSET \d+)?$/;
function assertSafeQuery(sql, collection) {
  if (!sql) {
    throw new Error("Invalid query: Query cannot be empty");
  }
  const cleanedupQuery = cleanupQuery(sql);
  if (cleanedupQuery !== sql) {
    throw new Error("Invalid query: SQL comments are not allowed");
  }
  const match = sql.match(SQL_SELECT_REGEX);
  if (!match) {
    throw new Error("Invalid query: Query must be a valid SELECT statement with proper syntax");
  }
  const [_, select, from, where, orderBy, order, limit, offset] = match;
  const columns = select?.trim().split(", ") || [];
  if (columns.length === 1) {
    if (columns[0] !== "*" && !columns[0]?.match(SQL_COUNT_REGEX) && !columns[0]?.match(/^"[a-z_]\w+"$/i)) {
      throw new Error(`Invalid query: Column '${columns[0]}' has invalid format. Expected *, COUNT(), or a quoted column name`);
    }
  } else if (!columns.every((column) => column.match(/^"[a-z_]\w+"$/i))) {
    throw new Error("Invalid query: Multiple columns must be properly quoted and alphanumeric");
  }
  if (from !== `_content_${collection}`) {
    const collection2 = String(from || "").replace(/^_content_/, "");
    throw new Error(`Invalid query: Collection '${collection2}' does not exist`);
  }
  if (where) {
    if (!where.startsWith(" WHERE (") || !where.endsWith(")")) {
      throw new Error("Invalid query: WHERE clause must be properly enclosed in parentheses");
    }
    const noString = cleanupQuery(where, { removeString: true });
    if (noString.match(SQL_COMMANDS)) {
      throw new Error("Invalid query: WHERE clause contains unsafe SQL commands");
    }
  }
  const _order = (orderBy + " " + order).split(", ");
  if (!_order.every((column) => column.match(/^("[a-zA-Z_]+"|[a-zA-Z_]+) (ASC|DESC)$/))) {
    throw new Error("Invalid query: ORDER BY clause must contain valid column names followed by ASC or DESC");
  }
  if (limit !== void 0 && !limit.match(/^ LIMIT \d+$/)) {
    throw new Error("Invalid query: LIMIT clause must be a positive number");
  }
  if (offset !== void 0 && !offset.match(/^ OFFSET \d+$/)) {
    throw new Error("Invalid query: OFFSET clause must be a positive number");
  }
  return true;
}
function cleanupQuery(query, options = { removeString: false }) {
  let inString = false;
  let stringFence = "";
  let result = "";
  for (let i = 0; i < query.length; i++) {
    const char = query[i];
    const prevChar = query[i - 1];
    const nextChar = query[i + 1];
    if (char === "'" || char === '"') {
      if (!options?.removeString) {
        result += char;
        continue;
      }
      if (inString) {
        if (char !== stringFence || nextChar === stringFence || prevChar === stringFence) {
          continue;
        }
        inString = false;
        stringFence = "";
        continue;
      } else {
        inString = true;
        stringFence = char;
        continue;
      }
    }
    if (!inString) {
      if (char === "-" && nextChar === "-") {
        return result;
      }
      if (char === "/" && nextChar === "*") {
        i += 2;
        while (i < query.length && !(query[i] === "*" && query[i + 1] === "/")) {
          i += 1;
        }
        i += 2;
        continue;
      }
      result += char;
    }
  }
  return result;
}

const _pnnHTy = eventHandler(async (event) => {
  const { sql } = await readBody(event);
  const collection = getRouterParam(event, "collection") || event.path?.split("/")?.[2] || "";
  assertSafeQuery(sql, collection);
  const conf = useRuntimeConfig().content;
  if (conf.integrityCheck) {
    await checkAndImportDatabaseIntegrity(event, collection, conf);
  }
  return loadDatabaseAdapter(conf).all(sql);
});

const _lazy_GCmx0c = () => import('../routes/renderer.mjs').then(function (n) { return n.r; });

const handlers = [
  { route: '', handler: _ggZAi3, lazy: false, middleware: true, method: undefined },
  { route: '/__nuxt_error', handler: _lazy_GCmx0c, lazy: true, middleware: false, method: undefined },
  { route: '/api/_nuxt_icon/:collection', handler: _sFKBXg, lazy: false, middleware: false, method: undefined },
  { route: '/__nuxt_content/docs/sql_dump.txt', handler: _bFkJck, lazy: false, middleware: false, method: undefined },
  { route: '/__nuxt_content/info/sql_dump.txt', handler: _bFkJck, lazy: false, middleware: false, method: undefined },
  { route: '/__nuxt_island/**', handler: _SxA8c9, lazy: false, middleware: false, method: undefined },
  { route: '/__nuxt_content/docs/query', handler: _pnnHTy, lazy: false, middleware: false, method: undefined },
  { route: '/__nuxt_content/info/query', handler: _pnnHTy, lazy: false, middleware: false, method: undefined },
  { route: '/**', handler: _lazy_GCmx0c, lazy: true, middleware: false, method: undefined }
];

function createNitroApp() {
  const config = useRuntimeConfig();
  const hooks = createHooks();
  const captureError = (error, context = {}) => {
    const promise = hooks.callHookParallel("error", error, context).catch((error_) => {
      console.error("Error while capturing another error", error_);
    });
    if (context.event && isEvent(context.event)) {
      const errors = context.event.context.nitro?.errors;
      if (errors) {
        errors.push({ error, context });
      }
      if (context.event.waitUntil) {
        context.event.waitUntil(promise);
      }
    }
  };
  const h3App = createApp({
    debug: destr(false),
    onError: (error, event) => {
      captureError(error, { event, tags: ["request"] });
      return errorHandler(error, event);
    },
    onRequest: async (event) => {
      event.context.nitro = event.context.nitro || { errors: [] };
      const fetchContext = event.node.req?.__unenv__;
      if (fetchContext?._platform) {
        event.context = {
          _platform: fetchContext?._platform,
          // #3335
          ...fetchContext._platform,
          ...event.context
        };
      }
      if (!event.context.waitUntil && fetchContext?.waitUntil) {
        event.context.waitUntil = fetchContext.waitUntil;
      }
      event.fetch = (req, init) => fetchWithEvent(event, req, init, { fetch: localFetch });
      event.$fetch = (req, init) => fetchWithEvent(event, req, init, {
        fetch: $fetch
      });
      event.waitUntil = (promise) => {
        if (!event.context.nitro._waitUntilPromises) {
          event.context.nitro._waitUntilPromises = [];
        }
        event.context.nitro._waitUntilPromises.push(promise);
        if (event.context.waitUntil) {
          event.context.waitUntil(promise);
        }
      };
      event.captureError = (error, context) => {
        captureError(error, { event, ...context });
      };
      await nitroApp$1.hooks.callHook("request", event).catch((error) => {
        captureError(error, { event, tags: ["request"] });
      });
    },
    onBeforeResponse: async (event, response) => {
      await nitroApp$1.hooks.callHook("beforeResponse", event, response).catch((error) => {
        captureError(error, { event, tags: ["request", "response"] });
      });
    },
    onAfterResponse: async (event, response) => {
      await nitroApp$1.hooks.callHook("afterResponse", event, response).catch((error) => {
        captureError(error, { event, tags: ["request", "response"] });
      });
    }
  });
  const router = createRouter({
    preemptive: true
  });
  const nodeHandler = toNodeListener(h3App);
  const localCall = (aRequest) => b(
    nodeHandler,
    aRequest
  );
  const localFetch = (input, init) => {
    if (!input.toString().startsWith("/")) {
      return globalThis.fetch(input, init);
    }
    return C(
      nodeHandler,
      input,
      init
    ).then((response) => normalizeFetchResponse(response));
  };
  const $fetch = createFetch({
    fetch: localFetch,
    Headers: Headers$1,
    defaults: { baseURL: config.app.baseURL }
  });
  globalThis.$fetch = $fetch;
  h3App.use(createRouteRulesHandler({ localFetch }));
  for (const h of handlers) {
    let handler = h.lazy ? lazyEventHandler(h.handler) : h.handler;
    if (h.middleware || !h.route) {
      const middlewareBase = (config.app.baseURL + (h.route || "/")).replace(
        /\/+/g,
        "/"
      );
      h3App.use(middlewareBase, handler);
    } else {
      const routeRules = getRouteRulesForPath(
        h.route.replace(/:\w+|\*\*/g, "_")
      );
      if (routeRules.cache) {
        handler = cachedEventHandler(handler, {
          group: "nitro/routes",
          ...routeRules.cache
        });
      }
      router.use(h.route, handler, h.method);
    }
  }
  h3App.use(config.app.baseURL, router.handler);
  const app = {
    hooks,
    h3App,
    router,
    localCall,
    localFetch,
    captureError
  };
  return app;
}
function runNitroPlugins(nitroApp2) {
  for (const plugin of plugins) {
    try {
      plugin(nitroApp2);
    } catch (error) {
      nitroApp2.captureError(error, { tags: ["plugin"] });
      throw error;
    }
  }
}
const nitroApp$1 = createNitroApp();
function useNitroApp() {
  return nitroApp$1;
}
runNitroPlugins(nitroApp$1);

const debug = (...args) => {
};
function GracefulShutdown(server, opts) {
  opts = opts || {};
  const options = Object.assign(
    {
      signals: "SIGINT SIGTERM",
      timeout: 3e4,
      development: false,
      forceExit: true,
      onShutdown: (signal) => Promise.resolve(signal),
      preShutdown: (signal) => Promise.resolve(signal)
    },
    opts
  );
  let isShuttingDown = false;
  const connections = {};
  let connectionCounter = 0;
  const secureConnections = {};
  let secureConnectionCounter = 0;
  let failed = false;
  let finalRun = false;
  function onceFactory() {
    let called = false;
    return (emitter, events, callback) => {
      function call() {
        if (!called) {
          called = true;
          return Reflect.apply(callback, this, arguments);
        }
      }
      for (const e of events) {
        emitter.on(e, call);
      }
    };
  }
  const signals = options.signals.split(" ").map((s) => s.trim()).filter((s) => s.length > 0);
  const once = onceFactory();
  once(process, signals, (signal) => {
    debug("received shut down signal", signal);
    shutdown(signal).then(() => {
      if (options.forceExit) {
        process.exit(failed ? 1 : 0);
      }
    }).catch((error) => {
      debug("server shut down error occurred", error);
      process.exit(1);
    });
  });
  function isFunction(functionToCheck) {
    const getType = Object.prototype.toString.call(functionToCheck);
    return /^\[object\s([A-Za-z]+)?Function]$/.test(getType);
  }
  function destroy(socket, force = false) {
    if (socket._isIdle && isShuttingDown || force) {
      socket.destroy();
      if (socket.server instanceof http.Server) {
        delete connections[socket._connectionId];
      } else {
        delete secureConnections[socket._connectionId];
      }
    }
  }
  function destroyAllConnections(force = false) {
    debug("Destroy Connections : " + (force ? "forced close" : "close"));
    let counter = 0;
    let secureCounter = 0;
    for (const key of Object.keys(connections)) {
      const socket = connections[key];
      const serverResponse = socket._httpMessage;
      if (serverResponse && !force) {
        if (!serverResponse.headersSent) {
          serverResponse.setHeader("connection", "close");
        }
      } else {
        counter++;
        destroy(socket);
      }
    }
    debug("Connections destroyed : " + counter);
    debug("Connection Counter    : " + connectionCounter);
    for (const key of Object.keys(secureConnections)) {
      const socket = secureConnections[key];
      const serverResponse = socket._httpMessage;
      if (serverResponse && !force) {
        if (!serverResponse.headersSent) {
          serverResponse.setHeader("connection", "close");
        }
      } else {
        secureCounter++;
        destroy(socket);
      }
    }
    debug("Secure Connections destroyed : " + secureCounter);
    debug("Secure Connection Counter    : " + secureConnectionCounter);
  }
  server.on("request", (req, res) => {
    req.socket._isIdle = false;
    if (isShuttingDown && !res.headersSent) {
      res.setHeader("connection", "close");
    }
    res.on("finish", () => {
      req.socket._isIdle = true;
      destroy(req.socket);
    });
  });
  server.on("connection", (socket) => {
    if (isShuttingDown) {
      socket.destroy();
    } else {
      const id = connectionCounter++;
      socket._isIdle = true;
      socket._connectionId = id;
      connections[id] = socket;
      socket.once("close", () => {
        delete connections[socket._connectionId];
      });
    }
  });
  server.on("secureConnection", (socket) => {
    if (isShuttingDown) {
      socket.destroy();
    } else {
      const id = secureConnectionCounter++;
      socket._isIdle = true;
      socket._connectionId = id;
      secureConnections[id] = socket;
      socket.once("close", () => {
        delete secureConnections[socket._connectionId];
      });
    }
  });
  process.on("close", () => {
    debug("closed");
  });
  function shutdown(sig) {
    function cleanupHttp() {
      destroyAllConnections();
      debug("Close http server");
      return new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) {
            return reject(err);
          }
          return resolve(true);
        });
      });
    }
    debug("shutdown signal - " + sig);
    if (options.development) {
      debug("DEV-Mode - immediate forceful shutdown");
      return process.exit(0);
    }
    function finalHandler() {
      if (!finalRun) {
        finalRun = true;
        if (options.finally && isFunction(options.finally)) {
          debug("executing finally()");
          options.finally();
        }
      }
      return Promise.resolve();
    }
    function waitForReadyToShutDown(totalNumInterval) {
      debug(`waitForReadyToShutDown... ${totalNumInterval}`);
      if (totalNumInterval === 0) {
        debug(
          `Could not close connections in time (${options.timeout}ms), will forcefully shut down`
        );
        return Promise.resolve(true);
      }
      const allConnectionsClosed = Object.keys(connections).length === 0 && Object.keys(secureConnections).length === 0;
      if (allConnectionsClosed) {
        debug("All connections closed. Continue to shutting down");
        return Promise.resolve(false);
      }
      debug("Schedule the next waitForReadyToShutdown");
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(waitForReadyToShutDown(totalNumInterval - 1));
        }, 250);
      });
    }
    if (isShuttingDown) {
      return Promise.resolve();
    }
    debug("shutting down");
    return options.preShutdown(sig).then(() => {
      isShuttingDown = true;
      cleanupHttp();
    }).then(() => {
      const pollIterations = options.timeout ? Math.round(options.timeout / 250) : 0;
      return waitForReadyToShutDown(pollIterations);
    }).then((force) => {
      debug("Do onShutdown now");
      if (force) {
        destroyAllConnections(force);
      }
      return options.onShutdown(sig);
    }).then(finalHandler).catch((error) => {
      const errString = typeof error === "string" ? error : JSON.stringify(error);
      debug(errString);
      failed = true;
      throw errString;
    });
  }
  function shutdownManual() {
    return shutdown("manual");
  }
  return shutdownManual;
}

function getGracefulShutdownConfig() {
  return {
    disabled: !!process.env.NITRO_SHUTDOWN_DISABLED,
    signals: (process.env.NITRO_SHUTDOWN_SIGNALS || "SIGTERM SIGINT").split(" ").map((s) => s.trim()),
    timeout: Number.parseInt(process.env.NITRO_SHUTDOWN_TIMEOUT || "", 10) || 3e4,
    forceExit: !process.env.NITRO_SHUTDOWN_NO_FORCE_EXIT
  };
}
function setupGracefulShutdown(listener, nitroApp) {
  const shutdownConfig = getGracefulShutdownConfig();
  if (shutdownConfig.disabled) {
    return;
  }
  GracefulShutdown(listener, {
    signals: shutdownConfig.signals.join(" "),
    timeout: shutdownConfig.timeout,
    forceExit: shutdownConfig.forceExit,
    onShutdown: async () => {
      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.warn("Graceful shutdown timeout, force exiting...");
          resolve();
        }, shutdownConfig.timeout);
        nitroApp.hooks.callHook("close").catch((error) => {
          console.error(error);
        }).finally(() => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }
  });
}

const cert = process.env.NITRO_SSL_CERT;
const key = process.env.NITRO_SSL_KEY;
const nitroApp = useNitroApp();
const server = cert && key ? new Server({ key, cert }, toNodeListener(nitroApp.h3App)) : new Server$1(toNodeListener(nitroApp.h3App));
const port = destr(process.env.NITRO_PORT || process.env.PORT) || 3e3;
const host = process.env.NITRO_HOST || process.env.HOST;
const path = process.env.NITRO_UNIX_SOCKET;
const listener = server.listen(path ? { path } : { port, host }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  const protocol = cert && key ? "https" : "http";
  const addressInfo = listener.address();
  if (typeof addressInfo === "string") {
    console.log(`Listening on unix socket ${addressInfo}`);
    return;
  }
  const baseURL = (useRuntimeConfig().app.baseURL || "").replace(/\/$/, "");
  const url = `${protocol}://${addressInfo.family === "IPv6" ? `[${addressInfo.address}]` : addressInfo.address}:${addressInfo.port}${baseURL}`;
  console.log(`Listening on ${url}`);
});
trapUnhandledNodeErrors();
setupGracefulShutdown(listener, nitroApp);
const nodeServer = {};

export { $fetch$1 as $, isScriptProtocol as A, withQuery as B, withoutTrailingSlash as C, sanitizeStatusCode as D, baseURL as E, executeAsync as F, pascalCase as G, kebabCase as H, upperFirst as I, getRequestHeaders as J, nodeServer as K, destr as a, buildAssetsURL as b, createError$1 as c, defineRenderHandler as d, encodePath as e, getRouteRules as f, getQuery as g, getResponseStatusText as h, getResponseStatus as i, useNitroApp as j, klona as k, defu as l, hasProtocol as m, withTrailingSlash as n, joinURL as o, publicAssetsURL as p, defuFn as q, isEqual as r, serialize$1 as s, parseQuery as t, useRuntimeConfig as u, getContext as v, withLeadingSlash as w, hash$1 as x, parseURL as y, decodePath as z };
//# sourceMappingURL=nitro.mjs.map
